import { cn } from '../../utils/helpers';

interface ShortcutHintProps {
  keys: string[];
  label?: string;
  className?: string;
}

export function ShortcutHint({ keys, label, className }: ShortcutHintProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {label && <span className="text-[10px] text-app-text-tertiary">{label}</span>}
      <div className="flex items-center gap-1">
        {keys.map((key, index) => (
          <kbd
            key={index}
            className="px-1.5 py-0.5 rounded border border-app-border bg-app-surface text-[9px] font-mono text-app-text-secondary shadow-sm"
          >
            {key}
          </kbd>
        ))}
      </div>
    </div>
  );
}
