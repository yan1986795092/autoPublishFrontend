import { useEffect, useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { contentsApi } from '../services/api';
import type { Content, ContentVersion } from '../types';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { PipelineProgress } from '../components/content/PipelineProgress';
import { Input } from '../components/ui/input';
import { SkeletonList } from '../components/ui/Skeleton';
import { Pagination } from '../components/ui/pagination';
import { EmptyState } from '../components/ui/empty-state';
import { ViewDensitySwitcher } from '../components/ui/view-density-switcher';
import { BulkActionBar } from '../components/ui/bulk-action-bar';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '../components/ui/dropdown-menu';
import { formatRelativeTime, debounce, cn } from '../utils/helpers';
import { ContentCalendar } from '../components/content/ContentCalendar';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '../stores/useUIStore';
import {
  FileText, PenLine, Trash2, ExternalLink, Plus, History,
  Search, MoreHorizontal, ChevronUp, ChevronDown, CalendarDays, List
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';

const platformConfig: Record<string, { label: string }> = {
  xiaohongshu: { label: '小红书' },
  wechat: { label: '公众号' },
};

type SortKey = 'title' | 'status' | 'updated_at';
type SortDir = 'asc' | 'desc';

export function ContentManagementPage() {
  const [contents, setContents] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [operationLoading, setOperationLoading] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'calendar'>('list');

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // Sort
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'updated_at', dir: 'desc' });

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Pagination
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const pageSize = 10;

  const navigate = useNavigate();
  const { showToast, viewDensity, setViewDensity } = useUIStore();

  // Version history dialog
  const [historyContent, setHistoryContent] = useState<Content | null>(null);
  const [versions, setVersions] = useState<ContentVersion[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Confirm dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean; title: string; description: string; variant?: 'danger' | 'default';
    onConfirm: () => void;
  }>({ open: false, title: '', description: '', onConfirm: () => {} });

  const densityClass = viewDensity === 'compact' ? 'py-2' : viewDensity === 'comfortable' ? 'py-4' : 'py-3';
  const showDescription = viewDensity !== 'compact';

  // Load contents with server-side pagination
  const loadContents = useCallback(async (pageNum: number) => {
    setLoading(true);
    try {
      const params: { page: number; page_size: number; status?: string } = { page: pageNum, page_size: pageSize };
      if (filter !== 'all') params.status = filter;
      const res = await contentsApi.list(params);
      if (res.data.success && res.data.data) {
        setContents(res.data.data.items || []);
        setTotalItems(res.data.data.pagination?.total || 0);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [filter, pageSize]);

  useEffect(() => { loadContents(page); }, [page, loadContents]);

  // Debounced search
  const debouncedSearch = useMemo(() => debounce((val: unknown) => { setSearchQuery(val as string); }, 300), []);
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
    debouncedSearch(e.target.value);
    setPage(1);
  }, [debouncedSearch]);

  // Filtered + searched + sorted
  const processedContents = useMemo(() => {
    let items = [...contents];

    if (filter !== 'all') items = items.filter((c) => c.status === filter);
    if (tagFilter) items = items.filter((c) => (c.tags || []).includes(tagFilter));
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter((c) =>
        (c.title || '').toLowerCase().includes(q) ||
        (c.content_md || '').slice(0, 200).toLowerCase().includes(q)
      );
    }

    items.sort((a, b) => {
      let cmp = 0;
      if (sort.key === 'title') cmp = (a.title || '').localeCompare(b.title || '');
      else if (sort.key === 'status') cmp = a.status.localeCompare(b.status);
      else cmp = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
      return sort.dir === 'asc' ? cmp : -cmp;
    });

    return items;
  }, [contents, filter, tagFilter, searchQuery, sort]);

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages);

  // Stats
  const stats = useMemo(() => ({
    all: contents.length,
    draft: contents.filter((c) => c.status === 'draft').length,
    published: contents.filter((c) => c.status === 'published').length,
    archived: contents.filter((c) => c.status === 'archived').length,
  }), [contents]);

  const allTags = useMemo(() =>
    [...new Set(contents.flatMap((c) => c.tags || []))],
    [contents]
  );

  const filters = [
    { value: 'all', label: '全部', count: stats.all },
    { value: 'draft', label: '草稿', count: stats.draft },
    { value: 'published', label: '已发布', count: stats.published },
    { value: 'archived', label: '已归档', count: stats.archived },
  ];

  // Selection
  const allVisibleSelected = processedContents.length > 0 && processedContents.every((c) => selectedIds.has(c.id));
  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedIds(new Set([...selectedIds].filter((id) => !processedContents.some((c) => c.id === id))));
    } else {
      const next = new Set(selectedIds);
      processedContents.forEach((c) => next.add(c.id));
      setSelectedIds(next);
    }
  };
  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  const handleBulkDelete = () => {
    setConfirmDialog({
      open: true, title: '批量删除', variant: 'danger',
      description: `确定要删除选中的 ${selectedIds.size} 条内容吗？此操作不可恢复。`,
      onConfirm: async () => {
        setOperationLoading(true);
        let success = 0, failed = 0;
        const results = await Promise.allSettled(
          Array.from(selectedIds).map((id) => contentsApi.delete(id))
        );
        results.forEach((r) => { if (r.status === 'fulfilled') success++; else failed++; });
        setContents((prev) => prev.filter((c) => !selectedIds.has(c.id)));
        setSelectedIds(new Set());
        setOperationLoading(false);
        if (failed === 0) {
          showToast(`已删除 ${success} 条内容`, 'success');
        } else {
          showToast(`成功 ${success} 条，失败 ${failed} 条`, failed > success / 2 ? 'error' : 'info');
        }
      },
    });
  };

  const handleBulkArchive = () => {
    setConfirmDialog({
      open: true, title: '批量归档', variant: 'default',
      description: `确定要归档选中的 ${selectedIds.size} 条内容吗？`,
      onConfirm: async () => {
        setOperationLoading(true);
        let success = 0, failed = 0;
        const results = await Promise.allSettled(
          Array.from(selectedIds).map((id) => contentsApi.update(id, { status: 'archived' }))
        );
        results.forEach((r) => { if (r.status === 'fulfilled') success++; else failed++; });
        setContents((prev) =>
          prev.map((c) =>
            selectedIds.has(c.id) ? { ...c, status: 'archived' as const } : c
          )
        );
        setSelectedIds(new Set());
        setOperationLoading(false);
        if (failed === 0) {
          showToast(`已归档 ${success} 条内容`, 'success');
        } else {
          showToast(`成功 ${success} 条，失败 ${failed} 条`, failed > success / 2 ? 'error' : 'info');
        }
      },
    });
  };

  // Sort toggle — first click is DESC (most recent first), then toggle
  const toggleSort = (key: SortKey) => {
    setSort((prev) => prev.key === key
      ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
      : { key, dir: 'desc' }
    );
  };

  const SortHeader = ({ k, children }: { k: SortKey; children: React.ReactNode }) => (
    <button onClick={() => toggleSort(k)} className="flex items-center gap-1 text-[10px] font-medium text-app-text-tertiary hover:text-app-text-secondary transition-colors uppercase tracking-wider">
      {children}
      {sort.key === k ? (
        sort.dir === 'asc' ? <ChevronUp className="w-3 h-3 text-primary-400" /> : <ChevronDown className="w-3 h-3 text-primary-400" />
      ) : (
        <ChevronUp className="w-3 h-3 opacity-20" />
      )}
    </button>
  );

  // Delete single
  const handleDelete = (id: string) => {
    setConfirmDialog({
      open: true, title: '删除内容', variant: 'danger',
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

  const getWordCount = (md?: string) => {
    if (!md) return 0;
    const text = md.replace(/[#*`\n]/g, '').trim();
    if (!text) return 0;
    return text.split(/\s+/).length;
  };

  if (loading) return <SkeletonList count={5} />;

  return (
    <div className="space-y-4 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
            <FileText className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-app-text">内容管理</h1>
            <p className="text-[11px] text-app-text-secondary">管理你的所有创作内容</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ViewDensitySwitcher value={viewDensity} onChange={setViewDensity} />
          <div className="flex items-center gap-0.5 p-0.5 rounded-lg border border-app-border bg-app-surface">
            <button
              onClick={() => setView('list')}
              className={cn('p-1.5 rounded-md transition-colors', view === 'list' ? 'bg-primary-600/20 text-primary-400' : 'text-app-text-tertiary hover:text-app-text-secondary')}
              title="列表视图"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setView('calendar')}
              className={cn('p-1.5 rounded-md transition-colors', view === 'calendar' ? 'bg-primary-600/20 text-primary-400' : 'text-app-text-tertiary hover:text-app-text-secondary')}
              title="日历视图"
            >
              <CalendarDays className="w-3.5 h-3.5" />
            </button>
          </div>
          <Button size="sm" onClick={() => navigate('/')} className="h-8 px-3 text-xs bg-primary-600 hover:bg-primary-500">
            <Plus className="h-3.5 w-3.5 mr-1" />新建内容
          </Button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-2">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => { setFilter(f.value); setPage(1); setTagFilter(null); }}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
              filter === f.value
                ? 'bg-primary-600/15 text-primary-400'
                : 'text-app-text-tertiary hover:text-app-text-secondary'
            )}
            aria-pressed={filter === f.value}
          >
            {f.label} <span className="tabular-nums opacity-70">{f.count}</span>
          </button>
        ))}
      </div>

      {/* Search + tags */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-app-text-tertiary pointer-events-none" />
          <Input
            value={searchInput}
            onChange={handleSearchChange}
            placeholder="搜索标题或内容..."
            className="h-8 pl-8 text-xs"
            aria-label="搜索内容"
          />
        </div>
        {allTags.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            <button onClick={() => setTagFilter(null)} className={cn('px-2 py-1 rounded text-[10px] font-medium transition-colors border', !tagFilter ? 'bg-primary-600/20 text-primary-400 border-primary-500/30' : 'bg-app-surface text-app-text-tertiary border-app-border hover:text-app-text-secondary')}>全部</button>
            {allTags.map((tag) => (
              <button key={tag} onClick={() => setTagFilter(tag)} className={cn('px-2 py-1 rounded text-[10px] font-medium transition-colors border', tagFilter === tag ? 'bg-primary-600/20 text-primary-400 border-primary-500/30' : 'bg-app-surface text-app-text-tertiary border-app-border hover:text-app-text-secondary')}>{tag}</button>
            ))}
          </div>
        )}
      </div>

      {/* Calendar View */}
      {view === 'calendar' && (
        <div className="rounded-lg border border-app-border bg-app-elevated p-4">
          <ContentCalendar />
        </div>
      )}

      {/* List View */}
      {view === 'list' && (
        <AnimatePresence mode="wait">
          {processedContents.length === 0 ? (
            <EmptyState
              icon={<PenLine className="w-6 h-6 text-app-text-tertiary" />}
              title={searchQuery ? '未找到匹配内容' : '暂无内容'}
              description={searchQuery ? '尝试更换搜索关键词' : '开始创作你的第一篇内容吧'}
              action={!searchQuery ? { label: '去生成', onClick: () => navigate('/') } : undefined}
            />
          ) : (
            <motion.div key="table" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* Bulk actions bar */}
              {selectedIds.size > 0 && (
                <BulkActionBar
                  selectedCount={selectedIds.size}
                  onBulkDelete={handleBulkDelete}
                  onBulkArchive={handleBulkArchive}
                  onClearSelection={() => setSelectedIds(new Set())}
                  loading={operationLoading}
                />
              )}

              {/* Table */}
              <div className="rounded-lg border border-app-border bg-app-elevated overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-app-border bg-app-surface/50">
                      <th className="w-10 px-2 py-3">
                        <input type="checkbox" checked={allVisibleSelected}
                          onChange={toggleSelectAll}
                          className="rounded border-app-border bg-app-surface accent-primary-500" />
                      </th>
                      <th className="group px-3 py-3 text-left">
                        <SortHeader k="title">标题</SortHeader>
                      </th>
                      <th className="px-3 py-3 text-left w-20">
                        <span className="text-[10px] font-medium text-app-text-tertiary uppercase tracking-wider">平台</span>
                      </th>
                      <th className="group px-3 py-3 text-left w-16">
                        <SortHeader k="status">状态</SortHeader>
                      </th>
                      <th className="px-3 py-3 text-left w-28 hidden md:table-cell">
                        <span className="text-[10px] font-medium text-app-text-tertiary uppercase tracking-wider">标签</span>
                      </th>
                      <th className="group px-3 py-3 text-left w-24">
                        <SortHeader k="updated_at">更新</SortHeader>
                      </th>
                      <th className="w-12 px-2 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {processedContents.map((content, idx) => {
                      const platform = platformConfig[content.platform_code as keyof typeof platformConfig];
                      const wordCount = getWordCount(content.content_md);
                      return (
                        <motion.tr key={content.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: idx * 0.02 }}
                          className={cn(
                            `border-b border-app-border/50 last:border-b-0 transition-colors ${densityClass}`,
                            selectedIds.has(content.id) ? 'bg-primary-600/5' : 'hover:bg-app-hover/30'
                          )}
                        >
                          <td className="px-2">
                            <input type="checkbox" checked={selectedIds.has(content.id)}
                              onChange={() => toggleSelect(content.id)}
                              className="rounded border-app-border bg-app-surface accent-primary-500" />
                          </td>
                          <td className="px-3">
                            <button onClick={() => navigate(`/content/${content.id}`)}
                              className="text-sm font-medium text-app-text hover:text-primary-400 transition-colors text-left">
                              {content.title || '无标题'}
                            </button>
                            {showDescription && (
                              <div className="flex items-center gap-2 mt-0.5">
                                <p className="text-[10px] text-app-text-tertiary leading-relaxed line-clamp-1">
                                  {(content.content_md || '').replace(/[#*`\n]/g, '').slice(0, 80) || '空内容'}
                                </p>
                                {wordCount > 0 && (
                                  <span className="text-[9px] text-app-text-tertiary shrink-0 tabular-nums">{wordCount} 字</span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-3">
                            {platform ? (
                              <Badge variant={content.platform_code === 'xiaohongshu' ? 'xhs' : content.platform_code === 'wechat' ? 'wechat' : 'default'} size="sm">
                            {platform.label}
                          </Badge>
                            ) : (
                              <span className="text-[10px] text-app-text-tertiary">--</span>
                            )}
                          </td>
                          <td className="px-3">
                            <PipelineProgress status={content.status} />
                          </td>
                          <td className="px-3 hidden md:table-cell">
                            <div className="flex items-center gap-1 flex-wrap">
                              {content.tags && content.tags.length > 0 ? (
                                content.tags.slice(0, 2).map((tag) => (
                                  <span key={tag} className="px-1.5 py-0.5 rounded-md bg-primary-600/10 text-primary-400 text-[9px] font-medium">{tag}</span>
                                ))
                              ) : (
                                <span className="text-[9px] text-app-text-tertiary">--</span>
                              )}
                              {(content.tags?.length || 0) > 2 && (
                                <span className="text-[9px] text-app-text-tertiary">+{content.tags!.length - 2}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-3">
                            <span className="text-[10px] text-app-text-secondary tabular-nums">{formatRelativeTime(content.updated_at)}</span>
                          </td>
                          <td className="px-2">
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
                                <DropdownMenuSeparator />
                                <DropdownMenuItem destructive onClick={() => handleDelete(content.id)}>
                                  <Trash2 className="w-3.5 h-3.5" /> 删除
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </motion.tr>
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

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}
        title={confirmDialog.title}
        description={confirmDialog.description}
        variant={confirmDialog.variant}
        onConfirm={confirmDialog.onConfirm}
      />

      {/* Version History Dialog */}
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
            <div className="flex-1 flex items-center justify-center py-8"><SkeletonList count={3} /></div>
          ) : versions.length > 0 ? (
            <div className="flex-1 overflow-auto space-y-2 pr-1">
              {versions.map((version, idx) => (
                <div key={version.id} className="rounded-lg border border-app-border bg-app-surface p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={idx === 0 ? 'primary' : 'outline'} size="sm">v{version.version_number}</Badge>
                      <span className="text-[10px] text-app-text-tertiary">{formatRelativeTime(version.created_at)}</span>
                    </div>
                    {idx === 0 && <span className="text-[9px] px-1.5 py-0.5 bg-primary-600/20 text-primary-400 rounded font-medium">当前版本</span>}
                  </div>
                  {version.change_summary && <p className="text-[10px] text-app-text-secondary mb-2">{version.change_summary}</p>}
                  {version.content_md && (
                    <div className="p-2 bg-app-elevated rounded max-h-20 overflow-auto text-[10px] text-app-text-secondary">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {(version.content_md ?? '').slice(0, 300) + ((version.content_md?.length ?? 0) > 300 ? '...' : '')}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-app-text-tertiary py-8 text-xs">暂无版本记录</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
