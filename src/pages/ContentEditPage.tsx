import { useEffect, useState, useRef, useCallback } from 'react';
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
import { formatRelativeTime, cn } from '../utils/helpers';
import { PLATFORM_MAP } from '../components/agent/PlatformSelector';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useUIStore } from '../stores/useUIStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select';
import {
  History as HistoryIcon, Loader2, Save, RotateCcw, Eye, Download,
  ClipboardCopy, ArrowLeft, FileText, MessageSquare, Palette,
  CheckCircle2, Send, Wand2, Expand, AlignLeft, Languages,
  Volume2, Hash, Search as SearchIcon, AlertTriangle, Tags,
} from 'lucide-react';

const platformConfig: Record<string, { label: string; icon: React.ReactNode }> = {
  xiaohongshu: { label: '小红书', icon: <Palette className="w-3 h-3" /> },
  wechat: { label: '公众号', icon: <MessageSquare className="w-3 h-3" /> },
};

export function ContentEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast, openPublishDialog } = useUIStore();

  const [content, setContent] = useState<Content | null>(null);
  const [versions, setVersions] = useState<ContentVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editTitle, setEditTitle] = useState('');
  const [editContentMd, setEditContentMd] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [platform, setPlatform] = useState('xiaohongshu');
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Version diff state
  const [diffMode, setDiffMode] = useState(false);
  const [diffBase, setDiffBase] = useState<string | null>(null);
  const [diffLines, setDiffLines] = useState<Array<{ type: string; text: string }> | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);

  // Load diff from backend when diffBase changes
  useEffect(() => {
    if (!diffMode || !diffBase || !content) {
      setDiffLines(null);
      return;
    }
    const target = versions.find(v => v.id !== diffBase);
    if (!target) return;
    let cancelled = false;
    setDiffLoading(true);
    (async () => {
      try {
        const res = await contentsApi.diffVersions(content.id, diffBase, target.id);
        if (!cancelled && res.data.success && res.data.data) {
          setDiffLines(res.data.data.changes);
        }
      } catch { /* ignore */ } finally {
        if (!cancelled) setDiffLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [content, diffMode, diffBase, versions]);

  // Reset diff state when closing dialog
  const handleHistoryOpenChange = useCallback((v: boolean) => {
    setHistoryOpen(v);
    if (!v) { setDiffMode(false); setDiffBase(null); setDiffLines(null); }
  }, []);

  // Autosave: debounce 10s after content changes
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
          const res = await aiEditApi.analyzeSeo(editContentMd, platform);
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
          const res = await aiEditApi.checkBannedWords(editContentMd, platform);
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
    } catch {
      showToast(`${getActionLabel(action)}失败`, 'error');
    } finally {
      setAiLoading(false);
    }
  }, [editContentMd, editTags, platform, showToast]);

  function getActionLabel(action: string): string {
    const labels: Record<string, string> = {
      rewrite: '改写', expand: '扩写', summarize: '总结',
      translate: '翻译', tone: '语调优化', headlines: '生成标题',
      seo: 'SEO 分析', tags: '标签推荐', banned: '违禁词检测',
    };
    return labels[action] || action;
  }

  // Preview dialog
  const [previewOpen, setPreviewOpen] = useState(false);
  // History dialog
  const [historyOpen, setHistoryOpen] = useState(false);

  // Publish history
  const [publishHistoryOpen, setPublishHistoryOpen] = useState(false);
  const [publishRecords, setPublishRecords] = useState<Array<{ id: string; platform_code: string; status: string; platform_url?: string; published_at?: string; created_at: string }>>([]);
  const [publishHistoryLoading, setPublishHistoryLoading] = useState(false);

  useEffect(() => {
    if (!id) { navigate('/content'); return; }
    loadContent(id);
  }, [id]);

  const loadContent = async (contentId: string) => {
    setLoading(true);
    try {
      const res = await contentsApi.get(contentId);
      if (res.data.success && res.data.data) {
        const data = res.data.data as Content & { versions?: ContentVersion[] };
        setContent(data);
        setEditTitle(data.title || '');
        setEditContentMd(data.content_md || '');
        setEditTags(data.tags || []);
        setPlatform(data.platform_code || 'xiaohongshu');
        if (data.versions) setVersions(data.versions);
      }
    } catch {
      showToast('加载内容失败', 'error');
      navigate('/content');
    } finally {
      setLoading(false);
    }
  };

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
  }, [id, editTitle, editContentMd, showToast]);

  // 使用 ref 持有最新 handleSave，避免在 effect 中依赖其引用变化
  const handleSaveRef = useRef(handleSave);
  useEffect(() => { handleSaveRef.current = handleSave; }, [handleSave]);

  // Listen for Ctrl+S keyboard shortcut
  useEffect(() => {
    const handler = () => { if (isDirty) handleSaveRef.current(); };
    window.addEventListener('shortcut:save', handler);
    return () => window.removeEventListener('shortcut:save', handler);
  }, [isDirty]);

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

  if (loading) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
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

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="text-app-text-tertiary hover:text-app-text-secondary"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-sm font-semibold text-app-text">
              {content.title || '无标题'}
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              {content.platform_code && (
                <Badge variant={content.platform_code === 'xiaohongshu' ? 'xhs' : content.platform_code === 'wechat' ? 'wechat' : 'default'} size="xs">
                {platformConfig[content.platform_code]?.icon} {platformConfig[content.platform_code]?.label}
                </Badge>
              )}
              <Badge variant={content.status === 'published' ? 'success' : 'warning'} size="xs">
                {content.status === 'published' ? '已发布' : content.status === 'draft' ? '草稿' : '已归档'}
              </Badge>
              <span className="text-[10px] text-app-text-tertiary">
                {formatRelativeTime(content.created_at)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="sm" onClick={handleExportMd} title="导出 Markdown" className="text-app-text-tertiary h-8">
            <Download className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleCopyContent} title="复制内容" className="text-app-text-tertiary h-8">
            <ClipboardCopy className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)} className="h-8 text-xs">
            <Eye className="h-3.5 w-3.5 mr-1" />
            预览
          </Button>
          {content && (
            <Button variant="primary" size="sm" onClick={() => openPublishDialog(content.id)} className="h-8 text-xs">
              <Send className="h-3.5 w-3.5 mr-1" />
              发布
            </Button>
          )}
          {versions.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setHistoryOpen(true)} className="h-8 text-xs">
              <HistoryIcon className="h-3.5 w-3.5 mr-1" />
              历史
            </Button>
          )}
          {content && (
            <Button variant="outline" size="sm" onClick={async () => {
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
            }} className="h-8 text-xs">
              <Send className="h-3.5 w-3.5 mr-1" />
              发布记录
            </Button>
          )}
          {isDirty && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditContentMd(content.content_md || '');
                  setEditTitle(content.title || '');
                  setEditTags(data.tags || []);
                  setIsDirty(false);
                }}
                className="h-8 text-xs"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                撤销
              </Button>
              <Button onClick={handleSave} disabled={saving} size="sm" className="h-8 text-xs bg-primary-600 hover:bg-primary-500">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                {saving ? '保存中...' : '保存'}
              </Button>
            </>
          )}
        </div>
      </div>

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
        <div className="px-4 py-2 border-b border-app-border bg-app-surface text-[11px] font-medium text-app-text-secondary flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-app-text-tertiary" />
          Markdown 编辑
          <span className="ml-auto flex items-center gap-2">
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
            <span className="text-app-text-tertiary">{Array.from(editContentMd).length} 字</span>
          </span>
        </div>
        {/* AI Editing Toolbar */}
        <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-app-border/30 bg-app-surface/50 overflow-x-auto">
          <span className="text-[9px] text-app-text-tertiary mr-1 shrink-0 font-medium">AI</span>
          <Button variant="ghost" size="xs" onClick={() => setRewriteOpen(true)} disabled={aiLoading} title="改写">
            <Wand2 className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="xs" onClick={() => runAiEdit('expand')} disabled={aiLoading} title="扩写">
            <Expand className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="xs" onClick={() => runAiEdit('summarize')} disabled={aiLoading} title="总结">
            <AlignLeft className="w-3 h-3" />
          </Button>
          <Separator orientation="vertical" className="h-4 mx-1" />
          <Select onValueChange={(lang) => runAiEdit('translate', { lang })}>
            <SelectTrigger className="h-6 w-auto gap-1 border-0 bg-transparent text-[10px] text-app-text-secondary hover:text-app-text" disabled={aiLoading}>
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
            <SelectTrigger className="h-6 w-auto gap-1 border-0 bg-transparent text-[10px] text-app-text-secondary hover:text-app-text" disabled={aiLoading}>
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
          <Button variant="ghost" size="xs" onClick={() => runAiEdit('headlines')} disabled={aiLoading} title="生成标题">
            <Hash className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="xs" onClick={() => runAiEdit('seo')} disabled={aiLoading} title="SEO分析">
            <SearchIcon className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="xs" onClick={() => runAiEdit('banned')} disabled={aiLoading} title="违禁词检测">
            <AlertTriangle className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="xs" onClick={() => runAiEdit('tags')} disabled={aiLoading} title="推荐标签">
            <Tags className="w-3 h-3" />
          </Button>
          {aiLoading && <Loader2 className="w-3 h-3 animate-spin text-primary-400 ml-1" />}
        </div>
        <Textarea
          value={editContentMd}
          onChange={(e) => { setEditContentMd(e.target.value); setIsDirty(true); }}
          className="min-h-[400px] border-0 rounded-none resize-none font-mono text-xs bg-app-elevated text-app-text"
          placeholder="使用 Markdown 编写内容..."
        />
      </div>

      {/* ── Rewrite Dialog ── */}
      <Dialog open={rewriteOpen} onOpenChange={setRewriteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="text-sm flex items-center gap-2"><Wand2 className="w-4 h-4 text-primary-400" />改写内容</DialogTitle></DialogHeader>
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
          <DialogHeader><DialogTitle className="text-sm flex items-center gap-2"><Hash className="w-4 h-4 text-primary-400" />推荐标题</DialogTitle></DialogHeader>
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
          <DialogHeader><DialogTitle className="text-sm flex items-center gap-2"><SearchIcon className="w-4 h-4 text-primary-400" />SEO 分析</DialogTitle></DialogHeader>
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

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <Eye className="w-4 h-4 text-primary-400" />
              预览
              <div className="flex gap-1 ml-auto">
                {['xiaohongshu', 'wechat', 'weibo', 'douyin'].map((p) => {
                  const entry = PLATFORM_MAP.get(p);
                  return (
                    <button
                      key={p}
                      onClick={() => setPlatform(p)}
                      className={cn(
                        'px-2 py-0.5 rounded text-[10px] font-medium border transition-colors',
                        platform === p
                          ? 'bg-primary-600/20 text-primary-400 border-primary-500/30'
                          : 'bg-app-surface text-app-text-tertiary border-app-border'
                      )}
                    >
                      {entry?.icon || '📄'} {entry?.label || p}
                    </button>
                  );
                })}
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className={cn(
            'rounded-xl overflow-hidden',
            platform === 'xiaohongshu' && 'bg-gradient-to-b from-pink-50/5 to-white/5',
            platform === 'wechat' && 'bg-gradient-to-b from-green-50/5 to-white/5',
            platform === 'weibo' && 'bg-gradient-to-b from-yellow-50/5 to-white/5',
            platform === 'douyin' && 'bg-gradient-to-b from-purple-50/5 to-white/5',
          )}>
            <div className={cn(
              'prose max-w-none p-4',
              platform === 'xiaohongshu' ? 'text-sm leading-relaxed' : '',
              platform === 'wechat' ? 'text-base leading-8' : '',
              platform === 'weibo' ? 'text-xs leading-relaxed' : '',
              '[&_h1]:text-gray-100 [&_h2]:text-gray-200 [&_p]:text-gray-300',
            )}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {editContentMd || '*暂无内容*'}
              </ReactMarkdown>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
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
                  onClick={() => { setDiffMode(!diffMode); setDiffBase(null); }}
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
              {diffMode && diffBase && (() => {
                const target = versions.find(v => v.id !== diffBase);
                if (!target) return null;
                if (diffLoading) return <p className="text-xs text-app-text-tertiary p-3">加载差异中...</p>;
                if (!diffLines) return null;
                const baseVer = versions.find(v => v.id === diffBase)?.version_number;
                return (
                  <div className="rounded-lg border border-app-border bg-app-surface p-3 mb-2 text-[10px] font-mono max-h-48 overflow-auto">
                    <p className="text-app-text-tertiary mb-1 sticky top-0 bg-app-surface pb-1">
                      对比 v{baseVer} → v{target.version_number}
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
                    if (diffBase === version.id) { setDiffBase(null); return; }
                    setDiffBase(version.id);
                  }}
                  className={cn(
                    'rounded-lg border bg-app-surface p-3 transition-colors',
                    diffMode && diffBase === version.id ? 'border-blue-500/50 bg-blue-500/5' : 'border-app-border',
                    diffMode ? 'cursor-pointer hover:border-blue-500/30' : ''
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {diffMode && (
                        <div className={cn(
                          'w-3.5 h-3.5 rounded border flex items-center justify-center',
                          diffMode && diffBase === version.id ? 'border-blue-500 bg-blue-500' : 'border-app-border'
                        )}>
                          {diffMode && diffBase === version.id && <span className="text-white text-[8px]">✓</span>}
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
                      onClick={() => {
                        setEditContentMd(version.content_md || '');
                        setIsDirty(true);
                        setHistoryOpen(false);
                        showToast(`已恢复到 v${version.version_number}，记得保存`, 'info');
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
              )})}
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
                    <span className="text-base">{plat?.icon || '📄'}</span>
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

    </div>
  );
}
