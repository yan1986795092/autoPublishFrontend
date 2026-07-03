import React, { memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../../utils/helpers';
import { formatDurationPrecise } from '../../../utils/format';
import type { ReasoningPart as ReasoningPartType } from './types';

interface ReasoningPartProps {
  part: ReasoningPartType;
}

function ReasoningPartInner({ part }: ReasoningPartProps) {
  const [expanded, setExpanded] = useState(!part.collapsed_by_default);

  const duration = part.duration_ms != null
    ? formatDurationPrecise(part.duration_ms / 1000)
    : null;

  const summaryLabel = '💭 思考过程';
  const summarySuffix = duration ? ` · ${duration}` : '';

  return (
    <div className="my-2">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1 text-xs text-app-text-secondary hover:text-app-text transition-colors"
      >
        <span>{summaryLabel}</span>
        {duration && (
          <span className="text-app-text-tertiary">{summarySuffix}</span>
        )}
        <motion.span
          animate={{ rotate: expanded ? 0 : 0 }}
          className="text-app-text-tertiary/60"
        >
          {expanded ? '▴' : '▾'}
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="reasoning-content"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className={cn(
              'mt-2 px-3 py-2 rounded-lg text-xs text-app-text-secondary',
              'bg-app-surface/30 border border-app-border/30',
              'whitespace-pre-wrap leading-relaxed',
            )}>
              {part.content}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export const ReasoningPart = memo(ReasoningPartInner, (prev, next) => {
  return (
    prev.part.id === next.part.id &&
    prev.part.content === next.part.content &&
    prev.part.state === next.part.state &&
    prev.part.collapsed_by_default === next.part.collapsed_by_default &&
    prev.part.duration_ms === next.part.duration_ms
  );
});

ReasoningPart.displayName = 'ReasoningPart';
