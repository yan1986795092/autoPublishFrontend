import { create } from 'zustand';
import type { AsyncTask, AgentResult, ExecutionPlan, PendingDecision, DecisionSubmitRequest, ChatMessage, ThinkingStep, StreamEvent, LLMChunk, ReasoningChunk, PreviousGeneration } from '../types';
import { agentApi } from '../services/api';
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

  // Stream events
  addStreamEvent: (event: StreamEvent) => void;

  // WebSocket 管理
  connectWebSocket: (taskId: string) => WebSocket | null;
  disconnectWebSocket: () => void;
  setWsConnectionState: (state: 'connecting' | 'connected' | 'disconnected') => void;
}

export const useAgentStore = create<AgentState>()((set, get) => ({
  currentTaskId: null,
  currentTask: null,
  currentResult: null,
  currentPlan: null,
  isRunning: false,
  error: null,
  pendingDecision: null,
  thinkingSteps: [],
  streamEvents: [],
  llmChunks: {},
  reasoningChunks: {},
  wsConnectionState: 'disconnected',
  _ws: null,
  taskHistory: [],
  _abortController: null,
  previousGenerations: [],
  messages: [],

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
    const { _ws } = get();
    if (_ws) {
      _ws.close();
      set({ _ws: null, wsConnectionState: 'disconnected' });
    }
  },

  previewPlan: async (prompt: string) => {
    try {
      set({ isRunning: true, error: null });
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
      const response = await agentApi.run({ prompt });
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
      const response = await agentApi.submitAsync({ prompt });
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
    const controller = new AbortController();

    // Archive previous generation before clearing for new run
    const prevState = useAgentStore.getState();
    if (prevState.streamEvents.length > 0) {
      const gen: PreviousGeneration = {
        id: crypto.randomUUID(),
        prompt: prevState.streamEvents.find(e => e.type === 'user_message')?.data?.content || '',
        result: prevState.currentResult,
        events: prevState.streamEvents,
        timestamp: Date.now(),
        plan: prevState.currentPlan || undefined,
      };
      set((s) => ({ previousGenerations: [...s.previousGenerations, gen] }));
    }

    set({ isRunning: true, error: null, thinkingSteps: [], currentResult: null, streamEvents: [], llmChunks: {}, reasoningChunks: {}, _abortController: controller });

    // 添加用户消息事件
    const userEvent: StreamEvent = {
      id: crypto.randomUUID(),
      type: 'user_message',
      timestamp: Date.now(),
      data: { content: prompt },
    };
    set((state) => ({ streamEvents: [...state.streamEvents, userEvent] }));

    try {
      const response = await fetch(agentApi.streamUrl(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ prompt }),
        signal: controller.signal,
      });

      if (!response.ok) {
        let errorMsg = `请求失败 (${response.status})`;
        try {
          const errBody = await response.text();
          const parsed = JSON.parse(errBody);
          errorMsg = parsed.detail || errorMsg;
        } catch { /* ignore parse errors */ }
        set((s) => ({
          streamEvents: [...s.streamEvents, {
            id: crypto.randomUUID(),
            type: 'error' as const,
            timestamp: Date.now(),
            data: { message: errorMsg },
          }],
          error: errorMsg,
          isRunning: false,
          currentTaskId: null,
        }));
        return;
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

        for (const eventBlock of events) {
          const eventMatch = eventBlock.match(/^event: (\w+)/m);
          const dataMatch = eventBlock.match(/^data: (.+)$/m);
          if (!eventMatch || !dataMatch) continue;

          const eventType = eventMatch[1];
          let data: Record<string, unknown>;
          try {
            data = JSON.parse(dataMatch[1]);
          } catch {
            continue;
          }

          const store = useAgentStore.getState();

          switch (eventType) {
            case 'plan':
              set({ currentPlan: data as unknown as ExecutionPlan });
              set((s) => ({
                streamEvents: [...s.streamEvents, {
                  id: crypto.randomUUID(),
                  type: 'plan',
                  timestamp: Date.now(),
                  data,
                }],
              }));
              break;
            case 'task_created':
              set({ currentTaskId: data.task_id as string });
              break;
            case 'thinking_step':
              set((s) => ({
                thinkingSteps: [...s.thinkingSteps, data as unknown as ThinkingStep],
                streamEvents: [...s.streamEvents, {
                  id: crypto.randomUUID(),
                  type: 'thinking_step',
                  timestamp: Date.now(),
                  data,
                  agent: (data as any).agent,
                  agent_type: (data as any).agent,
                  action: (data as any).action,
                  reasoning: (data as any).reasoning,
                  status: (data as any).status,
                  output_summary: (data as any).output_summary,
                }],
              }));
              break;
            case 'progress': {
              const existingTask = useAgentStore.getState().currentTask;
              set({
                currentTask: {
                  ...existingTask,
                  id: (data.task_id as string) || existingTask?.id || '',
                  user_id: existingTask?.user_id || '',
                  prompt: existingTask?.prompt || prompt,
                  state: 'running',
                  progress: (data.progress as number) || 0,
                  progress_message: (data.progress_message as string) || '',
                  current_step: (data.current_step as string) || '',
                  completed_steps: (data.completed_steps as number) || 0,
                  total_steps: (data.total_steps as number) || 0,
                  created_at: existingTask?.created_at || new Date().toISOString(),
                } as AsyncTask,
              });
              break;
            }
            case 'result':
              set({
                currentResult: data as unknown as AgentResult,
                isRunning: false,
                currentTaskId: null,
              });
              set((s) => ({
                streamEvents: [...s.streamEvents, {
                  id: crypto.randomUUID(),
                  type: 'result',
                  timestamp: Date.now(),
                  data,
                }],
              }));
              useAgentStore.getState().loadTaskHistory();
              break;
            case 'decision_required':
              set({
                pendingDecision: data as unknown as PendingDecision,
              });
              set((s) => ({
                streamEvents: [...s.streamEvents, {
                  id: crypto.randomUUID(),
                  type: 'decision_required',
                  timestamp: Date.now(),
                  data,
                }],
              }));
              break;
            case 'error':
              set({
                error: (data.message as string) || '执行出错',
                isRunning: false,
              });
              set((s) => ({
                streamEvents: [...s.streamEvents, {
                  id: crypto.randomUUID(),
                  type: 'error',
                  timestamp: Date.now(),
                  data: { message: data.message },
                }],
              }));
              break;
            case 'reasoning':
              set((s) => {
                const agent = (data as any).agent as string;
                const content = (data as any).content as string;
                const existing = s.reasoningChunks[agent] || [];
                return {
                  reasoningChunks: {
                    ...s.reasoningChunks,
                    [agent]: [...existing, { agent, content, timestamp: Date.now() }],
                  },
                  streamEvents: [...s.streamEvents, {
                    id: crypto.randomUUID(),
                    type: 'reasoning' as const,
                    timestamp: Date.now(),
                    data,
                    agent,
                    content,
                  }],
                };
              });
              break;
            case 'llm_chunk':
              set((s) => {
                const agent = (data as any).agent as string;
                const content = (data as any).content as string;
                const existing = s.llmChunks[agent] || [];
                return {
                  llmChunks: {
                    ...s.llmChunks,
                    [agent]: [...existing, { agent, content, timestamp: Date.now() }],
                  },
                  streamEvents: [...s.streamEvents, {
                    id: crypto.randomUUID(),
                    type: 'llm_chunk' as const,
                    timestamp: Date.now(),
                    data,
                    agent,
                    content,
                  }],
                };
              });
              break;
            case 'done':
              set({ isRunning: false, currentTaskId: null, _abortController: null });
              break;
          }
        }
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        set({ isRunning: false, currentTaskId: null, _abortController: null });
        return;
      }
      const errorMsg = String(e);
      set((s) => ({
        streamEvents: [...s.streamEvents, {
          id: crypto.randomUUID(),
          type: 'error' as const,
          timestamp: Date.now(),
          data: { message: errorMsg },
        }],
        error: errorMsg,
        isRunning: false,
        currentTaskId: null,
      }));
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
      // silent
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
    } catch {
      return false;
    }
  },
  clearDecision: () => set({ pendingDecision: null }),

  cancelTask: async (taskId: string) => {
    // 先 abort 前端 fetch stream
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
    } catch {
      return false;
    }
  },

  clearCurrent: () => {
    const s = useAgentStore.getState();
    if (s._abortController) s._abortController.abort();
    // Archive current generation before clearing
    if (s.streamEvents.length > 0) {
      const gen: PreviousGeneration = {
        id: crypto.randomUUID(),
        prompt: s.streamEvents.find(e => e.type === 'user_message')?.data?.content || '',
        result: s.currentResult,
        events: s.streamEvents,
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
    streamEvents: [],
    llmChunks: {},
    reasoningChunks: {},
    messages: [],
    _abortController: null,
  })},
}));
