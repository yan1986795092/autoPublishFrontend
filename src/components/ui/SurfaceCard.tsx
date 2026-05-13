import { type ReactNode } from 'react';
import { cn } from '../../utils/helpers';

interface SurfaceCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export function SurfaceCard({
  children,
  className,
  hover = false,
  onClick,
}: SurfaceCardProps) {
  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      className={cn(
        'rounded-lg border border-app-border bg-app-elevated',
        hover && 'cursor-pointer transition-colors hover:bg-app-hover',
        className
      )}
      onClick={onClick}
    >
      {children}
    </Component>
  );
}
