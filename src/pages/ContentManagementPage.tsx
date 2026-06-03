import { useEffect, useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { contentsApi } from '../services/api';
import type { Content, ContentVersion } from '../types';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { SkeletonList } from '../components/ui/Skeleton';
import { Pagination } from '../components/ui/pagination';
import { EmptyState } from '../components/ui/empty-state';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '../components/ui/dropdown-menu';
import { formatRelativeTime, debounce, cn } from '../utils/helpers';
import { ContentCalendar } from '../components/content/ContentCalendar';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '../stores/useUIStore';
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
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';

// ─── Constants ─────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft: { label: '草稿', className: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30' },
  published: { label: '已发布', className: 'bg-green-500/10 text-green-400 border border-green-500/30' },
  pending_review: { label: '待审核', className: 'bg-blue-500/10 text-blue-400 border border-blue-500/30' },
  archived: { label: '已下架', className: 'bg-gray-500/10 text-gray-400 border border-gray-500/30' },
};

const PLATFORM_CONFIG: Record<string, { label: string; dotColor: string }> = {
  xiaohongshu: { label: '小红书', dotColor: 'bg-pink-400' },
  wechat: { label: '公众号', dotColor: 'bg-green-400' },
};

const FILTERS = [
  { value: 'all', label: '全部' },
  { value: 'draft', label: '草稿' },
  { value: 'published', label: '已发布' },
  { value: 'pending_review', label: '待审核' },
  { value: 'unlisted', label: '已下架' },
] as const;

function getEffectiveFilter(filter: string): string {
  const map: Record<string, string> = { unlisted: 'archived' };
  return map[filter] || filter;
}

// ─── Component ──────────────────────────────────────────────────

