import { cn } from '../../utils/helpers';
import { formatDuration } from '../../utils/format';

interface UsageBadgeProps {
  usage?: {
    tokens_used?: number;
    time_elapsed?: number;
    model?: string;
  } | null;
  className?: string;
}

function _formatTokens(n: number | undefined): string {
  if (n == null) return '—';
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

/**
 * 显示 Token / 耗时 / 模型 三联指标。
 * - 桌面横排（sm+），移动竖排
 * - 字段缺失时只显示已有字段
 * - 加 aria-label 让屏幕阅读器读出完整三元组
 */
export function UsageBadge({ usage, className }: UsageBadgeProps) {
  if (!usage) return null;
  const { tokens_used, time_elapsed, model } = usage;
  const hasAny =
    tokens_used != null || time_elapsed != null || Boolean(model);
  if (!hasAny) return null;

  const ariaLabel = [
    tokens_used != null ? `Token ${_formatTokens(tokens_used)}` : null,
    time_elapsed != null ? `耗时 ${formatDuration(time_elapsed)}` : null,
    model ? `模型 ${model}` : null,
  ]
    .filter(Boolean)
    .join('，');

  return (
    <div
      className={cn(
        'flex flex-col gap-0.5 text-[10px] text-app-text-tertiary sm:flex-row sm:flex-wrap sm:gap-3',
        className,
      )}
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      {tokens_used != null && (
        <span>Token: {_formatTokens(tokens_used)}</span>
      )}
      {time_elapsed != null && (
        <span>耗时: {formatDuration(time_elapsed)}</span>
      )}
      {model && <span>模型: {model}</span>}
    </div>
  );
}