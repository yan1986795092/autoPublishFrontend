import { useState, useEffect, useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAgentStore } from '../stores/useAgentStore';
import { useUIStore } from '../stores/useUIStore';
import type { ChatMessage } from '../types';

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
  messages: ReturnType<typeof useAgentStore.getState>['messages'];
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
  addMessage: ReturnType<typeof useAgentStore.getState>['addMessage'];
}

// Skill template 替换已移至后端 api.py，前端不再重复处理。
// 此处仅追加内容类型/风格/篇幅等元信息标签。
function appendContentMeta(
  text: string,
  contentTypeConfig: ReturnType<typeof useAgentStore.getState>['contentTypeConfig'],
): string {
  const config = contentTypeConfig;
  if (config && config.type !== 'auto') {
    const parts: string[] = [`[内容类型: ${config.type}]`];
    if (config.style) parts.push(`[写作风格: ${config.style}]`);
    if (config.length) parts.push(`[篇幅: ${config.length}]`);
    const enabled = Object.entries(config.features || {})
      .filter(([, v]) => v)
      .map(([k]) => k);
    if (enabled.length > 0) parts.push(`[附加功能: ${enabled.join(', ')}]`);
    return `${text}\n\n${parts.join('\n')}`;
  }
  return text;
}

export function useExecutionEngine(_mode: WorkspaceMode): UseExecutionEngineReturn {
  void _mode; // reserved for future 'chat'/'create'/'studio' mode routing

  // 合并订阅：用 useShallow 把多个独立 selector 合并到一个订阅里，
  // 只有当其中任一字段实际变化时才返回新引用，避免每次 store 变化都触发重渲染。
  const {
    isRunning, currentResult, currentPlan, currentTask, currentTaskId,
    thinkingSteps, llmChunks, reasoningChunks, stages, currentStage,
    messages,
    appliedSkill, appliedSkillFull, wsConnectionState,
    runStreaming, runAsync, stopStreaming, disconnectWebSocket,
    clearCurrent, setAppliedSkill, addMessage,
    hasFirstEventReceived,
  } = useAgentStore(useShallow((s) => ({
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
    messages: s.messages,
    appliedSkill: s.appliedSkill,
    appliedSkillFull: s.appliedSkillFull,
    wsConnectionState: s.wsConnectionState,
    runStreaming: s.runStreaming,
    runAsync: s.runAsync,
    stopStreaming: s.stopStreaming,
    disconnectWebSocket: s.disconnectWebSocket,
    clearCurrent: s.clearCurrent,
    setAppliedSkill: s.setAppliedSkill,
    addMessage: s.addMessage,
    hasFirstEventReceived: s.hasFirstEventReceived,
  })));

  // contentTypeConfig 是 any 类型，单独订阅以避免触发 useShallow 的浅比较
  const contentTypeConfig = useAgentStore((s) => s.contentTypeConfig);

  const showToast = useUIStore((s) => s.showToast);

  const [prompt, setPrompt] = useState('');
  const [runningTime, setRunningTime] = useState(0);
  const [useStreaming, setUseStreaming] = useState(true);

  useEffect(() => {
    if (!isRunning) {
      setRunningTime(0);
      return;
    }
    const start = Date.now();
    const timer = setInterval(() => setRunningTime(Math.round((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [isRunning]);

  const handleExecute = useCallback(async (text: string, platform?: string | null, parameters?: Record<string, unknown>) => {
    if (!text.trim() || isRunning) return;
    const enriched = appendContentMeta(text.trim(), contentTypeConfig);
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text.trim(),
      timestamp: Date.now(),
    };
    addMessage(userMsg);
    if (useStreaming) {
      await runStreaming(enriched, platform, parameters);
    } else {
      const taskId = await runAsync(enriched);
      if (!taskId) showToast('提交任务失败', 'error');
    }
  }, [isRunning, useStreaming, runStreaming, runAsync, addMessage, showToast, appliedSkillFull, contentTypeConfig]);

  const handleDirectExecute = useCallback(async () => {
    if (!prompt.trim()) return;
    const enriched = appendContentMeta(prompt.trim(), contentTypeConfig);
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: prompt.trim(),
      timestamp: Date.now(),
    };
    addMessage(userMsg);
    if (useStreaming) {
      await runStreaming(enriched);
    } else {
      const taskId = await runAsync(enriched);
      if (!taskId) showToast('提交任务失败', 'error');
    }
  }, [prompt, useStreaming, runStreaming, runAsync, addMessage, showToast, appliedSkillFull, contentTypeConfig]);

  const handleStop = useCallback(() => {
    stopStreaming();
    disconnectWebSocket();
    showToast('任务已终止', 'info');
  }, [stopStreaming, disconnectWebSocket, showToast]);

  return useMemo(() => ({
    prompt, setPrompt,
    runningTime, isRunning,
    currentResult, currentPlan, currentTask, currentTaskId,
    thinkingSteps, llmChunks, reasoningChunks, stages, currentStage, messages,
    appliedSkill, appliedSkillFull,
    wsConnectionState,
    useStreaming, setUseStreaming,
    hasFirstEventReceived,
    handleExecute, handleStop, handleDirectExecute,
    handleClearCurrent: clearCurrent,
    handleSetAppliedSkill: setAppliedSkill,
    addMessage,
  }), [
    prompt, isRunning, currentResult, currentPlan, currentTask, currentTaskId,
    thinkingSteps, llmChunks, reasoningChunks, stages, currentStage, messages,
    appliedSkill, appliedSkillFull, wsConnectionState,
    useStreaming,
    hasFirstEventReceived,
    handleExecute, handleStop, handleDirectExecute,
    clearCurrent, setAppliedSkill, addMessage,
  ]);
}
