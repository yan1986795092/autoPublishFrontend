import { useEffect, useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { contentsApi } from '../services/api';
import type { Content, ContentVersion } from '../types';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Skeleton, SkeletonList } from '../components/ui/skeleton';
import { Pagination } from '../components/ui/pagination';
import { EmptyState } from '../components/ui/empty-state';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { BulkActionBar } from '../components/ui/bulk-action-bar';
import { Card } from '../components/ui/card';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '../components/ui/dropdown-menu';
import { formatRelativeTime, debounce, cn } from '../utils/helpers';
import { ContentCalendar } from '../components/content/ContentCalendar';
import { PLATFORM_MAP, isPublishable } from '../components/agent/PlatformSelector';
import { PlatformIcon } from '../components/agent/PlatformIcons';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '../stores/useUIStore';
import { useAgentStore } from '../stores/useAgentStore';
import {
  FileText,
  Trash2,
  ExternalLink,
  Plus,
  History,
  Search,
  MoreHorizontal,
  CalendarDays,
  List,
  Send,
  FileEdit,
  Globe,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';

// ─── Constants ─────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft: { label: '草稿', className: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30' },
  published: { label: '已发布', className: 'bg-green-500/10 text-green-400 border border-green-500/30' },
  archived: { label: '已下架', className: 'bg-gray-500/10 text-gray-400 border border-gray-500/30' },
};

const FILTERS = [
  { value: 'all', label: '全部' },
  { value: 'draft', label: '草稿' },
  { value: 'published', label: '已发布' },
  { value: 'archived', label: '已下架' },
] as const;

// ─── Component ──────────────────────────────────────────────────

