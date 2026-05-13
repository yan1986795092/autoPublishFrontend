import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/helpers';

const badgeVariants = cva(
  `inline-flex items-center gap-1 font-medium rounded-md transition-colors`,
  {
    variants: {
      variant: {
        default: 'bg-gray-800 text-gray-200',
        primary: 'bg-primary-600/20 text-primary-400',
        secondary: 'bg-gray-800 text-gray-400',
        accent: 'bg-amber-600/20 text-amber-400',
        success: 'bg-green-600/20 text-green-400',
        warning: 'bg-amber-600/20 text-amber-400',
        error: 'bg-red-600/20 text-red-400',
        info: 'bg-blue-600/20 text-blue-400',
        outline: 'border border-app-border text-app-text-secondary bg-transparent',
        xhs: 'bg-pink-600/20 text-pink-400',
        wechat: 'bg-green-600/20 text-green-400',
        zhihu: 'bg-blue-600/20 text-blue-400',
      },
      size: {
        default: 'h-5 px-2 py-0 text-xs',
        xs: 'h-3.5 px-1 py-0 text-[9px]',
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

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
