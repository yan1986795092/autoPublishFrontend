import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/helpers';
import type { AsyncTask } from '../../types';

interface TaskProgressBarProps {
  task: AsyncTask;
  className?: string;
}

const STATE_COLORS: Record<string, string> = {
  pending: 'bg-yellow-500',
  running: 'bg-blue-500',
  completed: 'bg-green-500',
  failed: 'bg-red-500',
  cancelled: 'bg-gray-500',
};

const STATE_LABELS: Record<string, string> = {
  pending: '等待中',
  running: '执行中',
  completed: '已完成',
  failed: '失败',
  cancelled: '已取消',
};

export function TaskProgressBar({ task, className }: TaskProgressBarProps) {
  const isRunning = task.state === 'running';
  const isCompleted = task.state === 'completed';
  const isFailed = task.state === 'failed';
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number | null>(null);

  // Estimate time remaining based on progress rate
  useEffect(() => {
    if (!isRunning) {
      setElapsed(0);
      startRef.current = null;
      return;
    }
    if (startRef.current === null) {
      startRef.current = Date.now();
    }
    const timer = setInterval(() => {
      if (startRef.current !== null) {
        setElapsed((Date.now() - startRef.current) / 1000);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [isRunning]);

  const progress = Math.min(task.progress, 100);
  const estimatedRemaining = progress > 5
    ? Math.round((elapsed / progress) * (100 - progress))
    : null;

  return (
    <div className={cn('space-y-2', className)}>
      {/* Status row */}
      <motion.div
        className="flex items-center justify-between text-xs"
        layout
      >
        <div className="flex items-center gap-2">
          <motion.span
            animate={{
              scale: isRunning ? [1, 1.3, 1] : 1,
              opacity: isRunning ? [1, 0.7, 1] : 1,
            }}
            transition={{
              duration: 1.5,
              repeat: isRunning ? Infinity : 0,
              ease: 'easeInOut',
            }}
            className={cn(
              'inline-block h-1.5 w-1.5 rounded-full',
              STATE_COLORS[task.state] || 'bg-gray-500'
            )}
          />
          <span className="font-medium text-app-text">
            {task.progress_message || STATE_LABELS[task.state] || task.state}
          </span>
        </div>
        <div className="flex items-center gap-2 text-app-text-secondary">
          <span>{task.completed_steps}/{task.total_steps} 步骤</span>
        </div>
      </motion.div>

      {/* Progress bar */}
      <div className="relative h-2 overflow-hidden rounded-full bg-app-surface">
        <motion.div
          className={cn(
            'h-full rounded-full',
            STATE_COLORS[task.state] || 'bg-gray-500'
          )}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
        {/* Shimmer effect for running state */}
        {isRunning && (
          <motion.div
            className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/10 to-transparent"
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          />
        )}
      </div>

      {/* Percentage + current step + ETA */}
      <div className="flex items-center justify-between text-xs text-app-text-secondary">
        <span>{Math.round(progress)}%</span>
        <div className="flex items-center gap-3">
          {isRunning && estimatedRemaining !== null && (
            <span className="text-[10px]">
              预计剩余 {estimatedRemaining > 60
                ? `${Math.round(estimatedRemaining / 60)}m`
                : `${estimatedRemaining}s`}
            </span>
          )}
          {isRunning && elapsed > 0 && (
            <span className="text-[10px] font-mono">
              {elapsed > 60
                ? `${Math.floor(elapsed / 60)}m${Math.round(elapsed % 60)}s`
                : `${Math.round(elapsed)}s`}
            </span>
          )}
          {isCompleted && task.completed_at && (
            <span className="text-[10px] text-green-400">已完成</span>
          )}
          {isFailed && (
            <span className="text-[10px] text-red-400">{task.error || '失败'}</span>
          )}
        </div>
      </div>
    </div>
  );
}
