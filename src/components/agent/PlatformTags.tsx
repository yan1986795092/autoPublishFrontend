import { cn } from '../../utils/helpers';
import { PUBLISHABLE_PLATFORMS, PLATFORM_MAP } from './PlatformSelector';
import { PlatformIcon } from './PlatformIcons';

interface PlatformTagsProps {
  selected: string | null;
  onSelect: (id: string | null) => void;
}

export function PlatformTags({ selected, onSelect }: PlatformTagsProps) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {PUBLISHABLE_PLATFORMS.map(p => {
        const isSelected = selected === p.id;
        return (
          <button
            key={p.id}
            onClick={() => onSelect(isSelected ? null : p.id)}
            className={cn(
              'rounded-full px-2.5 py-0.5 text-[10px] transition-all',
              isSelected
                ? 'bg-primary-500/20 text-primary-400 ring-1 ring-primary-500/30'
                : 'text-app-text-tertiary hover:text-app-text-secondary hover:bg-app-elevated/50'
            )}
          >
            <PlatformIcon id={p.id} size={14} /> {p.label}
          </button>
        );
      })}
    </div>
  );
}
