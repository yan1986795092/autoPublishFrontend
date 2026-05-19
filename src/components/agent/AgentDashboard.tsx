import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/helpers';
import { getAgentLabel } from '../../config/agents';
import type { PreviousGeneration } from '../../types';
import {
  BarChart3, CheckCircle2, XCircle, Zap, Clock, Bot,
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

export function AgentDashboard({ generations }: AgentDashboardProps) {
  const stats = useMemo(() => {
    const total = generations.length;
    const successful = generations.filter((g) => g.result?.status === 'completed').length;
    const failed = generations.filter((g) => g.result?.status === 'failed').length;
    const totalTokens = generations.reduce((sum, g) => sum + (g.result?.usage?.tokens_used ?? 0), 0);
    const totalCost = generations.reduce((sum, g) => sum + (g.result?.usage?.estimated_cost ?? 0), 0);
    const totalTime = generations.reduce((sum, g) => sum + (g.result?.usage?.time_elapsed ?? 0), 0);

    // Per-agent stats
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

    // Recent activity (last 7 days)
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentCount = generations.filter((g) => g.timestamp > sevenDaysAgo).length;

    return { total, successful, failed, totalTokens, totalCost, totalTime, agentMap, recentCount };
  }, [generations]);

  if (generations.length === 0) return null;

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
