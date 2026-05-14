import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { cn } from '../../utils/helpers';
import { Button } from './button';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'flex flex-col items-center justify-center py-12 text-center',
        className
      )}
    >
      {icon && (
        <div className="w-14 h-14 rounded-2xl bg-app-surface border border-app-border flex items-center justify-center mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-semibold text-app-text mb-1">{title}</h3>
      {description && (
        <p className="text-xs text-app-text-tertiary max-w-xs">{description}</p>
      )}
      {action && (
        <Button
          size="sm"
          onClick={action.onClick}
          className="mt-4 bg-primary-600 hover:bg-primary-500 text-xs"
        >
          {action.label}
        </Button>
      )}
    </motion.div>
  );
}
