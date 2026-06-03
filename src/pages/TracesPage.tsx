import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Search, RefreshCw, ChevronLeft, ChevronRight, AlertTriangle,
  CheckCircle2, Activity, Filter, X, ExternalLink,
} from 'lucide-react';
import { observabilityApi, type TraceSearchResult, type TraceStats, type TraceDetail } from '../services/api';
import { Button } from '../components/ui/button';
import { cn } from '../utils/helpers';

interface TraceSpan {
  span_id: string;
  trace_id: string;
  parent_span_id?: string;
  operation_name: string;
  service_name: string;
  start_time: string;
  relative_start_ms: number;
  duration_ms: number;
  is_error: boolean;
  tags: Record<string, unknown>;
  logs: Array<{ timestamp: string; fields: Record<string, unknown> }>;
}

const TIME_OPTIONS = [
  { label: '最近 1 小时', value: '1h' },
  { label: '最近 6 小时', value: '6h' },
  { label: '最近 24 小时', value: '24h' },
  { label: '最近 7 天', value: '7d' },
  { label: '最近 30 天', value: '30d' },
];

const SPAN_TYPES = [
  { label: '全部', value: '' },
  { label: 'Agent Run', value: 'agent.run' },
  { label: 'Agent Think', value: 'agent.think' },
  { label: 'Agent Task', value: 'agent.task_run' },
  { label: 'Agent Batch', value: 'agent.batch' },
  { label: 'Tool Call', value: 'tool.call' },
  { label: 'Model Request', value: 'model.request' },
  { label: 'Memory', value: 'memory.' },
  { label: 'Gateway', value: 'gateway.' },
];

const STATUS_OPTIONS = [
  { label: '全部', value: 'all' },
  { label: '成功', value: 'ok' },
  { label: '错误', value: 'error' },
];

function StatusBadge({ isError }: { isError: boolean }) {
  return isError ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-400">
      <AlertTriangle className="w-2.5 h-2.5" />
      错误
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-400">
      <CheckCircle2 className="w-2.5 h-2.5" />
      成功
    </span>
  );
}

function formatDuration(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(0)}μs`;
  if (ms < 1000) return `${ms.toFixed(1)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  } catch {
    return iso;
  }
}

function formatTimeFull(iso: string): string {
  try {
    return new Date(iso).toLocaleString('zh-CN', { hour12: false });
  } catch {
    return iso;
  }
}

interface SearchParams {
  service: string;
  operation: string;
  keyword: string;
  span_type: string;
  status: 'all' | 'error' | 'ok';
  time: string;
}

