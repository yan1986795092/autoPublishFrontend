import { motion } from 'framer-motion';

interface PlatformHealthCardProps {
  platform_code: string;
  platform_name: string;
  status: 'healthy' | 'degraded' | 'down';
  today_success: number;
  today_total: number;
  last_failure_time: string | null;
  last_failure_reason: string | null;
  week_success_rate: number;      // 0-1
  week_success_count?: number;
  week_total_count?: number;
  week_trend: number;
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)   return '刚刚';
  if (mins < 60)  return `${mins} 分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} 小时前`;
  return `${Math.floor(hours / 24)} 天前`;
}

const statusConfig = {
  healthy:  { dot: 'bg-green-400',  label: '正常', border: 'border-green-500/20', bg: 'bg-green-500/5' },
  degraded: { dot: 'bg-yellow-400', label: '波动', border: 'border-yellow-500/20', bg: 'bg-yellow-500/5' },
  down:     { dot: 'bg-red-400',    label: '异常', border: 'border-red-500/20',   bg: 'bg-red-500/5' },
};

export function PlatformHealthCard(props: PlatformHealthCardProps) {
  const cfg = statusConfig[props.status];
  const successPct = props.today_total > 0
    ? `${Math.round((props.today_success / props.today_total) * 100)}%`
    : '--';

  const trendLabel = props.week_trend > 0 ? '↑' : props.week_trend < 0 ? '↓' : '—';
  const trendColor = props.week_trend > 0 ? 'text-green-400'
                   : props.week_trend < 0 ? 'text-red-400' : 'text-app-text-tertiary';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-lg border ${cfg.border} ${cfg.bg} p-4 shadow-sm`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} aria-label={cfg.label} />
          <span className="text-sm font-medium text-app-text">{props.platform_name}</span>
        </div>
        <span className={`text-[10px] font-medium ${cfg.dot.replace('bg-', 'text-')}`}>
          {cfg.label}
        </span>
      </div>

      <div className="text-xs text-app-text-secondary space-y-1">
        {props.today_total > 0 ? (
          <>
            <p>今日: {props.today_success}/{props.today_total} 成功 ({successPct})</p>
            {props.last_failure_time && (
              <p>
                最近失败: {formatRelativeTime(props.last_failure_time)}
                {props.last_failure_reason && (
                  <span className="text-app-text-tertiary"> ({props.last_failure_reason})</span>
                )}
              </p>
            )}
          </>
        ) : (
          <p className="text-app-text-tertiary">今日暂无发布记录</p>
        )}
      </div>

      <div className="mt-2 pt-2 border-t border-app-border/30 flex justify-between text-[10px]">
        <span className="text-app-text-tertiary">近7天成功率</span>
        <span className={trendColor}>
          {(props.week_success_rate * 100).toFixed(1)}%
          {props.week_total_count !== undefined && (
            <span className="text-app-text-tertiary ml-1">({props.week_success_count}/{props.week_total_count})</span>
          )}
        </span>
      </div>
    </motion.div>
  );
}
