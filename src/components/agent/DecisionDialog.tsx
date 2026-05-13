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
import { Bot, HelpCircle } from 'lucide-react';
import type { PendingDecision, DecisionSubmitRequest } from '../../types';

interface DecisionDialogProps {
  decision: PendingDecision | null;
  taskId: string | null;
  onSubmit: (taskId: string, data: DecisionSubmitRequest) => void;
  onClose: () => void;
}

export function DecisionDialog({ decision, taskId, onSubmit, onClose }: DecisionDialogProps) {
  if (!decision || !taskId) return null;

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
          {/* Question */}
          <div className="rounded-lg border border-app-border/50 bg-app-surface/50 p-3">
            <div className="flex items-start gap-2">
              <HelpCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-blue-400" />
              <p className="text-sm leading-relaxed text-app-text">
                {decision.question}
              </p>
            </div>
          </div>

          {/* Context Preview */}
          {decision.context && decision.context.output_preview && (
            <div className="rounded-lg border border-app-border/30 bg-app-surface/30 p-2.5">
              <p className="mb-1 text-[10px] font-medium text-app-text-tertiary uppercase tracking-wider">
                输出预览
              </p>
              <p className="text-xs text-app-text-secondary leading-relaxed line-clamp-3 font-mono">
                {decision.context.output_preview as string}
              </p>
            </div>
          )}

          {/* Options */}
          <div className="space-y-2">
            <AnimatePresence mode="wait">
              {decision.options.map((option, i) => (
                <motion.div
                  key={option.value}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                >
                  <button
                    onClick={() => onSubmit(taskId, {
                      decision_id: decision.decision_id,
                      choice: option.value,
                    })}
                    className={cn(
                      'w-full rounded-lg border border-app-border/50 p-3 text-left text-sm transition-all',
                      'hover:border-blue-500/40 hover:bg-blue-500/5',
                      'active:scale-[0.98]'
                    )}
                  >
                    <span className="font-medium text-app-text">{option.label}</span>
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-app-border/30 pt-3">
            <span className="text-[10px] text-app-text-tertiary">
              Agent 会在你决定后继续执行
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-7 text-[10px]"
            >
              稍后决定
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