export function ContentManagementPage() {
  const [contents, setContents] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'calendar'>('list');

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const pageSize = 10;

  const navigate = useNavigate();
  const { showToast } = useUIStore();

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

  // ── Data loading ──

  const loadContents = useCallback(
    async (pageNum: number) => {
      setLoading(true);
      setError(null);
      try {
        const params: { page: number; page_size: number; status?: string } = {
          page: pageNum,
          page_size: pageSize,
        };
        const effectiveFilter = getEffectiveFilter(filter);
        if (effectiveFilter !== 'all') params.status = effectiveFilter;
        const res = await contentsApi.list(params);
        if (res.data.success && res.data.data) {
          setContents(res.data.data.items || []);
          setTotalItems(res.data.data.pagination?.total || 0);
        }
      } catch {
        setError('加载失败，请检查网络连接后重试');
      } finally {
        setLoading(false);
      }
    },
    [filter, pageSize],
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

  // ── Tags ──

  const allTags = useMemo(
    () => [...new Set(contents.flatMap((c) => c.tags || []))],
    [contents],
  );

  // ── Processed data ──

  const processedContents = useMemo(() => {
    let items = [...contents];

    const effectiveFilter = getEffectiveFilter(filter);
    if (effectiveFilter !== 'all') {
      items = items.filter((c) => c.status === effectiveFilter);
    }
    if (tagFilter) {
      items = items.filter((c) => (c.tags || []).includes(tagFilter));
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (c) =>
          (c.title || '').toLowerCase().includes(q) ||
          (c.content_md || '').slice(0, 200).toLowerCase().includes(q),
      );
    }

    items.sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    );
    return items;
  }, [contents, filter, tagFilter, searchQuery]);

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
    <div className="space-y-4 max-w-4xl mx-auto p-6">
      {/* ── Page Header ── */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-600 to-primary-500 flex items-center justify-center shadow-sm shadow-primary-600/20">
          <FileText className="w-[18px] h-[18px] text-white" />
        </div>
        <div>
          <h1 className="text-base font-semibold text-app-text">内容管理</h1>
          <p className="text-xs text-app-text-tertiary">管理所有已生成的内容</p>
        </div>
      </div>

      {/* ── Header: Search + View Toggle + New Button ── */}
      <div className="flex items-center justify-between gap-3">
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
            onClick={() => navigate('/')}
            className="h-8 px-3 text-xs bg-primary-600 hover:bg-primary-500"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            新建内容
          </Button>
        </div>
      </div>

      {/* ── Filter Pills ── */}
      <div className="flex items-center gap-1 flex-wrap">
        {FILTERS.map((f) => (
          <Button
            key={f.value}
            variant="ghost"
            size="sm"
            onClick={() => {
              setFilter(f.value);
              setPage(1);
              setTagFilter(null);
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
        {allTags.length > 0 && (
          <>
            <span className="w-px h-4 bg-app-border mx-1" />
            {allTags.map((tag) => (
              <Button
                key={tag}
                variant="ghost"
                size="sm"
                onClick={() => setTagFilter(tag)}
                className={cn(
                  tagFilter === tag
                    ? 'bg-primary-600/15 text-primary-400 hover:bg-primary-600/20'
                    : 'text-app-text-tertiary hover:text-app-text-secondary',
                )}
              >
                {tag}
              </Button>
            ))}
          </>
        )}
      </div>

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
              icon={
                <FileText className="w-6 h-6 text-app-text-tertiary" />
              }
              title={searchQuery ? '未找到匹配内容' : '暂无内容'}
              description={
                searchQuery
                  ? '尝试更换搜索关键词'
                  : '开始创作你的第一篇内容吧'
              }
              action={
                !searchQuery
                  ? { label: '去生成', onClick: () => navigate('/') }
                  : undefined
              }
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
                      <th className="px-3 py-2.5 text-left">
                        <span className="text-[10px] font-semibold text-app-text-tertiary uppercase tracking-wider">
                          标题
                        </span>
                      </th>
                      <th className="px-3 py-2.5 text-left w-24">
                        <span className="text-[10px] font-semibold text-app-text-tertiary uppercase tracking-wider">
                          平台
                        </span>
                      </th>
                      <th className="px-3 py-2.5 text-left w-20">
                        <span className="text-[10px] font-semibold text-app-text-tertiary uppercase tracking-wider">
                          状态
                        </span>
                      </th>
                      <th className="px-3 py-2.5 text-left w-28">
                        <span className="text-[10px] font-semibold text-app-text-tertiary uppercase tracking-wider">
                          更新时间
                        </span>
                      </th>
                      <th className="w-10 px-3 py-2.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {processedContents.map((content) => {
                      const statusCfg =
                        STATUS_CONFIG[content.status] || STATUS_CONFIG.draft;
                      const platformCfg = content.platform_code
                        ? PLATFORM_CONFIG[content.platform_code]
                        : null;
                      return (
                        <tr
                          key={content.id}
                          className="border-b border-app-border/50 last:border-b-0 hover:bg-app-hover/30 transition-colors"
                        >
                          <td className="px-3 py-2.5">
                            <button
                              onClick={() =>
                                navigate(`/content/${content.id}`)
                              }
                              className="text-sm font-medium text-app-text hover:text-primary-400 transition-colors text-left"
                            >
                              {content.title || '无标题'}
                            </button>
                          </td>
                          <td className="px-3 py-2.5">
                            {platformCfg ? (
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${platformCfg.dotColor}`}
                                />
                                <span className="text-xs text-app-text">
                                  {platformCfg.label}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-app-text-tertiary">
                                --
                              </span>
                            )}
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
                                <DropdownMenuItem
                                  onClick={() =>
                                    navigate(`/content/${content.id}`)
                                  }
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />{' '}
                                  编辑
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleViewHistory(content)}
                                >
                                  <History className="w-3.5 h-3.5" />{' '}
                                  版本历史
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  destructive
                                  onClick={() => handleDelete(content.id)}
                                >
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

              {/* Pagination */}
              <div className="mt-3">
                <Pagination
                  page={safePage}
                  totalPages={totalPages}
                  onPageChange={setPage}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* ── Confirm Dialog ── */}
      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) =>
          setConfirmDialog((prev) => ({ ...prev, open }))
        }
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
              <span className="text-[11px] text-app-text-tertiary font-normal">
                — 版本历史
              </span>
            </DialogTitle>
          </DialogHeader>
          {historyLoading ? (
            <div className="flex-1 flex items-center justify-center py-8">
              <SkeletonList count={3} />
            </div>
          ) : versions.length > 0 ? (
            <div className="flex-1 overflow-auto space-y-2 pr-1">
              {versions.map((version, idx) => (
                <div
                  key={version.id}
                  className="rounded-lg border border-app-border bg-app-surface p-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={idx === 0 ? 'primary' : 'outline'}
                        size="sm"
                      >
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
                          ((version.content_md?.length ?? 0) > 300
                            ? '...'
                            : '')}
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
