import React, { memo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '../../../utils/helpers';
import type { ErrorPart } from './types';

interface ErrorPartProps {
  part: ErrorPart;
  onRetry?: () => void;
}

function ErrorPartInner({ part, onRetry }: ErrorPartProps) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div
      className={cn(
        'my-2 rounded-lg border px-3 py-2',
        'border-red-500/30 bg-red-500/5',
      )}
      role="alert"
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-3.5 h-3.5 mt-0.5 text-red-400 shrink-0" />

        <div className="flex-1 min-w-0">
          <p className="text-xs text-red-300">⚠ 生成失败</p>

          {/* Details collapsible */}
          {part.details && (
            <button
              type="button"
              onClick={() => setShowDetails((v) => !v)}
              className="mt-0.5 text-[10px] text-red-400/70 hover:text-red-300 transition-colors"
            >
              {showDetails ? '隐藏详情 ▲' : '查看详情 ▼'}
            </button>
          )}

          {showDetails && part.details && (
            <pre className="mt-1 text-[10px] text-red-300/80 whitespace-pre-wrap break-words font-mono leading-relaxed">
              {part.code ? `[${part.code}] ` : ''}
              {part.message}
              {'\n'}
              {part.details}
            </pre>
          )}
        </div>

        {/* Retry button */}
        {part.retry_supported && onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className={cn(
              'shrink-0 rounded px-2 py-0.5 text-[10px]',
              'text-app-text-tertiary hover:text-primary-400',
              'border border-app-border/40 hover:border-primary-500/40',
              'transition-colors',
            )}
            aria-label="重试"
          >
            重试
          </button>
        )}
      </div>
    </div>
  );
}

export const ErrorPart = memo(ErrorPartInner, (prev, next) => {
  return (
    prev.part.id === next.part.id &&
    prev.part.message === next.part.message &&
    prev.part.code === next.part.code &&
    prev.part.details === next.part.details &&
    prev.part.retry_supported === next.part.retry_supported &&
    prev.part.state === next.part.state &&
    prev.onRetry === next.onRetry
  );
});

ErrorPart.displayName = 'ErrorPart';
