import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../utils/helpers';
import { Button } from '../components/ui/button';
import { useAgentStore } from '../stores/useAgentStore';
import { agentApi } from '../services/api';
import type { AgentMetrics } from '../types';
import {
  Activity, Database, Zap, Layers, Cpu, RefreshCw,
  CheckCircle2, XCircle, AlertTriangle, Clock, BarChart3,
  TrendingUp, TrendingDown,
} from 'lucide-react';

// ── Format helpers ──

function formatPct(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}

// ── Status Badge ──

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
      ok ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
    }`}>
      {ok ? <CheckCircle2 className="w-2.5 h-2.5" /> : <XCircle className="w-2.5 h-2.5" />}
      {label}
    </span>
  );
}

// ── Stat Card ──

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color: string;
}) {
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
    </motion.div>
  );
}

// ── Tab Bar ──

type TabKey = 'overview' | 'stats';

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'overview', label: '系统概览', icon: '📊' },
  { key: 'stats', label: '数据统计', icon: '📈' },
];

// ── Component ──

export function OperationsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  // Metrics state
  const [metrics, setMetrics] = useState<AgentMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [stale, setStale] = useState(false);

  // Task history for stats
  const { taskHistory, loadTaskHistory } = useAgentStore();
  const [historyLoaded, setHistoryLoaded] = useState(false);

  const fetchMetrics = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError('');
    try {
      const res = await agentApi.getMetrics();
      if (res.data.success && res.data.data) {
        setMetrics(res.data.data);
        setStale(false);
      } else {
        setError('获取指标失败');
        setStale(true);
      }
    } catch {
      setStale(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    const timer = setInterval(() => fetchMetrics(true), 15_000);
    return () => clearInterval(timer);
  }, [fetchMetrics]);

  // Load task history for stats tab
  useEffect(() => {
    if (!historyLoaded) {
      loadTaskHistory().finally(() => setHistoryLoaded(true));
    }
  }, [historyLoaded, loadTaskHistory]);

  // ── Derived stats ──

  const stats = useMemo(() => {
    const total = taskHistory.length;
    const completed = taskHistory.filter(t => t.state === 'completed').length;
    const failed = taskHistory.filter(t => t.state === 'failed').length;
    const running = taskHistory.filter(t => t.state === 'running').length;
    const pending = taskHistory.filter(t => t.state === 'pending').length;

    const durations = taskHistory
      .filter(t => t.result && typeof t.result === 'object')
      .map(t => ((t.result as any)?.usage?.time_elapsed as number) || 0)
      .filter(Boolean);
    const avgDuration = durations.length > 0
      ? (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(1)
      : '0';

    // Daily trend (last 7 days)
    const now = Date.now();
    const dayMs = 86400000;
    const dailyCounts: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const start = now - (i + 1) * dayMs;
      const end = now - i * dayMs;
      dailyCounts.push(taskHistory.filter(t => {
        const ts = new Date(t.created_at || t.updated_at || '').getTime();
        return ts >= start && ts < end;
      }).length);
    }

    // Platform distribution
    const platformCount: Record<string, number> = {};
    taskHistory.forEach(t => {
      const p = t.platform_code || 'unknown';
      platformCount[p] = (platformCount[p] || 0) + 1;
    });
    const platformLabels: Record<string, string> = {
      xiaohongshu: '📕 小红书', wechat: '📱 公众号', weibo: '🔵 微博',
      douyin: '🎵 抖音', bilibili: '🅱️ B站', copywriting: '📝 文案',
      'brand-story': '💼 品牌', 'ad-copy': '📢 广告', fiction: '📖 小说',
      script: '🎬 脚本', 'tech-doc': '📘 技术', tutorial: '📗 教程',
      seo: '🔍 SEO', email: '📧 邮件',
    };

    return {
      total, completed, failed, running, pending,
      successRate: total > 0 ? ((completed / total) * 100).toFixed(1) : '0',
      avgDuration, dailyCounts, platformCount, platformLabels,
    };
  }, [taskHistory]);

  // ── Loading state ──

  if (loading && !metrics) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-center h-48">
          <div className="flex items-center gap-2 text-sm text-app-text-secondary">
            <div className="w-4 h-4 rounded-full border-2 border-primary-400 border-t-transparent animate-spin" />
            加载中...
          </div>
        </div>
      </div>
    );
  }

  if (error && !metrics) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-center h-48">
          <div className="text-center space-y-3">
            <AlertTriangle className="w-8 h-8 text-red-400 mx-auto" />
            <p className="text-sm text-red-400">{error}</p>
            <Button variant="link" size="sm" onClick={() => fetchMetrics()}>重试</Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Render ──

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-app-text">运维中心</h1>
            <p className="text-xs text-app-text-secondary mt-0.5">系统监控与数据统计</p>
          </div>
        </div>
        <Button onClick={() => fetchMetrics(true)} disabled={refreshing} variant="outline" size="sm">
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          刷新
        </Button>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 rounded-lg bg-app-surface p-1 border border-white/[0.04]">
        {TABS.map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-all',
              activeTab === key
                ? 'bg-app-elevated text-app-text shadow-sm'
                : 'text-app-text-secondary hover:text-app-text'
            )}
          >
            <span>{icon}</span>
            {label}
          </button>
        ))}
      </div>

      {/* ───────────── Tab: 系统概览 ───────────── */}
      {activeTab === 'overview' && metrics && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          {/* Stale warning */}
          {stale && (
            <div className="flex items-center gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 shadow-sm">
              <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0" />
              <span className="text-xs text-yellow-400">数据可能不是最新</span>
            </div>
          )}

          {/* Stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard icon={Cpu} label="Worker 状态" value={metrics.worker.running ? '运行中' : '已停止'}
              color={metrics.worker.running ? 'text-green-400' : 'text-red-400'} />
            <StatCard icon={Activity} label="活跃任务" value={metrics.tasks.active} sub="当前排队/执行中"
              color="text-blue-400" />
            <StatCard icon={AlertTriangle} label="死信队列" value={metrics.tasks.dlq_size} sub="重试耗尽的任务"
              color={metrics.tasks.dlq_size > 0 ? 'text-yellow-400' : 'text-app-text-tertiary'} />
            <StatCard icon={Database} label="LLM Provider" value={metrics.config.default_llm_provider || 'N/A'}
              color="text-purple-400" />
          </div>

          {/* Cache */}
          <section className="space-y-3">
            <h2 className="text-xs font-medium text-app-text-tertiary uppercase tracking-wider">缓存统计</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { title: 'Agent 缓存', icon: Zap, color: 'text-yellow-400',
                  data: metrics.cache.agent_cache, rate: metrics.cache.agent_cache.hit_rate,
                  gradFrom: 'from-yellow-500', gradTo: 'to-orange-500' },
                { title: 'LLM 缓存', icon: Database, color: 'text-cyan-400',
                  data: metrics.cache.llm_cache, rate: metrics.cache.llm_cache.hit_rate,
                  gradFrom: 'from-cyan-500', gradTo: 'to-blue-500' },
              ].map(({ title, icon: Icon, color, data, rate, gradFrom, gradTo }) => (
                <div key={title} className="rounded-lg border border-app-border/50 bg-app-surface p-4 space-y-3 shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${color}`} />
                      <span className="text-xs font-medium text-app-text">{title}</span>
                    </div>
                    <StatusBadge ok={rate > 0.3} label={formatPct(rate)} />
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center text-[10px]">
                    <div><p className="text-app-text font-medium">{data.entries}</p><p className="text-app-text-tertiary">条目</p></div>
                    <div><p className="text-app-text font-medium">{data.hits}</p><p className="text-app-text-tertiary">命中</p></div>
                    <div><p className="text-app-text font-medium">{data.misses}</p><p className="text-app-text-tertiary">未命中</p></div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[9px] text-app-text-tertiary">
                      <span>缓存利用率</span>
                      <span>{Math.round((data.entries / data.max_entries) * 100)}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-app-border/50 overflow-hidden">
                      <motion.div initial={{ width: 0 }}
                        animate={{ width: `${(data.entries / data.max_entries) * 100}%` }}
                        className={`h-full rounded-full bg-gradient-to-r ${gradFrom} ${gradTo}`} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Queue & Rate */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-lg border border-app-border/50 bg-app-surface p-4 shadow-sm">
              <h3 className="text-xs font-medium text-app-text mb-3">📋 队列深度</h3>
              <div className="space-y-2">
                {metrics.queue?.queues?.map((q: any, i: number) => (
                  <div key={i}>
                    <div className="flex justify-between text-[10px] text-app-text-secondary mb-1">
                      <span>{q.name || `队列 ${i + 1}`}</span>
                      <span>{q.depth ?? 0}</span>
                    </div>
                    <div className="h-1 rounded-full bg-app-border/30 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                        style={{ width: `${Math.min(100, (q.depth ?? 0) * 10)}%` }} />
                    </div>
                  </div>
                )) || <p className="text-[10px] text-app-text-tertiary">无队列数据</p>}
              </div>
            </div>
            <div className="rounded-lg border border-app-border/50 bg-app-surface p-4 shadow-sm">
              <h3 className="text-xs font-medium text-app-text mb-3">⏱️ 速率限制</h3>
              {metrics.rate_limits ? (
                <div className="space-y-2 text-[10px] text-app-text-secondary">
                  <div className="flex justify-between"><span>每分钟请求</span><span>{metrics.rate_limits.requests_per_minute ?? '无限制'}</span></div>
                  <div className="flex justify-between"><span>当前使用</span><span>{metrics.rate_limits.current_usage ?? 0}</span></div>
                </div>
              ) : <p className="text-[10px] text-app-text-tertiary">当前无限制</p>}
            </div>
          </div>

          {/* Auto-refresh */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-app-border/50 bg-app-surface">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[10px] text-app-text-tertiary">每 15 秒自动刷新 · 上次刷新: 刚刚</span>
          </div>
        </motion.div>
      )}

      {/* ───────────── Tab: 数据统计 ───────────── */}
      {activeTab === 'stats' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-lg border border-app-border/50 bg-app-surface p-4 shadow-sm">
              <p className="text-[10px] text-app-text-tertiary mb-1">总执行次数</p>
              <p className="text-2xl font-bold text-app-text">{stats.total}</p>
            </div>
            <div className="rounded-lg border border-app-border/50 bg-app-surface p-4 shadow-sm">
              <p className="text-[10px] text-app-text-tertiary mb-1">成功次数</p>
              <p className="text-2xl font-bold text-green-400">{stats.completed}</p>
              <p className="text-[9px] text-green-400/80 mt-0.5">成功率 {stats.successRate}%</p>
            </div>
            <div className="rounded-lg border border-app-border/50 bg-app-surface p-4 shadow-sm">
              <p className="text-[10px] text-app-text-tertiary mb-1">失败次数</p>
              <p className="text-2xl font-bold text-red-400">{stats.failed}</p>
            </div>
            <div className="rounded-lg border border-app-border/50 bg-app-surface p-4 shadow-sm">
              <p className="text-[10px] text-app-text-tertiary mb-1">平均耗时</p>
              <p className="text-2xl font-bold text-blue-400">{stats.avgDuration}s</p>
            </div>
          </div>

          {/* Daily trend chart */}
          <div className="rounded-lg border border-app-border/50 bg-app-surface p-4 shadow-sm">
            <h3 className="text-xs font-medium text-app-text mb-4">📈 执行趋势（最近 7 天）</h3>
            <div className="h-40 flex items-end gap-2 px-2">
              {stats.dailyCounts.map((count, i) => {
                const max = Math.max(...stats.dailyCounts, 1);
                const height = (count / max) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[9px] text-app-text-tertiary">{count}</span>
                    <div className="w-full rounded-t-md bg-gradient-to-t from-blue-500/40 to-blue-500 transition-all"
                      style={{ height: `${Math.max(height, 2)}%` }} />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between mt-2 text-[8px] text-app-text-tertiary/60">
              {['6天前', '5天前', '4天前', '3天前', '2天前', '昨天', '今天'].map(d => (
                <span key={d}>{d}</span>
              ))}
            </div>
          </div>

          {/* Platform & Status distribution */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-lg border border-app-border/50 bg-app-surface p-4 shadow-sm">
              <h3 className="text-xs font-medium text-app-text mb-3">🎯 按平台分布</h3>
              <div className="space-y-3">
                {Object.entries(stats.platformCount)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 6)
                  .map(([code, count]) => {
                    const pct = stats.total > 0 ? ((count / stats.total) * 100).toFixed(0) : '0';
                    return (
                      <div key={code}>
                        <div className="flex justify-between text-[10px] text-app-text-secondary mb-1">
                          <span>{stats.platformLabels[code] || code}</span>
                          <span>{pct}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-app-border/30 overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                            style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            <div className="rounded-lg border border-app-border/50 bg-app-surface p-4 shadow-sm">
              <h3 className="text-xs font-medium text-app-text mb-3">📊 执行状态分布</h3>
              <div className="space-y-3">
                {[
                  { label: '✅ 成功', count: stats.completed, color: 'bg-green-500' },
                  { label: '❌ 失败', count: stats.failed, color: 'bg-red-500' },
                  { label: '🔄 运行中', count: stats.running, color: 'bg-blue-500' },
                  { label: '⏳ 排队中', count: stats.pending, color: 'bg-yellow-500' },
                ].map(({ label, count, color }) => {
                  const pct = stats.total > 0 ? ((count / stats.total) * 100).toFixed(1) : '0';
                  return (
                    <div key={label}>
                      <div className="flex justify-between text-[10px] text-app-text-secondary mb-1">
                        <span>{label}</span>
                        <span>{count} ({pct}%)</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-app-border/30 overflow-hidden">
                        <div className={`h-full rounded-full ${color}`}
                          style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {stats.total === 0 && (
            <div className="text-center py-12 text-app-text-tertiary">
              <Clock className="w-8 h-8 mx-auto mb-2" />
              <p className="text-xs">暂无执行数据</p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
