import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/button';
import { LoadingDots } from '../ui/loading-dots';
import { StageTimeline } from './StageTimeline';
import { UsageBadge } from './UsageBadge';
import { Sparkles, Bot, Copy, Check, Eye, Loader2, RefreshCw, StopCircle, AlertTriangle, Ban } from 'lucide-react';
import { useAgentStore } from '../../stores/useAgentStore';
import { cn } from '../../utils/helpers';
import { formatTime, formatDuration } from '../../utils/format';
import { AGENT_STAGE_MAP } from '../../types';
import type { StageInfo, LLMChunk, ReasoningChunk } from '../../types';

import { MessageBubble as NewMessageBubble } from '../chat/MessageBubble';
import type { MessagePart } from '../../types/message';

interface MessageBubbleProps {
  message: {
    id: string;
    role: string;
    content: string;
    timestamp: number;
    status?: string;
    kind?: string;
    renderMode?: string;
    renderPayload?: any;
    result?: any;
    /** Parts 模型数组（spec 2026-07-02 §3.1）— 存在时优先用新渲染器 */
    parts?: MessagePart[];
  };
  copiedId: string | null;
  onCopy: (id: string, text: string) => void;
  onRetry?: (id: string, prompt: string) => void;
  thinkingSteps?: any[];
  runningTime?: number;
  stages?: StageInfo[];
  currentStage?: string | null;
  llmChunks?: Record<string, LLMChunk[]>;
  reasoningChunks?: Record<string, ReasoningChunk[]>;
}

// 长内容阈值：超过此字符数默认折叠，避免挤压 timeline
const LONG_CONTENT_THRESHOLD = 800;

// 提取可复制的"纯文本产物"——业务 schema 优先，回退到 renderPayload.body / content
function _resolveCopyContent(message: any): string {
  const output = message?.result?.output;
  if (output) {
    return output.full_text || output.content || output.body || '';
  }
  return message?.renderPayload?.body || message?.content || '';
}

function _fallbackLlmChunks(result: any, content: string): Record<string, LLMChunk[]> {
  const chunks: Record<string, LLMChunk[]> = {};
  if (!content || !result?._stages) return chunks;
  const ts = Date.now();
  for (const st of result._stages) {
    if (st.agent === 'WritingAgent' || st.agent === 'FixAgent') {
      chunks[st.agent] = [{ agent: st.agent, content, timestamp: ts }];
    }
  }
  return chunks;
}

