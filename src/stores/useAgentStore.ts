/**
 * useAgentStore - Agent 执行状态管理
 * 
 * 职责：
 * - Agent 执行状态 (currentTask, currentResult, isRunning)
 * - SSE 流处理 (streamEvents, llmChunks, reasoningChunks)
 * - WebSocket 管理
 * - 预览功能
 * - 技能应用
 * 
 * 注意：对话管理已迁移到 useConversationStore
 */
import { create } from 'zustand';
import type {
  AsyncTask, AgentResult, ExecutionPlan, ChatMessage,
  ThinkingStep, StreamEvent, LLMChunk, ReasoningChunk,
  StageInfo, IntentConflict,
} from '../types';
import { getResultThinkingSteps } from '../utils/agentEvents';
import { resultToTimelineEvents } from '../utils/agentEventTimeline';
import { agentApi, chatApi } from '../services/api';
import { SSEProcessor } from '../services/sse-processor';
import { useAuthStore } from './useAuthStore';
import { useConversationStore } from './useConversationStore';

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

  // 流式事件列表（统一渲染源）
  streamEvents: StreamEvent[];

  // LLM token 流（打字机效果）
  llmChunks: Record<string, LLMChunk[]>;
  reasoningChunks: Record<string, ReasoningChunk[]>;

  // 动态阶段列表（用于 StageTimeline）
  stages: StageInfo[];
  currentStage: string | null;
  intentConflicts: IntentConflict[];

  // 流式事件是否已开始（第一个 SSE 事件到达后为 true）
  hasFirstEventReceived: boolean;

  // WebSocket 状态
  wsConnectionState: 'connecting' | 'connected' | 'disconnected';
  _ws: WebSocket | null;
  _reconnectTimer: ReturnType<typeof setTimeout> | null;

  // 流式处理器
  _streamingProcessor: SSEProcessor | null;
  _abortController: AbortController | null;

  // Applied Skill
  appliedSkill: import('../types').AppliedSkill | null;
  appliedSkillFull: import('../types').Skill | null;
  setAppliedSkill: (applied: import('../types').AppliedSkill | null, full: import('../types').Skill | null) => void;

  // 右侧预览
  previewContent: string | null;
  setPreviewContent: (content: string | null) => void;
  previewPlatform: string | null;
  setPreviewPlatform: (platform: string | null) => void;
  previewContentType: string | null;
  setPreviewContentType: (contentType: string | null) => void;

  // Stream events
  addStreamEvent: (event: StreamEvent) => void;

  // Actions
  previewPlan: (prompt: string) => Promise<ExecutionPlan | null>;
  runSync: (prompt: string) => Promise<AgentResult | null>;
  runAsync: (prompt: string, platform?: string | null) => Promise<string | null>;
  runStreaming: (prompt: string, platform?: string | null, parameters?: Record<string, unknown>, trigger?: Record<string, unknown>) => Promise<void>;
  loadTaskStatus: (taskId: string) => Promise<void>;
  setCurrentResult: (result: AgentResult | null) => void;
  setCurrentTask: (task: AsyncTask | null) => void;
  cancelTask: (taskId: string) => Promise<boolean>;
  stopStreaming: () => void;
  clearCurrent: () => void;
  /**
   * 重置整个 store 到初始状态
   * 用于：用户切换账号、logout、严重错误恢复
   * 注意：会清空所有对话、任务、流式状态、localStorage 缓存
   */
  reset: () => void;

  // WebSocket 管理
  connectWebSocket: (taskId: string) => WebSocket | null;
  disconnectWebSocket: () => void;
  setWsConnectionState: (state: 'connecting' | 'connected' | 'disconnected') => void;
}

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
  _streamingProcessor: null,
  _abortController: null,
  appliedSkill: null,
  appliedSkillFull: null,
  previewContent: null,
  previewPlatform: null,
  previewContentType: null,

  setAppliedSkill: (applied, full) => set({ appliedSkill: applied, appliedSkillFull: full }),
  setPreviewContent: (content) => set({ previewContent: content }),
  setPreviewPlatform: (platform) => set({ previewPlatform: platform }),
  setPreviewContentType: (contentType) => set({ previewContentType: contentType }),

  addStreamEvent: (event) => set((state) => ({ streamEvents: [...state.streamEvents, event] })),

  stopStreaming: () => {
    const { _streamingProcessor, _abortController, stages, thinkingSteps, reasoningChunks } = useAgentStore.getState();
    if (_streamingProcessor) {
      _streamingProcessor.abort();
    }
    if (_abortController) {
      _abortController.abort();
    }
    set({
      isRunning: false,
      currentTaskId: null,
      currentResult: null,
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

  // WebSocket 管理
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
          const conversationStore = useConversationStore.getState();
          const msgs = conversationStore.messages;
          const assistantMsg = msgs.find((m) => m.role === 'assistant' && m.status === 'running');
          if (assistantMsg) {
            conversationStore.updateMessage(assistantMsg.id, {
              status: 'completed',
              content: (result.output as any)?.full_text || (result.output as any)?.content || JSON.stringify(result.output, null, 2),
              result,
            });
          }
        } else if (data.type === 'error') {
          const conversationStore = useConversationStore.getState();
          const msgs = conversationStore.messages;
          const assistantMsg = msgs.find((m) => m.role === 'assistant' && m.status === 'running');
          if (assistantMsg) {
            conversationStore.updateMessage(assistantMsg.id, {
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

  /** Push to streamEvents with a cap */
  _pushStreamEvent: (events: StreamEvent[], event: StreamEvent): StreamEvent[] => {
    const arr = [...events, event];
    return arr.length > _MAX_STREAM_EVENTS ? arr.slice(-_MAX_STREAM_EVENTS) : arr;
  },

  runStreaming: async (prompt: string, platform?: string | null, parameters?: Record<string, unknown>, trigger?: Record<string, unknown>) => {
    // 防止重复调用
    if (get().isRunning) { get().stopStreaming(); }

    // 修复 BUG-17：stopStreaming() 触发的 ondone/onerror handler 可能在事件循环
    // 中还在排队，await 一帧让事件循环先处理完这些 handler，避免前一次的
    // msgIdRef.current 被错误地用于本次消息。
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    const token = useAuthStore.getState().accessToken;
    const conversationStore = useConversationStore.getState();

    // 获取当前对话 ID
    let conversationId: string | null = conversationStore.conversationId;
    const msgIdRef: { current: string } = { current: crypto.randomUUID() };
    const temporaryId = msgIdRef.current;

    // 添加 assistant placeholder
    if (!conversationStore.messages.find(m => m.role === 'assistant' && m.status === 'running')) {
      conversationStore.addMessage({
        id: temporaryId, role: 'assistant', content: '', status: 'running',
        timestamp: Date.now(), kind: 'generation', renderMode: 'generation_card',
        renderPayload: null, generationMeta: null,
      });
    }

    // Start streaming state
    set({
      isRunning: true, error: null, thinkingSteps: [], currentResult: null,
      llmChunks: {}, reasoningChunks: {}, stages: [], currentStage: null,
      intentConflicts: [], streamEvents: [], hasFirstEventReceived: false
    });
    
    // 初始阶段
    set({
      stages: [{
        agent: 'preparing',
        label: '🧠 思考分析中',
        icon: '🧠',
        status: 'running' as const,
        substeps: [],
      }],
      currentStage: 'preparing',
    });
    
    const controller = new AbortController();
    set({ _abortController: controller });

    // Create conversation messages in background
    const messagePromise = (async (): Promise<string> => {
      let realAssistantId = temporaryId;
      try {
        if (!conversationId) {
          const resp = await chatApi.quickStart({
            role: 'user', content: '[内容生成]', status: 'completed',
          });
          if (resp.data.success && resp.data.data) {
            conversationId = resp.data.data.conversation_id;
            // 更新 conversationStore
            conversationStore.switchConversation(conversationId);
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
      if (realAssistantId !== temporaryId) {
        msgIdRef.current = realAssistantId;
        conversationStore.updateMessage(temporaryId, { id: realAssistantId });
      }
      return realAssistantId;
    })();

    const processor = new SSEProcessor();

    // Throttled update helpers
    let lastStep: ThinkingStep | null = null;
    let errorOccurred = false;
    let accumulated = '';
    let msgUpdateTimer: ReturnType<typeof setTimeout> | null = null;
    let msgUpdatePending = false;
    const updateMsg = (content: string) => {
      if (msgUpdateTimer) {
        msgUpdatePending = true;
        return;
      }
      conversationStore.updateMessage(msgIdRef.current, { content });
      msgUpdateTimer = setTimeout(() => {
        msgUpdateTimer = null;
        if (msgUpdatePending) {
          msgUpdatePending = false;
          conversationStore.updateMessage(msgIdRef.current, { content: accumulated });
        }
      }, _MSG_UPDATE_INTERVAL);
    };

    // Chunk batching
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
          streamEvents: get()._pushStreamEvent(s.streamEvents, {
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
        streamEvents: get()._pushStreamEvent(s.streamEvents, {
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
        stages: s.stages.map(st =>
          st.agent === (event.data.agent as string)
            ? { ...st, substeps: [...(st.substeps || []), event.data as any] }
            : st
        ),
        streamEvents: get()._pushStreamEvent(s.streamEvents, {
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
        streamEvents: get()._pushStreamEvent(s.streamEvents, {
          id: `progress-${Date.now()}`,
          type: 'progress',
          timestamp: Date.now(),
          data: event.data,
        }),
      }));
    });

    processor.on('stage', (event) => {
      flushChunks();
      const data = event.data as any;
      const agent = data.agent as string;
      const status = data.status as string;
      const reviewRound = data._review_round as number | undefined;
      const stageKey = `${agent}|${reviewRound || 0}`;

      set((state) => {
        if (status === 'started') {
          const existing = state.stages.find(s => `${s.agent}|${s.reviewRound || 0}` === stageKey);
          const baseStages = state.stages.filter(s => s.agent !== 'preparing');
          if (!existing) {
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

    processor.on('result', async (event) => {
      flushChunks();
      const result = event.data as unknown as AgentResult;
      const timelineEvents = resultToTimelineEvents(result);
      const fullText = (result.output as any)?.full_text || (result.output as any)?.content || accumulated;
      const backendReview = (result.output as any)?.review_content as string | undefined;
      const backendDraft = (result.output as any)?.draft_content as string | undefined;
      const eventSteps = getResultThinkingSteps(result);
      const currentState = useAgentStore.getState();
      const finalSteps = eventSteps.length > 0 ? eventSteps : currentState.thinkingSteps;
      const resultWithReview = backendReview ? { ...result, _reviewContent: backendReview } : result;
      const resultWithTracking = {
        ...resultWithReview,
        _stages: currentState.stages.map(s => ({ ...s })),
        _thinkingSteps: finalSteps,
        _reasoningChunks: currentState.reasoningChunks,
        _llmChunks: currentState.llmChunks,
        _draftContent: backendDraft,
      };
      conversationStore.updateMessage(msgIdRef.current, {
        status: 'completed', content: fullText, result: resultWithTracking,
      });
      // 修复 BUG-13：成功完成后清除 error，避免上次失败的错误信息残留
      set((s) => ({
        currentResult: resultWithReview,
        isRunning: false,
        currentTaskId: null,
        thinkingSteps: finalSteps,
        error: null,
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
    });

    processor.on('error', (event) => {
      flushChunks();
      errorOccurred = true;
      conversationStore.updateMessage(msgIdRef.current, {
        status: 'failed',
        content: (event.data.message as string) || '执行出错',
      });
      set((s) => ({
        error: (event.data.message as string) || '执行出错',
        isRunning: false,
        currentTaskId: null,
        streamEvents: get()._pushStreamEvent(s.streamEvents, {
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
          stages: s.stages.map(st =>
            st.agent === agent ? { ...st, reasoning: (st.reasoning || '') + content } : st
          ),
          streamEvents: get()._pushStreamEvent(s.streamEvents, {
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
      const channel = (data.channel as string) || 'body';
      const reviewRound = (data._review_round as number) || 0;

      if (channel === 'review') {
        const key = `${agent}|${reviewRound}`;
        set((s) => {
          const existing = s.reasoningChunks[key] || [];
          return {
            reasoningChunks: { ...s.reasoningChunks, [key]: [...existing, { agent, content, timestamp: Date.now() }] },
            streamEvents: get()._pushStreamEvent(s.streamEvents, {
              id: `review-${Date.now()}-${key}`, type: 'reasoning', timestamp: Date.now(),
              data: event.data, agent, content,
            }),
          };
        });
        return;
      }

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

      // body
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
      if (errorOccurred) return;
      const conversationStore = useConversationStore.getState();
      const msg = conversationStore.messages.find(m => m.id === msgIdRef.current);
      const alreadySet = msg && msg.content && msg.content.length > 0 && get().currentResult;
      if (accumulated && !alreadySet) {
        conversationStore.updateMessage(msgIdRef.current, { content: accumulated });
      }
      set((s) => ({
        isRunning: false,
        currentTaskId: null,
        _abortController: null,
        _streamingProcessor: null,
        streamEvents: get()._pushStreamEvent(s.streamEvents, {
          id: `done-${Date.now()}`,
          type: 'done',
          timestamp: Date.now(),
          data: {},
        }),
      }));
    });

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
      messagePromise.then((realId) => { msgIdRef.current = realId; }),
    ]);

    if (connectError && !errorOccurred) {
      conversationStore.updateMessage(msgIdRef.current, {
        status: 'failed',
        content: connectError,
      });
      set({
        error: connectError,
        isRunning: false,
        currentTaskId: null,
        currentResult: null,
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
      _abortController: null,
      _streamingProcessor: null,
    });
  },

  reset: () => {
    const s = useAgentStore.getState();
    // 1. 关闭所有活动连接
    if (s._abortController) s._abortController.abort();
    if (s._streamingProcessor) s._streamingProcessor.abort();
    if (typeof s.disconnectWebSocket === 'function') {
      s.disconnectWebSocket();
    }
    if (s._reconnectTimer) {
      clearTimeout(s._reconnectTimer);
    }

    // 2. 修复 BUG-12：清空所有属于本 store 的状态。
    // 注意：对话管理（messages / conversationId / conversationList 等）已迁移到
    // useConversationStore，本 store 类型里也没声明这些字段。如果把它们写进
    // set()，在 zustand 默认的浅合并下会被静默丢弃，造成"看上去清了实际没清"的隐患。
    // 这里只重置本 store 实际持有的字段。
    set({
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
      _abortController: null,
      _streamingProcessor: null,
      // 预览相关：本 store 持有 previewContent/previewPlatform/previewContentType
      // 用户切换账号时也应清空，避免上一个用户的内容泄露
      previewContent: null,
      previewPlatform: null,
      previewContentType: null,
      // 技能选择：跨账号不应该保留（不同用户的技能库可能不同）
      appliedSkill: null,
      appliedSkillFull: null,
    });

    // 3. 清 localStorage
    try {
      localStorage.removeItem('autopublish-conversations');
    } catch {}
  },

  // 辅助方法：获取 _pushStreamEvent
  _pushStreamEvent: (events: StreamEvent[], event: StreamEvent): StreamEvent[] => {
    const arr = [...events, event];
    return arr.length > _MAX_STREAM_EVENTS ? arr.slice(-_MAX_STREAM_EVENTS) : arr;
  },
}));
