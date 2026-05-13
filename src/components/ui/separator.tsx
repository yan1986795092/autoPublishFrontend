import * as React from 'react';
import { cn } from '../../utils/helpers';

const Separator = ({ className, orientation = 'horizontal', decorative = true, ...props }: React.ComponentPropsWithoutRef<'div'> & {
  orientation?: 'horizontal' | 'vertical';
  decorative?: boolean;
}) => (
  <div
    role={decorative ? 'none' : 'separator'}
    aria-orientation={orientation}
    className={cn(
      'shrink-0 bg-app-border',
      orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
      className
    )}
    {...props}
  />
);

export { Separator };
