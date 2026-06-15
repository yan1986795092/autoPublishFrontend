import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { agentApi } from '../../services/api';
import { Button } from '../ui/button';
import type { AgentMetrics } from '../../types';
import {
  Activity, Database, Zap, Cpu, Brain, Globe,
  CheckCircle2, XCircle, AlertTriangle, BarChart3,
  Timer, Terminal, Layers, Server,
} from 'lucide-react';
import { StatCard } from './StatCard';

function formatPct(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}

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

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatMs(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms)}ms`;
}

const PROVIDER_LABELS: Record<string, string> = {
  zhipu: '智谱 GLM',
  qwen: '通义千问',
  openai: 'OpenAI',
  deepseek: 'DeepSeek',
};

const PROVIDER_COLORS: Record<string, string> = {
  zhipu: 'text-green-400',
  qwen: 'text-blue-400',
  openai: 'text-purple-400',
  deepseek: 'text-yellow-400',
};

function ProviderBadge({ provider, enabled }: { provider: string; enabled: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium border ${
      enabled
        ? 'border-green-500/30 bg-green-500/10 text-green-400'
        : 'border-app-border/30 text-app-text-tertiary opacity-50'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${enabled ? 'bg-green-400' : 'bg-app-border'}`} />
      {PROVIDER_LABELS[provider] || provider}
    </span>
  );
}

const AGENT_LABELS: Record<string, string> = {
  WritingAgent: '内容创作',
  SEOAgent: 'SEO 优化',
  ReviewAgent: '质量审核',
  ManagerAgent: '任务编排',
  ResearchAgent: '调研分析',
  FactCheckAgent: '事实核查',
  TranslationAgent: '翻译',
};

