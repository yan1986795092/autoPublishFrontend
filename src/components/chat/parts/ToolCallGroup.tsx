import React, { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../../utils/helpers';
import { formatDurationPrecise } from '../../../utils/format';
import type { ToolCallPart } from './types';

interface ToolCallGroupProps {
  parts: ToolCallPart[];
  /** 运行时自动展开，完成后悔自动折叠（父级传 message.status === 'streaming'） */
  autoExpand?: boolean;
}

function ToolCallGroupInner({ parts, autoExpand }: ToolCallGroupProps) {
  const isStreaming = autoExpand === true;
  const allDone = parts.every((p) => p.state === 'done');
  // 运行时展开，完成后折叠（override 内部状态）
  const expanded = isStreaming || (!allDone);

  if (parts.length === 0) return null;

  const totalDuration = parts.reduce((sum, p) => sum + (p.duration_ms ?? 0), 0);
  const durationLabel = totalDuration > 0
    ? formatDurationPrecise(totalDuration / 1000)
    : '';
  const runningAgent = parts.find((p) => p.state === 'streaming');

  // ── 折叠态：卡片式摘要 ─────────────────────────────────
  if (!expanded) {
    const summaryIcons = parts
      .map((p) => (p.state === 'done' ? `${p.icon}` : `${p.icon}...`))
      .join(' · ');
    return (
      <div className={cn(
        'my-2 rounded-lg border border-app-border/40 bg-app-bg/50 px-3 py-2',
        'text-xs text-app-text-secondary select-none',
      )}>
        <div className="flex items-center gap-2">
          {/* 左侧图标序列 */}
          <span className="truncate">{summaryIcons}</span>

          {/* 分隔 */}
          <span className="text-app-text-tertiary/40">|</span>

          {/* 步骤数 + 耗时 */}
          <span className="shrink-0 text-app-text-tertiary">
            {parts.length} 步 · {durationLabel}
          </span>

          {/* 展开提示 */}
          <span className="ml-auto shrink-0 text-app-text-tertiary/50">
            ▸
          </span>
        </div>
      </div>
    );
  }

  // ── 展开态：逐步骤展示 ────────────────────────────────
  return (
    <div className={cn(
      'my-2 rounded-lg border border-app-border/30 bg-app-bg/30',
      isStreaming && 'border-primary-500/20',
    )}>
      {/* 表头：概要行 */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-app-border/20 text-xs text-app-text-tertiary">
        <span>执行步骤</span>
        <span className="text-app-text-tertiary/50">
          · {parts.length} 步{totalDuration > 0 ? ` · ${durationLabel}` : ''}
        </span>
        {runningAgent && (
          <span className="ml-auto text-primary-500">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse mr-1" />
            {runningAgent.display_name}
          </span>
        )}
      </div>

      {/* 步骤列表 */}
      <div className="px-2 py-1">
        {parts.map((tool, idx) => {
          const isRunning = tool.state === 'streaming';
          const isError = tool.state === 'error' || Boolean(tool.error_message);
          const duration = tool.duration_ms != null
            ? formatDurationPrecise(tool.duration_ms / 1000)
            : null;

          return (
            <div
              key={tool.id}
              className={cn(
                'flex items-center gap-2 px-2 py-1.5 text-xs rounded-md',
                isRunning && 'bg-primary-500/5',
                isError && 'bg-red-500/5',
              )}
            >
              {/* 状态图标 */}
              {isRunning ? (
                <span className="flex-shrink-0 text-primary-500 animate-pulse">
                  {tool.icon}
                </span>
              ) : (
                <span className="flex-shrink-0 text-app-text-secondary">
                  {tool.icon}
                </span>
              )}

              {/* Agent 名称 */}
              <span className={cn(
                'flex-1 min-w-0 truncate',
                isRunning && 'text-primary-500 font-medium',
                isError && 'text-red-500',
              )}>
                {tool.display_name}
              </span>

              {/* 状态 + 耗时 */}
              {isRunning && (
                <span className="flex-shrink-0 flex items-center gap-1 text-primary-500">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse" />
                  运行中
                </span>
              )}
              {tool.state === 'done' && duration && (
                <span className="flex-shrink-0 text-app-text-tertiary">
                  {duration}
                </span>
              )}
              {tool.state === 'done' && !duration && (
                <span className="flex-shrink-0 text-green-500">✔</span>
              )}
              {isError && (
                <span className="flex-shrink-0 text-red-500">✗</span>
              )}

              {/* 进度分隔（仅展开态、非最后一项） */}
              {idx < parts.length - 1 && (
                <div className="absolute bottom-0 left-6 right-0 h-px bg-app-border/10" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const ToolCallGroup = memo(ToolCallGroupInner, (prev, next) => {
  if (prev.parts === next.parts && prev.autoExpand === next.autoExpand) return true;
  if (prev.parts.length !== next.parts.length) return false;
  for (let i = 0; i < prev.parts.length; i++) {
    const a = prev.parts[i];
    const b = next.parts[i];
    if (
      a.id !== b.id ||
      a.state !== b.state ||
      a.display_name !== b.display_name ||
      a.duration_ms !== b.duration_ms ||
      a.error_message !== b.error_message
    ) {
      return false;
    }
  }
  return true;
});

ToolCallGroup.displayName = 'ToolCallGroup';
