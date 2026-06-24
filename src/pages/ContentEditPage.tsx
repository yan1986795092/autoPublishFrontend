import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { contentsApi, aiEditApi, publishApi } from '../services/api';
import type { Content, ContentVersion } from '../types';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Separator } from '../components/ui/separator';
import { SkeletonCard, SkeletonText } from '../components/ui/Skeleton';
import { TagInput } from '../components/ui/TagInput';
import { ShortcutHint } from '../components/ui/shortcut-hint';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '../components/ui/dropdown-menu';
import { formatRelativeTime, cn } from '../utils/helpers';
import { PlatformIcon } from '../components/agent/PlatformIcons';
import { PLATFORM_MAP, isPublishable } from '../components/agent/PlatformSelector';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useUIStore } from '../stores/useUIStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select';
import { getPreviewComponent } from '../components/preview/index';
import {
  History as HistoryIcon, Loader2, Save, RotateCcw, Eye, Download,
  ClipboardCopy, ArrowLeft, FileText,
  CheckCircle2, Send, Wand2, Expand, AlignLeft, Languages,
  Volume2, Hash, Search as SearchIcon, AlertTriangle, Tags,
  MoreVertical, Pencil, Trash2, Heart, Clock, BookOpen,
} from 'lucide-react';

// ─── Constants ──────────────────────────────────────────────

function getActionLabel(action: string): string {
  const labels: Record<string, string> = {
    rewrite: '改写', expand: '扩写', summarize: '总结',
    translate: '翻译', tone: '语调优化', headlines: '生成标题',
    seo: 'SEO 分析', tags: '标签推荐', banned: '违禁词检测',
  };
  return labels[action] || action;
}

// ─── Content Stats Helper ───────────────────────────────────

interface ContentStats {
  charCount: number;
  chineseChars: number;
  englishWords: number;
  paragraphs: number;
  headings: number;
  links: number;
  readingTime: number;
}

function computeContentStats(md: string): ContentStats {
  const text = md || '';
  return {
    charCount: Array.from(text).length,
    chineseChars: (text.match(/[一-鿿]/g) || []).length,
    englishWords: (text.match(/[a-zA-Z]+/g) || []).length,
    paragraphs: text.split(/\n\s*\n/).filter(p => p.trim()).length || 1,
    headings: (text.match(/^#{1,6}\s+/gm) || []).length,
    links: (text.match(/\[([^\]]+)\]\(([^)]+)\)/g) || []).length,
    readingTime: Math.max(1, Math.ceil(Array.from(text).length / 500)),
  };
}

// ─── MoreMenu (shared between view & edit mode) ─────────────

interface MoreMenuProps {
  onExportMd: () => void;
  onCopyContent: () => void;
  onHistory: () => void;
  onPublishHistory: () => void;
  onDelete: () => void;
}

function MoreMenu({ onExportMd, onCopyContent, onHistory, onPublishHistory, onDelete }: MoreMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 text-xs">
          <MoreVertical className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={4}>
        <DropdownMenuItem onClick={onExportMd}>
          <Download className="w-3.5 h-3.5" /> 导出 Markdown
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onCopyContent}>
          <ClipboardCopy className="w-3.5 h-3.5" /> 复制内容
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onHistory}>
          <HistoryIcon className="w-3.5 h-3.5" /> 版本历史
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onPublishHistory}>
          <Send className="w-3.5 h-3.5" /> 发布记录
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem destructive onClick={onDelete}>
          <Trash2 className="w-3.5 h-3.5" /> 删除内容
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Content Stats Bar ──────────────────────────────────────

