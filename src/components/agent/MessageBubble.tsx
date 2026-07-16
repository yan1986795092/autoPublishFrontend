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
    /** [Task 5 / Phase 4] 后端显式标记，不再靠 kind 字段探测 */
    is_generation?: boolean;
    is_conversation?: boolean;
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
    const stages: StageInfo[] = generatedAgents.map((agent) => {
      const mapEntry = AGENT_STAGE_MAP[agent] || { label: '生成中', icon: '✍️' };
      return {
        agent,
        label: mapEntry.label,
        icon: mapEntry.icon,
        status: 'completed' as const,
      };
    });

    // 从 _llmChunks 的 review channel 中提取 ReviewAgent 各轮次
    // key 格式：初审 "ReviewAgent"（无 |），复审+ "ReviewAgent|1"、"ReviewAgent|2"
    if (llmChunks) {
      // 初审：key 是纯 agent 名（round 0）
      if (llmChunks['ReviewAgent']?.length) {
        const mapEntry = AGENT_STAGE_MAP.ReviewAgent || { label: '评审优化中', icon: '📋' };
        stages.push({
          agent: 'ReviewAgent',
          label: mapEntry.label,
          icon: mapEntry.icon,
          status: 'completed' as const,
        });
      }
      // 复审+：key 带 |round 后缀
      const reviewKeys = Object.keys(llmChunks).filter(k => k.startsWith('ReviewAgent|'));
      const seenRounds = new Set<number>();
      for (const key of reviewKeys) {
        const round = parseInt(key.split('|')[1], 10);
        if (isNaN(round) || seenRounds.has(round)) continue;
        seenRounds.add(round);
        const mapEntry = AGENT_STAGE_MAP.ReviewAgent || { label: '评审优化中', icon: '📋' };
        stages.push({
          agent: 'ReviewAgent',
          label: mapEntry.label,
          icon: mapEntry.icon,
          status: 'completed' as const,
          ...(round > 0 ? { reviewRound: round } : {}),
        });
      }
    }

    // 按出现顺序排序：llmChunks key 的插入顺序就是执行顺序
    return stages;
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
    const stageMap = new Map<string, StageInfo>();
    for (const s of steps) {
      if (!s.agent) continue;
      const rr = s._review_round || 0;
      const key = `${s.agent}|${rr}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const mapEntry = AGENT_STAGE_MAP[s.agent as keyof typeof AGENT_STAGE_MAP] || { label: s.agent, icon: '⚙️' };
      stageMap.set(key, {
        agent: s.agent,
        label: mapEntry.label,
        icon: mapEntry.icon,
        status: 'completed' as const,
        ...(rr > 0 ? { reviewRound: rr } : {}),
      });
    }
    if (stageMap.size > 0) return Array.from(stageMap.values());
  }

  return [];
}

function _partsToStages(parts: any[]): StageInfo[] {
  if (!Array.isArray(parts)) return [];
  const stages: StageInfo[] = [];
  for (const p of parts) {
    if (p.type === 'tool_call' && p.tool_name) {
      const existing = stages.findIndex(s => s.agent === p.tool_name && s.reviewRound === (p.round || 0));
      if (existing >= 0) {
        stages[existing] = { ...stages[existing], status: (p.state === 'done' ? 'completed' : p.state) as any };
      } else {
        stages.push({
          agent: p.tool_name,
          label: p.display_name || p.tool_name,
          icon: p.icon || '⚙️',
          status: (p.state === 'done' ? 'completed' : p.state === 'error' ? 'failed' : 'running') as any,
          reviewRound: p.round || 0,
        });
      }
    }
  }
  return stages;
}

/**
 * 从 parts[] 提取 reasoningChunks（历史消息时 result._reasoningChunks 可能为空，
 * 但 parts 中有 reasoning 类型的 part，提取后可以让 StageTimeline 展开显示思考过程）
 */
function _partsToReasoningChunks(parts: any[]): Record<string, Array<{agent: string; content: string; timestamp: number}>> {
  if (!Array.isArray(parts)) return {};
  const chunks: Record<string, Array<{agent: string; content: string; timestamp: number}>> = {};
  for (const p of parts) {
    if (p.type === 'reasoning' && p.content) {
      // agent 优先取 payload，回退到 server_id（格式：reasoning_AgentName_round_timestamp）
      const agent = p.agent || (p.server_id ? p.server_id.replace(/^reasoning_/, '').split(/_\d+$/)[0] : 'unknown');
      const round = p.round || 0;
      const key = `${agent}|${round}`;
      if (!chunks[key]) chunks[key] = [];
      chunks[key].push({ agent, content: p.content, timestamp: Date.now() });
    }
  }
  return chunks;
}

/**
 * 从 parts[] 提取 llmChunks（text part → {agent: [{agent, content, timestamp}]}）
 */
function _partsToLlmChunks(parts: any[]): Record<string, Array<{agent: string; content: string; timestamp: number}>> {
  if (!Array.isArray(parts)) return {};
  const chunks: Record<string, Array<{agent: string; content: string; timestamp: number}>> = {};
  for (const p of parts) {
    if (p.type === 'text' && p.content) {
      // agent 优先取 payload，回退到 server_id（格式：text_AgentName_round）
      const agent = p.agent || (p.server_id ? p.server_id.split('_')[1] || 'unknown' : 'unknown');
      if (!chunks[agent]) chunks[agent] = [];
      chunks[agent].push({ agent, content: p.content, timestamp: Date.now() });
    }
  }
  return chunks;
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

/**
 * 把 `_reasoningChunks` / `_llmChunks` 的 key（agent 名）规范化为 `{Agent}|{round}` 格式，
 * 这样才能跟 `_partsToStages`/`_synthesizeStages` 生成的 uniqueKey（`${agent}|${reviewRound}`）匹配上，
 * 让 StageTimeline 正确展开显示中间推理内容。
 * 历史消息里 _stages.label 是 "思考分析中"，_reasoningChunks key 是 "ManagerAgent"，
 * 不转换则 hasDetail 永远为 false，用户看不到任何中间过程。
 */
function _normalizeChunkKeys(
  chunks: Record<string, Array<{ agent: string; content: string; timestamp: number }>> | undefined,
): Record<string, Array<{ agent: string; content: string; timestamp: number }>> {
  if (!chunks || typeof chunks !== 'object') return {};
  const result: Record<string, Array<{ agent: string; content: string; timestamp: number }>> = {};
  for (const [key, values] of Object.entries(chunks)) {
    // 如果 key 已经是 "Agent|round" 格式，直接保留
    if (key.includes('|')) {
      result[key] = values;
      continue;
    }
    // key 是纯 agent 名，映射到 AGENT_STAGE_MAP 的 key（agent 名）
    const normalized = key.startsWith('ManagerAgent')
      ? 'ManagerAgent|0'
      : `${key}|0`;
    result[normalized] = values;
  }
  return result;
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

  // 优先用业务 schema 的纯文本作为复制/预览源（在 handlePreview 前定义，闭包清晰）
  const copyableContent = _resolveCopyContent(message);
  const copySource = copyableContent || message.content || '';

  const handlePreview = useCallback(() => {
    if (!copySource) return;
    const store = useAgentStore.getState();
    store.setPreviewContent(copySource);
    // 单一来源：直接从 message.result.output 读 TitleAgent / TagAgent 产物。
    // merge_and_finish 现在已经把 title/tags 写到 final_output.structured 顶层，
    // 任何"从前端猜来源"的 fallback 都是隐藏耦合——直接拿 result.output 即可。
    const output = (message as any).result?.output ?? {};
    const title = typeof output.title === 'string' && output.title.trim()
      ? output.title.trim()
      : null;
    const tags: string[] = Array.isArray(output.tags)
      ? (output.tags as unknown[]).filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
      : [];
    store.setPreviewTitle(title);
    store.setPreviewTags(tags);
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
    // ── [Task 5 / Phase 4] 优先用 is_generation 字段，回退到 kind 字段探测 ──
    const _isGeneration =
      message.is_generation === true ||
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
    const partsStages = storedStages.length === 0 ? _partsToStages(message.parts) : [];
    const fallbackStages = storedStages.length === 0
      ? (partsStages.length > 0 ? partsStages : _synthesizeStages(msgResult, displayContent))
      : storedStages;
    const displayStages = isRunning ? (stages || []) : fallbackStages;
    // AGENT_STAGE_MAP 补全 icon/label + 同 agent 去重（保留最后一个）
    const normalizedDisplayStages = displayStages.reduce<StageInfo[]>((acc, s) => {
      const normalized = (() => {
        if (s.label && s.icon && s.icon !== '⚙️') return s;
        const mapEntry = AGENT_STAGE_MAP[s.agent as keyof typeof AGENT_STAGE_MAP];
        if (!mapEntry) return { ...s, label: s.label || s.agent, icon: s.icon || '⚙️' };
        return { ...s, label: s.label || mapEntry.label, icon: (s.icon && s.icon !== '⚙️') ? s.icon : mapEntry.icon };
      })();
      const idx = acc.findIndex(a => a.agent === normalized.agent && (a.reviewRound || 0) === (normalized.reviewRound || 0));
      if (idx >= 0) acc[idx] = normalized;
      else acc.push(normalized);
      return acc;
    }, [] as StageInfo[]);
    const displayCurrentStage = isRunning ? (currentStage || null) : null;
    const displayLlmChunks = isRunning
      ? (llmChunks || {})
      : _normalizeChunkKeys(msgResult?._llmChunks) || _fallbackLlmChunks(msgResult, displayContent) || _partsToLlmChunks(message.parts);
    const displayReasoning = isRunning
      ? (reasoningChunks || {})
      : _normalizeChunkKeys(msgResult?._reasoningChunks);
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
          {normalizedDisplayStages.length > 0 && (
            <StageTimeline
              stages={normalizedDisplayStages}
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

    // ── [Task 4 / Bug C 修复] parts 深度比较 ──
    // 场景：切换对话时，新 message 有 parts[], 旧 message parts=undefined
    //      或者 parts 引用没变但内容变了（流式）
    const prevParts = (pm as any).parts as unknown[] | undefined;
    const nextParts = (nm as any).parts as unknown[] | undefined;
    if (prevParts === nextParts) {
      // 引用相同，无需深比
    } else if (!prevParts || !nextParts) {
      // 一边为空一边非空 → 变了
      return false;
    } else if (prevParts.length !== nextParts.length) {
      return false;
    } else {
      // 长度相同，逐个比关键字段
      for (let i = 0; i < prevParts.length; i++) {
        const p1 = prevParts[i] as Record<string, unknown>;
        const p2 = nextParts[i] as Record<string, unknown>;
        if (p1.id !== p2.id) return false;
        if (p1.type !== p2.type) return false;
        if (p1.state !== p2.state) return false;
        // content / body 是大字段，但流式场景必须比
        if (p1.content !== p2.content) return false;
        if (p1.body !== p2.body) return false;
      }
    }

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
