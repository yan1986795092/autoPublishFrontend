import { cn } from '../../utils/helpers';
import { ALL_PLATFORMS, PLATFORM_MAP } from './PlatformSelector';

interface PlatformTagsProps {
  selected: string | null;
  onSelect: (id: string | null) => void;
}

const POPULAR = ['xiaohongshu', 'wechat', 'weibo', 'douyin'];

export function PlatformTags({ selected, onSelect }: PlatformTagsProps) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {POPULAR.map(id => {
        const p = PLATFORM_MAP.get(id);
        if (!p) return null;
        const isSelected = selected === id;
        return (
          <button
            key={id}
            onClick={() => onSelect(isSelected ? null : id)}
            className={cn(
              'rounded-full px-2.5 py-0.5 text-[10px] transition-all',
              isSelected
                ? 'bg-primary-500/20 text-primary-400 ring-1 ring-primary-500/30'
                : 'text-app-text-tertiary hover:text-app-text-secondary hover:bg-app-elevated/50'
            )}
          >
            {p.icon} {p.label}
          </button>
        );
      })}
      {/* More platforms dropdown */}
      <div className="relative group">
        <button className="rounded-full px-2.5 py-0.5 text-[10px] text-app-text-tertiary hover:text-app-text-secondary hover:bg-app-elevated/50 transition-all">
          +{ALL_PLATFORMS.length - POPULAR.length}
        </button>
        <div className="absolute bottom-full left-0 mb-1 hidden group-hover:block group-focus-within:block z-50">
          <div className="bg-app-elevated border border-app-border rounded-xl p-3 shadow-xl min-w-[200px]">
            <div className="grid grid-cols-2 gap-1">
              {ALL_PLATFORMS.filter(p => !POPULAR.includes(p.id)).map(p => {
                const isSelected = selected === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => onSelect(isSelected ? null : p.id)}
                    className={cn(
                      'rounded-lg px-2 py-1.5 text-[10px] text-left transition-colors flex items-center gap-1.5',
                      isSelected
                        ? 'bg-primary-500/20 text-primary-400'
                        : 'text-app-text-tertiary hover:text-app-text-secondary hover:bg-app-elevated/50'
                    )}
                  >
                    <span>{p.icon}</span>
                    <span>{p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
