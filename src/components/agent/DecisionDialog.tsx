import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { cn } from '../../utils/helpers';
import { Bot, HelpCircle, Loader2 } from 'lucide-react';
import type { PendingDecision, DecisionSubmitRequest } from '../../types';

interface DecisionDialogProps {
  decision: PendingDecision | null;
  taskId: string | null;
  onSubmit: (taskId: string, data: DecisionSubmitRequest) => void;
  onClose: () => void;
}

export function DecisionDialog({ decision, taskId, onSubmit, onClose }: DecisionDialogProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (decision) {
      setSelected(null);
      setSubmitting(false);
    }
  }, [decision]);

  if (!decision || !taskId) return null;

  const handleSelect = useCallback((value: string) => {
    if (submitting) return;
    setSelected(value);
    setSubmitting(true);
    onSubmit(taskId, {
      decision_id: decision.decision_id,
      choice: value,
    });
  }, [submitting, onSubmit, taskId, decision]);

  useEffect(() => {
    if (!decision) return;
    const handler = (e: KeyboardEvent) => {
      if (submitting) return;
      const num = parseInt(e.key);
      if (num >= 1 && num <= decision.options.length) {
        e.preventDefault();
        handleSelect(decision.options[num - 1].value);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [decision, submitting, handleSelect]);

  const contextPreview = decision.context && String((decision.context as Record<string, unknown>).output_preview ?? '');

  return (
    <Dialog open={!!decision} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-500/15">
              <Bot className="h-3.5 w-3.5 text-blue-400" />
            </div>
            <DialogTitle>需要你的决定</DialogTitle>
          </div>
          <DialogDescription className="pt-1">
            Agent 执行过程中需要你确认后再继续
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-app-border/50 bg-app-surface/50 p-3">
            <div className="flex items-start gap-2">
              <HelpCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-blue-400" />
              <p className="text-sm leading-relaxed text-app-text">{decision.question}</p>
            </div>
          </div>

          {contextPreview ? (
            <div className="rounded-lg border border-app-border/30 bg-app-surface/30 p-2.5">
              <p className="mb-1 text-[10px] font-medium text-app-text-tertiary uppercase tracking-wider">
                输出预览
              </p>
              <p className="text-xs text-app-text-secondary leading-relaxed line-clamp-3 font-mono">
                {contextPreview}
              </p>
            </div>
          ) : null}

          <div className="space-y-2">
            <AnimatePresence mode="wait">
              {decision.options.map((option, i) => {
                const isSelected = selected === option.value;
                return (
                  <motion.div
                    key={option.value}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                  >
                    <button
                      onClick={() => handleSelect(option.value)}
                      disabled={submitting}
                      className={cn(
                        'w-full rounded-lg border p-3 text-left text-sm transition-all',
                        isSelected
                          ? 'border-blue-500/40 bg-blue-500/10 text-blue-400'
                          : submitting
                            ? 'border-app-border/30 bg-app-surface/30 text-app-text-tertiary cursor-default'
                            : 'border-app-border/50 text-app-text hover:border-blue-500/40 hover:bg-blue-500/5',
                        !submitting && 'active:scale-[0.98]'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className={cn(
                          'font-medium',
                          isSelected ? 'text-blue-400' : 'text-app-text'
                        )}>
                          {submitting && isSelected ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 mr-2 inline-block animate-spin" />
                              {option.label}
                            </>
                          ) : option.label}
                        </span>
                        {!submitting && (
                          <span className="text-[10px] text-app-text-tertiary font-mono">
                            [{i + 1}]
                          </span>
                        )}
                      </div>
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          <div className="flex items-center justify-between border-t border-app-border/30 pt-3">
            <span className="text-[10px] text-app-text-tertiary">
              Agent 会在你决定后继续执行
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={submitting}
              className="h-7 text-[10px]"
            >
              {submitting ? '提交中...' : '稍后决定'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
