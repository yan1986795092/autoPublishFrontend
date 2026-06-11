import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Pagination } from '../components/ui/pagination';
import { Button } from '../components/ui/button';
import { OptionChip } from '../components/ui/option-chip';
import { useAgentStore } from '../stores/useAgentStore';
import { AgentDashboard } from '../components/agent/AgentDashboard';
import { cn } from '../utils/helpers';
import { Clock, CheckCircle2, XCircle, AlertCircle, Loader2, Search } from 'lucide-react';
import type { AsyncTask } from '../types';

function formatDate(ts: string) {
  if (!ts) return '-';
  const d = new Date(ts);
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const STATE_CONFIG: Record<string, { icon: React.ReactNode; label: string; className: string }> = {
  completed: {
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    label: '已完成',
    className: 'text-green-400 bg-green-500/10 border border-green-500/30',
  },
  running: {
    icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
    label: '运行中',
    className: 'text-blue-400 bg-blue-500/10 border border-blue-500/30',
  },
  pending: {
    icon: <Clock className="w-3.5 h-3.5" />,
    label: '排队中',
    className: 'text-yellow-400 bg-yellow-500/10 border border-yellow-500/30',
  },
  failed: {
    icon: <XCircle className="w-3.5 h-3.5" />,
    label: '失败',
    className: 'text-red-400 bg-red-500/10 border border-red-500/30',
  },
  cancelled: {
    icon: <AlertCircle className="w-3.5 h-3.5" />,
    label: '已取消',
    className: 'text-app-text-tertiary bg-app-border/10 border border-app-border/30',
  },
};

const STATE_FILTERS = [
  { value: 'all', label: '全部' },
  { value: 'completed', label: '已完成' },
  { value: 'failed', label: '失败' },
  { value: 'running', label: '运行中' },
  { value: 'cancelled', label: '已取消' },
];

export function AgentHistoryPage() {
  const navigate = useNavigate();
  const { taskHistory, previousGenerations, loadTaskHistory } = useAgentStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const loadData = useCallback(() => {
    setError(null);
    setLoading(true);
    return loadTaskHistory()
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : '加载任务历史失败';
        setError(message);
      })
      .finally(() => setLoading(false));
  }, [loadTaskHistory]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = useMemo(() => {
    let items = taskHistory;
    if (statusFilter !== 'all') {
      items = items.filter((t) => t.state === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter((t) => t.prompt.toLowerCase().includes(q));
    }
    return items;
  }, [taskHistory, searchQuery, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [statusFilter, searchQuery]);

  return (
    <div className="max-w-4xl mx-auto p-6 h-full flex flex-col space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-app-text" />
          <div>
            <h1 className="text-lg font-semibold text-app-text">Agent 执行历史</h1>
            <p className="text-xs text-app-text-secondary">
              查看所有 Agent 任务的执行记录和结果
            </p>
          </div>
        </div>
        <Badge variant="secondary" className="text-[10px]">
          {taskHistory.length} 条记录
        </Badge>
      </div>

      {/* Dashboard */}
      <AgentDashboard generations={previousGenerations} />

      {/* Search + Filter bar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-app-text-tertiary pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索任务..."
            className="h-8 pl-8 text-xs"
          />
        </div>
        <OptionChip
          options={STATE_FILTERS}
          value={statusFilter}
          onChange={setStatusFilter}
          size="sm"
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-app-text-tertiary" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <XCircle className="w-10 h-10 text-red-400 mb-3" />
          <p className="text-sm text-red-400">{error}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={loadData}>
            重试
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Clock className="w-10 h-10 text-app-text-tertiary mb-3" />
          <p className="text-sm text-app-text-secondary">
            {searchQuery || statusFilter !== 'all'
              ? '未找到匹配的记录'
              : '暂无执行记录'}
          </p>
          {!searchQuery && statusFilter === 'all' && (
            <p className="text-xs text-app-text-tertiary mt-1">
              前往{' '}
              <Button
                variant="link"
                onClick={() => navigate('/agent-studio')}
                className="text-xs p-0 h-auto"
              >
                Agent Studio
              </Button>{' '}
              开始你的第一次创作
            </p>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <div className="space-y-3">
            {paginated.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onClick={() => navigate(`/agent-studio?taskId=${task.id}`)}
              />
            ))}
          </div>
        </div>
      )}
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}

function TaskCard({ task, onClick }: { task: AsyncTask; onClick: () => void }) {
  const cfg = STATE_CONFIG[task.state] || STATE_CONFIG.pending;

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-app-surface border border-app-border/50 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer p-4',
      )}
    >
      {/* Top row: status badge + prompt + timestamp */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px]',
              cfg.className,
            )}
          >
            {cfg.icon}
            {cfg.label}
          </span>
          <span className="text-sm font-medium text-app-text truncate">
            {task.prompt.slice(0, 60)}
            {task.prompt.length > 60 ? '...' : ''}
          </span>
        </div>
        <span className="text-xs text-app-text-tertiary flex-shrink-0 ml-2">
          {formatDate(task.created_at)}
        </span>
      </div>

      {/* Metadata row: step count + progress */}
      <div className="flex items-center gap-4 text-xs text-app-text-secondary">
        <span>
          {task.completed_steps}/{task.total_steps} 步骤
        </span>
        <span>进度 {task.progress}%</span>
        {task.progress_message && (
          <span className="text-app-text-tertiary truncate">
            {task.progress_message}
          </span>
        )}
      </div>

      {/* Progress dots: green for completed, gray for pending */}
      {task.total_steps > 0 && (
        <div className="mt-3 flex items-center gap-1">
          {Array.from({ length: task.total_steps }, (_, i) => (
            <div
              key={i}
              className={cn(
                'flex-1 h-1.5 rounded-full transition-colors',
                i < task.completed_steps ? 'bg-green-500' : 'bg-gray-600/40',
              )}
            />
          ))}
        </div>
      )}

      {/* Error message */}
      {task.error && (
        <p className="mt-2 text-[10px] text-red-400 truncate">{task.error}</p>
      )}
    </div>
  );
}
