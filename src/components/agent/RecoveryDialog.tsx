import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { AlertCircle, RotateCcw, SkipForward, XCircle } from 'lucide-react';
import type { RecoveryState } from '../../types';

interface RecoveryDialogProps {
  recovery: RecoveryState | null;
  onRetry: () => void;
  onSkip: () => void;
  onCancel: () => void;
  onClose: () => void;
}

export function RecoveryDialog({ recovery, onRetry, onSkip, onCancel, onClose }: RecoveryDialogProps) {
  const [modifiedInput, setModifiedInput] = useState('');
  const [action, setAction] = useState<'idle' | 'retrying' | 'skipping'>('idle');

  const handleRetry = useCallback(async () => {
    setAction('retrying');
    onRetry();
  }, [onRetry]);

  const handleSkip = useCallback(async () => {
    setAction('skipping');
    onSkip();
  }, [onSkip]);

  if (!recovery) return null;

  const agentLabel = recovery.failedStep?.agent?.replace('Agent', '') || '未知';

  return (
    <Dialog open={!!recovery} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-red-500/15">
              <AlertCircle className="h-3.5 w-3.5 text-red-400" />
            </div>
            <DialogTitle>步骤执行失败</DialogTitle>
          </div>
          <DialogDescription className="pt-1">
            Agent <strong>{agentLabel}</strong> 在执行过程中遇到错误
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Error detail */}
          <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
            <p className="text-xs text-red-400 leading-relaxed font-mono">
              {recovery.errorMessage}
            </p>
          </div>

          {/* Failed step context */}
          {recovery.failedStep && (
            <div className="rounded-lg border border-app-border/30 bg-app-surface/30 p-2.5">
              <p className="mb-1 text-[10px] font-medium text-app-text-tertiary uppercase tracking-wider">
                失败步骤
              </p>
              <p className="text-xs text-app-text-secondary">
                <span className="text-app-text-tertiary">操作:</span> {recovery.failedStep.action}
              </p>
              {recovery.failedStep.reasoning && (
                <p className="text-xs text-app-text-secondary mt-1">
                  <span className="text-app-text-tertiary">推理:</span> {recovery.failedStep.reasoning}
                </p>
              )}
            </div>
          )}

          {/* Modified input option */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-medium text-app-text-tertiary uppercase tracking-wider">
              修改参数后重试（可选）
            </label>
            <Textarea
              value={modifiedInput}
              onChange={(e) => setModifiedInput(e.target.value)}
              placeholder="留空则使用原始参数重试..."
              className="min-h-[60px] text-xs"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSkip}
              disabled={action !== 'idle'}
              className="flex-1 text-xs"
            >
              {action === 'skipping' ? (
                <>处理中...</>
              ) : (
                <><SkipForward className="w-3 h-3 mr-1" /> 跳过此步骤</>
              )}
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleRetry}
              disabled={action !== 'idle'}
              className="flex-1 text-xs"
            >
              {action === 'retrying' ? (
                <>重试中...</>
              ) : (
                <><RotateCcw className="w-3 h-3 mr-1" /> 重试</>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              disabled={action !== 'idle'}
              className="flex-shrink-0 text-xs"
            >
              <XCircle className="w-3 h-3 mr-1" /> 取消
            </Button>
          </div>

          {/* Retry count */}
          {recovery.retryCount > 0 && (
            <p className="text-[10px] text-app-text-tertiary text-center">
              已重试 {recovery.retryCount} 次
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