export function SystemTab() {
  const [metrics, setMetrics] = useState<AgentMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [stale, setStale] = useState(false);

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

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="flex items-center gap-2 text-sm text-app-text-secondary">
          <div className="w-4 h-4 rounded-full border-2 border-primary-400 border-t-transparent animate-spin" />
          <span>加载中...</span>
        </div>
      </div>
    );
  }

  if (error && !metrics) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-red-400 mx-auto" />
          <p className="text-sm text-red-400">{error}</p>
          <Button variant="link" size="sm" onClick={() => fetchMetrics()}>重试</Button>
        </div>
      </div>
    );
  }

  if (!metrics) return null;

  const { agent_runs: ar, llm_calls: llm, tool_calls: tc, history, config } = metrics;
  const runColor = ar.success_rate >= 0.9 ? 'text-green-400' : ar.success_rate >= 0.7 ? 'text-yellow-400' : 'text-red-400';
  const llmErrColor = llm.errors === 0 ? 'text-green-400' : 'text-red-400';
  const byModel = llm.by_model || {};
  const byProvider = llm.by_provider || {};
  const providers = config.providers || {};

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {metrics && (
        <>
          {stale && (
            <div className="flex items-center gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 shadow-sm">
              <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0" />
              <span className="text-xs text-yellow-400">数据可能不是最新</span>
            </div>
          )}

          {/* ── 系统概览 ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard icon={Cpu} label="Worker 状态" value={metrics.worker.running ? '运行中' : '已停止'}
              color={metrics.worker.running ? 'text-green-400' : 'text-red-400'} />
            <StatCard icon={Activity} label="活跃任务" value={metrics.tasks.active}
              color="text-blue-400" sub="当前排队/执行中" />
            <StatCard icon={AlertTriangle} label="死信队列" value={metrics.tasks.dlq_size}
              color={metrics.tasks.dlq_size > 0 ? 'text-yellow-400' : 'text-app-text-tertiary'}
              sub="重试耗尽的任务" />
            <StatCard icon={Database} label="LLM Gateway"
              value={config.llm_gateway_url?.replace(/^https?:\/\//, '') || 'N/A'}
              color="text-purple-400" sub={`Provider: ${config.default_llm_provider}`} />
          </div>

          {/* ── LLM 供应商状态 ── */}
          <section className="space-y-3">
            <h2 className="text-xs font-medium text-app-text-tertiary uppercase tracking-wider flex items-center gap-2">
              <Server className="w-3.5 h-3.5" />
              LLM 供应商
            </h2>
            <div className="flex flex-wrap gap-2">
              {Object.entries(providers).map(([key, enabled]) => (
                <ProviderBadge key={key} provider={key} enabled={!!enabled} />
              ))}
            </div>
          </section>

          {/* ── Agent 运行统计（实时 + 累计）── */}
          <section className="space-y-3">
            <h2 className="text-xs font-medium text-app-text-tertiary uppercase tracking-wider flex items-center gap-2">
              <Brain className="w-3.5 h-3.5" />
              Agent 运行统计
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard icon={BarChart3} label="当前进程运行数" value={ar.total} color="text-blue-400"
                sub={history ? `累计 ${history.agent_runs_total} 次` : undefined} />
              <StatCard icon={CheckCircle2} label="成功率" value={formatPct(ar.success_rate)} color={runColor}
                sub={`成功 ${ar.success} / 失败 ${ar.failed}`} />
              <StatCard icon={Timer} label="P95 耗时" value={formatMs(ar.p95_duration_ms)} color="text-cyan-400" />
              <StatCard icon={XCircle} label="超时次数" value={ar.timeout} color={ar.timeout > 0 ? 'text-yellow-400' : 'text-app-text-tertiary'} />
            </div>
          </section>

          {/* ── Agent 执行分布（DB 累计）── */}
          {history && history.agents.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xs font-medium text-app-text-tertiary uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-3.5 h-3.5" />
                Agent 执行分布
              </h2>
              <div className="grid grid-cols-1 gap-2">
                {history.agents.map((a) => (
                  <div key={a.name} className="rounded-lg border border-app-border/50 bg-app-surface p-3 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium text-app-text min-w-[80px]">{AGENT_LABELS[a.name] || a.name}</span>
                      <span className="text-[10px] text-app-text-secondary">
                        <strong className="text-app-text">{a.calls}</strong> 次调用
                      </span>
                      <span className="text-[10px] text-app-text-secondary">
                        <strong className="text-app-text">{formatTokens(a.tokens)}</strong> tokens
                      </span>
                    </div>
                    <span className="text-[10px] text-app-text-tertiary">
                      平均 {a.avg_time_s.toFixed(1)}s
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── LLM 调用统计 ── */}
          <section className="space-y-3">
            <h2 className="text-xs font-medium text-app-text-tertiary uppercase tracking-wider flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5" />
              LLM 调用统计（当前进程）
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard icon={BarChart3} label="总请求数" value={llm.total} color="text-blue-400" />
              <StatCard icon={Activity} label="Token 消耗" value={formatTokens(llm.total_tokens)}
                color="text-purple-400"
                sub={`输入 ${formatTokens(llm.prompt_tokens)} / 输出 ${formatTokens(llm.completion_tokens)}`} />
              <StatCard icon={Timer} label="P95 延迟" value={formatMs(llm.p95_duration_ms)} color="text-cyan-400" />
              <StatCard icon={XCircle} label="错误数" value={llm.errors} color={llmErrColor} />
            </div>

            {/* 累计概况 */}
            {history && (
              <div className="rounded-lg border border-app-border/50 bg-app-surface p-3 text-[10px] text-app-text-secondary flex items-center gap-4 shadow-sm">
                <span>累计 Token: <strong className="text-app-text">{formatTokens(history.llm_tokens_total)}</strong></span>
                <span>累计费用: <strong className="text-app-text">¥{history.llm_cost_total.toFixed(2)}</strong></span>
              </div>
            )}
          </section>

          {/* ── 模型分布 ── */}
          {Object.keys(byModel).length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xs font-medium text-app-text-tertiary uppercase tracking-wider flex items-center gap-2">
                <Database className="w-3.5 h-3.5" />
                模型调用分布
              </h2>
              <div className="grid grid-cols-1 gap-2">
                {Object.entries(byModel).map(([model, data]) => {
                  const totalM = data.calls || 1;
                  const errRate = data.errors / totalM;
                  return (
                    <div key={model} className="rounded-lg border border-app-border/50 bg-app-surface p-3 space-y-2 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-app-text">{model}</span>
                        <StatusBadge ok={errRate < 0.2} label={`${data.errors} 错误`} />
                      </div>
                      <div className="flex gap-4 text-[10px]">
                        <span className="text-app-text-secondary">调用 <strong className="text-app-text">{data.calls}</strong> 次</span>
                        <span className="text-app-text-secondary">输入 <strong className="text-app-text">{formatTokens(data.prompt_tokens)}</strong></span>
                        <span className="text-app-text-secondary">输出 <strong className="text-app-text">{formatTokens(data.completion_tokens)}</strong></span>
                      </div>
                      <div className="h-1 rounded-full bg-app-border/30 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            errRate > 0.2 ? 'bg-gradient-to-r from-yellow-500 to-red-500' : 'bg-gradient-to-r from-blue-500 to-purple-500'
                          }`}
                          style={{ width: `${Math.min(100, data.calls * 5)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ── 供应商分布 ── */}
          {Object.keys(byProvider).length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xs font-medium text-app-text-tertiary uppercase tracking-wider flex items-center gap-2">
                <Globe className="w-3.5 h-3.5" />
                供应商调用分布
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Object.entries(byProvider).map(([provider, data]) => (
                  <div key={provider} className="rounded-lg border border-app-border/50 bg-app-surface p-3 shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-app-text">{provider}</span>
                      <span className={`text-[10px] ${data.errors > 0 ? 'text-red-400' : 'text-green-400'}`}>
                        {data.errors > 0 ? `${data.errors} 错误` : '正常'}
                      </span>
                    </div>
                    <div className="flex gap-3 text-[10px]">
                      <span className="text-app-text-secondary">{data.calls} 次调用</span>
                      <span className="text-app-text-secondary">{formatTokens(data.tokens)} tokens</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── 工具调用统计 ── */}
          {Object.keys(tc).length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xs font-medium text-app-text-tertiary uppercase tracking-wider flex items-center gap-2">
                <Globe className="w-3.5 h-3.5" />
                工具调用统计
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(tc).map(([name, data]) => (
                  <div key={name} className="rounded-lg border border-app-border/50 bg-app-surface p-3 space-y-2 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-app-text">{name}</span>
                      {data.errors > 0 ? (
                        <span className="text-[10px] text-red-400">{data.errors} 错误</span>
                      ) : (
                        <span className="text-[10px] text-green-400">正常</span>
                      )}
                    </div>
                    <div className="flex gap-4 text-[10px]">
                      <span className="text-app-text-secondary">调用 <strong className="text-app-text">{data.total}</strong> 次</span>
                      <span className="text-app-text-secondary">错误率 <strong className={data.errors > 0 ? 'text-red-400' : 'text-app-text'}>
                        {data.total > 0 ? formatPct(data.errors / data.total) : '0%'}
                      </strong></span>
                    </div>
                    <div className="h-1 rounded-full bg-app-border/30 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          data.errors > 0 ? 'bg-gradient-to-r from-yellow-500 to-red-500' : 'bg-gradient-to-r from-blue-500 to-purple-500'
                        }`}
                        style={{ width: `${Math.min(100, data.total * 2)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── 缓存统计 ── */}
          <section className="space-y-3">
            <h2 className="text-xs font-medium text-app-text-tertiary uppercase tracking-wider">缓存统计</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {([
                { title: 'Agent 缓存', icon: Zap, color: 'text-yellow-400',
                  data: metrics.cache.agent_cache, rate: metrics.cache.agent_cache.hit_rate,
                  gradFrom: 'from-yellow-500', gradTo: 'to-orange-500',
                  entryKey: 'entries', maxKey: 'max_entries' },
                { title: 'LLM 缓存', icon: Database, color: 'text-cyan-400',
                  data: metrics.cache.llm_cache as any, rate: metrics.cache.llm_cache.hit_rate,
                  gradFrom: 'from-cyan-500', gradTo: 'to-blue-500',
                  entryKey: 'size', maxKey: 'max_size' },
              ] as const).map(({ title, icon: Icon, color, data, rate, gradFrom, gradTo, entryKey, maxKey }) => (
                <div key={title} className="rounded-lg border border-app-border/50 bg-app-surface p-4 space-y-3 shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${color}`} />
                      <span className="text-xs font-medium text-app-text">{title}</span>
                    </div>
                    <StatusBadge ok={rate > 0.3} label={formatPct(rate)} />
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center text-[10px]">
                    <div><p className="text-app-text font-medium">{(data as any)[entryKey]}</p><p className="text-app-text-tertiary">条目</p></div>
                    <div><p className="text-app-text font-medium">{data.hits}</p><p className="text-app-text-tertiary">命中</p></div>
                    <div><p className="text-app-text font-medium">{data.misses}</p><p className="text-app-text-tertiary">未命中</p></div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[9px] text-app-text-tertiary">
                      <span>缓存利用率</span>
                      <span>{Math.round(((data as any)[entryKey] / Math.max((data as any)[maxKey], 1)) * 100)}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-app-border/50 overflow-hidden">
                      <motion.div initial={{ width: 0 }}
                        animate={{ width: `${((data as any)[entryKey] / Math.max((data as any)[maxKey], 1)) * 100}%` }}
                        className={`h-full rounded-full bg-gradient-to-r ${gradFrom} ${gradTo}`} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Auto-refresh */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-app-border/50 bg-app-surface">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[10px] text-app-text-tertiary">每 15 秒自动刷新 · 实时数据来自 StatsCollector，累计数据来自 DB</span>
          </div>
        </>
      )}
    </motion.div>
  );
}
