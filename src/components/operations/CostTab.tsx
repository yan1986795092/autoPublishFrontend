import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { DollarSign, FileText, TrendingUp, PieChart as PieChartIcon, AlertTriangle } from 'lucide-react';
import { operationsApi } from '../../services/api';
import { StatCard } from './StatCard';
import type { CostMetrics } from '../../types/operations';

// ── 颜色调色板 ──
const STAGE_COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981'];
const MODEL_COLORS: Record<string, string> = {
  'GPT-4o': '#3b82f6',
  'GPT-4': '#2563eb',
  'gpt-4o': '#3b82f6',
  'gpt-4o-mini': '#60a5fa',
  'GPT-4o-mini': '#60a5fa',
  'GLM': '#8b5cf6',
  'glm': '#8b5cf6',
  '智谱': '#8b5cf6',
  'Qwen': '#10b981',
  'qwen': '#10b981',
  '通义千问': '#10b981',
  'DeepSeek': '#06b6d4',
  'deepseek': '#06b6d4',
  'unknown': '#6b7280',
};

function modelColor(key: string): string {
  return MODEL_COLORS[key] || MODEL_COLORS['unknown'];
}

function CostTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-app-border/50 bg-app-surface p-3 shadow-lg text-[11px]">
      <p className="font-medium text-app-text mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} style={{ color: entry.color }}>
          {entry.name}: ¥{Number(entry.value).toFixed(2)}
        </p>
      ))}
    </div>
  );
}

function DetailTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="rounded-lg border border-app-border/50 bg-app-surface p-3 shadow-lg text-[11px] space-y-0.5">
      <p className="font-medium text-app-text">{d?.stage}</p>
      <p className="text-app-text-secondary">¥{d?.cost.toFixed(2)}</p>
      <p className="text-app-text-tertiary">占 {(d?.percentage * 100).toFixed(1)}%</p>
    </div>
  );
}

