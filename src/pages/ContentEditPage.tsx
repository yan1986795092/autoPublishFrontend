import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { contentsApi } from '../services/api';
import type { Content, ContentVersion } from '../types';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { SkeletonCard, SkeletonText } from '../components/ui/Skeleton';
import { TagInput } from '../components/ui/TagInput';
import { formatRelativeTime, cn } from '../utils/helpers';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useUIStore } from '../stores/useUIStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { History as HistoryIcon, Loader2, Save, RotateCcw, Eye, Download, ClipboardCopy, ArrowLeft, FileText, MessageSquare, Palette } from 'lucide-react';

const platformConfig: Record<string, { label: string; icon: React.ReactNode }> = {
  xiaohongshu: { label: '小红书', icon: <Palette className="w-3 h-3" /> },
  wechat: { label: '公众号', icon: <MessageSquare className="w-3 h-3" /> },
};

export function ContentEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useUIStore();

  const [content, setContent] = useState<Content | null>(null);
  const [versions, setVersions] = useState<ContentVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editTitle, setEditTitle] = useState('');
  const [editContentMd, setEditContentMd] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [platform, setPlatform] = useState('xiaohongshu');

  // Preview dialog
  const [previewOpen, setPreviewOpen] = useState(false);
  // History dialog
  const [historyOpen, setHistoryOpen] = useState(false);
  const [diffMode, setDiffMode] = useState(false);
  const [diffBase, setDiffBase] = useState<string | null>(null);

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

  // Listen for Ctrl+S keyboard shortcut
  useEffect(() => {
    const handler = () => { if (isDirty) handleSave(); };
    window.addEventListener('shortcut:save', handler);
    return () => window.removeEventListener('shortcut:save', handler);
  }, [isDirty]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
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
  };

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
          {versions.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setHistoryOpen(true)} className="h-8 text-xs">
              <HistoryIcon className="h-3.5 w-3.5 mr-1" />
              历史
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
          <span className="ml-auto text-app-text-tertiary">{Array.from(editContentMd).length} 字</span>
        </div>
        <Textarea
          value={editContentMd}
          onChange={(e) => { setEditContentMd(e.target.value); setIsDirty(true); }}
          className="min-h-[400px] border-0 rounded-none resize-none font-mono text-xs bg-app-elevated text-app-text"
          placeholder="使用 Markdown 编写内容..."
        />
      </div>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <Eye className="w-4 h-4 text-primary-400" />
              预览
              <div className="flex gap-1 ml-auto">
                {(['xiaohongshu', 'wechat'] as const).map((p) => (
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
                    {platformConfig[p]?.icon} {platformConfig[p]?.label}
                  </button>
                ))}
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="min-h-[200px] bg-white/5 rounded-xl overflow-hidden">
            <div className="prose max-w-none p-4 [&_h1]:text-gray-100 [&_h2]:text-gray-200 [&_p]:text-gray-300 [&_p]:leading-relaxed">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {editContentMd || '*暂无内容*'}
              </ReactMarkdown>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyOpen} onOpenChange={(v) => { setHistoryOpen(v); if (!v) { setDiffMode(false); setDiffBase(null); } }}>
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
                const base = versions.find(v => v.id === diffBase);
                const target = versions.find(v => v.id !== diffBase);
                if (base && target) {
                  const baseLines = (base.content_md || '').split('\n');
                  const targetLines = (target.content_md || '').split('\n');
                  const maxLen = Math.max(baseLines.length, targetLines.length);
                  return (
                    <div className="rounded-lg border border-app-border bg-app-surface p-3 mb-2 text-[10px] font-mono">
                      <p className="text-app-text-tertiary mb-1">
                        对比 v{base.version_number} → v{target.version_number}
                      </p>
                      {Array.from({ length: maxLen }).map((_, i) => {
                        const a = baseLines[i] || '';
                        const b = targetLines[i] || '';
                        if (a === b) return null;
                        return (
                          <div key={i} className={cn(
                            'flex gap-2 py-0.5',
                            a && !b ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'
                          )}>
                            <span className="text-app-text-tertiary w-6 text-right shrink-0">{i + 1}</span>
                            <span className="truncate">{b || `<missing>`}</span>
                          </div>
                        );
                      })}
                    </div>
                  );
                }
                return null;
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
    </div>
  );
}
