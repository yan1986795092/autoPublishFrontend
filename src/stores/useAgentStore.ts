import { create } from 'zustand';
import type { AsyncTask, AgentResult, ExecutionPlan, PendingDecision, DecisionSubmitRequest, ChatMessage, ThinkingStep, StreamEvent, LLMChunk, ReasoningChunk, PreviousGeneration, RecoveryState } from '../types';
import { agentApi } from '../services/api';
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

  // 决策
  pendingDecision: PendingDecision | null;

  // Thinking trace（实时步骤）
  thinkingSteps: ThinkingStep[];

  // === 新增: 流式事件列表（统一渲染源） ===
  streamEvents: StreamEvent[];

  // === 新增: LLM token 流（打字机效果） ===
  llmChunks: Record<string, LLMChunk[]>;  // agent -> chunks[]
  reasoningChunks: Record<string, ReasoningChunk[]>;  // agent -> reasoning[]

  // WebSocket 状态
  wsConnectionState: 'connecting' | 'connected' | 'disconnected';
  _ws: WebSocket | null;
  _reconnectTimer: ReturnType<typeof setTimeout> | null;

  // 任务历史
  taskHistory: AsyncTask[];

  // 历史生成记录（多次执行的结果存档）
  previousGenerations: PreviousGeneration[];

  // 错误恢复状态
  recoveryState: RecoveryState | null;
  retryStep: () => Promise<void>;
  skipStep: () => Promise<void>;

  // 消息列表（Chat 式界面）
  messages: ChatMessage[];
  addMessage: (msg: ChatMessage) => void;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  clearMessages: () => void;
  clearHistory: () => void;

  // Actions
  previewPlan: (prompt: string) => Promise<ExecutionPlan | null>;
  runSync: (prompt: string) => Promise<AgentResult | null>;
  runAsync: (prompt: string) => Promise<string | null>;
  runStreaming: (prompt: string) => Promise<void>;
  loadTaskStatus: (taskId: string) => Promise<void>;
  loadTaskHistory: () => Promise<void>;
  setCurrentResult: (result: AgentResult | null) => void;
  setCurrentTask: (task: AsyncTask | null) => void;
  setPendingDecision: (decision: PendingDecision | null) => void;
  submitDecision: (taskId: string, data: DecisionSubmitRequest) => Promise<boolean>;
  clearDecision: () => void;
  cancelTask: (taskId: string) => Promise<boolean>;
  _abortController: AbortController | null;
  clearCurrent: () => void;

  // Content type config (from ContentTypeSelector)
  contentTypeConfig: import('../components/agent/ContentTypeSelector').ContentTypeConfig | null;
  setContentTypeConfig: (config: import('../components/agent/ContentTypeSelector').ContentTypeConfig | null) => void;

  // Applied Skill
  appliedSkill: import('../types').AppliedSkill | null;
  appliedSkillFull: import('../types').Skill | null;
  setAppliedSkill: (applied: import('../types').AppliedSkill | null, full: import('../types').Skill | null) => void;

  // Stream events
  addStreamEvent: (event: StreamEvent) => void;

  // WebSocket 管理
  connectWebSocket: (taskId: string) => WebSocket | null;
  disconnectWebSocket: () => void;
  setWsConnectionState: (state: 'connecting' | 'connected' | 'disconnected') => void;
}

