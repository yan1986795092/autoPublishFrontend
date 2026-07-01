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
  PaginatedResponse,
  ModelsResponse,
  PresetListItem,
  PresetDetail,
  AgentResult,
  ExecutionPlan,
  AsyncTask,
  HotTopic,
  RenderPayload,
  GenerationMeta,
} from '../types';
import { useAuthStore } from '../stores/useAuthStore';
import { handleUnauthorizedRetry } from './auth-refresh';

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
      return handleUnauthorizedRetry(apiClient, originalRequest);
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  register: (email: string, password: string, nickname?: string) =>
    apiClient.post<ApiResponse<AuthResponse>>(
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
    apiClient.get<ApiResponse<{ calendar: Record<string, Array<{ id: string; content_id: string; title: string; type: string; platform_code: string; content_status: string }>>; year: number; month: number }>>('/api/v1/contents/calendar', { params: { year, month } }),

  list: (params?: { page?: number; page_size?: number; status?: string; platform_code?: string; search?: string; tag?: string }) =>
    apiClient.get<ApiResponse<PaginatedResponse<Content>>>('/api/v1/contents', { params }),

  get: (id: string, config?: { signal?: AbortSignal }) =>
    apiClient.get<ApiResponse<Content>>(`/api/v1/contents/${id}`, config),

  update: (id: string, data: { title?: string; content_md?: string; content_html?: string; tags?: string; status?: string; change_summary?: string }) =>
    apiClient.put<ApiResponse<Content>>(`/api/v1/contents/${id}`, data),

  autosave: (id: string, content_md: string, extra?: { title?: string; tags?: string }) =>
    apiClient.put<ApiResponse<{ id: string; updated_at: string }>>(`/api/v1/contents/${id}/autosave`, { content_md, ...extra }),

  checkBannedWords: (id: string) =>
    apiClient.post<ApiResponse<{ words: Array<{ word: string; position: number; platform: string }>; total: number; platform: string }>>(`/api/v1/contents/${id}/check-banned-words`),

  diffVersions: (contentId: string, v1: string, v2: string) =>
    apiClient.get<ApiResponse<{ changes: Array<{ type: 'equal' | 'insert' | 'delete'; text: string }>; stats: { added: number; removed: number; unchanged: number } }>>(
      `/api/v1/contents/${contentId}/versions/diff`, { params: { v1, v2 } }
    ),

  delete: (id: string) =>
    apiClient.delete<ApiResponse<null>>(`/api/v1/contents/${id}`),

  /** 批量删除 */
  batchDelete: (ids: string[]) =>
    apiClient.post<ApiResponse<{ deleted: string[]; not_found: string[] }>>('/api/v1/contents/batch-delete', { ids }),

  /** 批量归档 */
  batchArchive: (ids: string[]) =>
    apiClient.post<ApiResponse<{ archived: string[]; not_found: string[] }>>('/api/v1/contents/batch-archive', { ids }),

  /** 直接创建内容（非 AI 生成） */
  create: (data: { title: string; content_md: string; platform_code?: string; tags?: string[] }) =>
    apiClient.post<ApiResponse<{ id: string; title: string; created_at: string }>>('/api/v1/contents', data),
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

  checkBannedWordsAi: (text: string, platform?: string) =>
    apiClient.post<ApiResponse<{ words: Array<{ word: string; reason: string; suggestion: string; severity: string }>; total: number }>>('/api/v1/contents/ai-edit/check-banned-words-ai', { text, platform: platform || 'xiaohongshu' }),

  suggestTags: (text: string) =>
    apiClient.post<ApiResponse<{ tags: string[] }>>('/api/v1/contents/ai-edit/suggest-tags', { text }),

  generateHeadlines: (text: string, count?: number) =>
    apiClient.post<ApiResponse<{ headlines: string[] }>>('/api/v1/contents/ai-edit/generate-headlines', { text, count: count || 5 }),

  analyzeSeo: (text: string, platform?: string) =>
    apiClient.post<ApiResponse<import('../types').SEOScore>>('/api/v1/contents/ai-edit/analyze-seo', { text, platform: platform || 'xiaohongshu' }),

  adaptContent: (text: string, sourcePlatform: string, targetPlatform: string) =>
    apiClient.post<ApiResponse<{ result: string }>>('/api/v1/contents/ai-edit/adapt-content', { text, source_platform: sourcePlatform, target_platform: targetPlatform }),

  analyzeViral: (text: string) =>
    apiClient.post<ApiResponse<{
      overall: number;
      topic_heat: number;
      headline_appeal: number;
      content_quality: number;
      engagement_potential: number;
      share_potential: number;
      strengths: string[];
      weaknesses: string[];
      tips: string[];
    }>>('/api/v1/contents/ai-edit/analyze-viral', { text }),

  expandKeywords: (keywords: string) =>
    apiClient.post<ApiResponse<{ keywords: string[] }>>('/api/v1/contents/ai-edit/expand-keywords', { keywords }),

  parseUrl: (url: string) =>
    apiClient.post<ApiResponse<{ title: string; description: string; content: string; images: string[]; domain: string }>>('/api/v1/contents/ai-edit/parse-url', { url }),

  rewrite: (text: string, instruction?: string, platform?: string) =>
    apiClient.post<ApiResponse<{ result: string }>>('/api/v1/contents/ai-edit/rewrite', { text, instruction, platform }),

  expand: (text: string, platform?: string) =>
    apiClient.post<ApiResponse<{ result: string }>>('/api/v1/contents/ai-edit/expand', { text, platform }),

  improveTone: (text: string, targetTone: string, platform?: string) =>
    apiClient.post<ApiResponse<{ result: string }>>('/api/v1/contents/ai-edit/improve-tone', { text, target_tone: targetTone, platform }),

  summarize: (text: string, platform?: string) =>
    apiClient.post<ApiResponse<{ result: string }>>('/api/v1/contents/ai-edit/summarize', { text, platform }),

  translate: (text: string, targetLang: string, platform?: string) =>
    apiClient.post<ApiResponse<{ result: string }>>('/api/v1/contents/ai-edit/translate', { text, target_lang: targetLang, platform }),
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
      return handleUnauthorizedRetry(agentApiClient, originalRequest);
    }
    return Promise.reject(error);
  }
);

