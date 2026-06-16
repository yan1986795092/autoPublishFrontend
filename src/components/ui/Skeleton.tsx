import { cn } from '../../utils/helpers';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'card' | 'avatar' | 'paragraph';
  animate?: boolean;
}

export function Skeleton({ className, variant = 'text', animate = true }: SkeletonProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden bg-app-surface rounded-lg',
        animate && 'before:absolute before:inset-0 before:-translate-x-full before:animate-shimmer before:bg-gradient-to-r before:from-transparent before:via-white/[0.04] before:to-transparent',
        variant === 'text' && 'h-4 w-full',
        variant === 'card' && 'h-32 w-full',
        variant === 'avatar' && 'h-10 w-10 rounded-full',
        variant === 'paragraph' && 'h-20 w-full',
        className
      )}
    />
  );
}

export function SkeletonRow() {
  return (
    <Skeleton className="h-12 w-full rounded-lg" />
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={`skeleton-row-${i}`} />
      ))}
    </div>
  );
}

export function SkeletonCardGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={`skeleton-card-${i}`} className="surface-card p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton variant="avatar" className="h-8 w-8" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-3.5 w-2/3" />
              <Skeleton className="h-2.5 w-1/3" />
            </div>
          </div>
          <Skeleton variant="paragraph" />
          <Skeleton className="h-2.5 w-1/4" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-lg border border-app-border bg-app-elevated p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton variant="avatar" className="h-8 w-8" />
        <div className="space-y-1.5 flex-1">
          <Skeleton className="h-3.5 w-2/3" />
          <Skeleton className="h-2.5 w-1/3" />
        </div>
      </div>
      <Skeleton variant="paragraph" />
      <Skeleton className="h-2.5 w-1/4" />
    </div>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={`skeleton-list-${i}`} />
      ))}
    </div>
  );
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={`skeleton-line-${i}`}
          className={cn(
            'h-3',
            i === lines - 1 ? 'w-3/4' : 'w-full'
          )}
        />
      ))}
    </div>
  );
}
