import { create } from 'zustand';
import type {
  AsyncTask, AgentResult, ExecutionPlan, ChatMessage,
  ThinkingStep, StreamEvent, LLMChunk, ReasoningChunk,
  PreviousGeneration, StageInfo, IntentConflict,
} from '../types';
import { AGENT_STAGE_MAP } from '../types';
import { getResultThinkingSteps } from '../utils/agentEvents';
import { resultToTimelineEvents } from '../utils/agentEventTimeline';
import { agentApi, chatApi, contentsApi, type ChatConversationSummary } from '../services/api';
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

  // WebSocket 状态
  wsConnectionState: 'connecting' | 'connected' | 'disconnected';
  _ws: WebSocket | null;
  _reconnectTimer: ReturnType<typeof setTimeout> | null;

  // 任务历史
  taskHistory: AsyncTask[];

  // 历史生成记录（多次执行的结果存档）
  previousGenerations: PreviousGeneration[];

  // 消息列表（Chat 式界面）
  messages: ChatMessage[];
  addMessage: (msg: ChatMessage) => void;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  clearMessages: () => void;
  clearHistory: () => void;

  // === 对话持久化 ===
  conversationId: string | null;
  conversationList: ChatConversationSummary[];
  loadConversations: (opts?: { showErrorToast?: (msg: string) => void }) => Promise<void>;
  loadConversationMessages: (conversationId: string) => Promise<void>;
  createConversation: (title?: string) => Promise<string | null>;
  deleteConversation: (conversationId: string) => Promise<boolean>;
  updateConversationTitle: (conversationId: string, title: string) => Promise<boolean>;
  switchConversation: (conversationId: string | null) => Promise<void>;

  // Actions
  previewPlan: (prompt: string) => Promise<ExecutionPlan | null>;
  runSync: (prompt: string) => Promise<AgentResult | null>;
  runAsync: (prompt: string, platform?: string | null) => Promise<string | null>;
  runStreaming: (prompt: string, platform?: string | null) => Promise<void>;
  loadTaskStatus: (taskId: string) => Promise<void>;
  loadTaskHistory: () => Promise<void>;
  setCurrentResult: (result: AgentResult | null) => void;
  setCurrentTask: (task: AsyncTask | null) => void;
  cancelTask: (taskId: string) => Promise<boolean>;
  _abortController: AbortController | null;
  clearCurrent: () => void;

  // Content type config (deprecated — kept for store shape compatibility)
  contentTypeConfig: any;
  setContentTypeConfig: (config: any) => void;

  // Applied Skill
  appliedSkill: import('../types').AppliedSkill | null;
  appliedSkillFull: import('../types').Skill | null;
  setAppliedSkill: (applied: import('../types').AppliedSkill | null, full: import('../types').Skill | null) => void;

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

/**
 * 从生成内容中智能提取标题：
 * 1. 跳过 Separator 行（---, ===, ___）
 * 2. 跳过 Agent 标记行（--- WritingAgent --- 等）
 * 3. 取第一个 # 标题行或第一个有效句子
 */