export const agentApi = {
  run: (data: { prompt: string; context?: Record<string, unknown>; skill_id?: string }) =>
    agentApiClient.post<ApiResponse<AgentResult>>('/api/v1/agent/run', data),

  plan: (data: { prompt: string; skill_id?: string }) =>
    agentApiClient.post<ApiResponse<ExecutionPlan>>('/api/v1/agent/plan', data),

  submitAsync: (data: { prompt: string; skill_id?: string; platform?: string }) =>
    agentApiClient.post<{ success: boolean; data: { task_id: string } }>('/api/v1/agent/async/submit', data),

  getAsyncStatus: (taskId: string) =>
    agentApiClient.get<{ success: boolean; data: AsyncTask }>(`/api/v1/agent/async/status/${taskId}`),

  listAsyncTasks: (limit?: number) =>
    agentApiClient.get<{ success: boolean; data: { tasks: AsyncTask[]; total: number } }>('/api/v1/agent/async/list', { params: { limit } }),

  cancelTask: (taskId: string) =>
    agentApiClient.delete<{ success: boolean }>(`/api/v1/agent/async/${taskId}`),

  wsUrl: (taskId: string) => {
    const base = import.meta.env.VITE_API_BASE_URL || '';
    const wsBase = base.replace(/^http/, 'ws');
    const token = useAuthStore.getState().accessToken;
    const qs = token ? `?token=${encodeURIComponent(token)}` : '';
    return `${wsBase || 'ws://localhost:8000'}/api/v1/agent/ws/${taskId}${qs}`;
  },

  /** SSE 流式执行：通过 fetch + ReadableStream 接收实时事件 */
  streamUrl: () => `${API_BASE_URL}/api/v1/agent/stream`,

  /** 获取系统监控指标 */
  getMetrics: () =>
    apiClient.get<{ success: boolean; data: import('../types').AgentMetrics }>('/api/v1/agent/metrics'),
};

// ===================== Operations Center API =====================
// 路径从 /api/v1/admin/metrics/* 迁移到 /api/v1/metrics/*
// 旧路径仍可访问（307 重定向），建议 2026-07-31 前完成切换

export const operationsApi = {
  /** 获取产能看板数据 */
  getProductionMetrics: () =>
    apiClient.get<{ success: boolean; data: import('../types/operations').ProductionMetrics }>(
      '/api/v1/metrics/production'
    ),

  /** 获取发布监控数据 */
  getPublishingMetrics: () =>
    apiClient.get<{ success: boolean; data: import('../types/operations').PublishingMetrics }>(
      '/api/v1/metrics/publishing'
    ),

  /** 获取成本分析数据 */
  getCostMetrics: () =>
    apiClient.get<{ success: boolean; data: import('../types/operations').CostMetrics }>(
      '/api/v1/metrics/cost'
    ),

  /** 设置月度预算 */
  setBudget: (budget: number) =>
    apiClient.patch<{ success: boolean; data: { monthly_budget: number } }>(
      '/api/v1/metrics/budget',
      { budget }
    ),

  /** 获取系统状态 */
  getSystemMetrics: () =>
    apiClient.get<{ success: boolean; data: import('../types/operations').SystemMetrics }>(
      '/api/v1/metrics/system'
    ),
};