export const useAgentStore = create<AgentState>()(
  (set, get) => ({
  currentTaskId: null,
  currentTask: null,
  currentResult: null,
  currentPlan: null,
  isRunning: false,
  error: null,
  pendingDecision: null,
  thinkingSteps: [],
  llmChunks: {},
  reasoningChunks: {},
  wsConnectionState: 'disconnected',
  _ws: null,
  _reconnectTimer: null,
  taskHistory: [],
  _abortController: null,
  recoveryState: null,
  previousGenerations: [],
  messages: [],
  contentTypeConfig: null,
  appliedSkill: null,
  appliedSkillFull: null,

  setAppliedSkill: (applied, full) => set({ appliedSkill: applied, appliedSkillFull: full }),
  setContentTypeConfig: (config) => set({ contentTypeConfig: config }),

  addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),
  updateMessage: (id, updates) => set((state) => ({
    messages: state.messages.map((m) => (m.id === id ? { ...m, ...updates } : m)),
  })),
  clearMessages: () => set({ messages: [] }),
  clearHistory: () => set({ previousGenerations: [] }),
  addStreamEvent: (event) => set((state) => ({ streamEvents: [...state.streamEvents, event] })),

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
        } else if (data.type === 'decision_required') {
          const decision = data.data as PendingDecision;
          useAgentStore.getState().setPendingDecision(decision);
          // showToast is a UI concern, handled by the component
        } else if (data.type === 'result') {
          const result = data.data;
          useAgentStore.getState().setCurrentResult(result);
          useAgentStore.getState().loadTaskHistory();
          const msgs = useAgentStore.getState().messages;
          const assistantMsg = msgs.find((m) => m.role === 'assistant' && m.status === 'running');
          if (assistantMsg) {
            useAgentStore.getState().updateMessage(assistantMsg.id, {
              status: 'completed',
              content: result.output?.full_text || result.output?.content || JSON.stringify(result.output, null, 2),
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

  runAsync: async (prompt: string) => {
    try {
      set({ isRunning: true, error: null, thinkingSteps: [] });
      const { appliedSkill } = get();
      const response = await agentApi.submitAsync({
        prompt,
        skill_id: appliedSkill?.skill_id,
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

  runStreaming: async (prompt: string) => {
    const token = useAuthStore.getState().accessToken;

    // Archive previous generation before clearing for new run
    const prevState = useAgentStore.getState();
    if (prevState.thinkingSteps.length > 0 || prevState.currentResult) {
      const gen: PreviousGeneration = {
        id: crypto.randomUUID(),
        prompt: prevState.messages.find(m => m.role === 'user')?.content || '',
        result: prevState.currentResult,
        events: [],
        timestamp: Date.now(),
        plan: prevState.currentPlan || undefined,
      };
      set((s) => ({ previousGenerations: [...s.previousGenerations, gen] }));
    }

    set({ isRunning: true, error: null, thinkingSteps: [], currentResult: null, llmChunks: {}, reasoningChunks: {}, recoveryState: null });

    // ── 创建助理消息（用于流式输出展示）──
    const msgId = crypto.randomUUID();
    get().addMessage({
      id: msgId, role: 'assistant', content: '', status: 'running', timestamp: Date.now(),
    });

    const controller = new AbortController();
    set({ _abortController: controller });

    const processor = new SSEProcessor();
    let lastStep: ThinkingStep | null = null;
    let errorOccurred = false;
    let accumulated = '';
    let lastUpdate = 0;
    const THROTTLE_MS = 50;

    const updateMsg = (content: string) => {
      const now = Date.now();
      if (now - lastUpdate >= THROTTLE_MS) {
        lastUpdate = now;
        get().updateMessage(msgId, { content });
      }
    };

    // Register SSE handlers
    processor.on('plan', (event) => {
      set({ currentPlan: event.data as unknown as ExecutionPlan });
    });

    processor.on('task_created', (event) => {
      set({ currentTaskId: event.data.task_id as string });
    });

    processor.on('thinking_step', (event) => {
      lastStep = event.data as unknown as ThinkingStep;
      set((s) => ({
        thinkingSteps: s.thinkingSteps.length >= 200
          ? [...s.thinkingSteps.slice(1), lastStep!]
          : [...s.thinkingSteps, lastStep!],
      }));
    });

    processor.on('progress', (event) => {
      const existingTask = useAgentStore.getState().currentTask;
      set({
        currentTask: {
          ...existingTask,
          id: (event.data.task_id as string) || existingTask?.id || '',
          user_id: existingTask?.user_id || '',
          prompt: existingTask?.prompt || prompt,
          state: 'running',
          progress: (event.data.progress as number) || 0,
          progress_message: (event.data.progress_message as string) || '',
          current_step: (event.data.current_step as string) || '',
          completed_steps: (event.data.completed_steps as number) || 0,
          total_steps: (event.data.total_steps as number) || 0,
          created_at: existingTask?.created_at || new Date().toISOString(),
        } as AsyncTask,
      });
    });

    processor.on('result', (event) => {
      const result = event.data as unknown as AgentResult;
      const fullText = (result.output as any)?.full_text || (result.output as any)?.content || accumulated;
      // Flush & mark completed
      get().updateMessage(msgId, {
        status: 'completed',
        content: fullText,
        result,
      });
      set({ currentResult: result, isRunning: false, currentTaskId: null });
      get().loadTaskHistory();
    });

    processor.on('decision_required', (event) => {
      set({ pendingDecision: event.data as unknown as PendingDecision });
    });

    processor.on('error', (event) => {
      errorOccurred = true;
      get().updateMessage(msgId, {
        status: 'failed',
        content: (event.data.message as string) || '执行出错',
      });
      set((s) => ({
        error: (event.data.message as string) || '执行出错',
        isRunning: false,
        currentTaskId: null,
        recoveryState: {
          failedStepIndex: s.thinkingSteps.length,
          failedStep: lastStep,
          retryCount: s.recoveryState?.retryCount ?? 0,
          errorMessage: (event.data.message as string) || '执行出错',
          planSnapshot: s.currentPlan,
        },
      }));
    });

    processor.on('reasoning', (event) => {
      const agent = (event.data as any).agent as string;
      const content = (event.data as any).content as string;
      set((s) => {
        const existing = s.reasoningChunks[agent] || [];
        return {
          reasoningChunks: { ...s.reasoningChunks, [agent]: [...existing, { agent, content, timestamp: Date.now() }] },
        };
      });
    });

    processor.on('llm_chunk', (event) => {
      const agent = (event.data as any).agent as string;
      const content = (event.data as any).content as string;
      accumulated += content;
      updateMsg(accumulated);
      set((s) => {
        const existing = s.llmChunks[agent] || [];
        return {
          llmChunks: { ...s.llmChunks, [agent]: [...existing, { agent, content, timestamp: Date.now() }] },
        };
      });
    });

    processor.on('done', () => {
      // Flush remaining content before marking done
      if (accumulated) {
        get().updateMessage(msgId, { content: accumulated });
      }
      set({ isRunning: false, currentTaskId: null, _abortController: null });
    });

    // Connect and process stream — wire external signal so cancelTask aborts the fetch
    const appliedSkill = useAgentStore.getState().appliedSkill;
    const bodyPayload: Record<string, unknown> = { prompt };
    if (appliedSkill?.skill_id) {
      bodyPayload.skill_id = appliedSkill.skill_id;
    }
    await processor.connect(agentApi.streamUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(bodyPayload),
    }, {
      onError(errorMsg) {
        if (errorOccurred) return; // already handled by error event
        const recovery = lastStep ? {
          failedStepIndex: useAgentStore.getState().thinkingSteps.length,
          failedStep: lastStep,
          retryCount: useAgentStore.getState().recoveryState?.retryCount ?? 0,
          errorMessage: errorMsg,
          planSnapshot: useAgentStore.getState().currentPlan,
        } : undefined;
        set((s) => ({
          error: errorMsg,
          isRunning: false,
          currentTaskId: null,
          _abortController: null,
          ...(recovery ? { recoveryState: recovery } : {}),
        }));
      },
    }, controller.signal);

    if (!errorOccurred) {
      set({ _abortController: null });
    }
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
  setPendingDecision: (decision) => set({ pendingDecision: decision }),
  submitDecision: async (taskId: string, data: DecisionSubmitRequest) => {
    try {
      const response = await agentApi.submitDecision(taskId, data);
      if (response.data.success) {
        set({ pendingDecision: null });
        return true;
      }
      return false;
    } catch (e) {
      console.error('submitDecision failed:', e);
      return false;
    }
  },
  clearDecision: () => set({ pendingDecision: null }),

  cancelTask: async (taskId: string) => {
    const { _abortController } = useAgentStore.getState();
    if (_abortController) {
      _abortController.abort();
      set({ _abortController: null });
    }
    try {
      const response = await agentApi.cancelTask(taskId);
      if (response.data.success) {
        set({
          isRunning: false,
          currentTaskId: null,
          currentTask: null,
        });
        return true;
      }
      return false;
    } catch (e) {
      console.error('cancelTask failed:', e);
      return false;
    }
  },

  retryStep: async () => {
    const state = useAgentStore.getState();
    if (!state.recoveryState) return;
    // Abort any in-flight SSE stream before starting a new one
    const { _abortController } = state;
    if (_abortController) {
      _abortController.abort();
    }
    const lastPrompt = state.messages.find(m => m.role === 'user')?.content || '';
    set({ error: null, recoveryState: null, isRunning: true });
    try {
      if (lastPrompt) {
        // runStreaming is an async action; await it to ensure isRunning is managed correctly
        await state.runStreaming(lastPrompt);
      } else {
        set({ isRunning: false });
      }
    } catch {
      set({ isRunning: false, error: '重试失败' });
    }
  },

  skipStep: async () => {
    const state = useAgentStore.getState();
    if (!state.recoveryState) return;
    // 在 thinkingSteps 中添加一个标记为 skipped 的步骤
    const skippedStep: ThinkingStep = {
      step_number: state.recoveryState.failedStepIndex,
      agent: state.recoveryState.failedStep?.agent || 'unknown',
      action: 'skipped',
      reasoning: '用户选择跳过此步骤',
      input_summary: '',
      output_summary: '已跳过',
      tokens_used: 0,
      time_elapsed: 0,
      status: 'done',
    };
    // 清除错误和恢复状态
    set((s) => ({
      error: null,
      recoveryState: null,
      thinkingSteps: [...s.thinkingSteps, skippedStep],
      isRunning: false,
    }));
  },

  clearCurrent: () => {
    const s = useAgentStore.getState();
    if (s._abortController) s._abortController.abort();
    // Archive current generation before clearing
    if (s.thinkingSteps.length > 0 || s.currentResult) {
      const gen: PreviousGeneration = {
        id: crypto.randomUUID(),
        prompt: s.messages.find(m => m.role === 'user')?.content || '',
        result: s.currentResult,
        events: [],
        timestamp: Date.now(),
        plan: s.currentPlan || undefined,
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
      pendingDecision: null,
      thinkingSteps: [],
      llmChunks: {},
      reasoningChunks: {},
      messages: [],
      contentTypeConfig: null,
      appliedSkill: null,
      appliedSkillFull: null,
      _abortController: null,
    });
  },
}));