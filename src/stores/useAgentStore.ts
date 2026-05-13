import { create } from 'zustand';
import type { AsyncTask, AgentResult, ExecutionPlan, PendingDecision, DecisionSubmitRequest, ChatMessage, ThinkingStep } from '../types';
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

  // WebSocket 状态
  wsConnectionState: 'connecting' | 'connected' | 'disconnected';
  _ws: WebSocket | null;

  // 任务历史
  taskHistory: AsyncTask[];

  // 消息列表（Chat 式界面）
  messages: ChatMessage[];
  addMessage: (msg: ChatMessage) => void;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  clearMessages: () => void;

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
  clearCurrent: () => void;

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
  wsConnectionState: 'disconnected',
  _ws: null,
  taskHistory: [],
  messages: [],

  addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),
  updateMessage: (id, updates) => set((state) => ({
    messages: state.messages.map((m) => (m.id === id ? { ...m, ...updates } : m)),
  })),
  clearMessages: () => set({ messages: [] }),

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
      set({ isRunning: false, error: 'Failed to generate plan' });
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
      set({ isRunning: false, error: 'Agent execution failed' });
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
    set({ isRunning: true, error: null, thinkingSteps: [], currentResult: null });

    try {
      const response = await fetch(agentApi.streamUrl(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
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
              break;
            case 'task_created':
              set({ currentTaskId: data.task_id as string });
              break;
            case 'thinking_step':
              set((s) => ({
                thinkingSteps: [...s.thinkingSteps, data as unknown as ThinkingStep],
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
              useAgentStore.getState().loadTaskHistory();
              break;
            case 'decision_required':
              set({
                pendingDecision: data as unknown as PendingDecision,
              });
              break;
            case 'error':
              set({
                error: (data.message as string) || '执行出错',
                isRunning: false,
              });
              break;
            case 'done':
              set({ isRunning: false, currentTaskId: null });
              break;
          }
        }
      }
    } catch (e) {
      set({ isRunning: false, error: String(e) });
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

  clearCurrent: () => set({
    currentTaskId: null,
    currentTask: null,
    currentResult: null,
    currentPlan: null,
    isRunning: false,
    error: null,
    pendingDecision: null,
    thinkingSteps: [],
    messages: [],
  }),
}));
