/**
 * MessageBubble — Parts-based message renderer (Phase 0.5 skeleton)
 *
 * Implements spec §4.4 "MessageBubble 重构"
 *
 * Key design decisions (per spec):
 * - tool_call parts are NOT interleaved with text; they are all collapsed
 *   into a single ToolCallGroup at the bottom
 * - text / reasoning / plan / artifact / error are rendered in original order
 * - React.memo with custom comparison: status / parts.length / last part ref
 *
 * This skeleton does NOT connect to the agent store (Phase 2).
 * It only receives a `message` prop.
 */
import React, { memo, useRef } from 'react';
import { motion } from 'framer-motion';
import { Bot } from 'lucide-react';
import { formatTime } from '../../utils/format';
import { TextPart } from './parts/TextPart';
import { ReasoningPart } from './parts/ReasoningPart';
import { ArtifactPart } from './parts/ArtifactPart';
import { PlanPart } from './parts/PlanPart';
import { ErrorPart } from './parts/ErrorPart';
import { ToolCallGroup } from './parts/ToolCallGroup';
import type { MessagePart } from '../types/message';

/** Minimal Message interface for the skeleton (Phase 0.5) */
interface Message {
  id: string;
  role: 'user' | 'assistant';
  status: 'sending' | 'streaming' | 'completed' | 'failed' | 'cancelled';
  timestamp: number;
  /** User content (role=user) */
  content?: string;
  /** Parts array — the source of truth for rendering */
  parts: MessagePart[];
}

interface MessageBubbleProps {
  message: Message;
  onRetry?: (messageId: string) => void;
}

function MessageBubbleInner({ message, onRetry }: MessageBubbleProps) {
  // Ref to the last part for memo comparison
  const lastPartRef = useRef<MessagePart | null>(null);
  const lastPart = message.parts?.[message.parts.length - 1] ?? null;
  lastPartRef.current = lastPart;

  // ── User message ────────────────────────────────────────────────────────────
  if (message.role === 'user') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-end"
      >
        <div className="max-w-[75%] rounded-2xl rounded-tr-sm border border-primary-500/20 bg-primary-500/10 px-4 py-2.5">
          <p className="text-sm text-app-text whitespace-pre-wrap">
            {message.content ?? ''}
          </p>
          <p className="mt-0.5 text-right text-[10px] text-app-text-tertiary">
            {formatTime(message.timestamp)}
          </p>
        </div>
      </motion.div>
    );
  }

  // ── Assistant message — parts-based rendering ───────────────────────────────
  if (message.role === 'assistant') {
    // 安全兜底：旧数据可能没有 parts
    const parts = message.parts || [];
    // Split parts into text/artifact/etc vs tool_call
    // per spec §4.4: "tool_call 不按时间穿插，全部折叠成 ToolCallGroup"
    const textAndArtifact = parts.filter(
      (p) => p.type !== 'tool_call',
    );
    const toolCalls = parts.filter(
      (p) => p.type === 'tool_call',
    ) as MessagePart[];

    const isStreaming = message.status === 'streaming';

    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-start"
      >
        <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-app-border/40 bg-app-elevated px-4 py-2.5">
          {/* Empty / streaming placeholder */}
          {parts.length === 0 && !message.content && (
            <div className="flex items-center gap-1.5 py-1">
              <Bot className="w-4 h-4 text-primary-400 animate-pulse" />
              <span className="text-sm text-app-text-secondary">思考中</span>
              <motion.span
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
                className="text-sm text-app-text-secondary"
              >
                ...
              </motion.span>
            </div>
          )}

          {/* 1. text / reasoning / plan / artifact / error — in original order */}
          {textAndArtifact.map((part, idx) => {
            const isLast = idx === textAndArtifact.length - 1;
            // Only text parts get the streaming cursor treatment
            const partIsStreaming =
              isStreaming && isLast && part.type === 'text';

            switch (part.type) {
              case 'text':
                return (
                  <TextPart
                    key={part.id}
                    part={part}
                    isStreaming={partIsStreaming}
                  />
                );
              case 'reasoning':
                return <ReasoningPart key={part.id} part={part} />;
              case 'artifact':
                return <ArtifactPart key={part.id} part={part} />;
              case 'plan':
                return <PlanPart key={part.id} part={part} />;
              case 'error':
                return (
                  <ErrorPart
                    key={part.id}
                    part={part}
                    onRetry={onRetry ? () => onRetry(message.id) : undefined}
                  />
                );
              default:
                return null;
            }
          })}

          {/* Fallback text content (for legacy messages that don't have parts yet) */}
          {parts.length === 0 && message.content && (
            <p className="text-sm text-app-text whitespace-pre-wrap leading-relaxed">
              {message.content}
              {isStreaming && (
                <motion.span
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                  className="inline-block w-2 h-4 bg-primary-400 ml-0.5"
                />
              )}
            </p>
          )}

          {/* 2. Tool calls — 运行时展开，完成后悔自动折叠为卡片 */}
          {toolCalls.length > 0 && (
            <ToolCallGroup parts={toolCalls as any} autoExpand={isStreaming} />
          )}

          {/* Timestamp */}
          {!isStreaming && (
            <p className="mt-1 text-[10px] text-app-text-tertiary">
              {formatTime(message.timestamp)}
            </p>
          )}
        </div>
      </motion.div>
    );
  }

  return null;
}

/**
 * React.memo with custom comparison:
 * - status: determines streaming/done/failed state
 * - parts.length: number of parts
 * - lastPartRef: reference to last part (stable when only last part updates)
 *
 * Historical messages: parts[] reference stable → skips entire subtree
 * Current streaming: parts array reference stable, only last part ref changes
 *   → only the last part re-renders
 */
export const MessageBubble = memo(
  MessageBubbleInner,
  (prev, next) => {
    if (prev.message.status !== next.message.status) return false;
    const prevParts = prev.message.parts || [];
    const nextParts = next.message.parts || [];
    if (prevParts.length !== nextParts.length) return false;
    if (prev.lastPartRef !== next.lastPartRef) return false;
    if (prev.onRetry !== next.onRetry) return false;
    // Also check the last part's content/state for streaming updates
    const prevLast = prevParts[prevParts.length - 1];
    const nextLast = nextParts[nextParts.length - 1];
    if (prevLast !== nextLast) {
      // Allow last part to differ — this is the streaming update case
      // Still return false to allow the individual TextPart to handle it
      if (prevLast?.id !== nextLast?.id) return false;
      if (prevLast?.state !== nextLast?.state) return false;
      if (prevLast?.type === 'text' && nextLast?.type === 'text') {
        if (prevLast.content !== nextLast.content) return false;
      }
    }
    return true;
  },
);

MessageBubble.displayName = 'MessageBubble';
