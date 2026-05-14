import * as React from 'react';
import { cn } from '../../utils/helpers';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  errorMessage?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, errorMessage, ...props }, ref) => {
    return (
      <div className="w-full">
        <input
          type={type}
          className={cn(
            `flex h-8 w-full rounded-md border bg-app-surface px-3 py-2
             text-sm text-app-text placeholder:text-app-text-tertiary
             transition-all duration-150
             focus:outline-none focus:ring-1
             disabled:cursor-not-allowed disabled:opacity-40
             hover:border-app-border-light`,
            error
              ? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/30 focus:shadow-[0_0_0_2px_rgba(239,68,68,0.15)]'
              : 'border-app-border focus:border-primary-500/50 focus:ring-primary-500/30 focus:shadow-[0_0_0_2px_rgba(59,130,246,0.15)]',
            className
          )}
          ref={ref}
          {...props}
        />
        {errorMessage && <p className="text-[10px] text-red-400 mt-1">{errorMessage}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';

export { Input };
