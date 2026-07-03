import React, { memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../../utils/helpers';
import { formatDurationPrecise } from '../../../utils/format';
import type { ToolCallPart } from './types';

interface ToolCallGroupProps {
  parts: ToolCallPart[];
}

function ToolCallGroupInner({ parts }: ToolCallGroupProps) {
  const [expanded, setExpanded] = useState(false);

  if (parts.length === 0) return null;

  const totalDuration = parts.reduce((sum, p) => sum + (p.duration_ms ?? 0), 0);
  const durationLabel = totalDuration > 0
    ? ` · ${formatDurationPrecise(totalDuration / 1000)}`
    : '';
  const countLabel = `${parts.length} 个工具调用`;
  const collapsedSummary = parts
    .map((p) => `${p.icon} ${p.display_name}`)
    .join(' · ');

  return (
    <div className="my-2">
      {/* Collapsed summary line */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className={cn(
          'flex items-center gap-1 text-xs text-app-text-secondary',
          'hover:text-app-text transition-colors',
        )}
      >
        <span>{collapsedSummary}</span>
        <span className="text-app-text-tertiary/60">
          · {countLabel}{durationLabel} {expanded ? '▴' : '▾'}
        </span>
      </button>

      {/* Expanded list — no cards, no rounded borders, no shadows */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="tool-call-list"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="mt-2 space-y-1 overflow-hidden"
          >
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
                    'relative pl-3 pr-2 py-1.5 text-xs',
                    'text-app-text-secondary',
                    // Error: left red bar
                    isError && 'border-l-2 border-red-500',
                  )}
                >
                  {/* Icon + name */}
                  <div className="flex items-center gap-1.5">
                    <span className="flex-shrink-0">{tool.icon}</span>
                    <span className="text-app-text-secondary">
                      {tool.display_name}
                    </span>

                    {/* Duration */}
                    {duration && !isRunning && (
                      <span className="ml-auto flex-shrink-0 text-app-text-tertiary">
                        {duration}
                      </span>
                    )}

                    {/* Status indicator */}
                    {isRunning && (
                      <span className="ml-auto flex-shrink-0">
                        <span className="inline-block w-2 h-2 rounded-full border border-blue-400 bg-blue-400/20 animate-pulse" />
                      </span>
                    )}
                    {tool.state === 'done' && (
                      <span className="ml-auto flex-shrink-0 text-green-400">✓</span>
                    )}
                    {isError && (
                      <span className="ml-auto flex-shrink-0 text-red-400">✗</span>
                    )}
                  </div>

                  {/* Input params — simple key-value, no cards */}
                  {Object.keys(tool.input).length > 0 && (
                    <div className="mt-0.5 pl-5 text-[11px] text-app-text-tertiary space-y-0.5">
                      {Object.entries(tool.input).slice(0, 4).map(([k, v]) => (
                        <div key={k}>
                          <span className="text-app-text-tertiary/70">{k}: </span>
                          <span className="text-app-text-tertiary/90">
                            {typeof v === 'string' ? `"${v}"` : JSON.stringify(v)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Error message */}
                  {isError && tool.error_message && (
                    <div className="mt-0.5 pl-5 text-[10px] text-red-400 truncate">
                      {tool.error_message}
                    </div>
                  )}

                  {/* Running separator */}
                  {idx < parts.length - 1 && <div className="mt-1" />}
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export const ToolCallGroup = memo(ToolCallGroupInner, (prev, next) => {
  if (prev.parts === next.parts) return true;
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
