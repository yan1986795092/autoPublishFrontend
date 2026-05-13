import * as React from 'react';
import { cn } from '../../utils/helpers';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          `flex h-8 w-full rounded-md border border-app-border bg-app-surface px-3 py-2
           text-sm text-app-text placeholder:text-app-text-tertiary
           transition-all duration-150
           focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/30 focus:shadow-[0_0_0_2px_rgba(59,130,246,0.15)]
           disabled:cursor-not-allowed disabled:opacity-40
           hover:border-app-border-light`,
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
