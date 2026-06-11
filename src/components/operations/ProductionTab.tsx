import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ComposedChart,
} from 'recharts';
import { FileText, TrendingUp, Cpu, Clock, AlertTriangle } from 'lucide-react';
import { operationsApi } from '../../services/api';
import { StatCard } from './StatCard';
import type { ProductionMetrics } from '../../types/operations';

// ── Custom Tooltips ──
function TrendTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-app-border/50 bg-app-surface p-3 shadow-lg text-[11px]">
      <p className="font-medium text-app-text mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} style={{ color: entry.color }}>
          {entry.name}: {entry.value}{entry.name === '累积总量' ? ' 篇' : ' 篇'}
        </p>
      ))}
    </div>
  );
}

function PlatformTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-app-border/50 bg-app-surface p-3 shadow-lg text-[11px]">
      <p className="font-medium text-app-text mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} style={{ color: entry.color }}>
          {entry.payload.count} 篇 ({entry.payload.percentage}%)
        </p>
      ))}
    </div>
  );
}

function formatPct(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}

export function ProductionTab() {
  const [data, setData] = useState<ProductionMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [trendDays, setTrendDays] = useState<7 | 30>(7);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await operationsApi.getProductionMetrics();
      if (res.data.success && res.data.data) {
        setData(res.data.data);
      } else {
        setError('获取数据失败');
      }
    } catch {
      setError('网络错误');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
    const timer = setInterval(fetch, 60_000);
    return () => clearInterval(timer);
  }, [fetch]);

  // ── Loading ──
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

  // ── Error ──
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

  // ── KPI colors ──
  const dailyColor = data.daily.change_vs_yesterday >= 0 ? 'text-green-400' : 'text-red-400';
  const weeklyColor = data.weekly.change_vs_last_week >= 0 ? 'text-green-400' : 'text-red-400';
  const aiColor = data.ai_generation_ratio >= 0.7 ? 'text-green-400' : data.ai_generation_ratio < 0.4 ? 'text-yellow-400' : 'text-blue-400';
  const timeColor = data.avg_completion_time_min < 10 ? 'text-green-400' : data.avg_completion_time_min < 20 ? 'text-yellow-400' : 'text-red-400';

  const trendData = data.trend.slice(-trendDays);
  const platformData = [...data.platform_distribution].sort((a, b) => b.count - a.count);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* KPI 横幅 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          icon={FileText} label="今日产量"
          value={data.daily.count}
          sub={`vs 昨日`}
          color={dailyColor}
          trend={data.daily.change_vs_yesterday * 100}
        />
        <StatCard
          icon={TrendingUp} label="本周总量"
          value={data.weekly.count}
          sub="本周累计"
          color={weeklyColor}
          trend={data.weekly.change_vs_last_week * 100}
        />
        <StatCard
          icon={Cpu} label="AI 生成占比"
          value={formatPct(data.ai_generation_ratio)}
          color={aiColor}
          sub={`${Math.round(data.ai_generation_ratio * 100)}% 由 AI 生成`}
        />
        <StatCard
          icon={Clock} label="平均完成耗时"
          value={`${Math.round(data.avg_completion_time_min)} min`}
          color={timeColor}
          sub={data.avg_completion_time_min < 10 ? '效率良好' : '需关注'}
        />
      </div>

      {/* 生产趋势图 */}
      <div className="rounded-lg border border-app-border/50 bg-app-surface p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-medium text-app-text">生产趋势</h3>
          <div className="flex gap-1">
            {([7, 30] as const).map((d) => (
              <button
                key={d}
                onClick={() => setTrendDays(d)}
                className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                  trendDays === d
                    ? 'bg-primary-600 text-white'
                    : 'text-app-text-tertiary hover:text-app-text-secondary'
                }`}
              >
                {d}日
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border, #2d2d3d)" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#888' }}
              tickFormatter={(v: string) => v.slice(5)} />
            <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#888' }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#888' }} />
            <Tooltip content={<TrendTooltip />} />
            <Bar yAxisId="left" dataKey="completed" name="每日完成" fill="#3b82f6" radius={[3, 3, 0, 0]} />
            <Line yAxisId="right" type="monotone" dataKey="cumulative" name="累积总量" stroke="#8b5cf6" strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* 平台产量分布 */}
      <div className="rounded-lg border border-app-border/50 bg-app-surface p-4 shadow-sm">
        <h3 className="text-xs font-medium text-app-text mb-4">平台产量分布</h3>
        <ResponsiveContainer width="100%" height={Math.max(120, platformData.length * 40)}>
          <BarChart data={platformData} layout="vertical" margin={{ left: 80, right: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border, #2d2d3d)" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 10, fill: '#888' }} />
            <YAxis type="category" dataKey="platform_name" tick={{ fontSize: 10, fill: '#ccc' }} width={80} />
            <Tooltip content={<PlatformTooltip />} />
            <Bar dataKey="count" name="产量" fill="#3b82f6" radius={[0, 3, 3, 0]}
              label={{ position: 'right', fontSize: 10, fill: '#888',
                formatter: ((_: any, entry: any) => `${entry.payload.percentage}% (${entry.payload.count})`) as any }} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 自动刷新 */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-app-border/50 bg-app-surface">
        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <span className="text-[10px] text-app-text-tertiary">每 60 秒自动刷新</span>
      </div>
    </motion.div>
  );
}
