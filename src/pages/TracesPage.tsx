import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Search, RefreshCw, ChevronLeft, ChevronRight, AlertTriangle,
  CheckCircle2, Activity, Filter, X, ExternalLink, Bot,
} from 'lucide-react';
import {
  observabilityApi,
  type TraceSearchResult,
  type TraceStats,
  type TraceDetail,
  type AgentEventSearchResult,
  type AgentEventRow,
} from '../services/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Card } from '../components/ui/card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select';
import { LoadingSpinner } from '../components/ui/loading-spinner';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
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

type PageMode = 'traces' | 'agent-events';

interface TraceSearchParams {
  service: string;
  operation: string;
  keyword: string;
  span_type: string;
  status: 'all' | 'error' | 'ok';
  time: string;
}

interface AgentEventSearchParams {
  service: string;
  session_id: string;
  run_id: string;
  agent_name: string;
  event_type: string;
  keyword: string;
  level: string;
  time: string;
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

const AGENT_EVENT_TYPES = [
  { label: '全部', value: '' },
  { label: '开始', value: 'agent_start' },
  { label: '思考', value: 'thought' },
  { label: '工具调用', value: 'tool_call' },
  { label: '工具结果', value: 'tool_result' },
  { label: '结束', value: 'agent_finish' },
  { label: '错误', value: 'error' },
];

const AGENT_LEVELS = [
  { label: '全部', value: '' },
  { label: 'INFO', value: 'INFO' },
  { label: 'WARNING', value: 'WARNING' },
  { label: 'ERROR', value: 'ERROR' },
];

function StatusBadge({ isError }: { isError: boolean }) {
  return isError ? (
    <span className="inline-flex items-center gap-1 bg-red-500/10 text-red-400 border border-red-500/30 rounded-full px-2 py-0.5 text-[9px]">
      <AlertTriangle className="w-2.5 h-2.5" />
      错误
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 bg-green-500/10 text-green-400 border border-green-500/30 rounded-full px-2 py-0.5 text-[9px]">
      <CheckCircle2 className="w-2.5 h-2.5" />
      成功
    </span>
  );
}

function EventLevelBadge({ level }: { level: string }) {
  const normalized = level.toUpperCase();
  if (normalized === 'ERROR') {
    return <StatusBadge isError />;
  }
  if (normalized === 'WARNING') {
    return (
      <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-full px-2 py-0.5 text-[9px]">
        <AlertTriangle className="w-2.5 h-2.5" />
        警告
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-full px-2 py-0.5 text-[9px]">
      <CheckCircle2 className="w-2.5 h-2.5" />
      {normalized || 'INFO'}
    </span>
  );
}

function formatDuration(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(0)}µs`;
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

function getOperationColor(op: string): string {
  if (op.startsWith('POST ') || op.startsWith('GET ') || op.startsWith('PUT ') || op.startsWith('DELETE '))
    return 'text-green-400';
  if (op.includes('agent.run')) return 'text-app-accent';
  if (op.includes('agent.think')) return 'text-purple-400';
  if (op.includes('tool.call')) return 'text-amber-400';
  if (op.includes('model.request')) return 'text-blue-400';
  if (op.includes('agent.')) return 'text-cyan-400';
  return 'text-app-text';
}

function getEventTypeColor(eventType: string): string {
  if (eventType === 'error') return 'text-red-400';
  if (eventType === 'tool_call') return 'text-amber-400';
  if (eventType === 'tool_result') return 'text-green-400';
  if (eventType === 'thought') return 'text-purple-400';
  if (eventType === 'agent_start' || eventType === 'agent_finish') return 'text-cyan-400';
  return 'text-app-text';
}

function getDurationColor(ms: number): string {
  if (ms > 5000) return 'text-red-400';
  if (ms > 1000) return 'text-amber-400';
  return 'text-app-text-secondary';
}

function truncateText(text: string | undefined, maxLength = 120): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

interface AgentSummaryRow {
  agentName: string;
  total: number;
  errors: number;
  toolCalls: number;
  latestTimestamp: string;
}

function buildAgentSummary(events: AgentEventRow[]): AgentSummaryRow[] {
  const summaryMap = new Map<string, AgentSummaryRow>();

  for (const event of events) {
    const agentName = event.agent_name || 'unknown';
    const current = summaryMap.get(agentName) ?? {
      agentName,
      total: 0,
      errors: 0,
      toolCalls: 0,
      latestTimestamp: event.timestamp || '',
    };

    current.total += 1;
    if (event.event_type === 'error' || event.level?.toUpperCase() === 'ERROR') {
      current.errors += 1;
    }
    if (event.event_type === 'tool_call') {
      current.toolCalls += 1;
    }
    if ((event.timestamp || '') > current.latestTimestamp) {
      current.latestTimestamp = event.timestamp || current.latestTimestamp;
    }

    summaryMap.set(agentName, current);
  }

  return Array.from(summaryMap.values()).sort((a, b) => {
    if (b.errors !== a.errors) return b.errors - a.errors;
    if (b.total !== a.total) return b.total - a.total;
    return a.agentName.localeCompare(b.agentName);
  });
}

export function TracesPage() {
  const [mode, setMode] = useState<PageMode>('traces');
  const [traceResult, setTraceResult] = useState<TraceSearchResult | null>(null);
  const [agentEventResult, setAgentEventResult] = useState<AgentEventSearchResult | null>(null);
  const [stats, setStats] = useState<TraceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const [traceParams, setTraceParams] = useState<TraceSearchParams>({
    service: '',
    operation: '',
    keyword: '',
    span_type: '',
    status: 'all',
    time: '1h',
  });
  const [agentParams, setAgentParams] = useState<AgentEventSearchParams>({
    service: 'autopublish-api',
    session_id: '',
    run_id: '',
    agent_name: '',
    event_type: '',
    keyword: '',
    level: '',
    time: '1h',
  });

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;

  const fetch = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      if (mode === 'traces') {
        const [resultData, statsData] = await Promise.all([
          observabilityApi.searchTraces({
            service: traceParams.service,
            operation: traceParams.operation,
            keyword: traceParams.keyword,
            span_type: traceParams.span_type,
            status: traceParams.status,
            time: traceParams.time,
            page,
            page_size: PAGE_SIZE,
          }),
          observabilityApi.getStats({
            service: traceParams.service,
            time: traceParams.time,
          }),
        ]);
        setTraceResult(resultData);
        setStats(statsData);
      } else {
        const resultData = await observabilityApi.searchAgentEvents({
          service: agentParams.service,
          session_id: agentParams.session_id,
          run_id: agentParams.run_id,
          agent_name: agentParams.agent_name,
          event_type: agentParams.event_type,
          keyword: agentParams.keyword,
          level: agentParams.level,
          time: agentParams.time,
          page,
          page_size: PAGE_SIZE,
        });
        setAgentEventResult(resultData);
      }
    } catch (e: unknown) {
      const err = e as Record<string, unknown>;
      const errMsg = (err?.response as Record<string, unknown>)?.data as Record<string, unknown>;
      setError((errMsg?.detail as string) || (e as Error)?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, [mode, traceParams, agentParams, page]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  useEffect(() => {
    setPage(1);
  }, [mode]);

  useEffect(() => {
    if (mode !== 'agent-events') return;
    fetch(true);
  }, [mode, fetch]);

  const activeTotal = mode === 'traces' ? traceResult?.total ?? 0 : agentEventResult?.total ?? 0;
  const totalPages = activeTotal ? Math.ceil(activeTotal / PAGE_SIZE) : 0;
  const agentSummaryRows = useMemo(
    () => buildAgentSummary(agentEventResult?.events || []),
    [agentEventResult],
  );
  const topErrorAgent = useMemo(
    () => agentSummaryRows.find((row) => row.errors > 0) ?? null,
    [agentSummaryRows],
  );
  const topToolCallAgent = useMemo(
    () => [...agentSummaryRows].sort((a, b) => b.toolCalls - a.toolCalls)[0] ?? null,
    [agentSummaryRows],
  );

  const executeSearch = useCallback(() => {
    setPage(1);
    fetch();
  }, [fetch]);

  const drillDownToAgent = useCallback((agentName: string) => {
    if (!agentName || agentName === '-') return;
    setMode('agent-events');
    setShowFilters(true);
    setAgentParams((p) => ({ ...p, agent_name: agentName }));
    setPage(1);
  }, []);

  useEffect(() => {
    if (mode !== 'agent-events') return;
    if (!agentParams.agent_name) return;
    fetch(true);
  }, [agentParams.agent_name, mode, fetch]);

  return (
    <div className="max-w-4xl mx-auto p-6 flex flex-col h-full overflow-hidden">
      <div className="flex-shrink-0 border-b border-app-border/50 bg-app-surface px-6 py-4">
        <div className="flex items-center justify-between mb-4 gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {mode === 'traces' ? (
              <Activity className="w-5 h-5 text-app-accent" />
            ) : (
              <Bot className="w-5 h-5 text-app-accent" />
            )}
            <h1 className="text-base font-semibold text-app-text">
              {mode === 'traces' ? '链路追踪' : 'Agent Events'}
            </h1>
            {mode === 'traces' && stats && (
              <Badge variant="outline" size="sm" className="gap-1 font-normal">
                {stats.total_traces.toLocaleString()} traces · {stats.total_spans.toLocaleString()} spans
              </Badge>
            )}
            {mode === 'agent-events' && agentEventResult && (
              <Badge variant="outline" size="sm" className="gap-1 font-normal">
                {agentEventResult.total.toLocaleString()} events
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Tabs value={mode} onValueChange={(value) => setMode(value as PageMode)}>
              <TabsList>
                <TabsTrigger value="traces">Traces</TabsTrigger>
                <TabsTrigger value="agent-events">Agent Events</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button onClick={() => fetch()} variant="outline" size="sm">
              <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
              刷新
            </Button>
          </div>
        </div>

        {mode === 'traces' && stats && (
          <div className="grid grid-cols-6 gap-3 mb-4">
            {[
              { label: 'Traces', value: stats.total_traces, color: 'text-app-accent' },
              { label: 'Spans', value: stats.total_spans, color: 'text-app-accent' },
              { label: '错误率', value: `${stats.error_rate}%`, color: stats.error_rate > 5 ? 'text-red-400' : 'text-green-400' },
              { label: 'p50 延迟', value: formatDuration(stats.p50_duration_ms ?? 0), color: 'text-app-text-secondary' },
              { label: 'p95 延迟', value: formatDuration(stats.p95_duration_ms ?? 0), color: 'text-app-text-secondary' },
              { label: 'p99 延迟', value: formatDuration(stats.p99_duration_ms ?? 0), color: 'text-app-text-secondary' },
            ].map(({ label, value, color }) => (
              <Card key={label} padding="sm" className="text-center shadow-sm">
                <p className="text-[10px] text-app-text-tertiary mb-0.5">{label}</p>
                <p className={cn('text-sm font-semibold', color)}>{String(value)}</p>
              </Card>
            ))}
          </div>
        )}

        {mode === 'agent-events' && agentEventResult && agentSummaryRows.length > 0 && (
          <div className="space-y-3 mb-4">
            <div className="grid grid-cols-4 gap-3">
              <Card padding="sm" className="text-center shadow-sm">
                <p className="text-[10px] text-app-text-tertiary mb-0.5">活跃 Agent</p>
                <p className="text-sm font-semibold text-app-accent">{agentSummaryRows.length}</p>
              </Card>
              <button
                type="button"
                onClick={() => agentSummaryRows[0] && drillDownToAgent(agentSummaryRows[0].agentName)}
                className="text-left"
              >
                <Card padding="sm" className={cn('text-center shadow-sm transition-colors hover:border-app-accent hover:bg-app-accent/5', agentParams.agent_name === agentSummaryRows[0]?.agentName && 'border-app-accent bg-app-accent/10')}>
                  <p className="text-[10px] text-app-text-tertiary mb-0.5">最高事件量</p>
                  <p className="text-sm font-semibold text-app-text-secondary">{agentSummaryRows[0]?.agentName || '-'}</p>
                  <p className="text-[10px] text-app-text-tertiary">{agentSummaryRows[0]?.total || 0} events</p>
                </Card>
              </button>
              <button
                type="button"
                onClick={() => topErrorAgent && drillDownToAgent(topErrorAgent.agentName)}
                className="text-left"
                disabled={!topErrorAgent}
              >
                <Card padding="sm" className={cn('text-center shadow-sm transition-colors hover:border-app-accent hover:bg-app-accent/5', !topErrorAgent && 'opacity-60', agentParams.agent_name === topErrorAgent?.agentName && 'border-app-accent bg-app-accent/10')}>
                  <p className="text-[10px] text-app-text-tertiary mb-0.5">最高错误量</p>
                  <p className="text-sm font-semibold text-red-400">{topErrorAgent?.agentName || '-'}</p>
                  <p className="text-[10px] text-app-text-tertiary">{topErrorAgent?.errors || 0} errors</p>
                </Card>
              </button>
              <button
                type="button"
                onClick={() => topToolCallAgent && drillDownToAgent(topToolCallAgent.agentName)}
                className="text-left"
                disabled={!topToolCallAgent}
              >
                <Card padding="sm" className={cn('text-center shadow-sm transition-colors hover:border-app-accent hover:bg-app-accent/5', !topToolCallAgent && 'opacity-60', agentParams.agent_name === topToolCallAgent?.agentName && 'border-app-accent bg-app-accent/10')}>
                  <p className="text-[10px] text-app-text-tertiary mb-0.5">工具调用最多</p>
                  <p className="text-sm font-semibold text-amber-400">{topToolCallAgent?.agentName || '-'}</p>
                  <p className="text-[10px] text-app-text-tertiary">{topToolCallAgent?.toolCalls || 0} calls</p>
                </Card>
              </button>
            </div>

            <Card padding="sm" className="shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-medium text-app-text">Agent 聚合</p>
                  {agentParams.agent_name && (
                    <Button
                      onClick={() => setAgentParams((p) => ({ ...p, agent_name: '' }))}
                      variant="ghost"
                      size="xs"
                      className="text-app-text-tertiary hover:text-app-accent"
                    >
                      <X className="w-3 h-3" />
                      清除下钻
                    </Button>
                  )}
                </div>
                <p className="text-[10px] text-app-text-tertiary">按当前页结果统计，点击可筛选</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="border-b border-app-border/30 text-left text-app-text-tertiary">
                      <th className="px-2 py-1.5 font-medium">Agent</th>
                      <th className="px-2 py-1.5 font-medium">Events</th>
                      <th className="px-2 py-1.5 font-medium">Errors</th>
                      <th className="px-2 py-1.5 font-medium">Tool Calls</th>
                      <th className="px-2 py-1.5 font-medium">Latest</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agentSummaryRows.slice(0, 6).map((row) => (
                      <tr
                        key={row.agentName}
                        className={cn('border-b border-app-border/20 last:border-0 cursor-pointer transition-colors hover:bg-app-hover/30', agentParams.agent_name === row.agentName && 'bg-app-accent/10')}
                        onClick={() => drillDownToAgent(row.agentName)}
                      >
                        <td className="px-2 py-1.5 font-medium text-app-text">{row.agentName}</td>
                        <td className="px-2 py-1.5 text-app-text-secondary">{row.total}</td>
                        <td className="px-2 py-1.5">
                          <span className={cn('font-medium', row.errors > 0 ? 'text-red-400' : 'text-app-text-secondary')}>
                            {row.errors}
                          </span>
                        </td>
                        <td className="px-2 py-1.5 text-amber-400">{row.toolCalls}</td>
                        <td className="px-2 py-1.5 text-app-text-tertiary whitespace-nowrap">{formatTime(row.latestTimestamp)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-app-text-tertiary pointer-events-none" />
            <Input
              type="text"
              value={mode === 'traces' ? traceParams.keyword : agentParams.keyword}
              onChange={(e) => {
                const value = e.target.value;
                if (mode === 'traces') {
                  setTraceParams((p) => ({ ...p, keyword: value, operation: '' }));
                } else {
                  setAgentParams((p) => ({ ...p, keyword: value }));
                }
              }}
              placeholder={mode === 'traces' ? '搜索关键字 (agent.run, tool.call, error...)' : '搜索关键字 (run_id, tool_name, model, error...)'}
              className="pl-9"
              onKeyDown={(e) => { if (e.key === 'Enter') executeSearch(); }}
            />
          </div>

          <Select
            value={mode === 'traces' ? traceParams.time : agentParams.time}
            onValueChange={(v) => {
              if (mode === 'traces') {
                setTraceParams((p) => ({ ...p, time: v }));
              } else {
                setAgentParams((p) => ({ ...p, time: v }));
              }
            }}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIME_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={executeSearch} variant="primary" size="sm">
            <Search className="w-3.5 h-3.5" />
            搜索
          </Button>

          <Button
            onClick={() => setShowFilters((v) => !v)}
            variant="outline"
            size="sm"
            className={cn(showFilters && 'border-app-accent bg-app-accent/10 text-app-accent')}
          >
            <Filter className="w-3.5 h-3.5" />
            筛选
          </Button>
        </div>

        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-3 grid grid-cols-3 gap-3"
          >
            <div>
              <label className="mb-1 block text-[10px] font-medium text-app-text-tertiary">服务</label>
              <Input
                type="text"
                value={mode === 'traces' ? traceParams.service : agentParams.service}
                onChange={(e) => {
                  const value = e.target.value;
                  if (mode === 'traces') {
                    setTraceParams((p) => ({ ...p, service: value }));
                  } else {
                    setAgentParams((p) => ({ ...p, service: value }));
                  }
                }}
                placeholder="留空表示全部服务"
              />
            </div>

            {mode === 'traces' ? (
              <>
                <div>
                  <label className="mb-1 block text-[10px] font-medium text-app-text-tertiary">操作名</label>
                  <Input
                    type="text"
                    value={traceParams.operation}
                    onChange={(e) => setTraceParams((p) => ({ ...p, operation: e.target.value }))}
                    placeholder="agent.think, tool.call..."
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-medium text-app-text-tertiary">状态</label>
                  <div className="flex gap-1">
                    {STATUS_OPTIONS.map((o) => (
                      <Button
                        key={o.value}
                        onClick={() => setTraceParams((p) => ({ ...p, status: o.value as 'all' | 'error' | 'ok' }))}
                        variant={traceParams.status === o.value ? 'primary' : 'outline'}
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
                      <Button
                        key={o.value}
                        onClick={() => setTraceParams((p) => ({ ...p, span_type: o.value }))}
                        variant={traceParams.span_type === o.value ? 'primary' : 'outline'}
                        size="xs"
                      >
                        {o.label}
                      </Button>
                    ))}
                  </div>
                </div>
                {(traceParams.keyword || traceParams.operation || traceParams.span_type) && (
                  <Button
                    onClick={() => setTraceParams((p) => ({ ...p, keyword: '', operation: '', span_type: '' }))}
                    variant="ghost"
                    size="xs"
                    className="col-span-3 text-app-text-tertiary hover:text-app-accent"
                  >
                    <X className="w-3 h-3" />
                    清除筛选
                  </Button>
                )}
              </>
            ) : (
              <>
                <div>
                  <label className="mb-1 block text-[10px] font-medium text-app-text-tertiary">Run ID</label>
                  <Input
                    type="text"
                    value={agentParams.run_id}
                    onChange={(e) => setAgentParams((p) => ({ ...p, run_id: e.target.value }))}
                    placeholder="run-123"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-medium text-app-text-tertiary">Session ID</label>
                  <Input
                    type="text"
                    value={agentParams.session_id}
                    onChange={(e) => setAgentParams((p) => ({ ...p, session_id: e.target.value }))}
                    placeholder="session-123"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-medium text-app-text-tertiary">Agent 名称</label>
                  <Input
                    type="text"
                    value={agentParams.agent_name}
                    onChange={(e) => setAgentParams((p) => ({ ...p, agent_name: e.target.value }))}
                    placeholder="planner / executor"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-medium text-app-text-tertiary">事件类型</label>
                  <div className="flex flex-wrap gap-1">
                    {AGENT_EVENT_TYPES.map((o) => (
                      <Button
                        key={o.value || 'all'}
                        onClick={() => setAgentParams((p) => ({ ...p, event_type: o.value }))}
                        variant={agentParams.event_type === o.value ? 'primary' : 'outline'}
                        size="xs"
                      >
                        {o.label}
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-medium text-app-text-tertiary">级别</label>
                  <div className="flex gap-1">
                    {AGENT_LEVELS.map((o) => (
                      <Button
                        key={o.value || 'all'}
                        onClick={() => setAgentParams((p) => ({ ...p, level: o.value }))}
                        variant={agentParams.level === o.value ? 'primary' : 'outline'}
                        size="sm"
                        className="flex-1"
                      >
                        {o.label}
                      </Button>
                    ))}
                  </div>
                </div>
                {(agentParams.keyword || agentParams.run_id || agentParams.session_id || agentParams.agent_name || agentParams.event_type || agentParams.level) && (
                  <Button
                    onClick={() => setAgentParams((p) => ({
                      ...p,
                      keyword: '',
                      run_id: '',
                      session_id: '',
                      agent_name: '',
                      event_type: '',
                      level: '',
                    }))}
                    variant="ghost"
                    size="xs"
                    className="col-span-3 text-app-text-tertiary hover:text-app-accent"
                  >
                    <X className="w-3 h-3" />
                    清除筛选
                  </Button>
                )}
              </>
            )}
          </motion.div>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <LoadingSpinner size="md" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <AlertTriangle className="w-6 h-6 text-red-400" />
            <p className="text-[12px] text-app-text-secondary">{error}</p>
            <Button onClick={() => fetch()} variant="outline" size="sm">
              重试
            </Button>
          </div>
        ) : mode === 'traces' ? (
          traceResult?.spans.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2">
              <Activity className="w-8 h-8 text-app-text-tertiary/40" />
              <p className="text-[12px] text-app-text-tertiary">暂无追踪数据</p>
              <p className="text-[11px] text-app-text-tertiary/60">确认服务已启动并产生了 tracing 数据</p>
            </div>
          ) : (
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 z-10">
                <tr className="bg-app-elevated/80 border-b border-app-border/50">
                  {['状态', '时间', '操作名', '服务', 'Trace ID', '延迟'].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-left text-[10px] font-semibold text-app-text-tertiary uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border/20">
                {((traceResult?.spans || []) as TraceSpan[]).map((span, i) => (
                  <tr
                    key={`${span.trace_id}-${span.span_id}-${i}`}
                    className="hover:bg-app-hover/30 transition-colors cursor-pointer"
                    onClick={() => setSelectedTraceId(span.trace_id)}
                  >
                    <td className="px-3 py-2.5"><StatusBadge isError={span.is_error} /></td>
                    <td className="px-3 py-2.5 font-mono text-app-text-secondary whitespace-nowrap">
                      {formatTime(span.start_time)}
                    </td>
                    <td className="px-3 py-2.5 max-w-[220px]">
                      <span className={cn('block truncate font-medium', getOperationColor(span.operation_name))}>
                        {span.operation_name}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-app-text-tertiary whitespace-nowrap font-mono text-[10px]">
                      {span.service_name}
                    </td>
                    <td className="px-3 py-2.5 max-w-[140px]">
                      <span className="group relative block font-mono text-app-text-tertiary text-[10px]">
                        <span className="block truncate">{span.trace_id}</span>
                        <span className="absolute left-0 top-full z-20 hidden group-hover:block bg-app-elevated border border-app-border/50 rounded-md px-2 py-1 text-[10px] font-mono text-app-text whitespace-nowrap shadow-lg">
                          {span.trace_id}
                        </span>
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap">
                      <span className={cn('font-mono font-medium', getDurationColor(span.duration_ms))}>
                        {formatDuration(span.duration_ms)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : (
          agentEventResult?.events.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2">
              <Bot className="w-8 h-8 text-app-text-tertiary/40" />
              <p className="text-[12px] text-app-text-tertiary">暂无 Agent 事件</p>
              <p className="text-[11px] text-app-text-tertiary/60">确认服务已产生 agent event 数据并写入 `agent-events-*`</p>
            </div>
          ) : (
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 z-10">
                <tr className="bg-app-elevated/80 border-b border-app-border/50">
                  {['级别', '时间', '事件类型', 'Agent', '消息', 'Run ID', '耗时/Token'].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-left text-[10px] font-semibold text-app-text-tertiary uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border/20">
                {(agentEventResult?.events || []).map((event, i) => (
                  <tr key={`${event.run_id}-${event.step_index}-${i}`} className="hover:bg-app-hover/30 transition-colors align-top">
                    <td className="px-3 py-2.5"><EventLevelBadge level={event.level} /></td>
                    <td className="px-3 py-2.5 font-mono text-app-text-secondary whitespace-nowrap">
                      {formatTime(event.timestamp)}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={cn('font-medium', getEventTypeColor(event.event_type))}>{event.event_type}</span>
                    </td>
                    <td className="px-3 py-2.5 text-app-text-tertiary whitespace-nowrap font-mono text-[10px]">
                      <div>{event.agent_name || '-'}</div>
                      {event.tool_name && <div className="text-app-accent mt-1">{event.tool_name}</div>}
                    </td>
                    <td className="px-3 py-2.5 max-w-[360px]">
                      <div className="text-app-text break-words">{truncateText(event.message || event.thought || event.error_message || '-', 140)}</div>
                      {(event.llm_model || event.llm_provider) && (
                        <div className="mt-1 text-[10px] text-app-text-tertiary font-mono">
                          {[event.llm_provider, event.llm_model].filter(Boolean).join(' / ')}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 max-w-[180px]">
                      <div className="font-mono text-[10px] text-app-text-tertiary break-all">{event.run_id || '-'}</div>
                      {event.trace_id && (
                        <div className="mt-1 font-mono text-[10px] text-app-text-tertiary/70 break-all">trace: {event.trace_id}</div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-right">
                      {typeof event.duration_ms === 'number' ? (
                        <div className={cn('font-mono font-medium', getDurationColor(event.duration_ms))}>
                          {formatDuration(event.duration_ms)}
                        </div>
                      ) : (
                        <div className="font-mono text-app-text-tertiary">-</div>
                      )}
                      {event.token_usage?.total_tokens !== undefined && (
                        <div className="mt-1 text-[10px] text-app-text-tertiary font-mono">
                          {event.token_usage.total_tokens} tok
                          {typeof event.token_usage.cost_usd === 'number' ? ` · $${event.token_usage.cost_usd}` : ''}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex-shrink-0 flex items-center justify-between border-t border-app-border/50 bg-app-surface px-6 py-3">
          <p className="text-[11px] text-app-text-tertiary">
            共 {activeTotal.toLocaleString()} 条 · 第 {page}/{totalPages} 页
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

      {mode === 'traces' && selectedTraceId && (
        <TraceDrawer
          traceId={selectedTraceId}
          onClose={() => setSelectedTraceId(null)}
        />
      )}
    </div>
  );
}

function TraceDrawer({ traceId, onClose }: { traceId: string; onClose: () => void }) {
  const [detail, setDetail] = useState<TraceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSpanId, setActiveSpanId] = useState<string | null>(null);

  useEffect(() => {
    observabilityApi.getTrace(traceId).then((d) => {
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
            <Button onClick={onClose} variant="outline" size="icon-sm">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <LoadingSpinner size="md" />
            </div>
          ) : detail ? (
            <div className="grid grid-cols-[360px_1fr] gap-4 h-full">
              <div className="border border-app-border/40 rounded-lg overflow-hidden">
                <div className="px-3 py-2 border-b border-app-border/40 bg-app-elevated/60 text-[11px] font-medium text-app-text-secondary">
                  Span 列表
                </div>
                <div className="max-h-[calc(100vh-180px)] overflow-auto">
                  {detail.spans.map((span) => (
                    <button
                      key={span.span_id}
                      onClick={() => setActiveSpanId(span.span_id)}
                      className={cn(
                        'w-full text-left px-3 py-2 border-b border-app-border/20 hover:bg-app-hover/30 transition-colors',
                        activeSpanId === span.span_id && 'bg-app-accent/10'
                      )}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className={cn('font-medium truncate', getOperationColor(span.operation_name))}>{span.operation_name}</span>
                        <StatusBadge isError={span.is_error} />
                      </div>
                      <div className="text-[10px] text-app-text-tertiary font-mono">
                        {span.service_name} · {formatDuration(span.duration_ms)}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="border border-app-border/40 rounded-lg overflow-hidden">
                <div className="px-3 py-2 border-b border-app-border/40 bg-app-elevated/60 text-[11px] font-medium text-app-text-secondary">
                  Span 详情
                </div>
                <div className="p-4 text-[11px] space-y-3 max-h-[calc(100vh-180px)] overflow-auto">
                  {activeSpan ? (
                    <>
                      <div>
                        <div className="text-app-text font-medium mb-1">{activeSpan.operation_name}</div>
                        <div className="text-app-text-tertiary font-mono text-[10px]">{activeSpan.span_id}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <Card padding="sm">
                          <p className="text-[10px] text-app-text-tertiary mb-1">服务</p>
                          <p className="font-mono text-app-text-secondary">{activeSpan.service_name}</p>
                        </Card>
                        <Card padding="sm">
                          <p className="text-[10px] text-app-text-tertiary mb-1">耗时</p>
                          <p className={cn('font-mono', getDurationColor(activeSpan.duration_ms))}>{formatDuration(activeSpan.duration_ms)}</p>
                        </Card>
                      </div>
                      <div>
                        <p className="text-[10px] text-app-text-tertiary mb-1">开始时间</p>
                        <p className="font-mono text-app-text-secondary">{formatTimeFull(activeSpan.start_time)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-app-text-tertiary mb-1">Tags</p>
                        <pre className="bg-app-elevated/50 border border-app-border/30 rounded-md p-3 overflow-auto text-[10px] text-app-text-secondary whitespace-pre-wrap">{JSON.stringify(activeSpan.tags, null, 2)}</pre>
                      </div>
                      <div>
                        <p className="text-[10px] text-app-text-tertiary mb-1">Logs</p>
                        <pre className="bg-app-elevated/50 border border-app-border/30 rounded-md p-3 overflow-auto text-[10px] text-app-text-secondary whitespace-pre-wrap">{JSON.stringify(activeSpan.logs, null, 2)}</pre>
                      </div>
                    </>
                  ) : (
                    <div className="h-32 flex items-center justify-center text-app-text-tertiary">
                      选择左侧 Span 查看详情
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-app-text-tertiary">加载失败</div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
