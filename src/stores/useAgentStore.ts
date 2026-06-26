import { create } from 'zustand';
import type {
  AsyncTask, AgentResult, ExecutionPlan, ChatMessage,
  ThinkingStep, StreamEvent, LLMChunk, ReasoningChunk,
  StageInfo, IntentConflict,
} from '../types';
import { getResultThinkingSteps } from '../utils/agentEvents';
import { resultToTimelineEvents } from '../utils/agentEventTimeline';
import { agentApi, chatApi, type ChatConversationSummary } from '../services/api';
import { SSEProcessor } from '../services/sse-processor';
import { useAuthStore } from './useAuthStore';

interface AgentState {
  // 当前任务
  currentTaskId: string | null;
  currentTask: AsyncTask | null;
  currentResult: AgentResult | null;
  currentPlan: ExecutionPlan | null;
  isRunning: boolean;
  error: string | null;

  // Thinking trace（实时步骤）
  thinkingSteps: ThinkingStep[];

  // === 新增: 流式事件列表（统一渲染源） ===
  streamEvents: StreamEvent[];

  // === 新增: LLM token 流（打字机效果） ===
  llmChunks: Record<string, LLMChunk[]>;  // agent -> chunks[]
  reasoningChunks: Record<string, ReasoningChunk[]>;  // agent -> reasoning[]

  // === 新增: 动态阶段列表（用于 StageTimeline） ===
  stages: StageInfo[];
  currentStage: string | null;
  intentConflicts: IntentConflict[];

  // 流式事件是否已开始（第一个 SSE 事件到达后为 true）
  hasFirstEventReceived: boolean;

  // WebSocket 状态
  wsConnectionState: 'connecting' | 'connected' | 'disconnected';
  _ws: WebSocket | null;
  _reconnectTimer: ReturnType<typeof setTimeout> | null;
  // 正在加载的对话 ID（用于丢弃过期请求，避免竞态）
  _inflightLoadId: string | null;

  // 消息列表（Chat 式界面）
  messages: ChatMessage[];
  addMessage: (msg: ChatMessage) => void;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  clearMessages: () => void;

  // === 对话持久化 ===
  conversationId: string | null;
  conversationList: ChatConversationSummary[];
  conversationListTotal: number;
  loadConversations: (opts?: { showErrorToast?: (msg: string) => void; limit?: number; offset?: number }) => Promise<void>;
  loadConversationMessages: (conversationId: string) => Promise<void>;
  createConversation: (title?: string) => Promise<string | null>;
  deleteConversation: (conversationId: string) => Promise<boolean>;
  updateConversationTitle: (conversationId: string, title: string) => Promise<boolean>;
  switchConversation: (conversationId: string | null) => Promise<void>;

  // Actions
  previewPlan: (prompt: string) => Promise<ExecutionPlan | null>;
  runSync: (prompt: string) => Promise<AgentResult | null>;
  runAsync: (prompt: string, platform?: string | null) => Promise<string | null>;
  runStreaming: (prompt: string, platform?: string | null, parameters?: Record<string, unknown>, trigger?: Record<string, unknown>) => Promise<void>;
  loadTaskStatus: (taskId: string) => Promise<void>;
  setCurrentResult: (result: AgentResult | null) => void;
  setCurrentTask: (task: AsyncTask | null) => void;
  cancelTask: (taskId: string) => Promise<boolean>;
  _abortController: AbortController | null;
  clearCurrent: () => void;

  // Applied Skill
  appliedSkill: import('../types').AppliedSkill | null;
  appliedSkillFull: import('../types').Skill | null;
  setAppliedSkill: (applied: import('../types').AppliedSkill | null, full: import('../types').Skill | null) => void;

  // 右侧预览
  previewContent: string | null;
  setPreviewContent: (content: string | null) => void;

  // 预览面板平台选择（默认 null = 自动检测）
  previewPlatform: string | null;
  setPreviewPlatform: (platform: string | null) => void;

  // 预览面板体裁选择（product copy, tech-doc 等）
  previewContentType: string | null;
  setPreviewContentType: (contentType: string | null) => void;

  // Stream events
  addStreamEvent: (event: StreamEvent) => void;

  // Streaming
  _streamingProcessor: SSEProcessor | null;
  stopStreaming: () => void;

  // WebSocket 管理
  connectWebSocket: (taskId: string) => WebSocket | null;
  disconnectWebSocket: () => void;
  setWsConnectionState: (state: 'connecting' | 'connected' | 'disconnected') => void;
}

const _CONV_STORAGE_KEY = 'autopublish-conversations';

const _MAX_STREAM_EVENTS = 500;

const _CHUNK_UPDATE_INTERVAL = 120;

const _MSG_UPDATE_INTERVAL = 50;

function _hasPersistedGenerationResult(message: Pick<ChatMessage, 'kind' | 'result'>): boolean {
  if (message.kind === 'generation') return true;
  const result = message.result as any;
  if (!result || typeof result !== 'object') return false;

  if (Array.isArray(result._stages) && result._stages.length > 0) return true;
  if (result._draftContent) return true;
  if (result._llmChunks && Object.keys(result._llmChunks).length > 0) return true;
  if (result.usage) return true;
  if (result.agent_type || result.task_id) return true;

  const output = result.output;
  if (!output || typeof output !== 'object') return false;
  return Boolean(output.full_text || output.content || output.draft_content);
}

