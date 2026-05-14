import { cn } from '../../utils/helpers';

interface FormFieldProps {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormField({ label, error, hint, children, className }: FormFieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label className="text-xs font-medium text-app-text">{label}</label>
      {children}
      {error && <p className="text-[10px] text-red-400 mt-1">{error}</p>}
      {hint && !error && <p className="text-[10px] text-app-text-tertiary mt-1">{hint}</p>}
    </div>
  );
}
