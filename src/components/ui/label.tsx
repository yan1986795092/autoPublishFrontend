import * as React from 'react';
import { cn } from '../../utils/helpers';

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        'text-xs font-medium text-app-text-secondary leading-none',
        className
      )}
      {...props}
    />
  )
);
Label.displayName = 'Label';

export { Label };