function extractTitleFromContent(content: string): string {
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // 跳过分隔线
    if (/^[-=_*]{3,}$/.test(trimmed)) continue;
    // 跳过 Agent 标记行（--- NameAgent ---）
    if (/^---\s+\w+Agent\s+---$/i.test(trimmed)) continue;
    // 取 # 标题行
    const headingMatch = trimmed.match(/^#+\s+(.+)/);
    if (headingMatch) return headingMatch[1].slice(0, 80);
    // 取第一个有效句子（至少 4 个字符，不是纯标点）
    if (/^[一-鿿\w]{4,}/.test(trimmed)) return trimmed.slice(0, 80);
  }
  return '';
}

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
  wsConnectionState: 'disconnected',
  _ws: null,
  _reconnectTimer: null,
  taskHistory: [],
  _abortController: null,
  previousGenerations: [],
  messages: [],
  contentTypeConfig: null,
  appliedSkill: null,
  appliedSkillFull: null,
  conversationId: _initFromStorage.conversationId,
  conversationList: _initFromStorage.conversationList,
  _streamingProcessor: null,

  setAppliedSkill: (applied, full) => set({ appliedSkill: applied, appliedSkillFull: full }),
  setContentTypeConfig: (config) => set({ contentTypeConfig: config }),

  addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),
  updateMessage: (id, updates) => set((state) => ({
    messages: state.messages.map((m) => (m.id === id ? { ...m, ...updates } : m)),
  })),
  clearMessages: () => set({ messages: [] }),
  clearHistory: () => set({ previousGenerations: [] }),
  addStreamEvent: (event) => set((state) => ({ streamEvents: [...state.streamEvents, event] })),

  stopStreaming: () => {
    const { _streamingProcessor, _abortController, messages } = useAgentStore.getState();
    if (_streamingProcessor) {
      _streamingProcessor.abort();
    }
    if (_abortController) {
      _abortController.abort();
    }
    // 将 running 中的 assistant 消息标记为 failed（用户可见停止状态）
    const runningMsg = messages.find(m => m.role === 'assistant' && m.status === 'running');
    if (runningMsg) {
      get().updateMessage(runningMsg.id, { status: 'failed' });
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
  loadConversations: async (opts?: { showErrorToast?: (msg: string) => void }) => {
    const savedId = localStorage.getItem('currentConversationId');
    console.log('[loadConversations] start, savedId from localStorage:', savedId);
    try {
      const response = await chatApi.listConversations({ limit: 50 });
      console.log('[loadConversations] response:', response.data);
      if (response.data.success && response.data.data) {
        const serverConversations = response.data.data.conversations;
        // 合并服务端列表与本地状态，避免条件竞争导致新创建的对话被覆盖
        set((state) => {
          const serverIds = new Set(serverConversations.map(c => c.id));
          const localOnly = state.conversationList.filter(c => !serverIds.has(c.id));
          const merged = localOnly.length > 0
            ? [...localOnly, ...serverConversations]
            : serverConversations;

          // 从合并后的列表中找当前对话ID
          const validId = savedId && merged.some((c) => c.id === savedId)
            ? savedId
            : (merged[0]?.id ?? null);

          console.log('[loadConversations] merged count:', merged.length, 'validId:', validId);
          if (validId !== savedId) {
            if (validId) localStorage.setItem('currentConversationId', validId);
            else localStorage.removeItem('currentConversationId');
          }
          return { conversationList: merged, conversationId: validId };
        });
        _saveConvToStorage(get());
        const currentId = get().conversationId;
        if (currentId) {
          console.log('[loadConversations] loading messages for:', currentId);
          await get().loadConversationMessages(currentId);
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
      if (response.data.success && response.data.data) {
        const { messages } = response.data.data;
        const chatMessages: ChatMessage[] = messages.map((m) => ({
          id: m.id,
          role: m.role as 'user' | 'assistant' | 'system',
          content: m.content,
          timestamp: new Date(m.created_at).getTime(),
          status: m.status as ChatMessage['status'],
          result: m.result as AgentResult | undefined,
          taskId: m.task_id,
          plan: m.plan as ExecutionPlan | undefined,
        }));
        // 从最后一条 assistant 消息中恢复 stages、thinkingSteps、reasoningChunks
        const lastAsst = [...messages].reverse().find(m => m.role === 'assistant');
        const restoredStages: StageInfo[] = (lastAsst?.result as any)?._stages || [];
        const restoredThinkingSteps: ThinkingStep[] = (lastAsst?.result as any)?._thinkingSteps || [];
        const restoredReasoningChunks: Record<string, ReasoningChunk[]> = (lastAsst?.result as any)?._reasoningChunks || {};
        // 把 reasoning 内容写回每个 stage，以便 StageTimeline 能展示
        for (const st of restoredStages) {
          const chunk = restoredReasoningChunks[st.agent]?.[0];
          if (chunk && !st.reasoning) {
            st.reasoning = chunk.content;
          }
        }
        localStorage.setItem('currentConversationId', conversationId);
        set({
          conversationId,
          messages: chatMessages,
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
      set({ conversationId: null, messages: [], isRunning: false, currentResult: null, thinkingSteps: [], llmChunks: {}, reasoningChunks: {}, stages: [], currentStage: null, intentConflicts: [], streamEvents: [] });
      _saveConvToStorage(get());
      return;
    }
    localStorage.setItem('currentConversationId', conversationId);
    set({ conversationId, messages: [], isRunning: false, currentResult: null, thinkingSteps: [], llmChunks: {}, reasoningChunks: {}, stages: [], currentStage: null, intentConflicts: [], streamEvents: [] });
    await get().loadConversationMessages(conversationId);
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
          useAgentStore.getState().loadTaskHistory();
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

  runStreaming: async (prompt: string, platform?: string | null, parameters?: Record<string, unknown>) => {
    // 防止重复调用
    if (get().isRunning) return;

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
        timestamp: Date.now(),
      });
    }

    // Archive previous generation
    const prevState = get();
    if (prevState.thinkingSteps.length > 0 || prevState.currentResult) {
      set((s) => ({
        previousGenerations: [...s.previousGenerations, {
          id: crypto.randomUUID(), prompt,
          result: prevState.currentResult,
          events: [], timestamp: Date.now(),
          plan: prevState.currentPlan || undefined,
        }],
      }));
    }

    // ── Start streaming state ──
    set({ isRunning: true, error: null, thinkingSteps: [], currentResult: null, llmChunks: {}, reasoningChunks: {}, stages: [], currentStage: null, intentConflicts: [], streamEvents: [] });
    const controller = new AbortController();
    set({ _abortController: controller });

    // ── Create conversation messages in background (parallel with SSE) ──
    const messagePromise = (async (): Promise<string> => {
      let realAssistantId = temporaryId;
      try {
        if (!conversationId) {
          const resp = await chatApi.quickStart({
            role: 'user', content: prompt, status: 'completed',
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
            const [asstResp] = await Promise.all([
              chatApi.addMessage(conversationId, {
                role: 'assistant', content: '', status: 'running',
              }),
              get().loadConversations().catch(() => {}),
            ]);
            if (asstResp?.data?.success && asstResp.data.data) {
              realAssistantId = asstResp.data.data.id;
            }
          }
        } else {
          const [userResp, asstResp] = await Promise.all([
            chatApi.addMessage(conversationId, {
              role: 'user', content: prompt, status: 'completed',
            }),
            chatApi.addMessage(conversationId, {
              role: 'assistant', content: '', status: 'running',
            }),
          ]);
          if (asstResp?.data?.success && asstResp.data.data) {
            realAssistantId = asstResp.data.data.id;
          }
          get().loadConversations().catch(() => {});
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
    let reviewContent = '';
    let lastMsgUpdate = 0;

    // Agent 名称中如果包含这些关键词，其输出不进入主正文
    const REVIEW_AGENT_PATTERNS = [/Review/i, /Judge/i, /Critic/i, /Analyze/i, /审核/i, /检查/i];

    const isReviewAgent = (name: string): boolean =>
      REVIEW_AGENT_PATTERNS.some(p => p.test(name));

    const updateMsg = (content: string) => {
      const now = Date.now();
      if (now - lastMsgUpdate >= _MSG_UPDATE_INTERVAL) {
        lastMsgUpdate = now;
        get().updateMessage(msgIdRef.current, { content });
      }
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
          ...(s.currentTask || {}),
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
      const data = event.data as any;
      const agent = data.agent as string;
      const status = data.status as string;
      const reviewRound = data._review_round as number | undefined;

      // 用 agent + reviewRound 作为唯一键，区分多轮审核/润色
      const stageKey = `${agent}|${reviewRound || 0}`;

      set((state) => {
        if (status === 'started') {
          const existing = state.stages.find(s => `${s.agent}|${s.reviewRound || 0}` === stageKey);
          if (!existing) {
            const mapEntry = AGENT_STAGE_MAP[agent] || { label: '处理中', icon: '⚙️' };
            return {
              stages: [...state.stages, {
                agent,
                label: mapEntry.label,
                icon: mapEntry.icon,
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
      // 后端 result.output.full_text 已是纯正文，review_content 独立字段
      const fullText = (result.output as any)?.full_text || (result.output as any)?.content || accumulated;
      // 优先使用后端的 review_content，其次用前端流式收集的 reviewContent
      const backendReview = (result.output as any)?.review_content as string | undefined;
      const finalReview = backendReview || reviewContent;
      const eventSteps = getResultThinkingSteps(result);
      // 优先使用前端实时积累的 thinkingSteps，其次才用后端结果中解析出的 steps
      const currentState = useAgentStore.getState();
      const finalSteps = eventSteps.length > 0 ? eventSteps : currentState.thinkingSteps;
      // 从 stages 中提取 reasoning 内容，重建 reasoningChunks 供后续恢复使用
      const finalReasoningChunks: Record<string, { agent: string; content: string; timestamp: number }[]> = {};
      for (const st of currentState.stages) {
        if (st.reasoning) {
          finalReasoningChunks[st.agent] = [{
            agent: st.agent,
            content: st.reasoning,
            timestamp: Date.now(),
          }];
        }
      }
      const resultWithReview = finalReview
        ? { ...result, _reviewContent: finalReview }
        : result;
      get().updateMessage(msgIdRef.current, {
        status: 'completed', content: fullText, result: resultWithReview,
      });
      set((s) => ({
        currentResult: resultWithReview,
        isRunning: false,
        currentTaskId: null,
        thinkingSteps: finalSteps,
        streamEvents: timelineEvents.length > 0 ? timelineEvents : s.streamEvents,
      }));
      get().loadTaskHistory();
      if (conversationId) {
        chatApi.updateMessage(msgIdRef.current, {
          status: 'completed', content: fullText,
          result: {
            ...resultWithReview,
            _stages: currentState.stages.map(s => ({ ...s, reasoning: '' })),
            _thinkingSteps: finalSteps,
            _reasoningChunks: finalReasoningChunks,
          } as unknown as Record<string, unknown>,
        }).catch(console.error);
      }

      // ── 自动保存到内容管理（不阻塞 UI） ──
      if (fullText) {
        // 清理内容：移除 Agent 标记行（--- WritingAgent ---）和 Separator 行
        const cleanMd = fullText.split('\n').filter((line: string) => {
          const t = line.trim();
          return !/^---\s+\w+Agent\s+---$/i.test(t) && !/^[-=_*]{3,}$/.test(t);
        }).join('\n').trim();
        // 智能提取标题
        const title = (result.output as any)?.title
          || extractTitleFromContent(cleanMd)
          || '生成内容';
        contentsApi.create({
          title,
          content_md: cleanMd,
          platform_code: platform || 'xiaohongshu',
        }).catch((err: unknown) => {
          console.error('auto-save content failed:', err);
        });
      }
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
      set((s) => {
        const existing = s.reasoningChunks[agent] || [];
        return {
          reasoningChunks: { ...s.reasoningChunks, [agent]: [...existing, { agent, content, timestamp: Date.now() }] },
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
      const agent = (event.data as any).agent as string;
      const content = (event.data as any).content as string;

      // 审核/分析类 agent 的输出不进入主正文，单独收集用于审核展示
      if (agent && isReviewAgent(agent)) {
        reviewContent += content;
        set((s) => {
          const existing = s.reasoningChunks[agent] || [];
          return {
            reasoningChunks: { ...s.reasoningChunks, [agent]: [...existing, { agent, content, timestamp: Date.now() }] },
            streamEvents: _pushStreamEvent(s.streamEvents, {
              id: `review-${Date.now()}-${agent}`, type: 'reasoning', timestamp: Date.now(),
              data: event.data, agent, content,
            }),
          };
        });
        return;
      }

      // 中间 Agent（WebSearch、HotTopicAgent 等）→ 仅 stage 展示，不进正文
      const _MAIN_CONTENT_AGENTS = ['WritingAgent', 'FixAgent'];
      if (!_MAIN_CONTENT_AGENTS.includes(agent)) {
        pendingChunks.push({ agent, content });
        if (!chunkBatchTimer) {
          chunkBatchTimer = setTimeout(() => {
            chunkBatchTimer = null;
            flushChunks();
          }, _CHUNK_UPDATE_INTERVAL);
        }
        return;
      }

      // FixAgent 开始生成时清空 accumulated，只保留最新修复版本
      if (agent === 'FixAgent' && accumulated) {
        accumulated = '';
        updateMsg(accumulated);
      }

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
    if (parameters) bodyPayload.parameters = parameters;
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

  loadTaskHistory: async () => {
    try {
      const response = await agentApi.listAsyncTasks(20);
      if (response.data.success && response.data.data) {
        const data = response.data.data as { tasks: AsyncTask[]; total: number };
        set({ taskHistory: data.tasks });
      }
    } catch (e) {
      console.error('loadTaskHistory failed:', e);
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
    // Archive current generation before clearing
    if (s.thinkingSteps.length > 0 || s.currentResult) {
      const gen: PreviousGeneration = {
        id: crypto.randomUUID(),
        prompt: s.messages.find(m => m.role === 'user')?.content || '',
        result: s.currentResult,
        events: s.streamEvents || [],
        timestamp: Date.now(),
        plan: s.currentPlan || undefined,
        stages: s.stages.length > 0 ? [...s.stages] : undefined,
      };
      set((state) => ({ previousGenerations: [...state.previousGenerations, gen] }));
    }
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
      contentTypeConfig: null,
      appliedSkill: null,
      appliedSkillFull: null,
      _abortController: null,
      _streamingProcessor: null,
    });
  },
}));