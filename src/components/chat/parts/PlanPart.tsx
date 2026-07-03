import React, { memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../../utils/helpers';
import type { PlanPart as PlanPartType } from './types';

interface PlanPartProps {
  part: PlanPartType;
}

function PlanPartInner({ part }: PlanPartProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="my-2">
      {/* Summary line */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className={cn(
          'flex items-center gap-1 text-xs text-app-text-secondary',
          'hover:text-app-text transition-colors',
        )}
      >
        <span>📋 执行计划</span>
        {part.tasks.length > 0 && (
          <span className="text-app-text-tertiary/70">
            · {part.tasks.length} 个任务 {expanded ? '▴' : '▾'}
          </span>
        )}
      </button>

      {/* Expanded content */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="plan-content"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className={cn(
              'mt-2 space-y-2',
              'px-3 py-2 rounded-lg text-xs',
              'bg-app-surface/30 border border-app-border/30',
            )}>
              {/* Goal */}
              {part.goal && (
                <div>
                  <div className="text-[10px] text-app-text-tertiary/70 uppercase tracking-wide mb-0.5">
                    目标
                  </div>
                  <div className="text-app-text-secondary leading-relaxed">
                    {part.goal}
                  </div>
                </div>
              )}

              {/* Reasoning */}
              {part.reasoning && (
                <div>
                  <div className="text-[10px] text-app-text-tertiary/70 uppercase tracking-wide mb-0.5">
                    推理
                  </div>
                  <div className="text-app-text-secondary leading-relaxed">
                    {part.reasoning}
                  </div>
                </div>
              )}

              {/* Tasks */}
              {part.tasks.length > 0 && (
                <div>
                  <div className="text-[10px] text-app-text-tertiary/70 uppercase tracking-wide mb-1">
                    任务列表
                  </div>
                  <div className="space-y-1">
                    {part.tasks.map((task, idx) => (
                      <div
                        key={task.id}
                        className="flex items-start gap-1.5 text-app-text-secondary"
                      >
                        <span className="flex-shrink-0 text-app-text-tertiary/50">
                          {idx + 1}.
                        </span>
                        <div>
                          <span className="text-app-text-secondary">
                            {task.agent_type}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export const PlanPart = memo(PlanPartInner, (prev, next) => {
  return (
    prev.part.id === next.part.id &&
    prev.part.goal === next.part.goal &&
    prev.part.reasoning === next.part.reasoning &&
    prev.part.state === next.part.state &&
    prev.part.tasks.length === next.part.tasks.length
  );
});

PlanPart.displayName = 'PlanPart';