function ContentStatsBar({ stats }: { stats: ContentStats }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-app-surface/50 border-t border-app-border overflow-x-auto">
      <BookOpen className="w-3 h-3 text-primary-400 shrink-0" />
      <span className="text-[10px] text-app-text-tertiary whitespace-nowrap tabular-nums">
        {stats.charCount.toLocaleString()} 字
      </span>
      <span className="w-px h-3 bg-app-border shrink-0" />
      <span className="text-[10px] text-app-text-tertiary whitespace-nowrap flex items-center gap-1">
        <Clock className="w-2.5 h-2.5" /> ~{stats.readingTime} 分钟
      </span>
      <span className="w-px h-3 bg-app-border shrink-0" />
      <span className="text-[10px] text-app-text-tertiary whitespace-nowrap">
        {stats.paragraphs} 段落
      </span>
      {stats.headings > 0 && (
        <>
          <span className="w-px h-3 bg-app-border shrink-0" />
          <span className="text-[10px] text-app-text-tertiary whitespace-nowrap">
            {stats.headings} 标题
          </span>
        </>
      )}
      {stats.links > 0 && (
        <>
          <span className="w-px h-3 bg-app-border shrink-0" />
          <span className="text-[10px] text-app-text-tertiary whitespace-nowrap">
            {stats.links} 链接
          </span>
        </>
      )}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────

export function ContentEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast, openPublishDialog } = useUIStore();

  // ── Core data ──
  const [content, setContent] = useState<Content | null>(null);
  const [versions, setVersions] = useState<ContentVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ── Edit state ──
  const [editTitle, setEditTitle] = useState('');
  const [editContentMd, setEditContentMd] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── View / Edit mode ──
  const [viewMode, setViewMode] = useState<'view' | 'edit'>('view');

  // ── Active platform for AI functions (seo/banned checks) ──
  const [activePlatform, setActivePlatform] = useState('xiaohongshu');

  // ── Version diff state ──
  const [diffMode, setDiffMode] = useState(false);
  const [diffSelected, setDiffSelected] = useState<string[]>([]);
  const [diffLines, setDiffLines] = useState<Array<{ type: string; text: string }> | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);

  // Load diff from backend when both versions are selected
  useEffect(() => {
    if (!diffMode || diffSelected.length !== 2 || !content) {
      setDiffLines(null);
      return;
    }
    const [v1, v2] = diffSelected;
    let cancelled = false;
    setDiffLoading(true);
    (async () => {
      try {
        const res = await contentsApi.diffVersions(content.id, v1, v2);
        if (!cancelled && res.data.success && res.data.data) {
          setDiffLines(res.data.data.changes);
        }
      } catch { /* ignore */ } finally {
        if (!cancelled) setDiffLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [content, diffMode, diffSelected, versions]);

  // Reset diff state when closing dialog
  const [historyOpen, setHistoryOpen] = useState(false);
  const handleHistoryOpenChange = useCallback((v: boolean) => {
    setHistoryOpen(v);
    if (!v) { setDiffMode(false); setDiffSelected([]); setDiffLines(null); }
  }, []);

  // ── Auto-save effect ──
  useEffect(() => {
    if (!isDirty || !id) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      setAutoSaveStatus('saving');
      try {
        await contentsApi.autosave(id, editContentMd);
        setAutoSaveStatus('saved');
        setTimeout(() => setAutoSaveStatus('idle'), 2000);
      } catch {
        // silent — autosave failures are non-critical
        setAutoSaveStatus('idle');
      }
    }, 10_000);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [id, editContentMd, isDirty]);

  // ── AI Editing ──
  const [aiLoading, setAiLoading] = useState(false);
  const [seoResult, setSeoResult] = useState<{ overall: number; suggestions: string[] } | null>(null);
  const [seoOpen, setSeoOpen] = useState(false);
  const [headlines, setHeadlines] = useState<string[]>([]);
  const [headlinesOpen, setHeadlinesOpen] = useState(false);
  const [rewriteInput, setRewriteInput] = useState('');
  const [rewriteOpen, setRewriteOpen] = useState(false);

  const runAiEdit = useCallback(async (action: string, extra?: Record<string, unknown>) => {
    if (!editContentMd.trim()) {
      showToast('请先输入内容', 'error');
      return;
    }
    setAiLoading(true);
    try {
      let newContent = editContentMd;
      switch (action) {
        case 'rewrite': {
          const res = await aiEditApi.rewrite(editContentMd, (extra?.instruction as string) || '');
          if (res.data.success) newContent = (res.data.data as { result: string }).result;
          break;
        }
        case 'expand': {
          const res = await aiEditApi.expand(editContentMd);
          if (res.data.success) newContent = editContentMd + '\n\n' + (res.data.data as { result: string }).result;
          break;
        }
        case 'summarize': {
          const res = await aiEditApi.summarize(editContentMd);
          if (res.data.success) newContent = (res.data.data as { result: string }).result;
          break;
        }
        case 'translate': {
          const lang = (extra?.lang as string) || 'en';
          const res = await aiEditApi.translate(editContentMd, lang);
          if (res.data.success) newContent = (res.data.data as { result: string }).result;
          break;
        }
        case 'tone': {
          const tone = (extra?.tone as string) || 'professional';
          const res = await aiEditApi.improveTone(editContentMd, tone);
          if (res.data.success) newContent = (res.data.data as { result: string }).result;
          break;
        }
        case 'headlines': {
          const res = await aiEditApi.generateHeadlines(editContentMd);
          if (res.data.success) {
            setHeadlines((res.data.data as { headlines: string[] }).headlines || []);
            setHeadlinesOpen(true);
          }
          setAiLoading(false);
          return;
        }
        case 'seo': {
          const res = await aiEditApi.analyzeSeo(editContentMd, activePlatform);
          if (res.data.success) {
            const data = res.data.data as { overall: number; suggestions: Array<{ type: string; message: string }> };
            setSeoResult({
              overall: data.overall || 0,
              suggestions: (data.suggestions || []).map(s => s.message),
            });
            setSeoOpen(true);
          }
          setAiLoading(false);
          return;
        }
        case 'tags': {
          const res = await aiEditApi.suggestTags(editContentMd);
          if (res.data.success) {
            const data = res.data.data as { tags: string[] };
            const newTags = [...new Set([...editTags, ...(data.tags || [])])];
            setEditTags(newTags);
            showToast(`已添加 ${data.tags?.length || 0} 个推荐标签`, 'success');
          }
          setAiLoading(false);
          return;
        }
        case 'banned': {
          const res = await aiEditApi.checkBannedWords(editContentMd, activePlatform);
          if (res.data.success) {
            const data = res.data.data as { words: Array<{ word: string }>; total: number };
            if (data.total > 0) {
              showToast(`发现 ${data.total} 个违规词: ${data.words.map(w => w.word).join(', ')}`, 'error');
            } else {
              showToast('没有发现违规词 ✅', 'success');
            }
          }
          setAiLoading(false);
          return;
        }
      }
      if (newContent !== editContentMd) {
        setEditContentMd(newContent);
        setIsDirty(true);
        showToast(`${getActionLabel(action)}成功`, 'success');
      }
    } catch (err: unknown) {
      let msg = '操作失败，请重试';
      if (err instanceof Error) msg = err.message;
      else if (typeof err === 'object' && err !== null) {
        const e = err as { response?: { data?: { message?: string } }; message?: string };
        msg = e.response?.data?.message || e.message || msg;
      }
      showToast(`${getActionLabel(action)}失败: ${msg}`, 'error');
    } finally {
      setAiLoading(false);
    }
  }, [editContentMd, editTags, activePlatform, showToast]);

  // ── Publish history ──
  const [publishHistoryOpen, setPublishHistoryOpen] = useState(false);
  const [publishRecords, setPublishRecords] = useState<Array<{ id: string; platform_code: string; status: string; platform_url?: string; published_at?: string; created_at: string }>>([]);
  const [publishHistoryLoading, setPublishHistoryLoading] = useState(false);

  // ── Delete confirm ──
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // ── Content stats ──
  const contentStats = useMemo(() => computeContentStats(editContentMd), [editContentMd]);

  // ── Load content ──
  const loadContent = useCallback(async (contentId: string) => {
    setLoading(true);
    try {
      const res = await contentsApi.get(contentId);
      if (res.data.success && res.data.data) {
        const data = res.data.data;
        setContent(data);
        setEditTitle(data.title || '');
        setEditContentMd(data.content_md || '');
        setEditTags(data.tags || []);
        // activePlatform = target_platform > content_style (if publishable) > default
        const style = data.platform_code || 'xiaohongshu';
        setActivePlatform(data.target_platform || (isPublishable(style) ? style : 'xiaohongshu'));
        if (data.versions) setVersions(data.versions);
      }
    } catch {
      showToast('加载内容失败', 'error');
      navigate('/content');
    } finally {
      setLoading(false);
    }
  }, [showToast, navigate]);

  useEffect(() => {
    if (!id) { navigate('/content'); return; }
    loadContent(id);
  }, [id, loadContent]);

  // ── Save ──
  const handleSave = useCallback(async () => {
    if (!id) return;
    setSaving(true);
    try {
      await contentsApi.update(id, { title: editTitle, content_md: editContentMd });
      showToast('保存成功', 'success');
      setIsDirty(false);
      loadContent(id);
    } catch {
      showToast('保存失败', 'error');
    } finally {
      setSaving(false);
    }
  }, [id, editTitle, editContentMd, showToast, loadContent]);

  // Keyboard shortcut: Ctrl+S
  const handleSaveRef = useRef(handleSave);
  useEffect(() => { handleSaveRef.current = handleSave; }, [handleSave]);

  useEffect(() => {
    const handler = () => { if (isDirty) handleSaveRef.current(); };
    window.addEventListener('shortcut:save', handler);
    return () => window.removeEventListener('shortcut:save', handler);
  }, [isDirty]);

  // ── Delete ──
  const handleDelete = useCallback(async () => {
    if (!id) return;
    try {
      await contentsApi.delete(id);
      showToast('内容已删除', 'success');
      navigate('/content');
    } catch {
      showToast('删除失败', 'error');
    }
  }, [id, navigate, showToast]);

  // ── Export & Copy ──
  const handleExportMd = () => {
    const blob = new Blob([editContentMd], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${editTitle || 'content'}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyContent = async () => {
    try {
      await navigator.clipboard.writeText(editContentMd);
      showToast('内容已复制到剪贴板', 'success');
    } catch {
      showToast('复制失败', 'error');
    }
  };

  // ── Mode switch ──
  const enterEditMode = () => setViewMode('edit');
  const exitEditMode = () => {
    // If dirty, auto-save silently before leaving edit mode
    if (isDirty && id) {
      contentsApi.autosave(id, editContentMd).catch(() => {});
    }
    setViewMode('view');
  };

  // ── Cancel editing (undo all changes) ──
  const handleUndo = useCallback(() => {
    setEditContentMd(content?.content_md || '');
    setEditTitle(content?.title || '');
    setEditTags(content?.tags || []);
    setIsDirty(false);
  }, [content]);

  // ── Loading / Error states ──
  if (loading) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto p-6">
        <SkeletonCard />
        <SkeletonText lines={5} />
      </div>
    );
  }

  if (!content) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-12 h-12 rounded-xl bg-app-surface border border-app-border flex items-center justify-center mb-4">
          <FileText className="w-6 h-6 text-app-text-tertiary" />
        </div>
        <h3 className="text-sm font-medium text-app-text-secondary mb-2">内容不存在</h3>
        <Button variant="outline" size="sm" onClick={() => navigate('/content')}>
          返回列表
        </Button>
      </div>
    );
  }

  const isViewMode = viewMode === 'view';
  const isEditMode = viewMode === 'edit';

  return (
    <div className="flex gap-0 items-start">
      {/* 左侧：主内容 */}
      <div className="flex-1 min-w-0 space-y-5 p-6">

      {/* ═══════════════════════════════════════════════════════
          HEADER — sticky with blur backdrop
         ═══════════════════════════════════════════════════════ */}
      <div className="sticky top-0 z-30 bg-app-bg/90 backdrop-blur-sm -mx-6 px-6 py-3 -mt-6 mb-2 border-b border-app-border/20">
        <div className="flex items-center justify-between gap-2">
          {/* Left: Back + Title + Badges */}
          <div className="flex items-center gap-3 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="text-app-text-tertiary hover:text-app-text-secondary shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="min-w-0">
              <h1 className={cn(
                'font-semibold truncate',
                isViewMode ? 'text-lg text-app-text' : 'text-sm text-app-text',
              )}>
                {editTitle || '无标题'}
              </h1>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {/* 创作风格 badge — 所有内容都有 */}
                {(() => {
                  const styleEntry = content.platform_code ? PLATFORM_MAP.get(content.platform_code) : undefined;
                  if (!styleEntry) return null;
                  return (
                    <Badge variant="outline" size="xs" title={`创作风格: ${styleEntry.label}`} className="gap-1">
                      <PlatformIcon id={content.platform_code!} size={12} />
                      {styleEntry.label}
                    </Badge>
                  );
                })()}
                {/* 发布目标 badge — 仅当设置了可发布平台时显示 */}
                {(() => {
                  const targetEntry = content.target_platform ? PLATFORM_MAP.get(content.target_platform) : undefined;
                  if (!targetEntry) return null;
                  return (
                    <Badge variant={content.target_platform === 'xiaohongshu' ? 'xhs' : content.target_platform === 'wechat' ? 'wechat' : 'success'} size="xs" title={`发布目标: ${targetEntry.label}`} className="gap-1">
                      <PlatformIcon id={content.target_platform!} size={12} />
                      {targetEntry.label}
                    </Badge>
                  );
                })()}
                <Badge variant={content.status === 'published' ? 'success' : 'warning'} size="xs">
                  {content.status === 'published' ? '已发布' : content.status === 'draft' ? '草稿' : '已归档'}
                </Badge>
                <span className="text-[10px] text-app-text-tertiary">
                  {formatRelativeTime(content.created_at)}
                </span>
                {/* view_count / like_count */}
                {content.view_count !== undefined && content.view_count > 0 && (
                  <span className="text-[10px] text-app-text-tertiary flex items-center gap-0.5">
                    <Eye className="w-3 h-3" /> {content.view_count}
                  </span>
                )}
                {content.like_count !== undefined && content.like_count > 0 && (
                  <span className="text-[10px] text-app-text-tertiary flex items-center gap-0.5">
                    <Heart className="w-3 h-3" /> {content.like_count}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            {isViewMode ? (
              <>
                <Button variant="primary" size="sm" onClick={enterEditMode} className="h-8 text-xs">
                  <Pencil className="h-3.5 w-3.5 mr-1" />
                  编辑
                </Button>
                <Button variant="primary" size="sm" onClick={() => openPublishDialog(content.id)} className="h-8 text-xs">
                  <Send className="h-3.5 w-3.5 mr-1" />
                  发布
                </Button>
                <MoreMenu
                  onExportMd={handleExportMd}
                  onCopyContent={handleCopyContent}
                  onHistory={() => setHistoryOpen(true)}
                  onPublishHistory={async () => {
                    setPublishHistoryLoading(true);
                    setPublishHistoryOpen(true);
                    try {
                      const res = await publishApi.getContentHistory(content.id);
                      setPublishRecords(res.data.data?.records || []);
                    } catch {
                      setPublishRecords([]);
                    } finally {
                      setPublishHistoryLoading(false);
                    }
                  }}
                  onDelete={() => setDeleteConfirmOpen(true)}
                />
              </>
            ) : (
              <>
                <Button variant="primary" size="sm" onClick={() => openPublishDialog(content.id)} className="h-8 text-xs">
                  <Send className="h-3.5 w-3.5 mr-1" />
                  发布
                </Button>
                <MoreMenu
                  onExportMd={handleExportMd}
                  onCopyContent={handleCopyContent}
                  onHistory={() => setHistoryOpen(true)}
                  onPublishHistory={async () => {
                    setPublishHistoryLoading(true);
                    setPublishHistoryOpen(true);
                    try {
                      const res = await publishApi.getContentHistory(content.id);
                      setPublishRecords(res.data.data?.records || []);
                    } catch {
                      setPublishRecords([]);
                    } finally {
                      setPublishHistoryLoading(false);
                    }
                  }}
                  onDelete={() => setDeleteConfirmOpen(true)}
                />
                {isDirty && (
                  <>
                    <Button variant="outline" size="sm" onClick={handleUndo} className="h-8 text-xs">
                      <RotateCcw className="h-3.5 w-3.5 mr-1" />
                      撤销
                    </Button>
                    <Button onClick={handleSave} disabled={saving} size="sm" className="h-8 text-xs bg-primary-600 hover:bg-primary-500">
                      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                      {saving ? '保存中...' : '保存'}
                    </Button>
                  </>
                )}
                {/* Exit edit mode button */}
                <Button variant="ghost" size="icon-sm" onClick={exitEditMode} className="h-8 w-8 text-app-text-tertiary hover:text-app-text" title="完成编辑">
                  <CheckCircle2 className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          VIEW MODE — Read-only content display
         ═══════════════════════════════════════════════════════ */}
      {isViewMode && (
        <div className="space-y-6 animate-[fadeIn_0.2s_ease-out]">
          {/* Title display */}
          <div>
            <h1 className="text-2xl font-bold text-app-text leading-snug">
              {editTitle || '无标题'}
            </h1>
            {/* Tags */}
            {editTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {editTags.map(tag => (
                  <Badge key={tag} variant="outline" size="sm">{tag}</Badge>
                ))}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-app-border/30" />

          {/* Rendered content */}
          <article className="prose prose-invert max-w-none
            prose-headings:text-app-text prose-headings:font-semibold
            prose-h1:text-xl prose-h2:text-lg prose-h3:text-base
            prose-p:text-app-text-secondary prose-p:leading-relaxed
            prose-a:text-primary-400 prose-a:no-underline hover:prose-a:underline
            prose-strong:text-app-text
            prose-code:text-xs prose-code:bg-app-elevated prose-code:px-1 prose-code:py-0.5 prose-code:rounded
            prose-pre:bg-app-elevated prose-pre:border prose-pre:border-app-border
            prose-img:rounded-lg
            prose-blockquote:border-l-primary-500/50 prose-blockquote:text-app-text-tertiary
            [&>p:first-child]:mt-0
          ">
            {editContentMd ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {editContentMd}
              </ReactMarkdown>
            ) : (
              <p className="text-app-text-tertiary italic">暂无内容</p>
            )}
          </article>

          {/* View mode footer stats */}
          <div className="flex items-center gap-4 px-4 py-3 rounded-lg border border-app-border/50 bg-app-elevated/50 text-[11px] text-app-text-tertiary">
            <ContentStatsBar stats={contentStats} />
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          EDIT MODE — Active editing interface
         ═══════════════════════════════════════════════════════ */}
      {isEditMode && (
        <div className="space-y-4 animate-[fadeIn_0.2s_ease-out]">
          {/* Title */}
          <div className="rounded-lg border border-app-border bg-app-elevated p-4">
            <div className="space-y-1.5">
              <span className="text-[10px] text-app-text-tertiary uppercase tracking-wider font-medium">标题</span>
              <Input
                value={editTitle}
                onChange={(e) => { setEditTitle(e.target.value); setIsDirty(true); }}
                placeholder="输入内容标题"
                className="h-10 text-sm font-medium"
              />
            </div>
          </div>

          {/* Tags */}
          <div className="rounded-lg border border-app-border bg-app-elevated p-4">
            <div className="space-y-1.5">
              <span className="text-[10px] text-app-text-tertiary uppercase tracking-wider font-medium">标签</span>
              <TagInput tags={editTags} onChange={(tags) => { setEditTags(tags); setIsDirty(true); }} />
            </div>
          </div>

          {/* Editor */}
          <div className="rounded-lg border border-app-border bg-app-elevated overflow-hidden">
            {/* Editor header bar */}
            <div className="flex items-center gap-2 px-4 py-2 border-b border-app-border bg-app-surface text-[11px] font-medium text-app-text-secondary">
              <FileText className="w-3.5 h-3.5 text-primary-400" />
              <span>Markdown 编辑</span>
              <div className="ml-auto flex items-center gap-3">
                {/* Auto-save status */}
                {autoSaveStatus === 'saving' && (
                  <span className="text-[10px] text-app-text-tertiary flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    自动保存中...
                  </span>
                )}
                {autoSaveStatus === 'saved' && (
                  <span className="text-[10px] text-green-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    已保存
                  </span>
                )}
                {/* Character count */}
                <span className="tabular-nums text-app-text-tertiary">
                  {contentStats.charCount.toLocaleString()} 字
                </span>
                {/* Keyboard shortcut hint */}
                {isDirty && (
                  <ShortcutHint keys={['Ctrl', 'S']} className="opacity-50" />
                )}
              </div>
            </div>

            {/* AI Toolbar — with labels */}
            <div className="flex flex-wrap items-center gap-0.5 px-3 py-2 border-b border-app-border/30 bg-app-surface/50">
              <span className="text-[10px] text-primary-400 mr-1 font-semibold shrink-0">AI</span>

              <Button variant="ghost" size="xs" onClick={() => setRewriteOpen(true)} disabled={aiLoading} title="改写" className="gap-1">
                <Wand2 className="w-3 h-3" /><span className="text-[10px] hidden sm:inline">改写</span>
              </Button>
              <Button variant="ghost" size="xs" onClick={() => runAiEdit('expand')} disabled={aiLoading} title="扩写" className="gap-1">
                <Expand className="w-3 h-3" /><span className="text-[10px] hidden sm:inline">扩写</span>
              </Button>
              <Button variant="ghost" size="xs" onClick={() => runAiEdit('summarize')} disabled={aiLoading} title="总结" className="gap-1">
                <AlignLeft className="w-3 h-3" /><span className="text-[10px] hidden sm:inline">总结</span>
              </Button>

              <Separator orientation="vertical" className="h-4 mx-1" />

              <Select onValueChange={(lang) => runAiEdit('translate', { lang })}>
                <SelectTrigger className="h-7 gap-1 px-1.5 border border-transparent hover:border-app-border text-[10px] text-app-text-secondary hover:text-app-text bg-transparent" disabled={aiLoading}>
                  <Languages className="w-3 h-3" />
                  <SelectValue placeholder="翻译" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="ja">日本語</SelectItem>
                  <SelectItem value="ko">한국어</SelectItem>
                  <SelectItem value="zh-CN">简体中文</SelectItem>
                </SelectContent>
              </Select>

              <Select onValueChange={(tone) => runAiEdit('tone', { tone })}>
                <SelectTrigger className="h-7 gap-1 px-1.5 border border-transparent hover:border-app-border text-[10px] text-app-text-secondary hover:text-app-text bg-transparent" disabled={aiLoading}>
                  <Volume2 className="w-3 h-3" />
                  <SelectValue placeholder="语调" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">专业</SelectItem>
                  <SelectItem value="humorous">幽默</SelectItem>
                  <SelectItem value="warm">温暖</SelectItem>
                  <SelectItem value="formal">正式</SelectItem>
                </SelectContent>
              </Select>

              <Separator orientation="vertical" className="h-4 mx-1" />

              <Button variant="ghost" size="xs" onClick={() => runAiEdit('headlines')} disabled={aiLoading} title="生成标题" className="gap-1">
                <Hash className="w-3 h-3" /><span className="text-[10px] hidden sm:inline">标题</span>
              </Button>
              <Button variant="ghost" size="xs" onClick={() => runAiEdit('seo')} disabled={aiLoading} title="SEO分析" className="gap-1">
                <SearchIcon className="w-3 h-3" /><span className="text-[10px] hidden sm:inline">SEO</span>
              </Button>
              <Button variant="ghost" size="xs" onClick={() => runAiEdit('banned')} disabled={aiLoading} title="违禁词检测" className="gap-1">
                <AlertTriangle className="w-3 h-3" /><span className="text-[10px] hidden sm:inline">违禁词</span>
              </Button>
              <Button variant="ghost" size="xs" onClick={() => runAiEdit('tags')} disabled={aiLoading} title="推荐标签" className="gap-1">
                <Tags className="w-3 h-3" /><span className="text-[10px] hidden sm:inline">标签</span>
              </Button>

              {aiLoading && <Loader2 className="w-3 h-3 animate-spin text-primary-400 ml-1 shrink-0" />}
            </div>

            {/* Textarea */}
            <Textarea
              value={editContentMd}
              onChange={(e) => { setEditContentMd(e.target.value); setIsDirty(true); }}
              className="min-h-[400px] border-0 rounded-none resize-none font-mono text-xs bg-app-elevated text-app-text leading-relaxed"
              placeholder="使用 Markdown 编写内容..."
            />

            {/* Stats bar */}
            <ContentStatsBar stats={contentStats} />
          </div>

          {/* Edit mode floating save bar */}
          {isDirty && (
            <div className="sticky bottom-0 z-20 rounded-lg border border-app-border bg-app-elevated/95 backdrop-blur-sm px-4 py-3 flex items-center justify-between shadow-lg shadow-black/10">
              <div className="flex items-center gap-3">
                <ShortcutHint keys={['Ctrl', 'S']} label="快捷键" />
                {autoSaveStatus === 'saving' && (
                  <span className="text-[10px] text-app-text-tertiary flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> 自动保存中...
                  </span>
                )}
                {autoSaveStatus === 'saved' && (
                  <span className="text-[10px] text-green-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> 已保存
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={handleUndo} className="text-xs">
                  <RotateCcw className="h-3.5 w-3.5 mr-1" />
                  撤销
                </Button>
                <Button onClick={handleSave} disabled={saving} size="sm" className="text-xs bg-primary-600 hover:bg-primary-500">
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                  {saving ? '保存中...' : '保存'}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          DIALOGS
         ═══════════════════════════════════════════════════════ */}

      {/* ── Rewrite Dialog ── */}
      <Dialog open={rewriteOpen} onOpenChange={setRewriteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-primary-400" />改写内容
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-app-text-secondary">输入改写要求（如：更口语化、更专业、缩短到200字）</p>
            <Input
              value={rewriteInput}
              onChange={(e) => setRewriteInput(e.target.value)}
              placeholder="例：更口语化，适合小红书风格"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setRewriteOpen(false)}>取消</Button>
              <Button size="sm" onClick={() => { runAiEdit('rewrite', { instruction: rewriteInput }); setRewriteOpen(false); setRewriteInput(''); }} disabled={!rewriteInput.trim()}>执行改写</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Headlines Dialog ── */}
      <Dialog open={headlinesOpen} onOpenChange={setHeadlinesOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <Hash className="w-4 h-4 text-primary-400" />推荐标题
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {headlines.length === 0 ? (
              <p className="text-xs text-app-text-tertiary py-4 text-center">暂无推荐标题</p>
            ) : (
              headlines.map((h, i) => (
                <button
                  key={i}
                  onClick={() => { setEditTitle(h); setIsDirty(true); setHeadlinesOpen(false); showToast('标题已更新', 'success'); }}
                  className="w-full text-left rounded-lg border border-app-border bg-app-surface px-3 py-2 text-xs text-app-text hover:border-primary-500/30 hover:bg-primary-500/5 transition-colors"
                >
                  {h}
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── SEO Dialog ── */}
      <Dialog open={seoOpen} onOpenChange={setSeoOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <SearchIcon className="w-4 h-4 text-primary-400" />SEO 分析
            </DialogTitle>
          </DialogHeader>
          {seoResult && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold" style={{ color: seoResult.overall >= 70 ? '#22c55e' : seoResult.overall >= 40 ? '#eab308' : '#ef4444' }}>
                  {seoResult.overall}
                </span>
                <span className="text-xs text-app-text-tertiary">/ 100</span>
              </div>
              {seoResult.suggestions.length > 0 ? (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-medium text-app-text-tertiary">优化建议</p>
                  {seoResult.suggestions.map((s, i) => (
                    <div key={i} className="flex items-start gap-2 text-[11px] text-app-text-secondary">
                      <span className="text-yellow-400 mt-0.5 shrink-0">•</span>
                      <span>{s}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-green-400">内容质量良好，无需优化 🎉</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>


      {/* ── History Dialog ── */}
      <Dialog open={historyOpen} onOpenChange={handleHistoryOpenChange}>
        <DialogContent className="max-w-2xl max-h-[70vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <HistoryIcon className="w-4 h-4 text-primary-400" />
                版本历史
              </div>
              {versions.length >= 2 && (
                <button
                  onClick={() => { setDiffMode(!diffMode); setDiffSelected([]); }}
                  className={cn(
                    'text-[10px] px-2 py-0.5 rounded transition-colors',
                    diffMode ? 'bg-blue-500/10 text-blue-400' : 'text-app-text-tertiary hover:text-app-text-secondary'
                  )}
                >
                  {diffMode ? '退出对比' : '对比版本'}
                </button>
              )}
            </DialogTitle>
          </DialogHeader>
          {versions.length > 0 ? (
            <div className="flex-1 overflow-auto space-y-2 pr-1">
              {diffMode && diffSelected.length < 2 && (
                <p className="text-[10px] text-app-text-tertiary text-center py-2">
                  {diffSelected.length === 0 ? '请选择两个版本进行对比' : '请再选一个版本进行对比'}
                </p>
              )}
              {diffMode && diffSelected.length === 2 && (() => {
                const v1 = versions.find(v => v.id === diffSelected[0]);
                const v2 = versions.find(v => v.id === diffSelected[1]);
                if (diffLoading) return <p className="text-xs text-app-text-tertiary p-3">加载差异中...</p>;
                if (!diffLines) return null;
                return (
                  <div className="rounded-lg border border-app-border bg-app-surface p-3 mb-2 text-[10px] font-mono max-h-48 overflow-auto">
                    <p className="text-app-text-tertiary mb-1 sticky top-0 bg-app-surface pb-1">
                      对比 v{v1?.version_number} → v{v2?.version_number}
                    </p>
                    {diffLines.map((change, i) => {
                      if (change.type === 'equal') return null;
                      return (
                        <div key={i} className={cn(
                          'flex gap-2 py-0.5',
                          change.type === 'delete' ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'
                        )}>
                          <span className="text-app-text-tertiary w-6 text-right shrink-0">{change.type === 'delete' ? '-' : '+'}</span>
                          <span className="truncate">{change.text}</span>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
              {versions.map((version, idx) => {
                return (
                  <div key={version.id}
                    onClick={() => {
                      if (!diffMode) return;
                      setDiffSelected(prev => {
                        if (prev.includes(version.id)) return prev.filter(id => id !== version.id);
                        if (prev.length >= 2) return [version.id];
                        return [...prev, version.id];
                      });
                    }}
                    className={cn(
                      'rounded-lg border bg-app-surface p-3 transition-colors',
                      diffMode && diffSelected.includes(version.id) ? 'border-blue-500/50 bg-blue-500/5' : 'border-app-border',
                      diffMode ? 'cursor-pointer hover:border-blue-500/30' : ''
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {diffMode && (
                          <div className={cn(
                            'w-3.5 h-3.5 rounded border flex items-center justify-center',
                            diffSelected.includes(version.id) ? 'border-blue-500 bg-blue-500' : 'border-app-border'
                          )}>
                            {diffSelected.includes(version.id) && <span className="text-white text-[8px]">✓</span>}
                          </div>
                        )}
                        <Badge variant={idx === 0 ? 'primary' : 'outline'} size="sm">v{version.version_number}</Badge>
                        <span className="text-[10px] text-app-text-tertiary">{formatRelativeTime(version.created_at)}</span>
                      </div>
                      {idx === 0 && !diffMode && (
                        <span className="text-[9px] px-1.5 py-0.5 bg-primary-600/20 text-primary-400 rounded font-medium">当前版本</span>
                      )}
                    </div>
                    {version.change_summary && (
                      <p className="text-[10px] text-app-text-secondary mb-2">{version.change_summary}</p>
                    )}
                    {idx > 0 && !diffMode && (
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            const res = await contentsApi.update(content.id, {
                              content_md: version.content_md || '',
                              change_summary: `回滚到 v${version.version_number}`,
                            });
                            if (res.data.success) {
                              showToast(`已恢复到 v${version.version_number}`, 'success');
                              setHistoryOpen(false);
                              loadContent(content.id);
                            }
                          } catch {
                            showToast('恢复失败', 'error');
                          }
                        }}
                        className="text-[10px] text-primary-400 hover:text-primary-300 mb-2"
                      >
                        <RotateCcw className="w-3 h-3 mr-1" />恢复到此版本
                      </Button>
                    )}
                    {version.content_md && !diffMode && (
                      <div className="p-2 bg-app-elevated rounded max-h-20 overflow-auto text-[10px] text-app-text-secondary">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {(version.content_md ?? '').slice(0, 300) + ((version.content_md?.length ?? 0) > 300 ? '...' : '')}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-app-text-tertiary py-8 text-xs">暂无版本记录</p>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Publish History Dialog ── */}
      <Dialog open={publishHistoryOpen} onOpenChange={setPublishHistoryOpen}>
        <DialogContent className="max-w-lg max-h-[60vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <Send className="w-4 h-4 text-primary-400" />
              发布记录
            </DialogTitle>
          </DialogHeader>
          {publishHistoryLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-app-text-tertiary" /></div>
          ) : publishRecords.length === 0 ? (
            <p className="text-center text-xs text-app-text-tertiary py-8">暂无发布记录</p>
          ) : (
            <div className="flex-1 overflow-auto space-y-2 pr-1">
              {publishRecords.map((record, idx) => {
                const plat = PLATFORM_MAP.get(record.platform_code);
                return (
                  <div key={record.id || idx} className="rounded-lg border border-app-border bg-app-surface p-3 flex items-center gap-3">
                    <PlatformIcon id={record.platform_code} size={20} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-app-text">{plat?.label || record.platform_code}</p>
                      <p className="text-[10px] text-app-text-tertiary">{formatRelativeTime(record.published_at || record.created_at)}</p>
                    </div>
                    <span className={cn(
                      'text-[10px] px-2 py-0.5 rounded-full font-medium',
                      record.status === 'published' ? 'bg-green-500/10 text-green-400' :
                      record.status === 'failed' ? 'bg-red-500/10 text-red-400' :
                      'bg-yellow-500/10 text-yellow-400'
                    )}>
                      {record.status === 'published' ? '已发布' : record.status === 'failed' ? '失败' : '草稿'}
                    </span>
                    {record.platform_url && (
                      <a href={record.platform_url} target="_blank" rel="noreferrer" className="text-[10px] text-primary-400 hover:underline shrink-0">查看</a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm Dialog ── */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="删除内容"
        description="确定要删除这篇内容吗？此操作不可恢复。"
        variant="danger"
        onConfirm={handleDelete}
      />

    </div>

    {/* 右侧：实时预览面板 — 始终可见，粘性定位 */}
    <div className="w-[380px] shrink-0 border-l border-app-border/30 bg-app-surface/20 p-4 hidden lg:block sticky top-0 self-start max-h-screen overflow-y-auto">
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 mb-3 shrink-0">
          <Eye className="w-4 h-4 text-primary-400" />
          <span className="text-xs font-semibold text-app-text">实时预览</span>
          {content?.platform_code && (
            <span className="text-[10px] text-app-text-tertiary ml-auto">
              {PLATFORM_MAP.get(content.platform_code)?.label || content.platform_code}
            </span>
          )}
        </div>
        <div className="flex-1 flex justify-center min-h-0">
          <div className="self-center w-full max-w-[300px] aspect-[9/19] rounded-[2.25rem] bg-neutral-800 p-[7px] shadow-2xl shadow-black/50 relative">
            <div className="w-full h-full rounded-[1.875rem] bg-white overflow-hidden relative flex flex-col">
              <div className="absolute top-[11px] left-1/2 -translate-x-1/2 z-20 w-[100px] h-[26px] bg-black rounded-full flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-neutral-700" />
              </div>
              <div className="shrink-0 flex items-center justify-between px-7 pt-[11px] pb-0.5 bg-white text-[10px] text-black font-semibold tracking-tight relative z-10">
                <span className="tabular-nums">9:41</span>
                <div className="flex items-center gap-1">
                  <svg width="13" height="9" viewBox="0 0 17 12" fill="currentColor"><path d="M1 8h2v4H1zm4-3h2v7H5zm4-4h2v11H9zm4-1h2v12h-2z"/></svg>
                  <svg width="13" height="9" viewBox="0 0 15 12" fill="currentColor"><path d="M7.5 10.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm3.5-2.5a5 5 0 00-7 0l-1.5-1.5a7 7 0 0110 0L11 8zm3-3a10 10 0 00-13 0L-.5 3.5a12 12 0 0116 0L14 5z"/></svg>
                  <svg width="20" height="10" viewBox="0 0 24 12" fill="none" stroke="currentColor" strokeWidth="1.2"><rect x="0.5" y="0.5" width="18" height="11" rx="2.5"/><path d="M21 4.5v3"/><rect x="2.5" y="2.5" width="12" height="7" rx="1.5" fill="currentColor"/></svg>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto bg-white">
                {(() => {
                  const platformCode = content?.platform_code || 'xiaohongshu';
                  const PreviewComponent = getPreviewComponent(platformCode);
                  // 标题在上 → 正文中间 → 底部统一放标签
                  // 先从正文中剥离所有 #标签，避免重复
                  const bodyWithoutTags = (editContentMd || '').replace(/#[^#\s]+/g, '').replace(/\n{3,}/g, '\n\n').trim();
                  const allTags = [...new Set([
                    ...((editContentMd || '').match(/#[^#\s]+/g) || []).map(t => t.replace('#', '')),
                    ...editTags,
                  ])];
                  const injectedContent = [
                    editTitle || '',
                    '',
                    bodyWithoutTags,
                    allTags.length > 0 ? `\n${allTags.map(t => `#${t}`).join(' ')}` : '',
                  ].filter(Boolean).join('\n');
                  return (
                    <div className="[&>*]:m-0">
                      <PreviewComponent content={injectedContent} />
                    </div>
                  );
                })()}
              </div>
              <div className="shrink-0 flex justify-center py-1.5 bg-white">
                <div className="w-[110px] h-[4px] rounded-full bg-neutral-300/70" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}
