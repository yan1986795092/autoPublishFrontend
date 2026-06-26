import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/button';
import { LoadingDots } from '../ui/loading-dots';
import { StageTimeline } from './StageTimeline';
import { Sparkles, Bot, Copy, Check, Eye, Loader2 } from 'lucide-react';
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
  };
  copiedId: string | null;
  onCopy: (id: string, text: string) => void;
  thinkingSteps?: any[];
  runningTime?: number;
  stages?: StageInfo[];
  currentStage?: string | null;
  llmChunks?: Record<string, LLMChunk[]>;
  reasoningChunks?: Record<string, ReasoningChunk[]>;
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

  return [];
}

export function MessageBubble({
  message,
  copiedId,
  onCopy,
  thinkingSteps,
  runningTime,
  stages,
  currentStage,
  llmChunks,
  reasoningChunks,
}: MessageBubbleProps) {
  const handlePreview = useCallback(() => {
    if (!message.content) return;
    const store = useAgentStore.getState();
    store.setPreviewContent(message.content);
    const platform =
      (message as any).renderPayload?.platform ||
      (message as any).generationMeta?.platform ||
      null;
    if (platform) store.setPreviewPlatform(platform);
  }, [message.content]);

  const [finalExpanded, setFinalExpanded] = useState(false);
  useEffect(() => {
    if (message.status === 'running') {
      setFinalExpanded(false);
    } else if (message.status === 'completed' || (!message.status && message.content)) {
      setFinalExpanded(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message.status]);

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
    const displayContent = message.renderPayload?.body || message.content || '';

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
              ) : isFailed ? (
                <span className="w-4 h-4 flex items-center justify-center text-red-400 text-sm">!</span>
              ) : (
                <Sparkles className="w-4 h-4 text-primary-400" />
              )}
              <span className="text-xs font-medium text-app-text">
                {isRunning ? '生成中...' : isFailed ? '生成失败' : '生成结果'}
              </span>
              {isRunning && runningTime !== undefined && (
                <span className="text-[10px] text-app-text-tertiary">{formatDuration(runningTime)}</span>
              )}
            </div>
            {!isRunning && displayContent && (
              <button
                onClick={() => onCopy(message.id, displayContent)}
                className="rounded p-1 text-app-text-tertiary hover:text-app-text-secondary transition-colors"
              >
                {copiedId === message.id ? (
                  <Check className="w-3.5 h-3.5 text-green-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            )}
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

          {/* Failed */}
          {isFailed && !displayContent && (
            <div className="text-sm text-red-400 py-1">请求失败，请重试</div>
          )}

          {/* Actions */}
          {!isRunning && displayContent && (
            <div className="flex items-center justify-between border-t border-app-border/30 mt-3 pt-2">
              <Button
                onClick={handlePreview}
                variant="ghost"
                size="xs"
                className="text-app-text-tertiary hover:text-primary-400"
              >
                <Eye className="w-3.5 h-3.5 mr-1" />
                预览
              </Button>
              {message.result?.usage && (
                <div className="flex flex-wrap gap-3 text-[10px] text-app-text-tertiary">
                  <span>Token: {message.result.usage.tokens_used}</span>
                  <span>耗时: {message.result.usage.time_elapsed?.toFixed(1)}s</span>
                  <span>模型: {message.result.usage.model || 'N/A'}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  return null;
}

export const MessageBubbleMemo = Object.assign(
  React.memo(MessageBubble, (prev, next) => {
    if (prev.message !== next.message) return false;
    if (prev.copiedId !== next.copiedId) return false;
    return true;
  }),
  { displayName: 'MessageBubbleMemo' },
);
