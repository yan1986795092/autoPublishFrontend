import { useState, useEffect, useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAgentStore } from '../stores/useAgentStore';
import { useConversationStore } from '../stores/useConversationStore';
import { useUIStore } from '../stores/useUIStore';
import type { ChatMessage } from '../types/agent';

export type WorkspaceMode = 'chat' | 'create' | 'studio';

interface UseExecutionEngineReturn {
  prompt: string;
  setPrompt: (v: string) => void;
  runningTime: number;
  isRunning: boolean;
  currentResult: ReturnType<typeof useAgentStore.getState>['currentResult'];
  currentPlan: ReturnType<typeof useAgentStore.getState>['currentPlan'];
  currentTask: ReturnType<typeof useAgentStore.getState>['currentTask'];
  currentTaskId: string | null;
  thinkingSteps: ReturnType<typeof useAgentStore.getState>['thinkingSteps'];
  llmChunks: ReturnType<typeof useAgentStore.getState>['llmChunks'];
  stages: ReturnType<typeof useAgentStore.getState>['stages'];
  currentStage: ReturnType<typeof useAgentStore.getState>['currentStage'];
  messages: ReturnType<typeof useConversationStore.getState>['messages'];
  appliedSkill: ReturnType<typeof useAgentStore.getState>['appliedSkill'];
  appliedSkillFull: ReturnType<typeof useAgentStore.getState>['appliedSkillFull'];
  wsConnectionState: ReturnType<typeof useAgentStore.getState>['wsConnectionState'];
  useStreaming: boolean;
  setUseStreaming: (v: boolean) => void;

  handleExecute: (text: string, platform?: string | null) => Promise<void>;
  handleStop: () => void;
  handleDirectExecute: () => Promise<void>;
  handleClearCurrent: () => void;
  handleSetAppliedSkill: ReturnType<typeof useAgentStore.getState>['setAppliedSkill'];
  addMessage: ReturnType<typeof useConversationStore.getState>['addMessage'];
}

export function useExecutionEngine(_mode: WorkspaceMode): UseExecutionEngineReturn {
  void _mode; // reserved for future 'chat'/'create'/'studio' mode routing

  // Agent Store 状态订阅
  // 修复 BUG-27：hasFirstEventReceived 单独订阅，
  // 否则它在 useShallow 对象里会让整个对象在第一个 SSE 事件到达时重算。
  const agentState = useAgentStore(useShallow((s) => ({
    isRunning: s.isRunning,
    currentResult: s.currentResult,
    currentPlan: s.currentPlan,
    currentTask: s.currentTask,
    currentTaskId: s.currentTaskId,
    thinkingSteps: s.thinkingSteps,
    llmChunks: s.llmChunks,
    reasoningChunks: s.reasoningChunks,
    stages: s.stages,
    currentStage: s.currentStage,
    appliedSkill: s.appliedSkill,
    appliedSkillFull: s.appliedSkillFull,
    wsConnectionState: s.wsConnectionState,
    runStreaming: s.runStreaming,
    runAsync: s.runAsync,
    stopStreaming: s.stopStreaming,
    disconnectWebSocket: s.disconnectWebSocket,
    clearCurrent: s.clearCurrent,
    setAppliedSkill: s.setAppliedSkill,
  })));
  const hasFirstEventReceived = useAgentStore((s) => s.hasFirstEventReceived);

  // Conversation Store 状态订阅
  const conversationState = useConversationStore(useShallow((s) => ({
    messages: s.messages,
    addMessage: s.addMessage,
  })));

  const showToast = useUIStore((s) => s.showToast);

  const [prompt, setPrompt] = useState('');
  const [runningTime, setRunningTime] = useState(0);
  const [useStreaming, setUseStreaming] = useState(true);

  useEffect(() => {
    if (!agentState.isRunning) {
      setRunningTime(0);
      return;
    }
    const start = Date.now();
    const timer = setInterval(() => setRunningTime(Math.round((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [agentState.isRunning]);

  const handleExecute = useCallback(async (text: string, platform?: string | null, parameters?: Record<string, unknown>) => {
    if (!text.trim() || agentState.isRunning) return;
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text.trim(),
      timestamp: Date.now(),
    };
    conversationState.addMessage(userMsg);
    if (useStreaming) {
      await agentState.runStreaming(text.trim(), platform, parameters);
    } else {
      const taskId = await agentState.runAsync(text.trim());
      if (!taskId) showToast('提交任务失败', 'error');
    }
  }, [agentState.isRunning, useStreaming, agentState.runStreaming, agentState.runAsync, conversationState.addMessage, showToast]);

  const handleDirectExecute = useCallback(async () => {
    if (!prompt.trim()) return;
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: prompt.trim(),
      timestamp: Date.now(),
    };
    conversationState.addMessage(userMsg);
    if (useStreaming) {
      await agentState.runStreaming(prompt.trim());
    } else {
      const taskId = await agentState.runAsync(prompt.trim());
      if (!taskId) showToast('提交任务失败', 'error');
    }
  }, [prompt, useStreaming, agentState.runStreaming, agentState.runAsync, conversationState.addMessage, showToast]);

  const handleStop = useCallback(() => {
    agentState.stopStreaming();
    agentState.disconnectWebSocket();
    showToast('任务已终止', 'info');
  }, [agentState.stopStreaming, agentState.disconnectWebSocket, showToast]);

  return useMemo(() => ({
    prompt, setPrompt,
    runningTime,
    isRunning: agentState.isRunning,
    currentResult: agentState.currentResult,
    currentPlan: agentState.currentPlan,
    currentTask: agentState.currentTask,
    currentTaskId: agentState.currentTaskId,
    thinkingSteps: agentState.thinkingSteps,
    llmChunks: agentState.llmChunks,
    stages: agentState.stages,
    currentStage: agentState.currentStage,
    messages: conversationState.messages,
    appliedSkill: agentState.appliedSkill,
    appliedSkillFull: agentState.appliedSkillFull,
    wsConnectionState: agentState.wsConnectionState,
    useStreaming, setUseStreaming,
    hasFirstEventReceived: agentState.hasFirstEventReceived,
    handleExecute, handleStop, handleDirectExecute,
    handleClearCurrent: agentState.clearCurrent,
    handleSetAppliedSkill: agentState.setAppliedSkill,
    addMessage: conversationState.addMessage,
  }), [
    prompt, agentState.isRunning, agentState.currentResult, agentState.currentPlan, agentState.currentTask, agentState.currentTaskId,
    agentState.thinkingSteps, agentState.llmChunks, agentState.stages, agentState.currentStage,
    conversationState.messages,
    agentState.appliedSkill, agentState.appliedSkillFull, agentState.wsConnectionState,
    useStreaming,
    agentState.hasFirstEventReceived,
    handleExecute, handleStop, handleDirectExecute,
    agentState.clearCurrent, agentState.setAppliedSkill, conversationState.addMessage,
  ]);
}