export function CostTab() {
  const [data, setData] = useState<CostMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAllDays, setShowAllDays] = useState(false);

  const fetch = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const res = await operationsApi.getCostMetrics();
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
    const timer = setInterval(() => fetch(true), 300_000);
    return () => clearInterval(timer);
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

  const { monthly } = data;

  const budgetColor = monthly.budget_usage_rate < 0.6
    ? 'text-green-400'
    : monthly.budget_usage_rate < 0.8
      ? 'text-yellow-400'
      : monthly.budget_usage_rate < 1.0
        ? 'text-orange-400'
        : 'text-red-400';

  const allModelKeys = [...new Set(data.token_trend.flatMap((d) => Object.keys(d.models)))].filter((k) => k !== 'unknown');
  const hasModelData = allModelKeys.length > 0;
  const areaData = data.token_trend.map((d) => {
    const row: Record<string, any> = { date: d.date.slice(5) };
    for (const key of allModelKeys) {
      row[key] = d.models[key] || 0;
    }
    row.total_cost = d.total_cost;
    return row;
  });

  const displayDetails = showAllDays ? data.daily_details : data.daily_details.slice(0, 7);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* KPI 横幅 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={DollarSign} label="本月总成本" value={`¥${monthly.total_cost.toFixed(2)}`} color="text-blue-400" />
        <StatCard icon={FileText} label="单篇均摊成本" value={`¥${monthly.per_article_cost.toFixed(2)}`} color="text-purple-400" />
        <StatCard icon={TrendingUp} label="日均消耗(7日)" value={`¥${monthly.daily_avg_cost_7d.toFixed(2)}`} color="text-cyan-400" />
        <StatCard icon={PieChartIcon} label="预算使用率" value={`${(monthly.budget_usage_rate * 100).toFixed(1)}%`}
          color={budgetColor}
          sub={`预算 ¥${monthly.monthly_budget.toFixed(2)}`} />
      </div>

      {/* Token 消耗趋势 */}
      <div className="rounded-lg border border-app-border/50 bg-app-surface p-4 shadow-sm">
        <h3 className="text-xs font-medium text-app-text mb-4">Token 消耗趋势</h3>
        {hasModelData ? (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={areaData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border, #2d2d3d)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#888' }} />
              <YAxis tick={{ fontSize: 10, fill: '#888' }}
                tickFormatter={(v: number) => `${(v / 1000000).toFixed(1)}M`} />
              <Tooltip content={<CostTooltip />} />
              {allModelKeys.map((key) => (
                <Area key={key} type="monotone" dataKey={key} name={key}
                  stackId="1" stroke={modelColor(key)} fill={modelColor(key)} fillOpacity={0.6} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-48 text-xs text-app-text-tertiary">
            暂无模型消耗数据
          </div>
        )}
      </div>

      {/* 成本按环节分布 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-lg border border-app-border/50 bg-app-surface p-4 shadow-sm">
          <h3 className="text-xs font-medium text-app-text mb-4">成本按环节分布</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={data.cost_by_stage} dataKey="cost" nameKey="stage"
                cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                paddingAngle={2}>
                {data.cost_by_stage.map((entry, i) => (
                  <Cell key={entry.stage} fill={STAGE_COLORS[i % STAGE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<DetailTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 mt-2 justify-center">
            {data.cost_by_stage.map((entry, i) => (
              <div key={entry.stage} className="flex items-center gap-1.5 text-[10px]">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: STAGE_COLORS[i % STAGE_COLORS.length] }} />
                <span className="text-app-text-secondary">{entry.stage}</span>
                <span className="text-app-text-tertiary">{(entry.percentage * 100).toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* 每日成本明细 */}
        <div className="rounded-lg border border-app-border/50 bg-app-surface p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-medium text-app-text">每日成本明细</h3>
            <button
              onClick={() => setShowAllDays(!showAllDays)}
              className="text-[10px] text-primary-400 hover:underline"
            >
              {showAllDays ? '收起' : '查看全部'}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[10px]">
              <thead>
                <tr className="border-b border-app-border/30 text-app-text-tertiary">
                  <th className="text-left py-1.5 pr-2">日期</th>
                  <th className="text-right py-1.5 px-2">调用次数</th>
                  <th className="text-right py-1.5 px-2">总 Token</th>
                  {hasModelData && allModelKeys.slice(0, 3).map((key) => (
                    <th key={key} className="text-right py-1.5 px-2">{key}</th>
                  ))}
                  <th className="text-right py-1.5 pl-2">总计</th>
                  <th className="text-right py-1.5 pl-2">环比</th>
                </tr>
              </thead>
              <tbody>
                {displayDetails.map((d) => (
                  <tr key={d.date} className="border-b border-app-border/10 hover:bg-app-elevated/20 transition-colors">
                    <td className="py-1.5 pr-2 text-app-text">{d.date.slice(5)}</td>
                    <td className="text-right py-1.5 px-2 text-app-text-secondary">{d.call_count}</td>
                    <td className="text-right py-1.5 px-2 text-app-text-secondary">
                      {(d.total_tokens / 10000).toFixed(1)}万
                    </td>
                    {hasModelData && allModelKeys.slice(0, 3).map((key) => (
                      <td key={key} className="text-right py-1.5 px-2 text-app-text-secondary">
                        {d.model_costs[key] ? `¥${d.model_costs[key].toFixed(2)}` : '—'}
                      </td>
                    ))}
                    <td className="text-right py-1.5 pl-2 text-app-text font-medium">
                      ¥{d.total_cost.toFixed(2)}
                    </td>
                    <td className="text-right py-1.5 pl-2">
                      {d.change_rate !== null ? (
                        <span className={d.change_rate >= 0 ? 'text-red-400' : 'text-green-400'}>
                          {d.change_rate >= 0 ? '+' : ''}{(d.change_rate * 100).toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-app-text-tertiary">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 自动刷新 */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-app-border/50 bg-app-surface">
        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <span className="text-[10px] text-app-text-tertiary">每 5 分钟自动刷新</span>
      </div>
    </motion.div>
  );
}