function _synthesizeStages(result: any, content: string): StageInfo[] {
  const llmChunks = result?._llmChunks as Record<string, LLMChunk[]> | undefined;
  const generatedAgents = ['WritingAgent', 'FixAgent'].filter(
    (agent) => Boolean(llmChunks?.[agent]?.length),
  );

  if (generatedAgents.length > 0) {
    return generatedAgents.map((agent) => {
      const mapEntry = AGENT_STAGE_MAP[agent] || { label: '生成中', icon: '✍️' };
      return {
        agent,
        label: mapEntry.label,
        icon: mapEntry.icon,
        status: 'completed' as const,
      };
    });
  }

  const draftContent = result?._draftContent || result?.output?.draft_content;
  const finalContent = result?.output?.full_text || result?.output?.content || content;
  if (draftContent || finalContent) {
    const mapEntry = AGENT_STAGE_MAP.WritingAgent;
    return [{
      agent: 'WritingAgent',
      label: mapEntry.label,
      icon: mapEntry.icon,
      status: 'completed' as const,
    }];
  }

  // D1: 多源兜底——从 _thinkingSteps 推断（review-flow 早期数据）
  const steps = result?._thinkingSteps as Array<{ agent?: string; _review_round?: number }> | undefined;
  if (steps && steps.length > 0) {
    // P24: 用 (agent, reviewRound) 二元组去重，保留多轮 review 的轮次信息。
    //      之前的 uniqueAgents 只按 agent 去重，第 2/3 轮 review 的 stage 会丢。
    const seen = new Set<string>();
    const stages: StageInfo[] = [];
    for (const s of steps) {
      if (!s.agent) continue;
      const rr = s._review_round || 0;
      const key = `${s.agent}|${rr}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const mapEntry = AGENT_STAGE_MAP[s.agent as keyof typeof AGENT_STAGE_MAP] || { label: s.agent, icon: '⚙️' };
      stages.push({
        agent: s.agent,
        label: mapEntry.label,
        icon: mapEntry.icon,
        status: 'completed' as const,
        ...(rr > 0 ? { reviewRound: rr } : {}),
      });
    }
    if (stages.length > 0) return stages;
  }

  return [];
}

function _extractErrorDetail(message: any): { message: string; code?: string } | null {
  // 兼容多种错误字段：result.error / result.message / error / message
  const result = message?.result;
  if (!result) return null;
  const messageText = result.error || result.message || result.detail || null;
  if (!messageText) return null;
  const code = result.error_code || result.code || undefined;
  return { message: messageText, code };
}

export function MessageBubble({
  message,
  copiedId,
  onCopy,
  onRetry,
  thinkingSteps,
  runningTime,
  stages,
  currentStage,
  llmChunks,
  reasoningChunks,
}: MessageBubbleProps) {
  console.log('[DEBUG MessageBubble]', { id: message.id, role: message.role, kind: message.kind, hasParts: Boolean(message.parts), partsLen: message.parts?.length ?? 0, contentLen: message.content?.length ?? 0, status: message.status });
  // ── Parts 模型渲染路径（spec 2026-07-02 §4.4）
  // 当 message 有 parts[] 时，使用新渲染器（替代 StageTimeline / llmChunks / reasoningChunks）
  if (message.parts && message.parts.length > 0) {
    return (
      <NewMessageBubble
        message={{
          id: message.id,
          role: message.role as 'user' | 'assistant',
          status: (message.status || 'completed') as 'sending' | 'streaming' | 'completed' | 'failed' | 'cancelled',
          timestamp: message.timestamp,
          content: message.content || '',
          parts: message.parts,
        }}
        onRetry={onRetry ? (id: string) => onRetry(id, message.content || '') : undefined}
      />
    );
  }
  // 优先用业务 schema 的纯文本作为复制/预览源（在 handlePreview 前定义，闭包清晰）
  const copyableContent = _resolveCopyContent(message);
  const copySource = copyableContent || message.content || '';

  const handlePreview = useCallback(() => {
    if (!copySource) return;
    const store = useAgentStore.getState();
    store.setPreviewContent(copySource);
    const platform =
      (message as any).renderPayload?.platform ||
      (message as any).generationMeta?.platform ||
      null;
    if (platform) store.setPreviewPlatform(platform);
  }, [copySource, message]);

  const handleStop = useCallback(() => {
    useAgentStore.getState().stopStreaming();
  }, []);

  const [finalExpanded, setFinalExpanded] = useState(false);
  useEffect(() => {
    if (message.status === 'running') {
      setFinalExpanded(false);
      return;
    }
    // 取消/失败：强制折叠，让错误信息优先可见
    if (message.status === 'failed' || message.status === 'cancelled') {
      setFinalExpanded(false);
      return;
    }
    // 完成 / 历史消息：长内容默认折叠（>800 字），短内容默认展开
    const hasContent = Boolean(message.content);
    const isLong = (copySource?.length || 0) > LONG_CONTENT_THRESHOLD;
    setFinalExpanded(hasContent && !isLong);
  }, [message.status, message.content, copySource]);

  // ── User message ──
  if (message.role === 'user') {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex justify-end">
        <div className="max-w-[75%] rounded-2xl rounded-tr-sm border border-primary-500/20 bg-primary-500/10 px-4 py-2.5">
          <p className="text-sm text-app-text whitespace-pre-wrap">{message.content}</p>
          <p className="mt-0.5 text-right text-[10px] text-app-text-tertiary">{formatTime(message.timestamp)}</p>
        </div>
      </motion.div>
    );
  }

  if (message.role === 'assistant') {
    const _isGeneration =
      message.kind === 'generation' ||
      message.renderMode === 'generation_card' ||
      (message.status === 'running' && message.kind !== 'conversation');
    const _isChatBubble = !_isGeneration;

    // ── Chat bubble ──
    if (_isChatBubble) {
      const isRunning = message.status === 'running';
      const isFailed = message.status === 'failed';
      return (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
          <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-app-border/40 bg-app-elevated px-4 py-2.5">
            {isRunning && !message.content ? (
              <div className="flex items-center gap-1.5 py-1">
                <Bot className="w-4 h-4 text-primary-400 animate-pulse" />
                <span className="text-sm text-app-text-secondary">思考中</span>
                <LoadingDots color="var(--color-primary-400)" size={6} />
              </div>
            ) : (
              <>
                <p className="text-sm text-app-text whitespace-pre-wrap leading-relaxed">{message.content}</p>
                {isRunning && (
                  <span className="inline-block w-2 h-4 bg-primary-400 ml-0.5 animate-pulse" />
                )}
              </>
            )}
            {!isRunning && !isFailed && (
              <p className="mt-1 text-[10px] text-app-text-tertiary">{formatTime(message.timestamp)}</p>
            )}
            {isFailed && (
              <p className="text-xs text-red-400 mt-1">回复失败</p>
            )}
          </div>
        </motion.div>
      );
    }

    // ── Generation result card ──
    const isRunning = message.status === 'running';
    const isFailed = message.status === 'failed';
    const isCancelled = message.status === 'cancelled';
    const isError = isFailed || isCancelled;
    const errorDetail = _extractErrorDetail(message);
    // P3: 统一用 copySource 作为"用户感知的产物"——复制/预览/折叠展示都用同一份
    // 保留 displayContent 别名用于 isError / 字数展示的兜底（避免空字符串误判）
    const displayContent = copySource || message.content || '';

    const msgResult = message.result as any;
    const storedStages = Array.isArray(msgResult?._stages) ? msgResult._stages : [];
    const fallbackStages = storedStages.length === 0 ? _synthesizeStages(msgResult, displayContent) : storedStages;
    const displayStages = isRunning ? (stages || []) : fallbackStages;
    const displayCurrentStage = isRunning ? (currentStage || null) : null;
    const displayLlmChunks = isRunning
      ? (llmChunks || {})
      : (msgResult?._llmChunks || _fallbackLlmChunks(msgResult, displayContent));
    const displayReasoning = isRunning
      ? (reasoningChunks || {})
      : (msgResult?._reasoningChunks || {});
    const displayThinkingSteps = isRunning
      ? (thinkingSteps || [])
      : (msgResult?._thinkingSteps || []);

    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
        <div className="max-w-[85%] w-full rounded-xl border border-app-border/40 bg-app-elevated p-4">
          {/* Header */}
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isRunning ? (
                <Bot className="w-4 h-4 text-primary-400 animate-pulse" />
              ) : isError ? (
                <span className="w-4 h-4 flex items-center justify-center text-red-400 text-sm">!</span>
              ) : (
                <Sparkles className="w-4 h-4 text-primary-400" />
              )}
              <span className="text-xs font-medium text-app-text">
                {isRunning
                  ? '生成中...'
                  : isCancelled
                    ? '已取消'
                    : isFailed
                      ? '生成失败'
                      : '生成结果'}
              </span>
              {isRunning && runningTime !== undefined && (
                <span className="text-[10px] text-app-text-tertiary">{formatDuration(runningTime)}</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {/* A2: running 中暴露 ⏹ 停止按钮 */}
              {isRunning && (
                <button
                  type="button"
                  onClick={handleStop}
                  className="rounded p-1 text-app-text-tertiary hover:text-red-400 transition-colors"
                  aria-label="停止生成"
                  title="停止生成"
                >
                  <StopCircle className="w-4 h-4" />
                </button>
              )}
              {/* 复制按钮：A4——用 copySource（业务 schema 纯文本）而非 renderPayload.body */}
              {!isRunning && copySource && (
                <button
                  onClick={() => onCopy(message.id, copySource)}
                  className="rounded p-1 text-app-text-tertiary hover:text-app-text-secondary transition-colors"
                  aria-label="复制内容"
                >
                  {copiedId === message.id ? (
                    <Check className="w-3.5 h-3.5 text-green-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Thinking animation */}
          {isRunning && !displayContent && (
            <div className="flex items-center gap-1.5 py-2">
              <Loader2 className="w-3.5 h-3.5 text-primary-400 animate-spin" />
              <span className="text-sm text-app-text-secondary">思考中</span>
              <LoadingDots color="var(--color-primary-400)" size={6} />
            </div>
          )}

          {/* Stage timeline */}
          {displayStages.length > 0 && (
            <StageTimeline
              stages={displayStages}
              currentStage={displayCurrentStage}
              isRunning={isRunning}
              llmChunks={displayLlmChunks}
              reasoningChunks={displayReasoning}
              thinkingSteps={displayThinkingSteps}
            />
          )}

          {/* Final product — collapsible */}
          {displayContent && (
            <div className="mt-3 rounded-lg border border-app-border/50 bg-app-elevated overflow-hidden">
              <button
                type="button"
                onClick={() => setFinalExpanded((v) => !v)}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-app-surface/50 transition-colors text-left"
              >
                <Sparkles className="w-3.5 h-3.5 text-primary-400 shrink-0" />
                <span className="text-xs font-medium text-app-text">最终产物</span>
                {!finalExpanded && (
                  <span className="text-[10px] text-app-text-tertiary/70 ml-1">
                    · {displayContent.length} 字
                  </span>
                )}
                <span className={cn(
                  'ml-auto text-app-text-tertiary/60 transition-transform duration-200',
                  finalExpanded && 'rotate-180',
                )}>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 4L5 7L8 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </button>
              <AnimatePresence initial={false}>
                {finalExpanded && (
                  <motion.div
                    key="final-content"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 py-2 text-sm text-app-text whitespace-pre-wrap leading-relaxed max-h-[60vh] overflow-y-auto">
                      {displayContent}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* A1: 失败/取消状态——区分 + 显示错误详情 + 重试按钮 */}
          {isError && (
            <div
              className={cn(
                'rounded-lg border px-3 py-2 mb-3',
                isCancelled
                  ? 'border-app-border/40 bg-app-surface/40'
                  : 'border-red-500/30 bg-red-500/5',
              )}
              role={isFailed ? 'alert' : 'status'}
            >
              <div className="flex items-start gap-2">
                {isCancelled ? (
                  <Ban className="w-3.5 h-3.5 mt-0.5 text-app-text-tertiary shrink-0" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 text-red-400 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className={cn('text-xs', isCancelled ? 'text-app-text-secondary' : 'text-red-300')}>
                    {isCancelled ? '生成已被你手动取消' : '生成失败，请重试'}
                  </p>
                  {!isCancelled && errorDetail && (
                    <details className="mt-1">
                      <summary className="text-[10px] text-red-400/70 cursor-pointer hover:text-red-300 select-none">
                        查看错误详情
                      </summary>
                      <pre className="mt-1 text-[10px] text-red-300/80 whitespace-pre-wrap break-words font-mono leading-relaxed">
{errorDetail.code ? `[${errorDetail.code}] ` : ''}{errorDetail.message}
                      </pre>
                    </details>
                  )}
                </div>
                {isFailed && onRetry && message.content && (
                  <button
                    type="button"
                    onClick={() => onRetry(message.id, message.content)}
                    className="shrink-0 rounded p-1 text-app-text-tertiary hover:text-primary-400 transition-colors"
                    aria-label="重试"
                    title="用相同 prompt 重新生成"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* A1: 失败且没产物时给最小兜底文案（兼容老 data） */}
          {isError && !displayContent && (
            <div className={cn('text-sm py-1', isCancelled ? 'text-app-text-tertiary' : 'text-red-400')}>
              {isCancelled ? '已取消' : '请求失败，请重试'}
            </div>
          )}

          {/* Actions */}
          {!isRunning && copySource && (
            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2 border-t border-app-border/30 mt-3 pt-2">
              <div className="flex items-center gap-2">
                <Button
                  onClick={handlePreview}
                  variant="ghost"
                  size="xs"
                  className="text-app-text-tertiary hover:text-primary-400"
                >
                  <Eye className="w-3.5 h-3.5 mr-1" />
                  预览
                </Button>
                {/* A1: 失败时在底部也提供重试入口（双重发现路径） */}
                {isFailed && onRetry && message.content && (
                  <Button
                    onClick={() => onRetry(message.id, message.content)}
                    variant="ghost"
                    size="xs"
                    className="text-app-text-tertiary hover:text-primary-400"
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1" />
                    重试
                  </Button>
                )}
              </div>
              {/* A5: 提取 UsageBadge，桌面横排 / 移动竖排 */}
              <UsageBadge usage={message.result?.usage} />
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  return null;
}

// 显式比较流式/重渲染相关字段，避免依赖 message 引用。
// 之前的 prev.message !== next.message 在 store 用 Object.assign 原地改时会失效，
// 导致 SSE 流式更新时 MessageBubble 不重新渲染。
export const MessageBubbleMemo = Object.assign(
  React.memo(MessageBubble, (prev, next) => {
    if (prev.copiedId !== next.copiedId) return false;
    if (prev.onRetry !== next.onRetry) return false;
    const pm = prev.message;
    const nm = next.message;
    if (pm === nm) {
      // 引用相同但其他 props 可能仍变了 — 下面按字段再核
    }
    if (pm.id !== nm.id) return false;
    if (pm.content !== nm.content) return false;
    if (pm.status !== nm.status) return false;
    if (pm.role !== nm.role) return false;
    if (pm.kind !== nm.kind) return false;
    if (pm.renderMode !== nm.renderMode) return false;
    if (pm.result !== nm.result) return false;
    if (pm.timestamp !== nm.timestamp) return false;
    // 仅在真正运行时才对比 stages，避免无意义重渲染
    if (pm.status === 'running' || nm.status === 'running') {
      if (prev.stages !== next.stages) return false;
      if (prev.currentStage !== next.currentStage) return false;
      if (prev.thinkingSteps !== next.thinkingSteps) return false;
      if (prev.llmChunks !== next.llmChunks) return false;
      if (prev.reasoningChunks !== next.reasoningChunks) return false;
      if (prev.runningTime !== next.runningTime) return false;
    }
    return true;
  }),
  { displayName: 'MessageBubbleMemo' },
);
