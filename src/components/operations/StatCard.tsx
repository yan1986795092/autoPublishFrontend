import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  sub?: string | React.ReactNode;
  color?: string;
  trend?: number;
  trendLabel?: string;
  /** 反转趋势颜色语义：数值上升显示红色（如成本），默认上升显示绿色（如产量） */
  trendInverted?: boolean;
}

export function StatCard({
  icon: Icon, label, value, sub, color = 'text-blue-400', trend, trendLabel, trendInverted = false,
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-app-border/50 bg-app-surface p-4 shadow-sm hover:shadow-md transition-all duration-200 hover:border-app-border/80"
    >
      <div className="flex items-center gap-2 mb-2.5">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-[10px] font-medium text-app-text-tertiary uppercase tracking-wider">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-[10px] text-app-text-tertiary mt-0.5">{sub}</p>}
      {trend !== undefined && (
        <div className="flex items-center gap-1 mt-1">
          <span className={`text-[10px] font-medium ${trendInverted ? (trend >= 0 ? 'text-red-400' : 'text-green-400') : (trend >= 0 ? 'text-green-400' : 'text-red-400')}`}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}%
          </span>
          {trendLabel && <span className="text-[9px] text-app-text-tertiary">{trendLabel}</span>}
        </div>
      )}
    </motion.div>
  );
}