// ===================== Skills API =====================

export const skillsApi = {
  list: (params?: { category?: string; source?: string }) =>
    apiClient.get<{ success: boolean; data: import('../types').SkillMeta[] }>('/api/v1/skills', { params }),

  get: (id: string) =>
    apiClient.get<{ success: boolean; data: import('../types').Skill }>(`/api/v1/skills/${id}`),

  listBuiltins: () =>
    apiClient.get<{ success: boolean; data: import('../types').Skill[] }>('/api/v1/skills/builtins'),

  getBuiltin: (id: string) =>
    apiClient.get<{ success: boolean; data: import('../types').Skill }>(`/api/v1/skills/builtins/${id}`),

  create: (data: {
    name: string;
    description?: string;
    category?: string;
    icon?: string;
    system_prompt: string;
    user_prompt_template?: string;
    preset_plan?: Record<string, unknown>;
    content_types?: string[];
    config_schema?: Record<string, unknown>;
    tags?: string[];
  }) =>
    apiClient.post<{ success: boolean; data: import('../types').SkillMeta }>('/api/v1/skills', data),

  update: (id: string, data: Record<string, unknown>) =>
    apiClient.put<{ success: boolean; data: import('../types').SkillMeta }>(`/api/v1/skills/${id}`, data),

  delete: (id: string) =>
    apiClient.delete<{ success: boolean }>(`/api/v1/skills/${id}`),

  importUrl: (url: string, nameOverride?: string) =>
    apiClient.post<{ success: boolean; data: import('../types').SkillMeta }>('/api/v1/skills/import/url', {
      url,
      name_override: nameOverride,
    }),

  importFile: (fileContent: string, fileName: string) =>
    apiClient.post<{ success: boolean; data: import('../types').SkillMeta }>('/api/v1/skills/import/file', {
      file_content: fileContent,
      file_name: fileName,
    }),

  previewImport: (fileContent: string, fileName: string) =>
    apiClient.post<{ success: boolean; data: Record<string, unknown> }>('/api/v1/skills/import/preview', {
      file_content: fileContent,
      file_name: fileName,
    }),

  recordUse: (id: string) =>
    apiClient.post<{ success: boolean }>(`/api/v1/skills/${id}/use`),
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

    try {
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

      // 修复 BUG-20：连接正常关闭时，最后一段没有 \n\n 结尾的事件块
      // 仍残留在 buffer 中（最后一句 token、最后一条 SSE 事件等），
      // 必须 flush 一次以避免丢字。
      if (buffer.trim()) {
        const normalizedTail = buffer.replace(/\r\n/g, '\n');
        for (const line of normalizedTail.split('\n')) {
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
    } catch (err) {
      // reader.read() or decoder.decode() threw — cancel the stream on abort
      if (signal?.aborted) {
        reader.cancel().catch(() => {});
      }
      throw err;
    }
  });
};

export default apiClient;

// ── Observability API ──────────────────────────────────────────────────────────

export interface TraceSpan {
  span_id: string;
  trace_id: string;
  parent_span_id: string;
  operation_name: string;
  service_name: string;
  start_time: string;
  duration_ms: number;
  is_error: boolean;
  kind: string;
  tags: Record<string, unknown>;
  logs: Array<{ timestamp: string; fields: Record<string, unknown> }>;
  score: number;
  relative_start_ms: number;
}

export interface TraceSearchResult {
  total: number;
  page: number;
  page_size: number;
  spans: TraceSpan[];
}

export interface TraceDetail {
  trace_id: string;
  total_duration_ms: number;
  start_time: string;
  end_time: string;
  span_count: number;
  error_count: number;
  spans: TraceSpan[];
  span_map?: Record<string, TraceSpan>;
}

export interface TraceStats {
  total_traces: number;
  total_spans: number;
  error_count: number;
  error_rate: number;
  by_service: Array<{ service: string; count: number }>;
  by_operation: Array<{ operation: string; count: number }>;
  p50_duration_ms: number;
  p95_duration_ms: number;
  p99_duration_ms: number;
}

export interface AgentEventRow {
  timestamp: string;
  session_id: string;
  run_id: string;
  step_index: number;
  parent_span_id: string;
  agent_name: string;
  event_type: string;
  level: string;
  message: string;
  thought?: string;
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  tool_output?: string;
  duration_ms?: number;
  token_usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    cost_usd?: number;
  };
  error_type?: string;
  error_message?: string;
  error_stack?: string;
  llm_model?: string;
  llm_provider?: string;
  service: string;
  trace_id: string;
  index: string;
  score: number;
}