export function TracesPage() {
  const [result, setResult] = useState<TraceSearchResult | null>(null);
  const [stats, setStats] = useState<TraceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const [params, setParams] = useState<SearchParams>({
    service: 'autopublish-api',
    operation: '',
    keyword: '',
    span_type: '',
    status: 'all',
    time: '1h',
  });
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;

  const fetch = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const [resultData, statsData] = await Promise.all([
        observabilityApi.searchTraces({
          service: params.service,
          operation: params.operation,
          keyword: params.keyword,
          span_type: params.span_type,
          status: params.status,
          time: params.time,
          page,
          page_size: PAGE_SIZE,
        }),
        observabilityApi.getStats({
          service: params.service,
          time: params.time,
        }),
      ]);
      setResult(resultData);
      setStats(statsData);
    } catch (e: unknown) {
      const err = e as Record<string, unknown>;
      const errMsg = (err?.response as Record<string, unknown>)?.data as Record<string, unknown>;
      setError((errMsg?.detail as string) || (e as Error)?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, [params, page]);

  useEffect(() => { fetch(); }, [fetch]);

  const totalPages = result ? Math.ceil(result.total / PAGE_SIZE) : 0;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex-shrink-0 border-b border-app-border/50 bg-app-surface px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5 text-app-accent" />
            <h1 className="text-base font-semibold text-app-text">链路追踪</h1>
            {stats && (
              <span className="text-[11px] text-app-text-tertiary">
                {stats.total_traces.toLocaleString()} traces · {stats.total_spans.toLocaleString()} spans
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => fetch()}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={cn('w-3 h-3', loading && 'animate-spin')} />
              刷新
            </Button>
          </div>
        </div>

        {/* ── Quick stats ────────────────────────────────── */}
        {stats && (
          <div className="grid grid-cols-6 gap-3 mb-4">
            {[
              { label: 'Traces', value: stats.total_traces, color: 'text-app-accent' },
              { label: 'Spans', value: stats.total_spans, color: 'text-app-accent' },
              { label: '错误率', value: `${stats.error_rate}%`, color: stats.error_rate > 5 ? 'text-red-400' : 'text-green-400' },
              { label: 'p50 延迟', value: formatDuration(stats.p50_duration_ms ?? 0), color: 'text-app-text-secondary' },
              { label: 'p95 延迟', value: formatDuration(stats.p95_duration_ms ?? 0), color: 'text-app-text-secondary' },
              { label: 'p99 延迟', value: formatDuration(stats.p99_duration_ms ?? 0), color: 'text-app-text-secondary' },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-md border border-app-border/30 bg-app-elevated px-3 py-2 text-center">
                <p className="text-[10px] text-app-text-tertiary mb-0.5">{label}</p>
                <p className={cn('text-sm font-semibold', color)}>{String(value)}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Search bar ─────────────────────────────────── */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-app-text-tertiary" />
            <input
              type="text"
              value={params.keyword}
              onChange={(e) => setParams((p) => ({ ...p, keyword: e.target.value, operation: '' }))}
              placeholder="搜索关键字 (agent.run, tool.call, error...)"
              className="w-full rounded-md border border-app-border/50 bg-app-bg pl-9 pr-3 py-2 text-[12px] text-app-text placeholder:text-app-text-tertiary focus:outline-none focus:ring-1 focus:ring-app-accent transition-shadow duration-150"
              onKeyDown={(e) => { if (e.key === 'Enter') { setPage(1); fetch(); } }}
            />
          </div>

          <select
            value={params.time}
            onChange={(e) => setParams((p) => ({ ...p, time: e.target.value }))}
            className="rounded-md border border-app-border/50 bg-app-elevated px-2 py-2 text-[11px] text-app-text-secondary focus:outline-none focus:ring-1 focus:ring-app-accent cursor-pointer transition-shadow duration-150"
          >
            {TIME_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <Button
            onClick={() => setShowFilters((v) => !v)}
            variant="outline"
            size="sm"
            className={cn(showFilters && 'border-app-accent bg-app-accent/10 text-app-accent')}
          >
            <Filter className="w-3.5 h-3.5" />
            筛选
          </Button>

          <Button
            onClick={() => setPage(1)}
            variant="primary"
            size="sm"
          >
            <Search className="w-3.5 h-3.5" />
            搜索
          </Button>
        </div>

        {/* ── Filter panel ────────────────────────────────── */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-3 grid grid-cols-3 gap-3"
          >
            <div>
              <label className="mb-1 block text-[10px] font-medium text-app-text-tertiary">服务</label>
              <input
                type="text"
                value={params.service}
                onChange={(e) => setParams((p) => ({ ...p, service: e.target.value }))}
                placeholder="autopublish-api"
                className="w-full rounded-md border border-app-border/50 bg-app-bg px-2 py-1.5 text-[11px] text-app-text placeholder:text-app-text-tertiary focus:outline-none focus:ring-1 focus:ring-app-accent transition-shadow duration-150"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-medium text-app-text-tertiary">操作名</label>
              <input
                type="text"
                value={params.operation}
                onChange={(e) => setParams((p) => ({ ...p, operation: e.target.value }))}
                placeholder="agent.think, tool.call..."
                className="w-full rounded-md border border-app-border/50 bg-app-bg px-2 py-1.5 text-[11px] text-app-text placeholder:text-app-text-tertiary focus:outline-none focus:ring-1 focus:ring-app-accent transition-shadow duration-150"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-medium text-app-text-tertiary">状态</label>
              <div className="flex gap-1">
                {STATUS_OPTIONS.map((o) => (
                  <Button
                    key={o.value}
                    onClick={() => setParams((p) => ({ ...p, status: o.value as 'all' | 'error' | 'ok' }))}
                    variant={params.status === o.value ? 'primary' : 'outline'}
                    size="sm"
                    className="flex-1"
                  >
                    {o.label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="col-span-3">
              <label className="mb-1 block text-[10px] font-medium text-app-text-tertiary">Span 类型</label>
              <div className="flex flex-wrap gap-1">
                {SPAN_TYPES.map((o) => (
                  <button
                    key={o.value}
                    onClick={() => setParams((p) => ({ ...p, span_type: o.value }))}
                    className={cn(
                      'rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors',
                      params.span_type === o.value
                        ? 'border-app-accent bg-app-accent/10 text-app-accent'
                        : 'border-app-border/30 bg-app-elevated text-app-text-tertiary hover:bg-app-surface',
                    )}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
            {(params.keyword || params.operation || params.span_type) && (
              <Button
                onClick={() => setParams((p) => ({ ...p, keyword: '', operation: '', span_type: '' }))}
                variant="ghost"
                size="xs"
                className="col-span-3 text-app-text-tertiary hover:text-app-accent"
              >
                <X className="w-3 h-3" />
                清除筛选
              </Button>
            )}
          </motion.div>
        )}
      </div>

      {/* ── Results table ───────────────────────────────── */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <RefreshCw className="w-5 h-5 text-app-text-tertiary animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <AlertTriangle className="w-6 h-6 text-red-400" />
            <p className="text-[12px] text-app-text-secondary">{error}</p>
            <Button
              onClick={() => fetch()}
              variant="outline"
              size="sm"
            >
              重试
            </Button>
          </div>
        ) : result?.spans.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2">
            <Activity className="w-8 h-8 text-app-text-tertiary/40" />
            <p className="text-[12px] text-app-text-tertiary">暂无追踪数据</p>
            <p className="text-[11px] text-app-text-tertiary/60">确认服务已启动并产生了 tracing 数据</p>
          </div>
        ) : (
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 z-10 bg-app-elevated/40 border-b border-app-border/50">
              <tr>
                {['状态', '时间', '操作名', '服务', 'Trace ID', 'Span ID', '延迟'].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold text-app-text-tertiary uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border/20">
              {(result?.spans as unknown as TraceSpan[]).map((span, i) => (
                <tr
                  key={`${span.trace_id}-${span.span_id}-${i}`}
                  className="hover:bg-app-elevated/50 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-all duration-150 cursor-pointer"
                  onClick={() => setSelectedTraceId(span.trace_id)}
                >
                  <td className="px-4 py-2.5"><StatusBadge isError={span.is_error} /></td>
                  <td className="px-4 py-2.5 font-mono text-app-text-secondary whitespace-nowrap">{formatTime(span.start_time)}</td>
                  <td className="px-4 py-2.5 max-w-[200px]">
                    <span className={cn(
                      'block truncate font-medium',
                      span.operation_name.includes('agent.run') ? 'text-app-accent' :
                      span.operation_name.includes('agent.think') ? 'text-purple-400' :
                      span.operation_name.includes('tool.call') ? 'text-amber-400' :
                      span.operation_name.includes('model.request') ? 'text-blue-400' :
                      'text-app-text',
                    )}>
                      {span.operation_name}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-app-text-tertiary whitespace-nowrap">{span.service_name}</td>
                  <td className="px-4 py-2.5 font-mono text-app-text-tertiary max-w-[120px]">
                    <span className="group relative block">
                      <span className="block truncate">{span.trace_id}</span>
                      <span className="absolute left-0 top-full z-20 hidden group-hover:block bg-app-elevated border border-app-border/50 rounded-md px-2 py-1 text-[10px] font-mono text-app-text whitespace-nowrap shadow-lg">
                        {span.trace_id}
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-app-text-tertiary max-w-[100px]">
                    <span className="block truncate">{span.span_id}</span>
                  </td>
                  <td className="px-4 py-2.5 text-right whitespace-nowrap">
                    <span className={cn(
                      'font-mono',
                      span.duration_ms > 5000 ? 'text-red-400' :
                      span.duration_ms > 1000 ? 'text-amber-400' :
                      'text-app-text-secondary',
                    )}>
                      {formatDuration(span.duration_ms)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Pagination ──────────────────────────────────── */}
      {result && totalPages > 1 && (
        <div className="flex-shrink-0 flex items-center justify-between border-t border-app-border/50 bg-app-surface px-6 py-3">
          <p className="text-[11px] text-app-text-tertiary">
            共 {result.total.toLocaleString()} 条 · 第 {page}/{totalPages} 页
          </p>
          <div className="flex items-center gap-1">
            <Button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              variant="outline"
              size="icon-sm"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = i + Math.max(1, Math.min(page - 2, totalPages - 4));
              return (
                <Button
                  key={p}
                  onClick={() => setPage(p)}
                  variant={p === page ? 'primary' : 'outline'}
                  size="icon-sm"
                >
                  {p}
                </Button>
              );
            })}
            <Button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              variant="outline"
              size="icon-sm"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Trace Detail Drawer ─────────────────────────── */}
      {selectedTraceId && (
        <TraceDrawer
          traceId={selectedTraceId}
          onClose={() => setSelectedTraceId(null)}
        />
      )}
    </div>
  );
}

// ── Trace Detail Drawer ─────────────────────────────────────────────────────

function TraceDrawer({ traceId, onClose }: { traceId: string; onClose: () => void }) {
  const [detail, setDetail] = useState<TraceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSpanId, setActiveSpanId] = useState<string | null>(null);

  useEffect(() => {
    observabilityApi.getTrace(traceId).then((d) => {
      // Build span_map from spans array for component compatibility
      const spanMap: Record<string, TraceSpan> = {};
      if (d.spans) {
        for (const s of d.spans) {
          spanMap[s.span_id] = s;
        }
      }
      setDetail({ ...d, span_map: spanMap } as TraceDetail);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [traceId]);

  const activeSpan = detail?.span_map?.[activeSpanId ?? ''];

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        className="w-[900px] max-w-full bg-app-bg border-l border-app-border/50 flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between border-b border-app-border/50 bg-app-surface px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-app-text">Trace: {traceId.slice(0, 16)}...</h2>
            {detail && (
              <p className="text-[10px] text-app-text-tertiary mt-0.5">
                {detail.span_count} spans · {detail.error_count} errors · {formatDuration(detail.total_duration_ms)}
                · {detail.start_time ? formatTimeFull(detail.start_time) : ''}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {traceId && (
              <Button variant="outline" size="xs" asChild>
                <a
                  href={`/api/v1/observability/traces/${traceId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="w-3 h-3" />
                  原始 JSON
                </a>
              </Button>
            )}
            <Button
              onClick={onClose}
              variant="outline"
              size="icon-sm"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <RefreshCw className="w-5 h-5 text-app-text-tertiary animate-spin" />
            </div>
          ) : detail ? (
            <div className="space-y-6">
              {/* Timeline */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-3.5 rounded-full bg-app-accent/60" />
                  <h3 className="text-[11px] font-semibold text-app-text">链路瀑布图</h3>
                </div>
                <TraceTimeline spans={detail.spans} activeSpanId={activeSpanId} onSelectSpan={setActiveSpanId} />
              </section>

              {/* Span Detail */}
              {activeSpan && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1 h-3.5 rounded-full bg-app-accent/60" />
                    <h3 className="text-[11px] font-semibold text-app-text">Span 详情</h3>
                  </div>
                  <SpanDetailPanel span={activeSpan} />
                </section>
              )}
            </div>
          ) : (
            <p className="text-[12px] text-app-text-tertiary">加载失败</p>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ── Trace Timeline ───────────────────────────────────────────────────────────

function TraceTimeline({
  spans,
  activeSpanId,
  onSelectSpan,
}: {
  spans: TraceSpan[];
  activeSpanId: string | null;
  onSelectSpan: (id: string | null) => void;
}) {
  if (!spans.length) return null;

  const traceDur = Math.max(...spans.map((s) => (s.relative_start_ms as number) + (s.duration_ms as number)));
  const msPerPx = traceDur / 600;

  return (
    <div className="rounded-lg border border-app-border/30 bg-app-surface overflow-hidden">
      <div className="overflow-x-auto">
        <div style={{ minWidth: 800 }}>
          {/* Timeline header */}
          <div className="flex items-center border-b border-app-border/20 px-2 py-1 bg-app-elevated/50">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex-1 text-[9px] text-app-text-tertiary font-mono text-right">
                {formatDuration((traceDur / 9) * i)}
              </div>
            ))}
          </div>

          {/* Spans */}
          {spans.map((span: TraceSpan) => {
            const left = ((span.relative_start_ms as number) / msPerPx) * 600 / 600;
            const width = Math.max(4, ((span.duration_ms as number) / msPerPx) * 600 / 600);
            const isActive = span.span_id === activeSpanId;

            return (
              <div
                key={span.span_id}
                className={cn(
                  'flex items-center border-b border-app-border/10 hover:bg-app-elevated/30 transition-colors cursor-pointer',
                  isActive && 'bg-app-accent/5',
                )}
                onClick={() => onSelectSpan(isActive ? null : span.span_id)}
              >
                <div className="w-52 flex-shrink-0 px-2 py-1.5">
                  <p className={cn(
                    'text-[10px] font-medium truncate',
                    span.operation_name.includes('agent.run') ? 'text-app-accent' :
                    span.operation_name.includes('agent.think') ? 'text-purple-400' :
                    span.operation_name.includes('tool.call') ? 'text-amber-400' :
                    span.operation_name.includes('model.request') ? 'text-blue-400' :
                    'text-app-text',
                  )}>
                    {span.operation_name}
                  </p>
                  <p className="text-[9px] text-app-text-tertiary font-mono truncate">{span.span_id.slice(0, 8)}...</p>
                </div>
                <div className="flex-1 relative h-8">
                  <div
                    className={cn(
                      'absolute top-2.5 h-3 rounded transition-all',
                      span.is_error ? 'bg-red-500/30 border border-red-500/50' :
                      span.operation_name.includes('agent.run') ? 'bg-app-accent/20 border border-app-accent/40' :
                      span.operation_name.includes('agent.think') ? 'bg-purple-500/20 border border-purple-500/40' :
                      span.operation_name.includes('tool.call') ? 'bg-amber-500/20 border border-amber-500/40' :
                      span.operation_name.includes('model.request') ? 'bg-blue-500/20 border border-blue-500/40' :
                      'bg-app-text-tertiary/20 border border-app-text-tertiary/30',
                      isActive && 'ring-1 ring-app-accent',
                    )}
                    style={{ left: `${left}px`, width: `${Math.max(width, 4)}px` }}
                  />
                </div>
                <div className="w-20 flex-shrink-0 px-2 py-1.5 text-right">
                  <span className={cn(
                    'text-[10px] font-mono',
                    span.duration_ms > 5000 ? 'text-red-400' :
                    span.duration_ms > 1000 ? 'text-amber-400' :
                    'text-app-text-secondary',
                  )}>
                    {formatDuration(span.duration_ms)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Span Detail Panel ──────────────────────────────────────────────────────

function SpanDetailPanel({ span }: { span: TraceSpan }) {
  const tags = span.tags || {};
  const importantKeys = [
    'agent.system', 'agent.node', 'agent.skill.name', 'agent.complexity',
    'agent.status', 'agent.task.id', 'task.agent_type', 'batch.size',
    'gen_ai.request.model', 'gen_ai.usage.prompt_tokens',
    'gen_ai.usage.completion_tokens', 'gen_ai.response.latency_ms',
    'llm.model', 'llm.status', 'tool.name', 'tool.category',
  ];

  return (
    <div className="rounded-lg border border-app-border/30 bg-app-surface divide-y divide-app-border/20">
      {/* Meta */}
      <div className="grid grid-cols-3 gap-4 p-4">
        {[
          ['Span ID', span.span_id],
          ['Trace ID', span.trace_id],
          ['Parent Span ID', span.parent_span_id || '(root)'],
          ['操作名', span.operation_name],
          ['服务', span.service_name],
          ['延迟', formatDuration(span.duration_ms)],
          ['开始时间', span.start_time ? formatTimeFull(span.start_time) : ''],
          ['状态', span.is_error ? 'error' : 'ok'],
        ].map(([k, v]) => (
          <div key={k}>
            <p className="text-[9px] text-app-text-tertiary uppercase tracking-wider mb-0.5">{k}</p>
            <p className="text-[11px] font-mono text-app-text truncate" title={String(v)}>{String(v)}</p>
          </div>
        ))}
      </div>

      {/* Key Tags */}
      {importantKeys.some((k) => tags[k]) && (
        <div className="p-4">
          <p className="text-[9px] text-app-text-tertiary uppercase tracking-wider mb-2">关键属性</p>
          <div className="grid grid-cols-2 gap-1">
            {importantKeys.filter((k) => tags[k]).map((k) => (
              <div key={k} className="flex items-start gap-1">
                <span className="text-[10px] text-app-text-tertiary font-mono flex-shrink-0">{k}:</span>
                <span className="text-[10px] text-app-accent font-mono break-all">{String(tags[k])}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Tags */}
      <div className="p-4">
        <p className="text-[9px] text-app-text-tertiary uppercase tracking-wider mb-2">全部标签 ({Object.keys(tags).length})</p>
        <div className="max-h-48 overflow-auto rounded-md border border-app-border/20 bg-app-bg p-2 space-y-0.5">
          {Object.entries(tags).map(([k, v]) => (
            <div key={k} className="flex items-start gap-2">
              <span className="text-[10px] text-purple-400 font-mono flex-shrink-0">{k}</span>
              <span className="text-[10px] text-app-text-secondary font-mono break-all">{String(v)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Log Events */}
      {(span.logs as Array<{ timestamp: string; fields: Record<string, unknown> }>)?.length > 0 && (
        <div className="p-4">
          <p className="text-[9px] text-app-text-tertiary uppercase tracking-wider mb-2">日志事件 ({span.logs.length})</p>
          <div className="space-y-1">
            {(span.logs as Array<{ timestamp: string; fields: Record<string, unknown> }>)?.map((log, i: number) => (
              <div key={i} className="flex items-start gap-2 text-[10px]">
                <span className="text-app-text-tertiary flex-shrink-0 font-mono">{formatTime(log.timestamp as string)}</span>
                <div className="flex-1 space-y-0.5">
                  {Object.entries(log.fields as Record<string, unknown> || {}).map(([k, v]) => (
                    <div key={k} className="flex items-start gap-1">
                      <span className="text-app-text-tertiary font-mono">{k}:</span>
                      <span className="text-app-text-secondary font-mono break-all">{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
