import { cn } from '../../utils/helpers';

export function SettingsSection({
  title,
  description,
  badge,
  children,
  className,
}: {
  title: string;
  description?: string;
  badge?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-5', className)}>
      <div className="flex items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-app-text">{title}</h3>
            {badge && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                {badge}
              </span>
            )}
          </div>
          {description && (
            <p className="text-xs text-app-text-tertiary mt-0.5">{description}</p>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

// Decorative top border accent line for cards
export function CardAccent({
  from = 'from-primary-500/60',
  via = 'via-transparent',
  to = 'to-transparent',
}: {
  from?: string;
  via?: string;
  to?: string;
}) {
  return <div className={cn('h-px bg-gradient-to-r', from, via, to)} />;
}
