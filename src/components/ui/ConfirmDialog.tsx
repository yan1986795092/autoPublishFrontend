import { Dialog, DialogContent, DialogHeader, DialogTitle } from './dialog';
import { Button } from './button';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = '确认',
  cancelLabel = '取消',
  variant = 'default',
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            {variant === 'danger' && <AlertTriangle className="w-4 h-4 text-red-400" />}
            {title}
          </DialogTitle>
        </DialogHeader>
        <p className="text-xs text-app-text-secondary leading-relaxed">{description}</p>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="text-xs">
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'danger' ? 'destructive' : 'default'}
            size="sm"
            onClick={() => { onConfirm(); onOpenChange(false); }}
            className="text-xs"
          >
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
