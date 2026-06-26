import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/helpers';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
};

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return prefersReducedMotion;
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <motion.div
      animate={prefersReducedMotion ? {} : { rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      className={cn(
        'border-2 border-app-border border-t-primary-400 rounded-full',
        sizeMap[size],
        className
      )}
      role="status"
      aria-label="加载中"
    />
  );
}