export interface AgentEventSearchResult {
  total: number;
  page: number;
  page_size: number;
  events: AgentEventRow[];
}

export interface DashboardOverview {
  trace_stats_hour: TraceStats;
  trace_stats_day: TraceStats;
  metrics: Record<string, number | null>;
  generated_at: string;
}

// ===================== Chat/Conversation Types =====================

export interface ChatMessageRecord {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  status: 'sending' | 'running' | 'completed' | 'failed';
  result?: AgentResult;
  task_id?: string;
  plan?: ExecutionPlan;
  kind?: 'user' | 'conversation' | 'generation';
  render_mode?: 'bubble' | 'generation_card';
  render_payload?: RenderPayload | null;
  is_generation?: boolean;
  is_conversation?: boolean;
  generation_meta?: GenerationMeta | null;
  created_at: string;
}

export interface ChatConversationSummary {
  id: string;
  title: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  message_count: number;
  last_message?: ChatMessageRecord;
}

export interface ChatConversationDetail {
  conversation: ChatConversationSummary;
  messages: ChatMessageRecord[];
}

// ===================== Chat API =====================

export const chatApi = {
  listConversations: (params?: { limit?: number; offset?: number; q?: string }) =>
    apiClient.get<{
      success: boolean;
      data: {
        conversations: ChatConversationSummary[];
        total: number;
        offset: number;
        limit: number;
      };
    }>('/api/v1/chat/conversations', { params }),

  createConversation: (data?: { title?: string }) =>
    apiClient.post<{
      success: boolean;
      data: ChatConversationSummary;
    }>('/api/v1/chat/conversations', data),

  getConversation: (conversationId: string) =>
    apiClient.get<{
      success: boolean;
      data: ChatConversationDetail;
    }>(`/api/v1/chat/conversations/${conversationId}`),

  updateConversation: (conversationId: string, data: { title?: string }) =>
    apiClient.put<{
      success: boolean;
      data: ChatConversationSummary;
    }>(`/api/v1/chat/conversations/${conversationId}`, data),

  pinConversation: (conversationId: string, isPinned: boolean) =>
    apiClient.patch<{
      success: boolean;
      data: ChatConversationSummary;
    }>(`/api/v1/chat/conversations/${conversationId}/pin`, { is_pinned: isPinned }),

  deleteConversation: (conversationId: string) =>
    apiClient.delete<{
      success: boolean;
      data: { id: string };
    }>(`/api/v1/chat/conversations/${conversationId}`),

  addMessage: (conversationId: string, data: {
    role: string;
    content: string;
    status?: string;
    result?: Record<string, unknown>;
    task_id?: string;
    plan?: Record<string, unknown>;
  }) =>
    apiClient.post<{
      success: boolean;
      data: ChatMessageRecord;
    }>(`/api/v1/chat/conversations/${conversationId}/messages`, data),

  updateMessage: (messageId: string, data: {
    content?: string;
    status?: string;
    result?: Record<string, unknown>;
  }) =>
    apiClient.put<{
      success: boolean;
      data: ChatMessageRecord;
    }>(`/api/v1/chat/messages/${messageId}`, data),

  deleteMessage: (messageId: string) =>
    apiClient.delete<{
      success: boolean;
      data: { id: string };
    }>(`/api/v1/chat/messages/${messageId}`),

  quickStart: (data: {
    role: string;
    content: string;
    status?: string;
    result?: Record<string, unknown>;
    task_id?: string;
    plan?: Record<string, unknown>;
  }) =>
    apiClient.post<{
      success: boolean;
      data: {
        conversation_id: string;
        message: ChatMessageRecord;
      };
    }>('/api/v1/chat/quick-start', data),
};

// ===================== Conversation API =====================

export interface ConversationTriggerData {
  action: 'create' | 'revise' | 'expand';
  topic?: string;
  platform?: string;
  style?: string;
  length?: string;
  tone?: string;
  audience?: string;
  keywords?: string[];
  revision_focus?: string;
  _prompt?: string;
}

export const conversationApi = {
  /** 对话聊天 SSE 流 URL */
  chatUrl: () => `${API_BASE_URL}/api/v1/conversation/chat`,

  /** 对话聊天 — 返回 SSE EventSource URL（前端直接用 EventSource 或 SSEProcessor 连接） */
  chat: (data: { message: string; conversation_id?: string }) =>
    apiClient.post<Blob>('/api/v1/conversation/chat', data, {
      responseType: 'blob',
    }),
};
