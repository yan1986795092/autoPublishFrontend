import { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/helpers';
import { HelpCircle, CheckCircle } from 'lucide-react';
import type { StreamEvent, PendingDecision } from '../../types';

interface InlineDecisionProps {
  event: StreamEvent;
  onSubmit: (decisionId: string, choice: string) => void;
}

export function InlineDecision({ event, onSubmit }: InlineDecisionProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const data = event.data as PendingDecision;
  const question = data?.question || '需要你的决定';
  const options = data?.options || [];
  const context = data?.context;
  const decisionId = data?.decision_id || '';

  if (!options.length) return null;

  const handleSelect = (value: string) => {
    if (submitted) return;
    setSelected(value);
    setSubmitted(true);
    onSubmit(decisionId, value);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 pt-0.5">
          {submitted ? (
            <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle className="w-3.5 h-3.5 text-green-400" />
            </div>
          ) : (
            <motion.div
              className="w-6 h-6 rounded-full bg-yellow-500/20 flex items-center justify-center"
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <HelpCircle className="w-3.5 h-3.5 text-yellow-400" />
            </motion.div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-yellow-400">需要你的决定</span>
            {submitted && (
              <span className="text-[10px] text-green-400">已确认</span>
            )}
          </div>

          <p className="text-sm text-app-text font-medium mb-3">{question}</p>

          {/* Context preview */}
          {context && Object.keys(context).length > 0 && (
            <div className="mb-3 rounded-lg bg-app-surface/30 p-2.5 text-xs text-app-text-secondary leading-relaxed border border-app-border/30">
              {Object.entries(context).map(([key, val]) => (
                <div key={key} className="mb-1 last:mb-0">
                  <span className="text-app-text-tertiary">{key}: </span>
                  {typeof val === 'string' ? val : JSON.stringify(val)}
                </div>
              ))}
            </div>
          )}

          {/* Options */}
          <div className="flex flex-wrap gap-2">
            {options.map((option: { value: string; label: string }) => {
              const isSelected = selected === option.value;
              return (
                <motion.button
                  key={option.value}
                  whileHover={submitted ? {} : { scale: 1.02 }}
                  whileTap={submitted ? {} : { scale: 0.98 }}
                  onClick={() => handleSelect(option.value)}
                  disabled={submitted}
                  className={cn(
                    'rounded-lg px-4 py-2 text-xs font-medium border transition-all',
                    isSelected
                      ? 'bg-green-500/20 text-green-400 border-green-500/40'
                      : submitted
                        ? 'bg-app-surface/30 text-app-text-tertiary border-app-border/30 cursor-default'
                        : 'bg-app-surface text-app-text-secondary border-app-border hover:border-yellow-500/30 hover:text-yellow-400'
                  )}
                >
                  {option.label}
                  {isSelected && submitted && (
                    <CheckCircle className="w-3 h-3 ml-1.5 inline-block" />
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
