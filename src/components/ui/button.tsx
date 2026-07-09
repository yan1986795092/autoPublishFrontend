import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/helpers';

const buttonVariants = cva(
  `inline-flex items-center justify-center gap-1.5 whitespace-nowrap font-medium font-sans
   transition-all duration-150 cursor-pointer select-none
   disabled:pointer-events-none disabled:opacity-40
   active:scale-[0.98]`,
  {
    variants: {
      variant: {
        default: 'bg-app-elevated text-app-text border border-app-border hover:bg-app-hover hover:border-app-border-light active:bg-app-surface',
        primary: 'bg-primary-600 text-white hover:bg-primary-500 active:bg-primary-700',
        destructive: 'bg-red-600 text-white hover:bg-red-500 active:bg-red-700',
        gradient: 'bg-gradient-primary text-white hover:shadow-[0_0_16px_rgba(59,130,246,0.3)] active:opacity-90',
        outline: 'border border-app-border text-gray-200 hover:bg-app-elevated hover:border-app-border-light active:bg-gray-800',
        ghost: 'text-gray-400 hover:text-white hover:bg-app-elevated active:bg-app-surface',
        'ghost-glow': 'text-primary-400 hover:text-primary-300 hover:bg-primary-600/10 active:bg-primary-600/20 hover:shadow-[0_0_12px_rgba(59,130,246,0.1)]',
        link: 'text-primary-500 underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-8 px-3 text-sm rounded-md',
        xs: 'h-6 px-1.5 text-[10px] rounded-md',
        sm: 'h-7 px-2.5 text-xs rounded-md',
        lg: 'h-9 px-4 text-sm rounded-lg',
        xl: 'h-10 px-5 text-sm rounded-lg',
        icon: 'h-8 w-8 text-sm rounded-md',
        'icon-sm': 'h-7 w-7 text-xs rounded-md',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, onClick, disabled, ...props }, ref) => {
    const { 'aria-label': ariaLabel, ...restProps } = props;
    const Comp = asChild ? Slot : 'button';
    return (
      // 修复: 去掉 RippleEffect wrapper。RippleEffect 外层 div 的 onClick 在某些
      // React + Radix Slot 组合下可能导致 button 的 onClick 事件链不完整（尤其是
      // macOS Safari 的事件模型），从而出现"点击按钮无效"的 bug。
      // ripple 效果是纯视觉装饰，去掉不影响按钮核心功能。
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        onClick={onClick}
        disabled={disabled}
        aria-label={ariaLabel}
        {...restProps}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
