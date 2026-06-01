import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { agentApi } from '../services/api';
import type { AgentMetrics } from '../types';
import {
  Activity, Database, Zap, Layers, Cpu, RefreshCw,
  CheckCircle2, XCircle, AlertTriangle,
} from 'lucide-react';

function formatPct(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
      ok
        ? 'bg-green-500/10 text-green-400'
        : 'bg-red-500/10 text-red-400'
    }`}>
      {ok ? <CheckCircle2 className="w-2.5 h-2.5" /> : <XCircle className="w-2.5 h-2.5" />}
      {label}
    </span>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-app-border/50 bg-app-surface p-4"
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-[10px] font-medium text-app-text-tertiary uppercase tracking-wider">{label}</span>
      </div>
      <p className={`text-xl font-semibold ${color}`}>{value}</p>
      {sub && <p className="text-[10px] text-app-text-tertiary mt-0.5">{sub}</p>}
    </motion.div>
  );
}

export function MetricsPage() {
  const [metrics, setMetrics] = useState<AgentMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetch = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError('');
    try {
      const res = await agentApi.getMetrics();
      if (res.data.success && res.data.data) {
        setMetrics(res.data.data);
      } else {
        setError('获取指标失败');
      }
    } catch (e: any) {
      setError(e?.message || '网络错误');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetch();
    const timer = setInterval(() => fetch(true), 15_000);
    return () => clearInterval(timer);
  }, [fetch]);

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-2 text-sm text-app-text-secondary">
          <div className="w-4 h-4 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
          加载中...
        </div>
      </div>
    );
  }

  if (error && !metrics) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-red-400 mx-auto" />
          <p className="text-sm text-red-400">{error}</p>
          <button onClick={() => fetch()} className="text-xs text-blue-400 hover:underline">重试</button>
        </div>
      </div>
    );
  }

  if (!metrics) return null;

  const cacheHitRate = metrics.cache.agent_cache.hit_rate;
  const llmHitRate = metrics.cache.llm_cache.hit_rate;

  return (
    <div className="mx-auto max-w-4xl h-full overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-app-text">系统监控</h1>
          <p className="text-xs text-app-text-secondary mt-0.5">Agent 系统实时运行指标</p>
        </div>
        <button
          onClick={() => fetch(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 rounded-lg border border-app-border/50 px-3 py-1.5 text-xs text-app-text-secondary hover:text-app-text transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          刷新
        </button>
      </div>

      {/* Worker & Tasks */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          icon={Cpu}
          label="Worker 状态"
          value={metrics.worker.running ? '运行中' : '已停止'}
          color={metrics.worker.running ? 'text-green-400' : 'text-red-400'}
        />
        <StatCard
          icon={Activity}
          label="活跃任务"
          value={metrics.tasks.active}
          sub="当前排队/执行中"
          color="text-blue-400"
        />
        <StatCard
          icon={AlertTriangle}
          label="死信队列"
          value={metrics.tasks.dlq_size}
          sub="重试耗尽的任务"
          color={metrics.tasks.dlq_size > 0 ? 'text-yellow-400' : 'text-app-text-tertiary'}
        />
        <StatCard
          icon={Database}
          label="LLM Provider"
          value={metrics.config.default_llm_provider}
          color="text-purple-400"
        />
      </div>

      {/* Cache Stats */}
      <section className="space-y-3">
        <h2 className="text-xs font-medium text-app-text-tertiary uppercase tracking-wider">缓存统计</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Agent Cache */}
          <div className="rounded-lg border border-app-border/50 bg-app-surface p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-400" />
                <span className="text-xs font-medium text-app-text">Agent 缓存</span>
              </div>
              <StatusBadge ok={cacheHitRate > 0.3} label={formatPct(cacheHitRate)} />
            </div>
            <div className="grid grid-cols-3 gap-3 text-center text-[10px]">
              <div>
                <p className="text-app-text font-medium">{metrics.cache.agent_cache.entries}</p>
                <p className="text-app-text-tertiary">条目 / {metrics.cache.agent_cache.max_entries}</p>
              </div>
              <div>
                <p className="text-app-text font-medium">{metrics.cache.agent_cache.hits}</p>
                <p className="text-app-text-tertiary">命中</p>
              </div>
              <div>
                <p className="text-app-text font-medium">{metrics.cache.agent_cache.misses}</p>
                <p className="text-app-text-tertiary">未命中</p>
              </div>
            </div>
            {/* Progress bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[9px] text-app-text-tertiary">
                <span>缓存利用率</span>
                <span>{Math.round((metrics.cache.agent_cache.entries / metrics.cache.agent_cache.max_entries) * 100)}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-app-border/50 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(metrics.cache.agent_cache.entries / metrics.cache.agent_cache.max_entries) * 100}%` }}
                  className="h-full rounded-full bg-gradient-to-r from-yellow-500 to-orange-500"
                />
              </div>
            </div>
          </div>

          {/* LLM Cache */}
          <div className="rounded-lg border border-app-border/50 bg-app-surface p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-medium text-app-text">LLM 缓存</span>
              </div>
              <StatusBadge ok={llmHitRate > 0.3} label={formatPct(llmHitRate)} />
            </div>
            <div className="grid grid-cols-3 gap-3 text-center text-[10px]">
              <div>
                <p className="text-app-text font-medium">{metrics.cache.llm_cache.size}</p>
                <p className="text-app-text-tertiary">条目 / {metrics.cache.llm_cache.max_size}</p>
              </div>
              <div>
                <p className="text-app-text font-medium">{metrics.cache.llm_cache.hits}</p>
                <p className="text-app-text-tertiary">命中</p>
              </div>
              <div>
                <p className="text-app-text font-medium">{metrics.cache.llm_cache.misses}</p>
                <p className="text-app-text-tertiary">未命中</p>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-[9px] text-app-text-tertiary">
                <span>缓存利用率</span>
                <span>{Math.round((metrics.cache.llm_cache.size / metrics.cache.llm_cache.max_size) * 100)}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-app-border/50 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(metrics.cache.llm_cache.size / metrics.cache.llm_cache.max_size) * 100}%` }}
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Config */}
      <section className="space-y-3">
        <h2 className="text-xs font-medium text-app-text-tertiary uppercase tracking-wider">运行时配置</h2>
        <div className="rounded-lg border border-app-border/50 bg-app-surface p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            {[
              { label: '日志级别', value: metrics.config.log_level },
              { label: '调试模式', value: metrics.config.debug ? '开启' : '关闭' },
              { label: 'Feature Flag', value: [
                metrics.config.enable_reflection && '反思',
                metrics.config.enable_message_bus && '通信总线',
                metrics.config.enable_hitl && '人机协同',
              ].filter(Boolean).join('、') || '无' },
              { label: '最大重试', value: `${metrics.config.worker_max_retries} 次` },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-app-text-tertiary mb-0.5">{label}</p>
                <p className="text-app-text font-medium">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Auto-refresh hint */}
      <p className="text-center text-[10px] text-app-text-tertiary/50">
        每 15 秒自动刷新
      </p>
    </div>
  );
}
