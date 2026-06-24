import * as React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '../../utils/helpers';
import { Input } from './input';

interface PasswordInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  error?: boolean;
  errorMessage?: string;
}

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, error, errorMessage, ...props }, ref) => {
    const [visible, setVisible] = React.useState(false);

    return (
      <div className="w-full">
        <div className="relative">
          <Input
            ref={ref}
            type={visible ? 'text' : 'password'}
            className={cn('pr-10', className)}
            error={error}
            {...props}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className={cn(
              'absolute right-2.5 top-1/2 -translate-y-1/2',
              'text-app-text-tertiary hover:text-app-text-secondary transition-colors',
              'p-1 rounded',
              'focus:outline-none focus-visible:ring-1 focus-visible:ring-primary-500/30'
            )}
            tabIndex={-1}
          >
            {visible ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>
        {errorMessage && (
          <p className="text-[10px] text-red-400 mt-1">{errorMessage}</p>
        )}
      </div>
    );
  }
);
PasswordInput.displayName = 'PasswordInput';
