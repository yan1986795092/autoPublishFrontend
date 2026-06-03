import { cn } from '../../utils/helpers';

export interface OptionChipOption<T extends string = string> {
  value: T;
  label: string;
}

interface OptionChipProps<T extends string = string> {
  options: ReadonlyArray<OptionChipOption<T>>;
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  /** 'flex' — 水平排列（默认）；'grid-cols-2' — 2 列网格 */
  layout?: 'flex' | 'grid-cols-2';
  size?: 'sm' | 'md';
}

export function OptionChip<T extends string = string>({
  options,
  value,
  onChange,
  disabled,
  layout = 'flex',
  size = 'md',
}: OptionChipProps<T>) {
  const isGrid = layout === 'grid-cols-2';

  return (
    <div className={cn(isGrid ? 'grid grid-cols-2 gap-1' : 'flex gap-1')}>
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          disabled={disabled}
          className={cn(
            'rounded-lg border text-[10px] font-medium transition-all',
            size === 'md' ? 'py-1.5' : 'py-1',
            isGrid ? 'px-1.5' : 'flex-1 px-1',
            value === opt.value
              ? 'border-primary-500/50 bg-primary-600/15 text-primary-400'
              : 'border-app-border bg-app-surface text-app-text-tertiary hover:text-app-text-secondary',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