function _loadConvFromStorage(): Pick<AgentState, 'conversationId' | 'conversationList'> {
  try {
    const raw = localStorage.getItem(_CONV_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { conversationId: null, conversationList: [] };
}

function _saveConvToStorage(state: Pick<AgentState, 'conversationId' | 'conversationList'>) {
  try {
    localStorage.setItem(_CONV_STORAGE_KEY, JSON.stringify({
      conversationId: state.conversationId,
      conversationList: state.conversationList,
    }));
  } catch { /* ignore */ }
}

const _initFromStorage = _loadConvFromStorage();

// extractTitleFromContent 已移至后端 merge_and_finish，前端不再需要此函数。

export const useAgentStore = create<AgentState>()((set, get) => ({
  currentTaskId: null,
  currentTask: null,
  currentResult: null,
  currentPlan: null,
  isRunning: false,
  error: null,
  thinkingSteps: [],
  streamEvents: [],
  llmChunks: {},
  reasoningChunks: {},
  stages: [],
  currentStage: null,
  intentConflicts: [],
  hasFirstEventReceived: false,
  wsConnectionState: 'disconnected',
  _ws: null,
  _reconnectTimer: null,
  _inflightLoadId: null,
  _abortController: null,
  messages: [],
  appliedSkill: null,
  appliedSkillFull: null,
  previewContent: null,
  previewPlatform: null,
  previewContentType: null,
  conversationId: _initFromStorage.conversationId,
  conversationList: _initFromStorage.conversationList,
  conversationListTotal: 0,
  _streamingProcessor: null,

  setAppliedSkill: (applied, full) => set({ appliedSkill: applied, appliedSkillFull: full }),
  setPreviewContent: (content) => set({ previewContent: content }),
  setPreviewPlatform: (platform) => set({ previewPlatform: platform }),
  setPreviewContentType: (contentType) => set({ previewContentType: contentType }),

  addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),
  updateMessage: (id, updates) => set((state) => ({
    messages: state.messages.map((m) => (m.id === id ? { ...m, ...updates } : m)),
  })),
  clearMessages: () => set({ messages: [] }),
  addStreamEvent: (event) => set((state) => ({ streamEvents: [...state.streamEvents, event] })),

  stopStreaming: () => {
    const { _streamingProcessor, _abortController, messages, stages, thinkingSteps, reasoningChunks } = useAgentStore.getState();
    if (_streamingProcessor) {
      _streamingProcessor.abort();
    }
    if (_abortController) {
      _abortController.abort();
    }
    // 将 running 中的 assistant 消息标记为 failed，并保存已生成的部分 stages
    const runningMsg = messages.find(m => m.role === 'assistant' && m.status === 'running');
    if (runningMsg) {
      const updates: Partial<ChatMessage> = { status: 'failed' };
      if (stages.length > 0) {
        updates.result = {
          _stages: stages.map(s => ({ ...s })),
          _thinkingSteps: thinkingSteps,
          _reasoningChunks: reasoningChunks,
        } as any;
      }
      get().updateMessage(runningMsg.id, updates);
    }
    set({
      isRunning: false,
      currentTaskId: null,
      currentResult: null,   // ← 侧边栏 AdvancedPanel 不再残留旧结果
      thinkingSteps: [],
      llmChunks: {},
      reasoningChunks: {},
      stages: [],
      currentStage: null,
      intentConflicts: [],
      streamEvents: [],
      _streamingProcessor: null,
      _abortController: null,
    });
  },

  // === 对话持久化 ===
  loadConversations: async (opts?: { showErrorToast?: (msg: string) => void; limit?: number; offset?: number }) => {
    const savedId = localStorage.getItem('currentConversationId');
    // 默认拉到后端上限 200；想"加载更多"可在 opts 里显式传 offset
    const limit = Math.max(1, Math.min(opts?.limit ?? 200, 200));
    const offset = Math.max(0, opts?.offset ?? 0);
    try {
      const response = await chatApi.listConversations({ limit, offset });
      if (response.data.success && response.data.data) {
        const serverConversations = response.data.data.conversations;
        const total = response.data.data.total ?? serverConversations.length;
        // 合并服务端列表与本地状态，避免条件竞争导致新创建的对话被覆盖
        set((state) => {
          const serverIds = new Set(serverConversations.map(c => c.id));
          const localOnly = state.conversationList.filter(c => !serverIds.has(c.id));
          // offset>0 时是"加载更多"，把已有放在新分页前面；否则正常覆盖
          const merged = offset === 0
            ? (localOnly.length > 0 ? [...localOnly, ...serverConversations] : serverConversations)
            : [...state.conversationList, ...serverConversations.filter(c => !state.conversationList.some(x => x.id === c.id))];

          // 从合并后的列表中找当前对话ID（仅在首屏时恢复）
          const validId = offset === 0 && savedId && merged.some((c) => c.id === savedId)
            ? savedId
            : (offset === 0 ? (merged[0]?.id ?? null) : state.conversationId);

          if (offset === 0 && validId !== savedId) {
            if (validId) localStorage.setItem('currentConversationId', validId);
            else localStorage.removeItem('currentConversationId');
          }
          return {
            conversationList: merged,
            conversationListTotal: offset === 0 ? total : state.conversationListTotal,
            ...(offset === 0 ? { conversationId: validId } : {}),
          };
        });
        _saveConvToStorage(get());
        if (offset === 0) {
          const currentId = get().conversationId;
          if (currentId) {
            // 标记 inflight，让后续 switchConversation 抢占时可丢弃这次结果
            set({ _inflightLoadId: currentId });
            await get().loadConversationMessages(currentId);
          }
        }
      }
    } catch (e) {
      const msg = '加载对话历史失败，请检查网络连接';
      console.error('[loadConversations] failed:', e);
      opts?.showErrorToast?.(msg);
    }
  },

  loadConversationMessages: async (conversationId: string) => {
    try {
      const response = await chatApi.getConversation(conversationId);
      // 竞态保护：响应到达时检查 inflight 标记是否仍是当前对话，
      // 如果用户已经在加载期间切换到了其他对话，丢弃这次结果。
      const inflight = useAgentStore.getState()._inflightLoadId;
      if (inflight !== conversationId) {
        return;
      }
      if (response.data.success && response.data.data) {
        const { messages } = response.data.data;
        const chatMessages: ChatMessage[] = messages.map((m) => {
          const msg = {
            id: m.id,
            role: m.role as 'user' | 'assistant' | 'system',
            content: m.content,
            timestamp: new Date(m.created_at).getTime(),
            status: m.status as ChatMessage['status'],
            result: m.result as AgentResult | undefined,
            taskId: m.task_id,
            plan: m.plan as ExecutionPlan | undefined,
            kind: m.kind as ChatMessage['kind'],
            renderMode: m.render_mode as ChatMessage['renderMode'],
            renderPayload: (m.render_payload || null) as ChatMessage['renderPayload'],
            generationMeta: (m.generation_meta || null) as ChatMessage['generationMeta'],
          };
          const result = msg.result as any;
          // 旧格式归一化：thinking steps / reasoning 藏在 _stages[].substeps[] 里
          if (result?._stages?.length) {
            for (const st of result._stages) {
              // reasoning: 优先取 _reasoningChunks，其次从 substeps 拼接
              if (result._reasoningChunks?.[st.agent]?.[0]?.content) {
                const rKey = `${st.agent}|${st.reviewRound || 0}`;
                if (!st.reasoning) st.reasoning = (result._reasoningChunks[rKey] || result._reasoningChunks[st.agent] || [{}])[0]?.content || '';
              } else if (st.substeps?.length && !st.reasoning) {
                st.reasoning = st.substeps
                  .filter((s: any) => s.reasoning)
                  .map((s: any) => s.reasoning)
                  .join('\n\n');
              }
            }
            // 扁平化所有 substeps 作为 _thinkingSteps（供全局 store 和 MessageBubble 使用）
            if (!result._thinkingSteps) {
              result._thinkingSteps = result._stages.flatMap((st: any) =>
                (st.substeps || []).map((s: any) => ({
                  ...s,
                  status: s.status === 'completed' ? 'done' : s.status,
                }))
              );
            }
          }
          return msg;
        });
        // 同时恢复全局 state 给当前对话的实时展示
        const lastGenerated = [...chatMessages].reverse().find((m) =>
          m.role === 'assistant' && _hasPersistedGenerationResult(m)
        );
        const lastResult = lastGenerated?.result as any;
        const restoredStages: StageInfo[] = (lastResult?._stages || []) as StageInfo[];
        const restoredThinkingSteps: ThinkingStep[] = (lastResult?._thinkingSteps || []) as ThinkingStep[];
        const restoredReasoningChunks: Record<string, ReasoningChunk[]> = (lastResult?._reasoningChunks || {}) as Record<string, ReasoningChunk[]>;
        localStorage.setItem('currentConversationId', conversationId);
        set({
          // 不要回写 conversationId —— 用户可能已经切换到另一个对话
          messages: chatMessages,
          currentResult: lastGenerated ? lastResult as AgentResult : null,
          stages: restoredStages,
          currentStage: null,
          thinkingSteps: restoredThinkingSteps,
          reasoningChunks: restoredReasoningChunks,
        });
        _saveConvToStorage(get());
      }
    } catch (e) {
      console.error('loadConversationMessages failed:', e);
    }
  },

  createConversation: async (title?: string) => {
    try {
      const response = await chatApi.createConversation({ title });
      if (response.data.success && response.data.data) {
        const conv = response.data.data;
        localStorage.setItem('currentConversationId', conv.id);
        set((state) => ({
          conversationList: [conv, ...state.conversationList],
          conversationId: conv.id,
          messages: [],
        }));
        _saveConvToStorage(get());
        return conv.id;
      }
      return null;
    } catch (e) {
      console.error('createConversation failed:', e);
      return null;
    }
  },

  deleteConversation: async (conversationId: string) => {
    try {
      const response = await chatApi.deleteConversation(conversationId);
      if (response.data.success) {
        const state = get();
        const remaining = state.conversationList.filter((c) => c.id !== conversationId);
        const nextId = remaining[0]?.id ?? null;
        if (nextId) localStorage.setItem('currentConversationId', nextId);
        else localStorage.removeItem('currentConversationId');
        set({
          conversationList: remaining,
          conversationId: state.conversationId === conversationId ? nextId : state.conversationId,
          messages: state.conversationId === conversationId ? [] : state.messages,
        });
        _saveConvToStorage(get());
        if (state.conversationId === conversationId && nextId) {
          await get().loadConversationMessages(nextId);
        }
        return true;
      }
      return false;
    } catch (e) {
      console.error('deleteConversation failed:', e);
      return false;
    }
  },

  updateConversationTitle: async (conversationId: string, title: string) => {
    try {
      const response = await chatApi.updateConversation(conversationId, { title });
      if (response.data.success && response.data.data) {
        set((state) => ({
          conversationList: state.conversationList.map((c) =>
            c.id === conversationId ? { ...c, title } : c
          ),
        }));
        _saveConvToStorage(get());
        return true;
      }
      return false;
    } catch (e) {
      console.error('updateConversationTitle failed:', e);
      return false;
    }
  },

  switchConversation: async (conversationId: string | null) => {
    // 切换前必须停掉正在进行的 SSE 和 WebSocket，否则旧流会污染新对话
    const { _streamingProcessor, _abortController, _ws } = useAgentStore.getState();
    if (_streamingProcessor) _streamingProcessor.abort();
    if (_abortController) _abortController.abort();
    if (_ws) { _ws.close(); set({ _ws: null }); }
    set({
      _streamingProcessor: null,
      _abortController: null,
      wsConnectionState: 'disconnected',
    });

    if (!conversationId) {
      localStorage.removeItem('currentConversationId');
      set({
        conversationId: null, _inflightLoadId: null,
        messages: [], isRunning: false, currentResult: null, thinkingSteps: [],
        llmChunks: {}, reasoningChunks: {}, stages: [], currentStage: null,
        intentConflicts: [], streamEvents: [],
      });
      _saveConvToStorage(get());
      return;
    }
    localStorage.setItem('currentConversationId', conversationId);
    // 抢占式清空 + 标记 inflight，避免旧对话的加载请求污染新对话
    set({
      conversationId, _inflightLoadId: conversationId,
      messages: [], isRunning: false, currentResult: null, thinkingSteps: [],
      llmChunks: {}, reasoningChunks: {}, stages: [], currentStage: null,
      intentConflicts: [], streamEvents: [],
    });
    try {
      await get().loadConversationMessages(conversationId);
    } catch (e) {
      // 异常由 loadConversationMessages 内部 catch；这里只做兜底
      console.error('[switchConversation] load failed:', e);
    }
  },

  setWsConnectionState: (wsConnectionState) => set({ wsConnectionState }),

  connectWebSocket: (taskId: string) => {
    const { disconnectWebSocket } = get();
    disconnectWebSocket();

    set({ wsConnectionState: 'connecting', _ws: null });
    const ws = new WebSocket(agentApi.wsUrl(taskId));

    ws.onopen = () => {
      set({ wsConnectionState: 'connected', _ws: ws });
    };

    ws.onclose = () => {
      set({ wsConnectionState: 'disconnected', _ws: null });
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'progress') {
          const task = data.data as AsyncTask;
          useAgentStore.getState().setCurrentTask(task);
        } else if (data.type === 'thinking_step') {
          const step = data.data as ThinkingStep;
          set((s) => ({ thinkingSteps: [...s.thinkingSteps, step] }));
        } else if (data.type === 'result') {
          const result = data.data as AgentResult;
          useAgentStore.getState().setCurrentResult(result);
          const eventSteps = getResultThinkingSteps(result);
          if (eventSteps.length > 0) {
            set({ thinkingSteps: eventSteps });
          }
          const msgs = useAgentStore.getState().messages;
          const assistantMsg = msgs.find((m) => m.role === 'assistant' && m.status === 'running');
          if (assistantMsg) {
            useAgentStore.getState().updateMessage(assistantMsg.id, {
              status: 'completed',
              content: (result.output as any)?.full_text || (result.output as any)?.content || JSON.stringify(result.output, null, 2),
              result,
            });
          }
        } else if (data.type === 'error') {
          const msgs = useAgentStore.getState().messages;
          const assistantMsg = msgs.find((m) => m.role === 'assistant' && m.status === 'running');
          if (assistantMsg) {
            useAgentStore.getState().updateMessage(assistantMsg.id, {
              status: 'failed',
              content: data.message || '任务执行出错',
            });
          }
        }
      } catch {
        // ignore parse errors
      }
    };

    ws.onerror = () => {
      set({ wsConnectionState: 'disconnected' });
    };

    set({ _ws: ws });
    return ws;
  },

  disconnectWebSocket: () => {
    const { _ws, _reconnectTimer } = get();
    if (_reconnectTimer) {
      clearTimeout(_reconnectTimer);
    }
    if (_ws) {
      _ws.close();
      set({ _ws: null, _reconnectTimer: null, wsConnectionState: 'disconnected' });
    }
  },

  previewPlan: async (prompt: string) => {
    try {
      set({ isRunning: true, error: null, thinkingSteps: [], currentResult: null });
      const response = await agentApi.plan({ prompt });
      if (response.data.success && response.data.data) {
        const plan = response.data.data as unknown as ExecutionPlan;
        set({ currentPlan: plan, isRunning: false });
        return plan;
      }
      set({ isRunning: false, error: '生成计划失败' });
      return null;
    } catch (e) {
      set({ isRunning: false, error: String(e) });
      return null;
    }
  },

  runSync: async (prompt: string) => {
    try {
      set({ isRunning: true, error: null, currentResult: null });
      const { appliedSkill } = get();
      const response = await agentApi.run({
        prompt,
        skill_id: appliedSkill?.skill_id,
      });
      if (response.data.success && response.data.data) {
        const result = response.data.data as unknown as AgentResult;
        set({ currentResult: result, isRunning: false });
        return result;
      }
      set({ isRunning: false, error: 'Agent 执行失败' });
      return null;
    } catch (e) {
      set({ isRunning: false, error: String(e) });
      return null;
    }
  },

  runAsync: async (prompt: string, platform?: string | null) => {
    try {
      set({ isRunning: true, error: null, thinkingSteps: [] });
      const { appliedSkill } = get();
      const response = await agentApi.submitAsync({
        prompt,
        skill_id: appliedSkill?.skill_id,
        platform: platform || undefined,
      });
      if (response.data.success && response.data.data) {
        const taskId = response.data.data.task_id;
        set({ currentTaskId: taskId, isRunning: true });
        return taskId;
      }
      set({ isRunning: false, error: 'Failed to submit task' });
      return null;
    } catch (e) {
      set({ isRunning: false, error: String(e) });
      return null;
    }
  },

  /** Push to streamEvents with a cap — older events are dropped. */
  _pushStreamEvent: (events: StreamEvent[], event: StreamEvent): StreamEvent[] => {
    const arr = [...events, event];
    return arr.length > _MAX_STREAM_EVENTS ? arr.slice(-_MAX_STREAM_EVENTS) : arr;
  },

  runStreaming: async (prompt: string, platform?: string | null, parameters?: Record<string, unknown>, trigger?: Record<string, unknown>) => {
    // 防止重复调用
    if (get().isRunning) { get().stopStreaming(); }

    const token = useAuthStore.getState().accessToken;
    const state = get();

    // ── Prepare local state immediately (don't wait for DB) ──
    let conversationId: string | null = state.conversationId;
    // 使用 ref 对象持有 ID，避免在 messagePromise 内对外层 let 变量赋值后，
    // SSE processor.on 回调中的 updateMsg 看不到更新。
    const msgIdRef: { current: string } = { current: crypto.randomUUID() };
    const temporaryId = msgIdRef.current;  // may be replaced when DB returns

    // Add assistant placeholder locally for immediate UI feedback
    if (!state.messages.find(m => m.role === 'assistant' && m.status === 'running')) {
      get().addMessage({
        id: temporaryId, role: 'assistant', content: '', status: 'running',
        timestamp: Date.now(), kind: 'generation', renderMode: 'generation_card',
        renderPayload: null, generationMeta: null,
      });
    }

    // ── Start streaming state ──
    set({ isRunning: true, error: null, thinkingSteps: [], currentResult: null, llmChunks: {}, reasoningChunks: {}, stages: [], currentStage: null, intentConflicts: [], streamEvents: [], hasFirstEventReceived: false });
    // ── 立即添加"准备中"阶段，让 StageTimeline 提前出现 ──
    set({
      stages: [{
        agent: 'preparing',
        label: '🧠 准备中',
        icon: '🧠',
        status: 'running' as const,
        substeps: [],
      }],
      currentStage: 'preparing',
    });
    const controller = new AbortController();
    set({ _abortController: controller });

    // ── Create conversation messages in background (parallel with SSE) ──
    const messagePromise = (async (): Promise<string> => {
      let realAssistantId = temporaryId;
      try {
        if (!conversationId) {
          const resp = await chatApi.quickStart({
            role: 'user', content: '[内容生成]', status: 'completed',
          });
          if (resp.data.success && resp.data.data) {
            conversationId = resp.data.data.conversation_id;
            // Optimistic update: immediately prepend the new conversation so the
            // left sidebar reflects it without waiting for loadConversations.
            const optimisticConv: ChatConversationSummary = {
              id: conversationId,
              title: resp.data.data.message?.content?.slice(0, 30) + (resp.data.data.message?.content?.length > 30 ? '…' : '') || '新对话',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              message_count: 1,
            };
            set((s) => ({
              conversationId,
              conversationList: [optimisticConv, ...s.conversationList],
            }));
            _saveConvToStorage(get());
            const asstResp = await chatApi.addMessage(conversationId, {
              role: 'assistant', content: '', status: 'running',
            });
            if (asstResp?.data?.success && asstResp.data.data) {
              realAssistantId = asstResp.data.data.id;
            }
          }
        } else {
          const [, asstResp] = await Promise.all([
            chatApi.addMessage(conversationId, {
              role: 'user', content: '[内容生成]', status: 'completed',
            }),
            chatApi.addMessage(conversationId, {
              role: 'assistant', content: '', status: 'running',
            }),
          ]);
          if (asstResp?.data?.success && asstResp.data.data) {
            realAssistantId = asstResp.data.data.id;
          }
        }
      } catch (e) {
        console.error('message creation failed:', e);
      }
      // Swap temporary ID to real ID if they differ
      if (realAssistantId !== temporaryId) {
        // 通过 ref 对象更新 ID，updateMsg 在 processor.on 回调中读到的就是最新值
        msgIdRef.current = realAssistantId;
        set((s) => ({
          messages: s.messages.map(m =>
            m.id === temporaryId ? { ...m, id: realAssistantId } : m
          ),
        }));
      }
      return realAssistantId;
    })();

    const processor = new SSEProcessor();

    // ── Throttled update helpers ──
    const { _pushStreamEvent } = useAgentStore.getState();
    let lastStep: ThinkingStep | null = null;
    let errorOccurred = false;
    let accumulated = '';
    // 节流写 message.content：保留所有 chunk 内容，只控制 set() 频率
    // 旧实现 (50ms 间隔直接丢弃中间的 chunk) 会导致 SSE 高频推送时大段内容被跳过
    let msgUpdateTimer: ReturnType<typeof setTimeout> | null = null;
    let msgUpdatePending = false;
    const updateMsg = (content: string) => {
      // 有待写入 → 下一次 timer 触发时一定会带上最新的 content（accumulated 永远是最新累计值）
      if (msgUpdateTimer) {
        msgUpdatePending = true;
        return;
      }
      get().updateMessage(msgIdRef.current, { content });
      msgUpdateTimer = setTimeout(() => {
        msgUpdateTimer = null;
        if (msgUpdatePending) {
          msgUpdatePending = false;
          // 读最新的 accumulated（来自闭包）→ 重新触发一次写入
          get().updateMessage(msgIdRef.current, { content: accumulated });
        }
      }, _MSG_UPDATE_INTERVAL);
    };

    // ── Chunk batching (avoids per-chunk set()) ──
    let chunkBatchTimer: ReturnType<typeof setTimeout> | null = null;
    let pendingChunks: Array<{ agent: string; content: string }> = [];

    const flushChunks = () => {
      const batch = pendingChunks;
      pendingChunks = [];
      if (batch.length === 0) return;
      set((s) => {
        const newChunks = { ...s.llmChunks };
        for (const { agent, content } of batch) {
          const existing = newChunks[agent] || [];
          newChunks[agent] = [...existing, { agent, content, timestamp: Date.now() }];
        }
        const lastEvent = batch[batch.length - 1];
        return {
          llmChunks: newChunks,
          streamEvents: _pushStreamEvent(s.streamEvents, {
            id: `llm-${Date.now()}-${lastEvent.agent}`,
            type: 'llm_chunk',
            timestamp: Date.now(),
            data: { agent: lastEvent.agent, content: lastEvent.content },
            agent: lastEvent.agent,
            content: lastEvent.content,
          }),
        };
      });
    };

    // Register SSE handlers
    processor.on('plan', (event) => {
      set((s) => ({
        hasFirstEventReceived: true,
        currentPlan: event.data as unknown as ExecutionPlan,
        streamEvents: _pushStreamEvent(s.streamEvents, {
          id: `plan-${Date.now()}`,
          type: 'plan',
          timestamp: Date.now(),
          data: event.data,
        }),
      }));
    });

    processor.on('task_created', (event) => {
      set({ currentTaskId: event.data.task_id as string });
    });

    processor.on('thinking_step', (event) => {
      flushChunks();
      lastStep = event.data as unknown as ThinkingStep;
      set((s) => ({
        thinkingSteps: s.thinkingSteps.length >= 200
          ? [...s.thinkingSteps.slice(1), lastStep!]
          : [...s.thinkingSteps, lastStep!],
        // Push substep to matching stage
        stages: s.stages.map(st =>
          st.agent === (event.data.agent as string)
            ? { ...st, substeps: [...(st.substeps || []), event.data as any] }
            : st
        ),
        streamEvents: _pushStreamEvent(s.streamEvents, {
          id: `thinking-${Date.now()}-${(event.data.step_number as number) || 0}`,
          type: 'thinking_step',
          timestamp: Date.now(),
          data: event.data,
          agent: event.data.agent as string,
          action: event.data.action as string,
          reasoning: event.data.reasoning as string,
          status: event.data.status as string,
          output_summary: event.data.output_summary as string,
        }),
      }));
    });

    processor.on('progress', (event) => {
      set((s) => ({
        currentTask: {
          // Preserve any existing fields. If s.currentTask is null (e.g. after
          // stopStreaming cleared it), fall back to a minimal skeleton so we
          // still have a place to render the live progress.
          id: (event.data.task_id as string) || s.currentTask?.id || '',
          user_id: s.currentTask?.user_id || '',
          prompt: s.currentTask?.prompt || prompt,
          state: 'running',
          progress: (event.data.progress as number) || 0,
          progress_message: (event.data.progress_message as string) || '',
          current_step: (event.data.current_step as string) || '',
          completed_steps: (event.data.completed_steps as number) || 0,
          total_steps: (event.data.total_steps as number) || 0,
          created_at: s.currentTask?.created_at || new Date().toISOString(),
        } as AsyncTask,
        streamEvents: _pushStreamEvent(s.streamEvents, {
          id: `progress-${Date.now()}`,
          type: 'progress',
          timestamp: Date.now(),
          data: event.data,
        }),
      }));
    });

    processor.on('stage', (event) => {
      flushChunks();  // 确保 stage 更新前 pendingChunks 已经刷进 llmChunks
      const data = event.data as any;
      const agent = data.agent as string;
      const status = data.status as string;
      const reviewRound = data._review_round as number | undefined;

      // 用 agent + reviewRound 作为唯一键，区分多轮审核/润色
      const stageKey = `${agent}|${reviewRound || 0}`;

      set((state) => {
        if (status === 'started') {
          const existing = state.stages.find(s => `${s.agent}|${s.reviewRound || 0}` === stageKey);
          // 移除合成阶段"preparing"，替换为真实阶段
          const baseStages = state.stages.filter(s => s.agent !== 'preparing');
          if (!existing) {
            // label/icon 由后端 nodes.py stage_map 提供，前端不再映射
            return {
              stages: [...baseStages, {
                agent,
                label: (data.label as string) || '处理中',
                icon: (data.icon as string) || '⚙️',
                status: 'running' as const,
                substeps: [],
                conflicts: data.conflicts as IntentConflict[] | undefined,
                reviewRound,
              }],
              currentStage: agent,
              intentConflicts: (data.conflicts as IntentConflict[]) || state.intentConflicts,
            };
          }
          return {
            stages: state.stages.map(s =>
              `${s.agent}|${s.reviewRound || 0}` === stageKey ? { ...s, status: 'running' as const } : s
            ),
            currentStage: agent,
          };
        }

        if (status === 'completed') {
          return {
            stages: state.stages.map(s =>
              `${s.agent}|${s.reviewRound || 0}` === stageKey
                ? { ...s, status: 'completed' as const, duration: data.duration as number }
                : s
            ),
            currentStage: state.currentStage === agent ? null : state.currentStage,
          };
        }

        return state;
      });
    });

    processor.on('result', (event) => {
      flushChunks();
      const result = event.data as unknown as AgentResult;
      const timelineEvents = resultToTimelineEvents(result);
      // 后端 result.output.full_text 是纯正文，review_content / draft_content 为独立字段
      const fullText = (result.output as any)?.full_text || (result.output as any)?.content || accumulated;
      const backendReview = (result.output as any)?.review_content as string | undefined;
      const backendDraft = (result.output as any)?.draft_content as string | undefined;
      const eventSteps = getResultThinkingSteps(result);
      const currentState = useAgentStore.getState();
      const finalSteps = eventSteps.length > 0 ? eventSteps : currentState.thinkingSteps;
      const resultWithReview = backendReview
        ? { ...result, _reviewContent: backendReview }
        : result;
      // 本地保存含推理的 stages，供已完成消息的 StageTimeline 渲染
      const resultWithTracking = {
        ...resultWithReview,
        _stages: currentState.stages.map(s => ({ ...s })),
        _thinkingSteps: finalSteps,
        _reasoningChunks: currentState.reasoningChunks,
        _llmChunks: currentState.llmChunks,
        _draftContent: backendDraft,
      };
      get().updateMessage(msgIdRef.current, {
        status: 'completed', content: fullText, result: resultWithTracking,
      });
      set((s) => ({
        currentResult: resultWithReview,
        isRunning: false,
        currentTaskId: null,
        thinkingSteps: finalSteps,
        streamEvents: timelineEvents.length > 0 ? timelineEvents : s.streamEvents,
      }));
      if (conversationId) {
        chatApi.updateMessage(msgIdRef.current, {
          status: 'completed', content: fullText,
          result: {
            ...resultWithReview,
            _stages: currentState.stages.map(s => ({ ...s, reasoning: '' })),
            _thinkingSteps: finalSteps,
            _reasoningChunks: currentState.reasoningChunks,
            _llmChunks: currentState.llmChunks,
            _draftContent: backendDraft,
          } as unknown as Record<string, unknown>,
        }).catch(console.error);
      }

      // 自动保存内容到 contents 表已移至后端 merge_and_finish，详见 backend/src/agent/nodes.py
    });

    processor.on('error', (event) => {
      flushChunks();
      errorOccurred = true;
      get().updateMessage(msgIdRef.current, {
        status: 'failed',
        content: (event.data.message as string) || '执行出错',
      });
      set((s) => ({
        error: (event.data.message as string) || '执行出错',
        isRunning: false,
        currentTaskId: null,
        streamEvents: _pushStreamEvent(s.streamEvents, {
          id: `error-${Date.now()}`,
          type: 'error',
          timestamp: Date.now(),
          data: event.data,
          content: (event.data.message as string) || '执行出错',
          status: 'failed',
        }),
      }));
      if (conversationId) {
        chatApi.updateMessage(msgIdRef.current, {
          status: 'failed',
          content: (event.data.message as string) || '执行出错',
        }).catch(console.error);
      }
    });

    processor.on('reasoning', (event) => {
      const agent = (event.data as any).agent as string;
      const content = (event.data as any).content as string;
      const reviewRound = (event.data as any)._review_round || 0;
      const key = `${agent}|${reviewRound}`;
      set((s) => {
        const existing = s.reasoningChunks[key] || [];
        return {
          reasoningChunks: { ...s.reasoningChunks, [key]: [...existing, { agent, content, timestamp: Date.now() }] },
          // Also append reasoning to the corresponding stage
          stages: s.stages.map(st =>
            st.agent === agent ? { ...st, reasoning: (st.reasoning || '') + content } : st
          ),
          streamEvents: _pushStreamEvent(s.streamEvents, {
            id: `reasoning-${Date.now()}-${agent}`,
            type: 'reasoning',
            timestamp: Date.now(),
            data: event.data,
            agent,
            content,
          }),
        };
      });
    });

    processor.on('llm_chunk', (event) => {
      const data = event.data as any;
      const agent = data.agent as string;
      const content = data.content as string;
      // channel 由后端 nodes.py _CHANNEL_MAP 按 agent_type 映射，前端不再推测
      const channel = (data.channel as string) || 'body';
      const reviewRound = (data._review_round as number) || 0;

      // review → 审核/评审结论，不走正文 accumulated
      if (channel === 'review') {
        const key = `${agent}|${reviewRound}`;
        set((s) => {
          const existing = s.reasoningChunks[key] || [];
          return {
            reasoningChunks: { ...s.reasoningChunks, [key]: [...existing, { agent, content, timestamp: Date.now() }] },
            streamEvents: _pushStreamEvent(s.streamEvents, {
              id: `review-${Date.now()}-${key}`, type: 'reasoning', timestamp: Date.now(),
              data: event.data, agent, content,
            }),
          };
        });
        return;
      }

      // search / reasoning → 仅 stage 展示，不进正文
      if (channel === 'search' || channel === 'reasoning') {
        pendingChunks.push({ agent, content });
        if (!chunkBatchTimer) {
          chunkBatchTimer = setTimeout(() => {
            chunkBatchTimer = null;
            flushChunks();
          }, _CHUNK_UPDATE_INTERVAL);
        }
        return;
      }

      // body — 主正文（WritingAgent / FixAgent 等），累加到 accumulated
      accumulated += content;
      updateMsg(accumulated);
      pendingChunks.push({ agent, content });
      if (!chunkBatchTimer) {
        chunkBatchTimer = setTimeout(() => {
          chunkBatchTimer = null;
          flushChunks();
        }, _CHUNK_UPDATE_INTERVAL);
      }
    });

    processor.on('done', () => {
      flushChunks();
      // 如果 error 事件已标记过，不覆盖失败状态
      if (errorOccurred) return;
      // 仅当 result 事件未设置内容时才用 accumulated（防覆盖后端 fullText）
      const msg = get().messages.find(m => m.id === msgIdRef.current);
      const alreadySet = msg && msg.content && msg.content.length > 0 && get().currentResult;
      if (accumulated && !alreadySet) {
        get().updateMessage(msgIdRef.current, { content: accumulated });
      }
      set((s) => ({
        isRunning: false,
        currentTaskId: null,
        _abortController: null,
        _streamingProcessor: null,
        streamEvents: _pushStreamEvent(s.streamEvents, {
          id: `done-${Date.now()}`,
          type: 'done',
          timestamp: Date.now(),
          data: {},
        }),
      }));
    });

    // Connect SSE stream (immediately — parallel with message creation)
    const appliedSkill = useAgentStore.getState().appliedSkill;
    const bodyPayload: Record<string, unknown> = { prompt };
    if (appliedSkill?.skill_id) bodyPayload.skill_id = appliedSkill.skill_id;
    if (platform) bodyPayload.platform = platform;
    const resolvedParameters = { ...(parameters || {}) };
    if (Object.keys(resolvedParameters).length > 0) bodyPayload.parameters = resolvedParameters;
    if (trigger && typeof trigger === 'object') bodyPayload.trigger = trigger;
    set({ _streamingProcessor: processor });

    // Fire SSE and message creation in parallel
    const [connectError] = await Promise.all([
      (async (): Promise<string | null> => {
        let err: string | null = null;
        await processor.connect(agentApi.streamUrl(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(bodyPayload),
        }, {
          onError(errorMsg) {
            if (errorOccurred) return;
            err = errorMsg;
          },
        }, controller.signal);
        return err;
      })(),
      // Message creation runs in background, swaps msgIdRef.current when done
      messagePromise.then((realId) => { msgIdRef.current = realId; }),
    ]);

    if (connectError && !errorOccurred) {
      get().updateMessage(msgIdRef.current, {
        status: 'failed',
        content: connectError,
      });
      set({
        error: connectError,
        isRunning: false,
        currentTaskId: null,
        currentResult: null,  // ← 连接失败时侧边栏不残留旧结果
        _abortController: null,
        _streamingProcessor: null,
      });
    }
    set({ _abortController: null, _streamingProcessor: null });
  },

  loadTaskStatus: async (taskId: string) => {
    try {
      const response = await agentApi.getAsyncStatus(taskId);
      if (response.data.success && response.data.data) {
        const task = response.data.data as unknown as AsyncTask;
        set({
          currentTask: task,
          isRunning: task.state === 'running' || task.state === 'pending',
        });
        if (task.state === 'completed' && task.result) {
          set({ currentResult: task.result as unknown as AgentResult });
        }
      }
    } catch (e) {
      set({ error: String(e) });
    }
  },

  setCurrentResult: (result) => set({ currentResult: result }),
  setCurrentTask: (task) => set({ currentTask: task }),

  cancelTask: async (taskId: string) => {
    // Stop the SSE stream via AbortController
    const { _abortController, _streamingProcessor } = useAgentStore.getState();
    if (_abortController) {
      _abortController.abort();
    }
    if (_streamingProcessor) {
      _streamingProcessor.abort();
    }
    set({
      isRunning: false,
      currentTaskId: null,
      _abortController: null,
      _streamingProcessor: null,
    });
    if (!taskId) return true;
    try {
      const response = await agentApi.cancelTask(taskId);
      return response.data.success;
    } catch (e) {
      console.error('cancelTask failed:', e);
      return false;
    }
  },

  clearCurrent: () => {
    const s = useAgentStore.getState();
    if (s._abortController) s._abortController.abort();
    if (s._streamingProcessor) s._streamingProcessor.abort();
    set({
      currentTaskId: null,
      currentTask: null,
      currentResult: null,
      currentPlan: null,
      isRunning: false,
      error: null,
      thinkingSteps: [],
      llmChunks: {},
      reasoningChunks: {},
      stages: [],
      currentStage: null,
      intentConflicts: [],
      streamEvents: [],
      // 保留 conversationId，只清除当前界面的 messages
      messages: [],
      appliedSkill: null,
      appliedSkillFull: null,
      _abortController: null,
      _streamingProcessor: null,
    });
  },
}));
