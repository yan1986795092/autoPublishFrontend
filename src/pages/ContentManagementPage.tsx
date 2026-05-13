import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { contentsApi } from '../services/api';
import type { Content, ContentVersion } from '../types';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { SkeletonList } from '../components/ui/Skeleton';
import { formatRelativeTime, cn } from '../utils/helpers';
import { ContentCalendar } from '../components/content/ContentCalendar';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '../stores/useUIStore';
import { PenLine, Trash2, ExternalLink, Plus, History, Clock, FileText, CalendarDays, List, RotateCcw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';

const statusConfig = {
  published: { label: '已发布', variant: 'success' as const },
  draft: { label: '草稿', variant: 'warning' as const },
  archived: { label: '已归档', variant: 'secondary' as const },
};

const platformConfig: Record<string, { label: string; emoji: string }> = {
  xiaohongshu: { label: '小红书', emoji: '🎨' },
  wechat: { label: '公众号', emoji: '📱' },
  zhihu: { label: '知乎', emoji: '💡' },
};

export function ContentManagementPage() {
  const [contents, setContents] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'calendar'>('list');

  // Version history dialog
  const [historyContent, setHistoryContent] = useState<Content | null>(null);
  const [versions, setVersions] = useState<ContentVersion[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  const navigate = useNavigate();
  const { showToast } = useUIStore();

  useEffect(() => {
    contentsApi.list({ page: 1, page_size: 50 })
      .then((res) => {
        if (res.data.success) {
          setContents(res.data.data?.items || []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这条内容吗？')) return;
    try {
      await contentsApi.delete(id);
      setContents((prev) => prev.filter((c) => c.id !== id));
      showToast('删除成功', 'success');
    } catch {
      showToast('删除失败', 'error');
    }
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

  const allTags = [...new Set(contents.flatMap((c) => c.tags || []))];
  const filteredContents = (filter === 'all'
    ? contents
    : contents.filter((c) => c.status === filter)
  ).filter((c) => !tagFilter || (c.tags || []).includes(tagFilter));

  const filters = [
    { value: 'all', label: '全部' },
    { value: 'draft', label: '草稿' },
    { value: 'published', label: '已发布' },
    { value: 'archived', label: '已归档' },
  ];

  if (loading) {
    return <SkeletonList count={5} />;
  }

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
            <FileText className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-app-text">内容管理</h1>
            <p className="text-[11px] text-app-text-secondary">
              共 {filteredContents.length} 条内容
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center rounded-md border border-app-border bg-app-surface p-0.5">
            <button
              onClick={() => setView('list')}
              className={cn('p-1.5 rounded text-[11px]', view === 'list' ? 'bg-app-elevated text-app-text' : 'text-app-text-tertiary')}
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setView('calendar')}
              className={cn('p-1.5 rounded text-[11px]', view === 'calendar' ? 'bg-app-elevated text-app-text' : 'text-app-text-tertiary')}
            >
              <CalendarDays className="w-3.5 h-3.5" />
            </button>
          </div>
          <Button size="sm" onClick={() => navigate('/')} className="h-8 px-3 text-xs bg-primary-600 hover:bg-primary-500">
            <Plus className="h-3.5 w-3.5 mr-1" />
            新建内容
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-1.5 bg-app-surface rounded-lg p-1 border border-app-border w-fit">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              filter === f.value
                ? 'bg-app-elevated text-app-text'
                : 'text-app-text-tertiary hover:text-app-text-secondary'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Tag filter */}
      {allTags.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setTagFilter(null)}
            className={cn(
              'px-2 py-1 rounded-lg text-[10px] font-medium transition-colors border',
              !tagFilter
                ? 'bg-primary-600/20 text-primary-400 border-primary-500/30'
                : 'bg-app-surface text-app-text-tertiary border-app-border hover:text-app-text-secondary'
            )}
          >
            全部标签
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setTagFilter(tag)}
              className={cn(
                'px-2 py-1 rounded-lg text-[10px] font-medium transition-colors border',
                tagFilter === tag
                  ? 'bg-primary-600/20 text-primary-400 border-primary-500/30'
                  : 'bg-app-surface text-app-text-tertiary border-app-border hover:text-app-text-secondary'
              )}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Calendar View */}
      {view === 'calendar' && (
        <div className="rounded-lg border border-app-border bg-app-elevated p-4">
          <ContentCalendar />
        </div>
      )}

      {/* List View */}
      {view === 'list' && (
        <AnimatePresence mode="wait">
          {filteredContents.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <div className="w-12 h-12 rounded-xl bg-app-surface border border-app-border flex items-center justify-center mb-4">
                <PenLine className="w-6 h-6 text-app-text-tertiary" />
              </div>
              <h3 className="text-sm font-medium text-app-text-secondary mb-1">暂无内容</h3>
              <p className="text-xs text-app-text-tertiary mb-4">开始创作你的第一篇内容吧</p>
              <Button size="sm" onClick={() => navigate('/')} className="bg-primary-600 hover:bg-primary-500 text-xs">
                去生成
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-2"
            >
              {filteredContents.map((content, index) => {
                const status = statusConfig[content.status as keyof typeof statusConfig] || statusConfig.draft;
                const platform = platformConfig[content.platform_code as keyof typeof platformConfig];

                return (
                  <motion.div
                    key={content.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="rounded-lg border border-app-border bg-app-elevated p-4 transition-colors hover:bg-app-hover"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3
                            className="text-sm font-medium text-app-text truncate cursor-pointer hover:text-primary-400 transition-colors"
                            onClick={() => navigate(`/content/${content.id}`)}
                          >
                            {content.title || '无标题'}
                          </h3>
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap">
                          {platform && (
                            <Badge variant={content.platform_code === 'xiaohongshu' ? 'xhs' : content.platform_code === 'wechat' ? 'wechat' : 'zhihu'} size="sm">
                              {platform.emoji} {platform.label}
                            </Badge>
                          )}
                          <Badge variant={status.variant} size="sm">
                            {status.label}
                          </Badge>
                          <span className="text-[10px] text-app-text-tertiary">
                            {formatRelativeTime(content.created_at)}
                          </span>
                        </div>

                        {content.tags && content.tags.length > 0 && (
                          <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                            {content.tags.map((tag) => (
                              <span key={tag} className="px-1.5 py-0.5 rounded-md bg-primary-600/10 text-primary-400 text-[9px] font-medium">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        <button
                          onClick={() => navigate(`/content/${content.id}`)}
                          className="p-1.5 rounded text-app-text-tertiary hover:text-app-text-secondary hover:bg-app-hover/50 transition-colors"
                          title="编辑"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleViewHistory(content)}
                          className="p-1.5 rounded text-app-text-tertiary hover:text-app-text-secondary hover:bg-app-hover/50 transition-colors"
                          title="版本历史"
                        >
                          <Clock className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(content.id)}
                          className="p-1.5 rounded text-app-text-tertiary hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="删除"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      )}

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
            <div className="flex-1 flex items-center justify-center py-8">
              <SkeletonList count={3} />
            </div>
          ) : versions.length > 0 ? (
            <div className="flex-1 overflow-auto space-y-2 pr-1">
              {versions.map((version, idx) => (
                <div key={version.id} className="rounded-lg border border-app-border bg-app-surface p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={idx === 0 ? 'primary' : 'outline'} size="sm">v{version.version_number}</Badge>
                      <span className="text-[10px] text-app-text-tertiary">{formatRelativeTime(version.created_at)}</span>
                    </div>
                    {idx === 0 && (
                      <span className="text-[9px] px-1.5 py-0.5 bg-primary-600/20 text-primary-400 rounded font-medium">当前版本</span>
                    )}
                  </div>
                  {version.change_summary && (
                    <p className="text-[10px] text-app-text-secondary mb-2">{version.change_summary}</p>
                  )}
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
