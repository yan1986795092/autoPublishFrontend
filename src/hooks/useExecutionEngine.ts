import { useState, useEffect, useCallback } from 'react';
import { useAgentStore } from '../stores/useAgentStore';
import { useUIStore } from '../stores/useUIStore';
import type { ChatMessage, ExecutionPlan } from '../types';

export type WorkspaceMode = 'chat' | 'create' | 'studio';

interface UseExecutionEngineReturn {
  // State
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
  messages: ReturnType<typeof useAgentStore.getState>['messages'];
  previousGenerations: ReturnType<typeof useAgentStore.getState>['previousGenerations'];
  appliedSkill: ReturnType<typeof useAgentStore.getState>['appliedSkill'];
  appliedSkillFull: ReturnType<typeof useAgentStore.getState>['appliedSkillFull'];
  pendingDecision: ReturnType<typeof useAgentStore.getState>['pendingDecision'];
  recoveryState: ReturnType<typeof useAgentStore.getState>['recoveryState'];
  wsConnectionState: ReturnType<typeof useAgentStore.getState>['wsConnectionState'];
  useStreaming: boolean;
  setUseStreaming: (v: boolean) => void;

  // Actions
  handleExecute: (text: string) => Promise<void>;
  handleStop: () => void;
  handleDirectExecute: () => Promise<void>;
  handlePreviewPlan: () => Promise<void>;
  handleConfirmPlan: (adjustedPlan: ExecutionPlan) => Promise<void>;
  handleDecisionSubmit: (taskId: string, data: { decision_id: string; choice: string; text?: string }) => Promise<boolean>;
  handleRetryStep: () => Promise<void>;
  handleSkipStep: () => Promise<void>;
  handleClearCurrent: () => void;
  handleClearDecision: () => void;
  handleSetAppliedSkill: ReturnType<typeof useAgentStore.getState>['setAppliedSkill'];
  addMessage: ReturnType<typeof useAgentStore.getState>['addMessage'];
}

