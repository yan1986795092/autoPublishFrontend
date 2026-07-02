import { useState, useEffect, useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAgentStore } from '../stores/useAgentStore';
import { useConversationStore } from '../stores/useConversationStore';

/**
 * 创作页 (Workspace) 的 agent 执行状态订阅
 *
 * 本 hook 取代了原先的 useExecutionEngine。
 *
 * 拆分原因：
 * - 历史版本中 hook 还承担了"同步 prompt、useStreaming、handleExecute 等 UI 状态"
 *   这部分 UI 状态实际只属于 Workspace 组件本身，已迁移回组件本地 useState。
 * - 此 hook 现在只负责订阅 useAgentStore 中与"agent 实时状态"相关的字段，
 *   并提供统一的 stop / clear 入口。
 *
 * 字段分类：
 * - **agent 实时状态**：isRunning / currentResult / currentPlan / currentTask /
 *   currentTaskId / thinkingSteps / llmChunks / reasoningChunks /
 *   stages / currentStage / hasFirstEventReceived
 * - **agent 行为方法**：handleStop / handleClearCurrent
 *
 * 取消字段（已迁出）：
 * - ~~prompt / setPrompt~~       → Workspace 本地 useState
 * - ~~useStreaming / setUseStreaming~~ → 不再使用
 * - ~~handleExecute / handleDirectExecute~~ → Workspace 已走 useConversationChat.sendChatMessage
 */
export function useAgentEngine() {
  // ── 修复 BUG-27：hasFirstEventReceived 单独订阅，
  // 否则它在 useShallow 对象里会让整个对象在第一个 SSE 事件到达时重算。 ──
  const agentState = useAgentStore(
    useShallow((s) => ({
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
      stopStreaming: s.stopStreaming,
      disconnectWebSocket: s.disconnectWebSocket,
      clearCurrent: s.clearCurrent,
    })),
  );
  const hasFirstEventReceived = useAgentStore((s) => s.hasFirstEventReceived);

  // 仍然订阅 useConversationStore.messages，因为 MessageBubble 渲染需要
  const messages = useConversationStore((s) => s.messages);

  // 计时：isRunning 期间每秒 +1，停后归零
  const [runningTime, setRunningTime] = useState(0);
  useEffect(() => {
    if (!agentState.isRunning) {
      setRunningTime(0);
      return;
    }
    const start = Date.now();
    const timer = setInterval(
      () => setRunningTime(Math.round((Date.now() - start) / 1000)),
      1000,
    );
    return () => clearInterval(timer);
  }, [agentState.isRunning]);

  // 停 agent 流 + 断 WS
  const handleStop = useCallback(() => {
    agentState.stopStreaming();
    agentState.disconnectWebSocket();
  }, [agentState.stopStreaming, agentState.disconnectWebSocket]);

  return useMemo(
    () => ({
      // agent 实时状态
      isRunning: agentState.isRunning,
      currentResult: agentState.currentResult,
      currentPlan: agentState.currentPlan,
      currentTask: agentState.currentTask,
      currentTaskId: agentState.currentTaskId,
      thinkingSteps: agentState.thinkingSteps,
      llmChunks: agentState.llmChunks,
      reasoningChunks: agentState.reasoningChunks,
      stages: agentState.stages,
      currentStage: agentState.currentStage,
      hasFirstEventReceived,

      // 消息列表（来自 useConversationStore，方便 Workspace 一次性订阅）
      messages,

      // 计时
      runningTime,

      // 行为
      handleStop,
      handleClearCurrent: agentState.clearCurrent,
    }),
    [
      agentState.isRunning,
      agentState.currentResult,
      agentState.currentPlan,
      agentState.currentTask,
      agentState.currentTaskId,
      agentState.thinkingSteps,
      agentState.llmChunks,
      agentState.reasoningChunks,
      agentState.stages,
      agentState.currentStage,
      agentState.clearCurrent,
      hasFirstEventReceived,
      messages,
      runningTime,
      handleStop,
    ],
  );
}
