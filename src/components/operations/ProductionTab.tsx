import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ComposedChart, Bar, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { FileText, TrendingUp, Eye, MessageSquare, Clock, AlertTriangle } from 'lucide-react';
import { Globe, MessageSquare as MDIcon, Video, BookOpen, Share2, Star } from 'lucide-react';
import { operationsApi } from '../../services/api';
import { StatCard } from './StatCard';
import type { ProductionMetrics } from '../../types/operations';

// ── Tooltip ──
function TrendTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-app-border/50 bg-app-surface p-3 shadow-lg text-[11px]">
      <p className="font-medium text-app-text mb-1">{label}</p>
      {payload.map((e: any, i: number) => (
        <p key={i} style={{ color: e.color }}>
          {e.name}: {e.value}{e.name === '累积总量' ? ' 篇' : ' 篇'}
        </p>
      ))}
    </div>
  );
}

function formatPct(v: number) { return `${(v * 100).toFixed(1)}%`; }
function fmtViews(n: number) {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`;
  return String(n);
}

const PLATFORM_ICON_MAP: Record<string, React.ElementType> = {
  wechat: MDIcon, xiaohongshu: Star, zhihu: BookOpen,
  bilibili: Video, toutiao: Globe, weibo: Share2,
};

const POLL_INTERVAL = 60_000;

export function ProductionTab() {
  const [data, setData] = useState<ProductionMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [trendDays, setTrendDays] = useState<7 | 30>(7);

  const fetch = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const res = await operationsApi.getProductionMetrics();
      if (res.data.success && res.data.data) setData(res.data.data);
      else setError('获取数据失败');
    } catch { setError('网络错误'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetch();
    const t = setInterval(() => fetch(true), POLL_INTERVAL);
    return () => clearInterval(t);
  }, [fetch]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="flex items-center gap-2 text-sm text-app-text-secondary">
          <div className="w-4 h-4 rounded-full border-2 border-primary-400 border-t-transparent animate-spin" />
          加载中...
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-red-400 mx-auto" />
          <p className="text-sm text-red-400">{error}</p>
          <button onClick={fetch} className="text-xs text-primary-400 hover:underline">重试</button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const dailyColor  = data.daily.change_vs_yesterday >= 0 ? 'text-green-400' : 'text-red-400';
  const weeklyColor = data.weekly.change_vs_last_week >= 0 ? 'text-green-400' : 'text-red-400';
  const viewsColor  = data.change_vs_last_week_views >= 0 ? 'text-green-400' : 'text-red-400';
  const timeColor   = data.avg_end_to_end_time_min < 30 ? 'text-green-400'
                     : data.avg_end_to_end_time_min < 120 ? 'text-yellow-400' : 'text-red-400';

  const trendData = data.trend.slice(-trendDays);
  const platData  = [...data.platform_distribution].sort((a, b) => b.count - a.count);
  const maxCount  = platData[0]?.count || 1;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">

      {/* KPI 横幅 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          icon={FileText} label="今日产量"
          value={data.daily.count} sub="今日完成"
          color={dailyColor}
          trend={data.daily.change_vs_yesterday * 100}
          trendLabel="vs 昨日"
        />
        <StatCard
          icon={TrendingUp} label="本周总量"
          value={data.weekly.count} sub="本周累计"
          color={weeklyColor}
          trend={data.weekly.change_vs_last_week * 100}
          trendLabel="vs 上周"
        />
        <StatCard
          icon={Eye} label="平均阅读量"
          value={fmtViews(data.avg_view_count)}
          color={viewsColor}
          sub={`vs 上周 ${data.change_vs_last_week_views >= 0 ? '+' : ''}${(data.change_vs_last_week_views * 100).toFixed(1)}%`}
          trend={data.change_vs_last_week_views * 100}
        />
        <StatCard
          icon={Clock} label="平均完成时长"
          value={`${Math.round(data.avg_end_to_end_time_min)} min`}
          color={timeColor}
          sub={data.avg_end_to_end_time_min < 30 ? '较快' : data.avg_end_to_end_time_min < 120 ? '正常' : '较慢'}
        />
      </div>

      {/* 产量趋势 */}
      <div className="rounded-lg border border-app-border/50 bg-app-surface p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-medium text-app-text">产量趋势</h3>
          <div className="flex gap-1">
            {([7, 30] as const).map(d => (
              <button
                key={d}
                onClick={() => setTrendDays(d)}
                className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                  trendDays === d ? 'bg-primary-600 text-white' : 'text-app-text-tertiary hover:text-app-text-secondary'
                }`}
              >
                {d}日
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border, #2d2d3d)" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#888' }} tickFormatter={v => v.slice(5)} />
            <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#888' }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#888' }} />
            <Tooltip content={<TrendTooltip />} />
            <Bar yAxisId="left" dataKey="completed" name="每日完成" fill="#3b82f6" radius={[3, 3, 0, 0]} />
            <Line yAxisId="right" type="monotone" dataKey="cumulative" name="累积总量"
              stroke="#8b5cf6" strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* 平台产量分布 */}
      <div className="rounded-lg border border-app-border/50 bg-app-surface p-4 shadow-sm">
        <h3 className="text-xs font-medium text-app-text mb-4">平台产量分布</h3>
        <div className="space-y-3">
          {platData.map(p => {
            const Icon = PLATFORM_ICON_MAP[p.platform_code] || Globe;
            const pct = Math.round((p.count / maxCount) * 100);
            return (
              <div key={p.platform_code} className="flex items-center gap-3">
                <Icon className="w-4 h-4 text-app-text-tertiary shrink-0" />
                <span className="text-xs text-app-text-secondary min-w-[80px]">{p.platform_name}</span>
                <div className="flex-1 h-2 rounded-full bg-app-border/30 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                  />
                </div>
                <span className="text-[10px] text-app-text-secondary shrink-0">
                  {p.percentage >= 0.01 ? `${(p.percentage * 100).toFixed(1)}%` : '<1%'} ({p.count})
                </span>
              </div>
            );
          })}
          {platData.length === 0 && (
            <p className="text-xs text-app-text-tertiary text-center py-4">暂无数据</p>
          )}
        </div>
      </div>

      {/* 刷新提示 */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-app-border/50 bg-app-surface">
        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <span className="text-[10px] text-app-text-tertiary">每 {POLL_INTERVAL / 1000} 秒自动刷新</span>
      </div>
    </motion.div>
  );
}