export function ContentManagementPage() {
  const [contents, setContents] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [view, setView] = useState<'list' | 'calendar' | 'card'>('card');

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const pageSize = 8;

  const navigate = useNavigate();
  const { showToast, openPublishDialog } = useUIStore();

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  // Version history dialog
  const [historyContent, setHistoryContent] = useState<Content | null>(null);
  const [versions, setVersions] = useState<ContentVersion[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Confirm dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    variant?: 'danger' | 'default';
    onConfirm: () => void;
  }>({ open: false, title: '', description: '', onConfirm: () => {} });

  // ── Stats (from backend) ──
  const [stats, setStats] = useState<{ total: number; draft: number; published: number; archived: number } | null>(null);
  const allTags = useMemo(
    () => [...new Set(contents.flatMap((c) => c.tags || []))],
    [contents],
  );

  // ── Data loading ──

  const loadContents = useCallback(
    async (pageNum: number) => {
      setLoading(true);
      setError(null);
      try {
        const params: { page: number; page_size: number; status?: string; search?: string; tag?: string } = {
          page: pageNum,
          page_size: pageSize,
        };
        if (filter !== 'all') params.status = filter;
        if (searchQuery) params.search = searchQuery;
        const res = await contentsApi.list(params);
        if (res.data.success && res.data.data) {
          setContents(res.data.data.items || []);
          setTotalItems(res.data.data.pagination?.total || 0);
          if (res.data.data.stats) setStats(res.data.data.stats);
        }
      } catch {
        setError('加载失败，请检查网络连接后重试');
      } finally {
        setLoading(false);
      }
    },
    [filter, pageSize, searchQuery],
  );

  useEffect(() => {
    loadContents(page);
  }, [page, loadContents]);

  // ── Search ──

  const debouncedSearch = useMemo(
    () => debounce((val: unknown) => { setSearchQuery(val as string); }, 300),
    [],
  );
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchInput(e.target.value);
      debouncedSearch(e.target.value);
      setPage(1);
    },
    [debouncedSearch],
  );

  // ── Processed data ──

  const processedContents = useMemo(() => {
    return [...contents].sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    );
  }, [contents]);

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages);

  // ── Actions ──

  const handleDelete = (id: string) => {
    setConfirmDialog({
      open: true,
      title: '删除内容',
      variant: 'danger',
      description: '确定要删除这条内容吗？此操作不可恢复。',
      onConfirm: async () => {
        try {
          await contentsApi.delete(id);
          setContents((prev) => prev.filter((c) => c.id !== id));
          setSelectedIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
          showToast('删除成功', 'success');
        } catch {
          showToast('删除失败', 'error');
        }
      },
    });
  };

  const handleViewHistory = async (content: Content) => {
    setHistoryLoading(true);
    setHistoryContent(content);
    setHistoryOpen(true);
    try {
      const res = await contentsApi.get(content.id);
      if (res.data.success && res.data.data) {
        const data = res.data.data as Content & { versions?: ContentVersion[] };
        setVersions(data.versions || []);
      }
    } catch {
      setVersions([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  // ── Render ──

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-3">
        <p className="text-sm text-red-400">{error}</p>
        <Button variant="outline" size="sm" onClick={() => loadContents(page)}>
          重试
        </Button>
      </div>
    );
  }

  if (loading) return <SkeletonList count={5} />;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Page Header ── */}
      <div className="shrink-0 border-b border-app-border/60 px-6 py-3.5 bg-app-surface/60 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary-600/15 border border-primary-500/20 flex items-center justify-center shrink-0">
              <FileText className="w-[18px] h-[18px] text-primary-400" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-app-text leading-none tracking-tight">内容管理</h1>
              <p className="text-xs text-app-text-tertiary mt-0.5 leading-none">管理所有已生成的内容</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Scrollable Content Area ── */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
          <div className="max-w-4xl mx-auto space-y-4">
            {/* ── Stats Bar ── */}
            {stats && (
              <div className="grid grid-cols-4 gap-3 shrink-0">
                {[
                  { icon: FileText, label: '总数', value: stats.total, color: 'text-blue-400' },
                  { icon: FileEdit, label: '草稿', value: stats.draft, color: 'text-yellow-400' },
                  { icon: Globe, label: '已发布', value: stats.published, color: 'text-green-400' },
                ].map(({ icon: Icon, label, value, color }) => (
                  <div key={label} className="rounded-lg border border-app-border/50 bg-app-elevated p-3 flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${color}`} />
                    <div>
                      <p className="text-lg font-bold text-app-text">{value}</p>
                      <p className="text-[10px] text-app-text-tertiary">{label}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Search + Controls ── */}
            <div className="flex items-center justify-between gap-3 shrink-0">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-app-text-tertiary pointer-events-none" />
                <Input
                  value={searchInput}
                  onChange={handleSearchChange}
                  placeholder="搜索标题..."
                  className="h-8 pl-8 text-xs"
                  aria-label="搜索内容"
                />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-0.5 p-0.5 rounded-lg border border-app-border bg-app-surface">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setView('card')}
                    className={cn(
                      view === 'card'
                        ? 'bg-primary-600/20 text-primary-400'
                        : 'text-app-text-tertiary',
                    )}
                    title="卡片视图"
                  >
                    <FileText className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setView('list')}
                    className={cn(
                      view === 'list'
                        ? 'bg-primary-600/20 text-primary-400'
                        : 'text-app-text-tertiary',
                    )}
                    title="列表视图"
                  >
                    <List className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setView('calendar')}
                    className={cn(
                      view === 'calendar'
                        ? 'bg-primary-600/20 text-primary-400'
                        : 'text-app-text-tertiary',
                    )}
                    title="日历视图"
                  >
                    <CalendarDays className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <Button
                  size="sm"
                  onClick={async () => {
                    const store = useAgentStore.getState();
                    const newId = await store.createConversation();
                    if (newId) {
                      await store.switchConversation(newId);
                    } else {
                      store.clearCurrent();
                    }
                    navigate('/');
                  }}
                  className="h-8 px-3 text-xs bg-primary-600 hover:bg-primary-500"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  新建内容
                </Button>
              </div>
            </div>

            {/* ── Filter Pills ── */}
            <div className="flex items-center gap-1 flex-wrap shrink-0">
              {FILTERS.map((f) => (
                <Button
                  key={f.value}
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFilter(f.value);
                    setPage(1);
                  }}
                  className={cn(
                    filter === f.value
                      ? 'bg-primary-600/15 text-primary-400 hover:bg-primary-600/20'
                      : 'text-app-text-tertiary hover:text-app-text-secondary',
                  )}
                  aria-pressed={filter === f.value}
                >
                  {f.label}
                </Button>
              ))}
            </div>

            {/* ── Bulk Action Bar ── */}
            {selectedIds.size > 0 && (
              <BulkActionBar
                selectedCount={selectedIds.size}
                onClearSelection={() => setSelectedIds(new Set())}
                onBulkDelete={async () => {
                  setBulkLoading(true);
                  try {
                    const res = await contentsApi.batchDelete(Array.from(selectedIds));
                    const deleted = res.data.data?.deleted?.length ?? 0;
                    showToast(`已删除 ${deleted} 条内容`, 'success');
                    setSelectedIds(new Set());
                    loadContents(page);
                  } catch {
                    showToast('批量删除失败', 'error');
                  } finally {
                    setBulkLoading(false);
                  }
                }}
                onBulkArchive={async () => {
                  setBulkLoading(true);
                  try {
                    const res = await contentsApi.batchArchive(Array.from(selectedIds));
                    const archived = res.data.data?.archived?.length ?? 0;
                    showToast(`已归档 ${archived} 条内容`, 'success');
                    setSelectedIds(new Set());
                    loadContents(page);
                  } catch {
                    showToast('批量归档失败', 'error');
                  } finally {
                    setBulkLoading(false);
                  }
                }}
                loading={bulkLoading}
              />
            )}

            {/* ── Card View ── */}
            {view === 'card' && (
              <AnimatePresence mode="wait">
                {processedContents.length === 0 ? (
                  <EmptyState
                    icon={<FileText className="w-6 h-6 text-app-text-tertiary" />}
                    title={searchQuery ? '未找到匹配内容' : '暂无内容'}
                    description={searchQuery ? '尝试更换搜索关键词' : '开始创作你的第一篇内容吧'}
                    action={!searchQuery ? { label: '去生成', onClick: () => navigate('/') } : undefined}
                  />
                ) : (
                  <motion.div
                    key="card-grid"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
                  >
                    {processedContents.map((content, idx) => {
                      const statusCfg = STATUS_CONFIG[content.status] || STATUS_CONFIG.draft;
                      const preview = (content.content_md || '').slice(0, 200);
                      return (
                        <motion.div
                          key={content.id}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.03 }}
                        >
                          <Card
                            variant="interactive"
                            className="h-[200px] cursor-pointer hover:border-primary-500/30 transition-all overflow-hidden"
                            onClick={() => navigate(`/content/${content.id}`)}
                          >
                            <div className="p-3 flex flex-col h-full gap-1.5">
                              <div className="flex items-start gap-2">
                                <input
                                  type="checkbox"
                                  checked={selectedIds.has(content.id)}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    const next = new Set(selectedIds);
                                    if (e.target.checked) next.add(content.id);
                                    else next.delete(content.id);
                                    setSelectedIds(next);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="mt-0.5 rounded border-app-border bg-app-surface text-primary-500 focus:ring-primary-500 shrink-0"
                                />
                                <h3 className="text-sm font-medium text-app-text truncate flex-1 min-w-0">
                                  {content.title || '无标题'}
                                </h3>
                                <span className={`shrink-0 inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] ${statusCfg.className}`}>
                                  {statusCfg.label}
                                </span>
                              </div>
                              {preview && (
                                <p className="text-[11px] text-app-text-tertiary line-clamp-3 leading-relaxed flex-1 overflow-hidden">
                                  {preview}
                                </p>
                              )}
                              <div className="flex items-center gap-2 pt-1 shrink-0">
                                {content.platform_code && (
                                  <span className="text-[10px] text-app-text-tertiary flex items-center gap-1">
                                    <PlatformIcon id={content.platform_code} size={14} />
                                    <span className={isPublishable(content.platform_code) ? '' : 'italic'}>
                                      {PLATFORM_MAP.get(content.platform_code)?.label || content.platform_code}
                                    </span>
                                  </span>
                                )}
                                {content.target_platform && content.target_platform !== content.platform_code && (
                                  <span className="text-[10px] text-green-400 flex items-center gap-1">
                                    <PlatformIcon id={content.target_platform} size={14} />
                                    {PLATFORM_MAP.get(content.target_platform)?.label || content.target_platform}
                                  </span>
                                )}
                                <span className="text-[10px] text-app-text-tertiary ml-auto">
                                  {formatRelativeTime(content.updated_at)}
                                </span>
                              </div>
                              {content.tags && content.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 shrink-0">
                                  {content.tags.slice(0, 3).map(tag => (
                                    <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded-full bg-app-surface border border-app-border/30 text-app-text-tertiary">
                                      {tag}
                                    </span>
                                  ))}
                                  {content.tags.length > 3 && (
                                    <span className="text-[9px] text-app-text-tertiary">+{content.tags.length - 3}</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            )}

            {/* ── Calendar View ── */}
            {view === 'calendar' && (
              <div className="rounded-lg border border-app-border bg-app-elevated p-4">
                <ContentCalendar />
              </div>
            )}

            {/* ── List View ── */}
            {view === 'list' && (
              <AnimatePresence mode="wait">
                {processedContents.length === 0 ? (
                  <EmptyState
                    icon={<FileText className="w-6 h-6 text-app-text-tertiary" />}
                    title={searchQuery ? '未找到匹配内容' : '暂无内容'}
                    description={searchQuery ? '尝试更换搜索关键词' : '开始创作你的第一篇内容吧'}
                    action={!searchQuery ? { label: '去生成', onClick: () => navigate('/') } : undefined}
                  />
                ) : (
                  <motion.div
                    key="table"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <div className="rounded-lg border border-app-border bg-app-elevated overflow-hidden">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-app-border bg-app-elevated/80">
                            <th className="w-8 px-2 py-2.5 text-center">
                              <input
                                type="checkbox"
                                checked={selectedIds.size > 0 && selectedIds.size === processedContents.length}
                                onChange={() => {
                                  if (selectedIds.size === processedContents.length) {
                                    setSelectedIds(new Set());
                                  } else {
                                    setSelectedIds(new Set(processedContents.map(c => c.id)));
                                  }
                                }}
                                className="rounded border-app-border bg-app-surface text-primary-500 focus:ring-primary-500"
                              />
                            </th>
                            <th className="px-3 py-2.5 text-left">
                              <span className="text-[10px] font-semibold text-app-text-tertiary uppercase tracking-wider">标题</span>
                            </th>
                            <th className="px-3 py-2.5 text-left w-28">
                              <span className="text-[10px] font-semibold text-app-text-tertiary uppercase tracking-wider">风格 / 目标</span>
                            </th>
                            <th className="px-3 py-2.5 text-left w-20">
                              <span className="text-[10px] font-semibold text-app-text-tertiary uppercase tracking-wider">状态</span>
                            </th>
                            <th className="px-3 py-2.5 text-left w-28">
                              <span className="text-[10px] font-semibold text-app-text-tertiary uppercase tracking-wider">更新时间</span>
                            </th>
                            <th className="w-10 px-3 py-2.5" />
                          </tr>
                        </thead>
                        <tbody>
                          {processedContents.map((content) => {
                            const statusCfg = STATUS_CONFIG[content.status] || STATUS_CONFIG.draft;
                            return (
                              <tr
                                key={content.id}
                                className="border-b border-app-border/50 last:border-b-0 hover:bg-app-hover/30 transition-colors"
                              >
                                <td className="px-2 py-2.5 text-center">
                                  <input
                                    type="checkbox"
                                    checked={selectedIds.has(content.id)}
                                    onChange={(e) => {
                                      const next = new Set(selectedIds);
                                      if (e.target.checked) next.add(content.id);
                                      else next.delete(content.id);
                                      setSelectedIds(next);
                                    }}
                                    className="rounded border-app-border bg-app-surface text-primary-500 focus:ring-primary-500"
                                  />
                                </td>
                                <td className="px-3 py-2.5 max-w-0">
                                  <button
                                    onClick={() => navigate(`/content/${content.id}`)}
                                    className="text-sm font-medium text-app-text hover:text-primary-400 transition-colors text-left w-full"
                                  >
                                    <span className="truncate block">{content.title || '无标题'}</span>
                                  </button>
                                </td>
                                <td className="px-3 py-2.5">
                                  <div className="flex flex-wrap items-center gap-1">
                                    {content.platform_code && (
                                      <span className="text-[10px] text-app-text-tertiary flex items-center gap-1 bg-app-surface px-1.5 py-0.5 rounded border border-app-border/30">
                                        <PlatformIcon id={content.platform_code} size={12} />
                                        <span>{PLATFORM_MAP.get(content.platform_code)?.label || content.platform_code}</span>
                                      </span>
                                    )}
                                    {content.target_platform && content.target_platform !== content.platform_code && (
                                      <span className="text-[10px] text-green-400 flex items-center gap-1 bg-green-500/5 px-1.5 py-0.5 rounded border border-green-500/20">
                                        <PlatformIcon id={content.target_platform} size={12} />
                                        {PLATFORM_MAP.get(content.target_platform)?.label || content.target_platform}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-3 py-2.5">
                                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] ${statusCfg.className}`}>
                                    {statusCfg.label}
                                  </span>
                                </td>
                                <td className="px-3 py-2.5">
                                  <span className="text-xs text-app-text-secondary tabular-nums">
                                    {formatRelativeTime(content.updated_at)}
                                  </span>
                                </td>
                                <td className="px-3 py-2.5">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <button className="flex items-center justify-center w-7 h-7 rounded-md text-app-text-tertiary hover:text-app-text hover:bg-app-hover/50 transition-colors">
                                        <MoreHorizontal className="w-3.5 h-3.5" />
                                      </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" sideOffset={2}>
                                      <DropdownMenuItem onClick={() => navigate(`/content/${content.id}`)}>
                                        <ExternalLink className="w-3.5 h-3.5" /> 编辑
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleViewHistory(content)}>
                                        <History className="w-3.5 h-3.5" /> 版本历史
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => openPublishDialog(content.id)}>
                                        <Send className="w-3.5 h-3.5" /> 发布
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem destructive onClick={() => handleDelete(content.id)}>
                                        <Trash2 className="w-3.5 h-3.5" /> 删除
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* ── Pagination ── */}
        {(view === 'card' || view === 'list') && processedContents.length > 0 && (
          <div className="shrink-0 px-6 pb-4">
            <div className="max-w-4xl mx-auto">
              <Pagination
                page={safePage}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Confirm Dialog ── */}
      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}
        title={confirmDialog.title}
        description={confirmDialog.description}
        variant={confirmDialog.variant}
        onConfirm={confirmDialog.onConfirm}
      />

      {/* ── Version History Dialog ── */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-2xl max-h-[70vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <History className="w-4 h-4 text-primary-400" />
              {historyContent?.title || '无标题'}
              <span className="text-[11px] text-app-text-tertiary font-normal">— 版本历史</span>
            </DialogTitle>
          </DialogHeader>
          {historyLoading ? (
            <div className="flex-1 flex items-center justify-center py-8">
              <SkeletonList count={3} />
            </div>
          ) : versions.length > 0 ? (
            <div className="flex-1 overflow-auto space-y-2 pr-1">
              {versions.map((version, idx) => (
                <div key={version.id} className="rounded-lg border border-app-border bg-app-surface p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={idx === 0 ? 'primary' : 'outline'} size="sm">
                        v{version.version_number}
                      </Badge>
                      <span className="text-[10px] text-app-text-tertiary">
                        {formatRelativeTime(version.created_at)}
                      </span>
                    </div>
                    {idx === 0 && (
                      <span className="text-[9px] px-1.5 py-0.5 bg-primary-600/20 text-primary-400 rounded font-medium">
                        当前版本
                      </span>
                    )}
                  </div>
                  {version.change_summary && (
                    <p className="text-[10px] text-app-text-secondary mb-2">
                      {version.change_summary}
                    </p>
                  )}
                  {version.content_md && (
                    <div className="p-2 bg-app-elevated rounded max-h-20 overflow-auto text-[10px] text-app-text-secondary">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {(version.content_md ?? '').slice(0, 300) +
                          ((version.content_md?.length ?? 0) > 300 ? '...' : '')}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-app-text-tertiary py-8 text-xs">
              暂无版本记录
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
