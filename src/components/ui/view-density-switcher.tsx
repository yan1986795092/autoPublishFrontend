import { cn } from '../../utils/helpers';
import { Rows3, Rows4, Rows2 } from 'lucide-react';

export type Density = 'compact' | 'standard' | 'comfortable';

interface ViewDensitySwitcherProps {
  value: Density;
  onChange: (d: Density) => void;
}

export function ViewDensitySwitcher({ value, onChange }: ViewDensitySwitcherProps) {
  const options: { value: Density; icon: typeof Rows3; title: string }[] = [
    { value: 'compact', icon: Rows3, title: '紧凑' },
    { value: 'standard', icon: Rows4, title: '标准' },
    { value: 'comfortable', icon: Rows2, title: '宽松' },
  ];

  return (
    <div className="flex items-center border border-app-border bg-app-surface p-0.5 gap-0.5 rounded-md">
      {options.map(({ value: opt, icon: Icon, title }) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          title={title}
          className={cn(
            'p-1.5 rounded transition-colors',
            value === opt
              ? 'bg-app-elevated text-app-text'
              : 'text-app-text-tertiary hover:text-app-text-secondary'
          )}
        >
          <Icon className="w-3.5 h-3.5" />
        </button>
      ))}
    </div>
  );
}