/** Enrich prompt with skill template + content type context */
function enrichPrompt(
  text: string,
  appliedSkillFull: ReturnType<typeof useAgentStore.getState>['appliedSkillFull'],
  contentTypeConfig: ReturnType<typeof useAgentStore.getState>['contentTypeConfig'],
): string {
  const skill = appliedSkillFull;
  if (skill) {
    if (skill.user_prompt_template) {
      let template = skill.user_prompt_template;
      template = template.replace(/\{topic\}/g, text.split('\n')[0]);
      template = template.replace(/\{content\}/g, text);
      return template;
    }
    return text;
  }

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
  const isRunning = useAgentStore((s) => s.isRunning);
  const currentResult = useAgentStore((s) => s.currentResult);
  const currentPlan = useAgentStore((s) => s.currentPlan);
  const currentTask = useAgentStore((s) => s.currentTask);
  const currentTaskId = useAgentStore((s) => s.currentTaskId);
  const thinkingSteps = useAgentStore((s) => s.thinkingSteps);
  const llmChunks = useAgentStore((s) => s.llmChunks);
  const messages = useAgentStore((s) => s.messages);
  const previousGenerations = useAgentStore((s) => s.previousGenerations);
  const appliedSkill = useAgentStore((s) => s.appliedSkill);
  const appliedSkillFull = useAgentStore((s) => s.appliedSkillFull);
  const pendingDecision = useAgentStore((s) => s.pendingDecision);
  const recoveryState = useAgentStore((s) => s.recoveryState);
  const wsConnectionState = useAgentStore((s) => s.wsConnectionState);
  const contentTypeConfig = useAgentStore((s) => s.contentTypeConfig);

  const showToast = useUIStore((s) => s.showToast);

  const [prompt, setPrompt] = useState('');
  const [runningTime, setRunningTime] = useState(0);
  const [useStreaming, setUseStreaming] = useState(true);

  const runStreaming = useAgentStore((s) => s.runStreaming);
  const runAsync = useAgentStore((s) => s.runAsync);
  const previewPlan = useAgentStore((s) => s.previewPlan);
  const retryStep = useAgentStore((s) => s.retryStep);
  const skipStep = useAgentStore((s) => s.skipStep);
  const submitDecision = useAgentStore((s) => s.submitDecision);
  const clearDecision = useAgentStore((s) => s.clearDecision);
  const cancelTask = useAgentStore((s) => s.cancelTask);
  const disconnectWebSocket = useAgentStore((s) => s.disconnectWebSocket);
  const clearCurrent = useAgentStore((s) => s.clearCurrent);
  const setAppliedSkill = useAgentStore((s) => s.setAppliedSkill);
  const addMessage = useAgentStore((s) => s.addMessage);

  // Running timer
  useEffect(() => {
    if (!isRunning) {
      setRunningTime(0);
      return;
    }
    const start = Date.now();
    const timer = setInterval(() => setRunningTime(Math.round((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [isRunning]);

  const handleExecute = useCallback(async (text: string) => {
    if (!text.trim() || isRunning) return;
    const enriched = enrichPrompt(text.trim(), appliedSkillFull, contentTypeConfig);
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text.trim(),
      timestamp: Date.now(),
    };
    addMessage(userMsg);
    if (useStreaming) {
      await runStreaming(enriched);
    } else {
      const taskId = await runAsync(enriched);
      if (!taskId) showToast('提交任务失败', 'error');
    }
  }, [isRunning, useStreaming, runStreaming, runAsync, addMessage, showToast, appliedSkillFull, contentTypeConfig]);

  const handleDirectExecute = useCallback(async () => {
    if (!prompt.trim()) return;
    const enriched = enrichPrompt(prompt.trim(), appliedSkillFull, contentTypeConfig);
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
    if (currentTaskId) cancelTask(currentTaskId);
    disconnectWebSocket();
    showToast('任务已终止', 'info');
  }, [currentTaskId, cancelTask, disconnectWebSocket, showToast]);

  const handlePreviewPlan = useCallback(async () => {
    if (!prompt.trim()) return;
    showToast('正在生成执行计划...', 'info');
    const plan = await previewPlan(prompt.trim());
    if (plan) {
      showToast(`计划包含 ${plan.tasks.length} 个步骤`, 'info');
    } else {
      showToast('生成计划失败', 'error');
    }
  }, [prompt, previewPlan, showToast]);

  const handleConfirmPlan = useCallback(async (adjustedPlan: ExecutionPlan) => {
    const enriched = enrichPrompt(prompt.trim(), appliedSkillFull, contentTypeConfig);
    const planContext = adjustedPlan.goal
      ? `${enriched}\n\n[已确认计划: ${adjustedPlan.goal} — ${adjustedPlan.tasks.length} 个步骤]`
      : enriched;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: prompt.trim(),
      timestamp: Date.now(),
    };
    addMessage(userMsg);

    if (useStreaming) {
      await runStreaming(planContext);
    } else {
      const taskId = await runAsync(planContext);
      if (!taskId) showToast('提交任务失败', 'error');
    }
  }, [prompt, useStreaming, runStreaming, runAsync, addMessage, showToast, appliedSkillFull, contentTypeConfig]);

  const handleDecisionSubmit = useCallback(async (taskId: string, data: { decision_id: string; choice: string; text?: string }) => {
    const ok = await submitDecision(taskId, data);
    showToast(ok ? '决定已提交' : '提交失败', ok ? 'success' : 'error');
    return ok;
  }, [submitDecision, showToast]);

  return {
    prompt, setPrompt,
    runningTime, isRunning,
    currentResult, currentPlan, currentTask, currentTaskId,
    thinkingSteps, llmChunks, messages, previousGenerations,
    appliedSkill, appliedSkillFull,
    pendingDecision, recoveryState, wsConnectionState,
    useStreaming, setUseStreaming,
    handleExecute, handleStop, handleDirectExecute,
    handlePreviewPlan, handleConfirmPlan,
    handleDecisionSubmit,
    handleRetryStep: retryStep,
    handleSkipStep: skipStep,
    handleClearCurrent: clearCurrent,
    handleClearDecision: clearDecision,
    handleSetAppliedSkill: setAppliedSkill,
    addMessage,
  };
}
