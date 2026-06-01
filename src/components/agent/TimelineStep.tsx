import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/helpers';
import { Brain, ChevronDown } from 'lucide-react';
import type { StreamEvent } from '../../types';
import { getAgentMeta, getAgentActionDesc, getAgentColor } from '../../config/agents';
import { AgentIcon } from './AgentIcon';

interface TimelineStepProps {
  event: StreamEvent;
  isLast: boolean;
}

export function TimelineStep({ event, isLast }: TimelineStepProps) {
  const [showReasoning, setShowReasoning] = useState(false);
  const [showInterim, setShowInterim] = useState(false);
  const isRunning = event.status === 'running';
  const isDone = event.status === 'done' || event.status === 'completed';
  const isFailed = event.status === 'failed';
  const agent = event.agent || '';
  const meta = getAgentMeta(agent);
  const intermediateOutput = (event.data?.intermediate_output as string) || '';
  const reasoning = (event.reasoning ?? '') as string;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex gap-3 group"
    >
      {/* Timeline gutter */}
      <div className="flex flex-col items-center flex-shrink-0 w-4">
        <div
          className={cn(
            'w-2 h-2 rounded-full border-2 transition-colors',
            isDone
              ? 'bg-green-500 border-green-500'
              : isFailed
                ? 'bg-red-500 border-red-500'
                : isRunning
                  ? 'bg-blue-500 border-blue-500 animate-pulse'
                  : 'bg-app-text-tertiary/30 border-app-text-tertiary/30'
          )}
        />
        {!isLast && <div className="w-px flex-1 bg-app-border/50 min-h-[8px]" />}
      </div>

      {/* Content */}
      <div className={cn('pb-5 min-w-0 flex-1', isLast && 'pb-0')}>
        {/* Top row: agent + action + time */}
        <div className="flex items-center gap-2 min-w-0">
          {/* Agent badge */}
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium border flex-shrink-0',
              getAgentColor(agent),
              isDone && 'opacity-70',
              isRunning && ''
            )}
          >
            <AgentIcon agentType={agent} size={12} className={cn('w-3 h-3', agent ? 'text-inherit' : '')} />
            {meta.label}
          </span>

          {/* Action description */}
          <span className="text-xs text-app-text-secondary truncate">
            {getAgentActionDesc(agent, event.status || 'running')}
          </span>

          {/* Time elapsed */}
          {event.data?.time_elapsed != null && (
            <span className="text-[10px] text-app-text-tertiary tabular-nums ml-auto flex-shrink-0">
              {(event.data.time_elapsed as number).toFixed(1)}s
            </span>
          )}
        </div>

        {/* Reasoning */}
        {reasoning ? (
          <div className="mt-1">
            <button
              onClick={() => setShowReasoning(!showReasoning)}
              className="inline-flex items-center gap-1 text-[10px] text-yellow-400/50 hover:text-yellow-400 transition-colors"
            >
              <Brain className="w-3 h-3" />
              {showReasoning ? '收起' : '查看思考'}
              <ChevronDown className={cn('w-2.5 h-2.5 transition-transform', showReasoning && 'rotate-180')} />
            </button>
            <AnimatePresence>
              {showReasoning ? (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="overflow-hidden"
                >
                  <p className="mt-1 text-[11px] text-yellow-300/50 leading-relaxed pl-3 border-l-2 border-yellow-500/30">
                    {reasoning}
                  </p>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        ) : null}

        {/* Output summary */}
        {isDone && event.output_summary && (
          <p className="mt-1 text-[10px] text-app-text-tertiary leading-relaxed line-clamp-2">
            {event.output_summary}
          </p>
        )}

        {/* Tokens */}
        {event.data?.tokens_used && (
          <p className="mt-0.5 text-[9px] text-app-text-tertiary/60">
            {(event.data.tokens_used as number).toLocaleString()} tokens
          </p>
        )}

        {/* Interim output */}
        {intermediateOutput && (
          <div className="mt-1">
            <button
              onClick={() => setShowInterim(!showInterim)}
              className="text-[9px] text-app-text-tertiary/50 hover:text-app-text-tertiary transition-colors"
            >
              {showInterim ? '隐藏' : '查看'}中间输出
            </button>
            {showInterim && (
              <pre className="mt-1 text-[9px] text-app-text-tertiary/60 font-mono bg-app-elevated/30 rounded p-1.5 overflow-x-auto whitespace-pre-wrap">
                {intermediateOutput.slice(0, 500)}{intermediateOutput.length > 500 ? '...' : ''}
              </pre>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
