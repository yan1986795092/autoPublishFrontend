import { useMemo } from 'react';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '../ui/button';
import { cn } from '../../utils/helpers';
import { getAgentLabel } from '../../config/agents';
import type { PreviousGeneration } from '../../types';
import { observabilityApi, type DashboardOverview } from '../../services/api';
import {
  BarChart3, CheckCircle2, XCircle, Zap, Clock, Bot,
  TrendingUp, Coins, AlertTriangle, RefreshCw,
} from 'lucide-react';

interface AgentDashboardProps {
  generations: PreviousGeneration[];
}

interface AgentStat {
  agentType: string;
  count: number;
  totalTokens: number;
  totalTime: number;
  successCount: number;
}

function LiveMetricCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number | null;
  sub?: string;
  color: string;
}) {
  return (
    <div className="rounded-lg border border-app-border/30 bg-app-surface p-2.5">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={cn('w-3 h-3', color)} />
        <span className="text-[9px] text-app-text-tertiary uppercase tracking-wider">{label}</span>
      </div>
      <p className={cn('text-base font-semibold', color)}>
        {value === null ? '—' : value}
      </p>
      {sub && <p className="text-[9px] text-app-text-tertiary">{sub}</p>}
    </div>
  );
}

function PrometheusMetricsPanel() {
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await observabilityApi.getDashboardOverview();
        if (!cancelled) setData(res);
      } catch {
        // silently fail — dashboard still works without live metrics
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    const id = setInterval(load, 15000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  const m = data?.metrics;
  const successRate = m?.success_rate_1h != null ? `${(m.success_rate_1h * 100).toFixed(1)}%` : null;
  const cost = m?.cost_1h_usd != null ? `$${m.cost_1h_usd.toFixed(4)}` : null;
  const tokens = m?.token_prompt_1h != null && m?.token_completion_1h != null
    ? (m.token_prompt_1h + m.token_completion_1h).toLocaleString()
    : null;

  return (
    <div className="rounded-lg border border-app-border/50 bg-app-surface p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-medium text-app-text-tertiary uppercase tracking-wider">
          实时指标（Prometheus · 最近 1h）
        </p>
        <Button
          onClick={async () => {
            setLoading(true);
            try {
              const res = await observabilityApi.getDashboardOverview();
              setData(res);
            } catch { /* ignore */ }
            setLoading(false);
          }}
          variant="ghost"
          size="icon-sm"
        >
          <RefreshCw className={cn('w-3 h-3', loading && 'animate-spin')} />
        </Button>
      </div>
      <div className="grid grid-cols-4 gap-2">
        <LiveMetricCard icon={TrendingUp} label="成功率" value={successRate} color="text-green-400" />
        <LiveMetricCard icon={BarChart3} label="运行次数" value={m?.runs_1h != null ? Math.round(m.runs_1h) : null} color="text-blue-400" />
        <LiveMetricCard icon={AlertTriangle} label="错误次数" value={m?.errors_1h != null ? Math.round(m.errors_1h) : null} color="text-red-400" />
        <LiveMetricCard icon={Zap} label="p95 延迟" value={m?.p95_latency_1h != null ? `${m.p95_latency_1h.toFixed(0)}ms` : null} color="text-amber-400" />
        <LiveMetricCard icon={Coins} label="Token 消耗" value={tokens} sub="(提示+补全)" color="text-yellow-400" />
        <LiveMetricCard icon={Coins} label="美元成本" value={cost} sub="(模型费用)" color="text-orange-400" />
        <LiveMetricCard icon={CheckCircle2} label="任务数" value={m?.tasks_1h != null ? Math.round(m.tasks_1h) : null} color="text-cyan-400" />
        <LiveMetricCard icon={BarChart3} label="Spans" value={data?.trace_stats_hour?.total_spans != null ? data.trace_stats_hour.total_spans.toLocaleString() : null} color="text-purple-400" />
      </div>
      {data && (
        <p className="text-[9px] text-app-text-tertiary/60 mt-2">
          更新于 {new Date(data.generated_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
          · 共 {data.trace_stats_hour?.total_traces ?? 0} traces / {data.trace_stats_hour?.total_spans ?? 0} spans
          · 错误率 {data.trace_stats_hour?.error_rate ?? 0}%
        </p>
      )}
    </div>
  );
}

export function AgentDashboard({ generations }: AgentDashboardProps) {
  const stats = useMemo(() => {
    const total = generations.length;
    const successful = generations.filter((g) => g.result?.status === 'completed').length;
    const failed = generations.filter((g) => g.result?.status === 'failed').length;
    const totalTokens = generations.reduce((sum, g) => sum + (g.result?.usage?.tokens_used ?? 0), 0);
    const totalCost = generations.reduce((sum, g) => sum + (g.result?.usage?.estimated_cost ?? 0), 0);
    const totalTime = generations.reduce((sum, g) => sum + (g.result?.usage?.time_elapsed ?? 0), 0);

    const agentMap = new Map<string, AgentStat>();
    generations.forEach((g) => {
      const steps = g.result?.thinking_trace?.steps || [];
      steps.forEach((step) => {
        const existing = agentMap.get(step.agent) || {
          agentType: step.agent,
          count: 0,
          totalTokens: 0,
          totalTime: 0,
          successCount: 0,
        };
        existing.count++;
        existing.totalTokens += step.tokens_used || 0;
        existing.totalTime += step.time_elapsed || 0;
        if (step.status === 'done') existing.successCount++;
        agentMap.set(step.agent, existing);
      });
    });

    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentCount = generations.filter((g) => g.timestamp > sevenDaysAgo).length;

    return { total, successful, failed, totalTokens, totalCost, totalTime, agentMap, recentCount };
  }, [generations]);

  if (generations.length === 0) {
    return (
      <div className="space-y-3">
        <PrometheusMetricsPanel />
      </div>
    );
  }

  const cards = [
    { icon: BarChart3, label: '总生成次数', value: stats.total, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { icon: CheckCircle2, label: '成功', value: stats.successful, color: 'text-green-400', bg: 'bg-green-500/10' },
    { icon: XCircle, label: '失败', value: stats.failed, color: 'text-red-400', bg: 'bg-red-500/10' },
    { icon: Zap, label: '总 Token', value: stats.totalTokens.toLocaleString(), color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
    { icon: Clock, label: '近 7 日', value: stats.recentCount, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { icon: Bot, label: 'Agent 类型', value: stats.agentMap.size, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Live Prometheus Metrics */}
      <PrometheusMetricsPanel />

      {/* Summary cards */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {cards.map((card) => (
          <div key={card.label} className={cn('rounded-lg p-3', card.bg)}>
            <div className="flex items-center gap-1.5 mb-1">
              <card.icon className={cn('w-3 h-3', card.color)} />
              <span className="text-[9px] text-app-text-tertiary">{card.label}</span>
            </div>
            <p className={cn('text-sm font-semibold', card.color)}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Per-agent breakdown */}
      {stats.agentMap.size > 0 && (
        <div className="rounded-lg border border-app-border bg-app-surface p-3">
          <p className="text-[10px] font-medium text-app-text-tertiary uppercase tracking-wider mb-2">Agent 执行统计</p>
          <div className="space-y-1.5">
            {[...stats.agentMap.entries()].map(([agent, stat]) => {
              const pct = stat.count > 0 ? Math.round((stat.successCount / stat.count) * 100) : 0;
              return (
                <div key={agent} className="flex items-center gap-3 text-[10px]">
                  <span className="w-16 font-medium text-app-text truncate" title={agent}>{getAgentLabel(agent)}</span>
                  <div className="flex-1 h-2 rounded-full bg-app-border/50 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-green-500 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-app-text-secondary">{stat.count}次</span>
                  <span className="w-16 text-right text-app-text-tertiary">{stat.totalTokens} tok</span>
                  <span className="w-12 text-right text-app-text-tertiary">{stat.totalTime.toFixed(0)}s</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}
