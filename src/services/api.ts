import axios, { type AxiosInstance, type InternalAxiosRequestConfig, type AxiosResponse } from 'axios';
import type {
  ApiResponse,
  AuthResponse,
  User,
  Content,
  GenerateRequest,
  GenerateResponse,
  GenerateParams,
  PublishRequest,
  PublishResponse,
  Platform,
  PromptTemplate,
  PromptTemplateDetail,
  PaginatedResponse,
  ModelsResponse,
  PresetListItem,
  PresetDetail,
  AgentResult,
  ExecutionPlan,
  AsyncTask,
  DecisionSubmitRequest,
  HotTopic,
} from '../types';
import { useAuthStore } from '../stores/useAuthStore';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().accessToken;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = useAuthStore.getState().refreshToken;
      if (refreshToken) {
        try {
          const response = await axios.post<ApiResponse<{ access_token: string }>>(
            `${API_BASE_URL}/api/v1/auth/refresh`,
            { refresh_token: refreshToken }
          );
          if (response.data.success && response.data.data) {
            useAuthStore.getState().setTokens(
              response.data.data.access_token,
              refreshToken
            );
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${response.data.data.access_token}`;
            }
            return apiClient(originalRequest);
          }
        } catch {
          useAuthStore.getState().logout();
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  register: (email: string, password: string, nickname?: string) =>
    apiClient.post<ApiResponse<{ user_id: string; email: string; nickname: string }>>(
      '/api/v1/auth/register',
      { email, password, nickname }
    ),

  login: (email: string, password: string) =>
    apiClient.post<ApiResponse<AuthResponse>>('/api/v1/auth/login', { email, password }),

  refresh: (refreshToken: string) =>
    apiClient.post<ApiResponse<{ access_token: string }>>('/api/v1/auth/refresh', {
      refresh_token: refreshToken,
    }),

  getMe: () => apiClient.get<ApiResponse<User>>('/api/v1/auth/me'),

  deleteAccount: () => apiClient.delete<ApiResponse<null>>('/api/v1/auth/account'),
};

export const contentsApi = {
  generate: (data: GenerateRequest) =>
    apiClient.post<ApiResponse<GenerateResponse>>('/api/v1/contents/generate', data),

  batchGenerate: (data: { topic: string; platforms: string[]; parameters?: GenerateParams }) =>
    apiClient.post<ApiResponse<{ contents: GenerateResponse[] }>>('/api/v1/contents/generate/batch', data),

  calendar: (year?: number, month?: number) =>
    apiClient.get<ApiResponse<{ calendar: Record<string, Array<{ id: string; title: string; type: string; platform_code: string; status: string }>>; year: number; month: number }>>('/api/v1/contents/calendar', { params: { year, month } }),

  list: (params?: { page?: number; page_size?: number; status?: string; platform_code?: string }) =>
    apiClient.get<ApiResponse<PaginatedResponse<Content>>>('/api/v1/contents', { params }),

  get: (id: string) =>
    apiClient.get<ApiResponse<Content>>(`/api/v1/contents/${id}`),

  update: (id: string, data: { title?: string; content_md?: string; content_html?: string; status?: string }) =>
    apiClient.put<ApiResponse<Content>>(`/api/v1/contents/${id}`, data),

  autosave: (id: string, content_md: string) =>
    apiClient.put<ApiResponse<{ id: string; updated_at: string }>>(`/api/v1/contents/${id}/autosave`, { content_md }),

  checkBannedWords: (id: string) =>
    apiClient.post<ApiResponse<{ words: Array<{ word: string; position: number; platform: string }>; total: number; platform: string }>>(`/api/v1/contents/${id}/check-banned-words`),

  diffVersions: (contentId: string, v1: string, v2: string) =>
    apiClient.get<ApiResponse<{ changes: Array<{ type: 'equal' | 'insert' | 'delete'; text: string }>; stats: { added: number; removed: number; unchanged: number } }>>(
      `/api/v1/contents/${contentId}/versions/diff`, { params: { v1, v2 } }
    ),

  delete: (id: string) =>
    apiClient.delete<ApiResponse<null>>(`/api/v1/contents/${id}`),
};

export const publishApi = {
  getBestTime: (platformCode?: string) =>
    apiClient.get<ApiResponse<{ best: string; time_slots: string[]; weekdays: string[]; reason: string }>>('/api/v1/publish/best-time', { params: { platform_code: platformCode || 'xiaohongshu' } }),

  publish: (data: PublishRequest) =>
    apiClient.post<ApiResponse<PublishResponse>>('/api/v1/publish', data),

  batchPublish: (data: { content_id: string; platforms: string[]; publish_mode: string; schedule_time?: string }) =>
    apiClient.post<ApiResponse<{ results: PublishResponse[] }>>('/api/v1/publish/batch', data),

  getContentHistory: (contentId: string) =>
    apiClient.get<ApiResponse<{ records: Array<{
      id: string; platform_code: string; status: string;
      platform_post_id?: string; platform_url?: string;
      error_message?: string; published_at?: string; created_at: string;
    }> }>>(`/api/v1/publish/content/${contentId}`),
};

export const aiEditApi = {
  checkBannedWords: (text: string, platform?: string) =>
    apiClient.post<ApiResponse<{ words: Array<{ word: string; position: number; platform: string; suggestion: string }>; total: number }>>('/api/v1/contents/ai-edit/check-banned-words', { text, platform: platform || 'xiaohongshu' }),

  suggestTags: (text: string) =>
    apiClient.post<ApiResponse<{ tags: string[] }>>('/api/v1/contents/ai-edit/suggest-tags', { text }),

  generateHeadlines: (text: string, count?: number) =>
    apiClient.post<ApiResponse<{ headlines: string[] }>>('/api/v1/contents/ai-edit/generate-headlines', { text, count: count || 5 }),

  analyzeSeo: (text: string, platform?: string) =>
    apiClient.post<ApiResponse<import('../types').SEOScore>>('/api/v1/contents/ai-edit/analyze-seo', { text, platform: platform || 'xiaohongshu' }),

  adaptContent: (text: string, sourcePlatform: string, targetPlatform: string) =>
    apiClient.post<ApiResponse<{ result: string }>>('/api/v1/contents/ai-edit/adapt-content', { text, source_platform: sourcePlatform, target_platform: targetPlatform }),

  analyzeViral: (text: string) =>
    apiClient.post<ApiResponse<unknown>>('/api/v1/contents/ai-edit/analyze-viral', { text }),

  expandKeywords: (keywords: string) =>
    apiClient.post<ApiResponse<{ keywords: string[] }>>('/api/v1/contents/ai-edit/expand-keywords', { keywords }),

  parseUrl: (url: string) =>
    apiClient.post<ApiResponse<{ title: string; description: string; content: string; images: string[]; domain: string }>>('/api/v1/contents/ai-edit/parse-url', { url }),

  rewrite: (text: string, instruction?: string) =>
    apiClient.post<ApiResponse<{ result: string }>>('/api/v1/contents/ai-edit/rewrite', { text, instruction }),

  expand: (text: string) =>
    apiClient.post<ApiResponse<{ result: string }>>('/api/v1/contents/ai-edit/expand', { text }),

  improveTone: (text: string, targetTone: string) =>
    apiClient.post<ApiResponse<{ result: string }>>('/api/v1/contents/ai-edit/improve-tone', { text, target_tone: targetTone }),

  summarize: (text: string) =>
    apiClient.post<ApiResponse<{ result: string }>>('/api/v1/contents/ai-edit/summarize', { text }),

  translate: (text: string, targetLang: string) =>
    apiClient.post<ApiResponse<{ result: string }>>('/api/v1/contents/ai-edit/translate', { text, target_lang: targetLang }),
};

export const platformsApi = {
  list: () => apiClient.get<ApiResponse<Platform[]>>('/api/v1/platforms'),
  listModels: () => apiClient.get<ApiResponse<ModelsResponse>>('/api/v1/platforms/models'),
  hotTopics: (platform?: string, limit?: number) =>
    apiClient.get<ApiResponse<{ platforms: Record<string, HotTopic[]>; updated_at: string }>>('/api/v1/platforms/hot-topics', { params: { platform, limit: limit || 10 } }),
};

export const presetsApi = {
  list: (platform_code?: string) =>
    apiClient.get<ApiResponse<PresetListItem[]>>('/api/v1/presets', { params: { platform_code } }),
  get: (id: string) =>
    apiClient.get<ApiResponse<PresetDetail>>(`/api/v1/presets/${id}`),
  create: (data: { name: string; description?: string; parameters: Record<string, unknown>; platform_code?: string; template_id?: string }) =>
    apiClient.post<ApiResponse<{ id: string }>>('/api/v1/presets', data),
  update: (id: string, data: { name?: string; description?: string; parameters?: Record<string, unknown> }) =>
    apiClient.put<ApiResponse<{ id: string }>>(`/api/v1/presets/${id}`, data),
  delete: (id: string) =>
    apiClient.delete<ApiResponse<null>>(`/api/v1/presets/${id}`),
};

export const personasApi = {
  list: () =>
    apiClient.get<ApiResponse<import('../types').Persona[]>>('/api/v1/personas'),
  get: (id: string) =>
    apiClient.get<ApiResponse<import('../types').Persona>>(`/api/v1/personas/${id}`),
  create: (data: { name: string; description?: string; tone?: string; style_notes?: string }) =>
    apiClient.post<ApiResponse<{ id: string }>>('/api/v1/personas', data),
  update: (id: string, data: { name?: string; description?: string; tone?: string; style_notes?: string }) =>
    apiClient.put<ApiResponse<{ id: string }>>(`/api/v1/personas/${id}`, data),
  delete: (id: string) =>
    apiClient.delete<ApiResponse<null>>(`/api/v1/personas/${id}`),
};

export const templatesApi = {
  list: (params?: { platform_code?: string }) =>
    apiClient.get<ApiResponse<PromptTemplate[]>>('/api/v1/templates', { params }),
  get: (id: string) =>
    apiClient.get<ApiResponse<PromptTemplateDetail>>(`/api/v1/templates/${id}`),
  create: (data: Partial<PromptTemplateDetail>) =>
    apiClient.post<ApiResponse<{ id: string }>>('/api/v1/templates', data),
  update: (id: string, data: Partial<PromptTemplateDetail>) =>
    apiClient.put<ApiResponse<{ id: string }>>(`/api/v1/templates/${id}`, data),
  delete: (id: string) =>
    apiClient.delete<ApiResponse<null>>(`/api/v1/templates/${id}`),
};

// ===================== Agent API =====================

/** Agent API 独立客户端（超时 300s，因为 LLM 调用可能持续数分钟） */
const agentApiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 300_000, // 5 分钟
  headers: { 'Content-Type': 'application/json' },
});

agentApiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().accessToken;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

agentApiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = useAuthStore.getState().refreshToken;
      if (refreshToken) {
        try {
          const response = await axios.post<ApiResponse<{ access_token: string }>>(
            `${API_BASE_URL}/api/v1/auth/refresh`,
            { refresh_token: refreshToken }
          );
          if (response.data.success && response.data.data) {
            useAuthStore.getState().setTokens(
              response.data.data.access_token,
              refreshToken
            );
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${response.data.data.access_token}`;
            }
            return agentApiClient(originalRequest);
          }
        } catch {
          useAuthStore.getState().logout();
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export const agentApi = {
  run: (data: { prompt: string; context?: Record<string, unknown> }) =>
    agentApiClient.post<ApiResponse<AgentResult>>('/api/v1/agent/run', data),

  plan: (data: { prompt: string }) =>
    agentApiClient.post<ApiResponse<ExecutionPlan>>('/api/v1/agent/plan', data),

  submitAsync: (data: { prompt: string }) =>
    agentApiClient.post<{ success: boolean; data: { task_id: string } }>('/api/v1/agent/async/submit', data),

  getAsyncStatus: (taskId: string) =>
    agentApiClient.get<{ success: boolean; data: AsyncTask }>(`/api/v1/agent/async/status/${taskId}`),

  listAsyncTasks: (limit?: number) =>
    agentApiClient.get<{ success: boolean; data: { tasks: AsyncTask[]; total: number } }>('/api/v1/agent/async/list', { params: { limit } }),

  submitDecision: (taskId: string, data: DecisionSubmitRequest) =>
    agentApiClient.post<{ success: boolean; data: { task_id: string; state: string } }>(`/api/v1/agent/decision/${taskId}`, data),

  cancelTask: (taskId: string) =>
    agentApiClient.delete<{ success: boolean }>(`/api/v1/agent/async/${taskId}`),

  wsUrl: (taskId: string) => {
    const base = import.meta.env.VITE_API_BASE_URL || '';
    const wsBase = base.replace(/^http/, 'ws');
    return `${wsBase || 'ws://localhost:8000'}/api/v1/agent/ws/${taskId}`;
  },

  /** SSE 流式执行：通过 fetch + ReadableStream 接收实时事件 */
  streamUrl: () => `${API_BASE_URL}/api/v1/agent/stream`,
};

/** SSE 流式生成：通过 fetch + ReadableStream 逐 token 解析 */
export const generateStream = (
  data: GenerateRequest,
  callbacks: {
    onToken: (token: string) => void;
    onTitle: (title: string) => void;
    onDone: (result: { content_id: string; title: string; metadata: GenerateResponse['metadata'] }) => void;
    onError: (message: string) => void;
  },
  signal?: AbortSignal,
): Promise<void> => {
  const token = useAuthStore.getState().accessToken;

  return fetch(`${API_BASE_URL}/api/v1/contents/generate/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
    signal,
  }).then(async (response) => {
    if (!response.ok) {
      const err = await response.text();
      throw new Error(err);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      buffer = buffer.replace(/\r\n/g, '\n');
      const events = buffer.split('\n\n');
      buffer = events.pop() || '';

      for (const event of events) {
        for (const line of event.split('\n')) {
          if (line.startsWith('data: ')) {
            try {
              const parsed = JSON.parse(line.slice(6));
              switch (parsed.type) {
                case 'token':
                  callbacks.onToken(parsed.content);
                  break;
                case 'title':
                  callbacks.onTitle(parsed.content);
                  break;
                case 'done':
                  callbacks.onDone(parsed);
                  break;
                case 'error':
                  callbacks.onError(parsed.message);
                  break;
              }
            } catch {
              // skip malformed JSON
            }
          }
        }
      }
    }
  });
};

export default apiClient;
