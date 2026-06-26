import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/helpers';

const badgeVariants = cva(
  `inline-flex items-center gap-1 font-medium rounded-md transition-colors`,
  {
    variants: {
      variant: {
        default: 'bg-app-elevated text-app-text-secondary',
        primary: 'bg-primary-600/20 text-primary-400',
        secondary: 'bg-app-surface text-app-text-tertiary',
        accent: 'bg-amber-600/20 text-amber-500',
        success: 'bg-green-600/20 text-green-400',
        warning: 'bg-amber-600/20 text-amber-500',
        error: 'bg-red-600/20 text-red-400',
        info: 'bg-blue-600/20 text-blue-400',
        outline: 'border border-app-border text-app-text-secondary bg-transparent',
        'outline-success': 'border border-green-500/50 text-green-400 bg-transparent',
        'outline-warning': 'border border-amber-500/50 text-amber-400 bg-transparent',
        'outline-error': 'border border-red-500/50 text-red-400 bg-transparent',
        xhs: 'bg-pink-600/20 text-pink-400',
        wechat: 'bg-green-600/20 text-green-400',
      },
      size: {
        default: 'h-5 px-2 py-0 text-xs',
        xs: 'h-3.5 px-1 py-0 text-[10px]',
        sm: 'h-4 px-1.5 py-0 text-[10px]',
        lg: 'h-6 px-3 py-1 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

const dotColors = {
  default: 'bg-app-text-tertiary',
  primary: 'bg-primary-400',
  secondary: 'bg-app-text-tertiary',
  accent: 'bg-amber-400',
  success: 'bg-green-400',
  warning: 'bg-amber-400',
  error: 'bg-red-400',
  info: 'bg-blue-400',
  outline: 'bg-app-text-tertiary',
  'outline-success': 'bg-green-400',
  'outline-warning': 'bg-amber-400',
  'outline-error': 'bg-red-400',
  xhs: 'bg-pink-400',
  wechat: 'bg-green-400',
} as const;

export interface BadgeProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onClick'>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
  removable?: boolean;
  onRemove?: () => void;
}

function Badge({ className, variant, size, dot, removable, onRemove, children, ...props }: BadgeProps) {
  const dotColor = dot ? (dotColors[variant as keyof typeof dotColors] || 'bg-gray-400') : undefined;

  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {dot && (
        <span
          className={cn(
            'inline-block w-1.5 h-1.5 rounded-full flex-shrink-0',
            dotColor
          )}
        />
      )}
      {children}
      {removable && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove?.();
          }}
          className="ml-0.5 -mr-0.5 rounded-sm opacity-60 hover:opacity-100 transition-opacity focus:outline-none focus-visible:ring-1 focus-visible:ring-app-border"
        >
          <span className="sr-only">Remove</span>
          <span className="text-[10px] leading-none">×</span>
        </button>
      )}
    </div>
  );
}

export { Badge, badgeVariants };
