import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { contentsApi, aiEditApi, publishApi } from '../services/api';
import type { Content, ContentVersion } from '../types';
import { isPublishable } from '../components/agent/PlatformSelector';
import { useUIStore } from '../stores/useUIStore';
import {
  computeContentStats,
  getActionLabel,
  type SEOAnalysisResult,
  type DiffLine,
  type PublishRecord,
} from '../types/content-editor';

// ─── Hook return type ─────────────────────────────────────

export interface UseContentEditorReturn {
  // Core data
  content: Content | null;
  versions: ContentVersion[];
  loading: boolean;
  saving: boolean;

  // Editing state
  editTitle: string;
  editContentMd: string;
  editTags: string[];
  isDirty: boolean;
  autoSaveStatus: 'idle' | 'saving' | 'saved';
  activePlatform: string;
  /** P0-3: 平台已切换但未保存 */
  platformDirty: boolean;

  // AI state
  aiLoading: boolean;
  seoResult: SEOAnalysisResult | null;
  seoOpen: boolean;
  headlines: string[];
  headlinesOpen: boolean;

  // AI Preview dialog (for rewrite/expand/summarize/translate/tone)
  aiPreviewOpen: boolean;
  aiPreviewResult: string;
  aiPreviewAction: string;
  setAiPreviewOpen: (v: boolean) => void;
  handleApplyAiPreview: () => void;

  // Banned words dialog
  bannedWordsOpen: boolean;
  bannedWordsList: Array<{ word: string }>;
  setBannedWordsOpen: (v: boolean) => void;
  handleApplyBannedReplace: () => void;

  // Dialog state
  historyOpen: boolean;
  publishHistoryOpen: boolean;
  publishRecords: PublishRecord[];
  publishHistoryLoading: boolean;
  deleteConfirmOpen: boolean;

  // Diff state
  diffMode: boolean;
  diffSelected: string[];
  diffLines: DiffLine[] | null;
  diffLoading: boolean;

  // Change handlers (with dirty flag management)
  handleTitleChange: (title: string) => void;
  handleContentChange: (content: string) => void;
  handleTagsChange: (tags: string[]) => void;
  /** P0-3: 切换内容平台/体裁 — 只改本地状态，需用户点保存落库 */
  handlePlatformChange: (platform: string) => void;

  // Dialog setters
  setHeadlinesOpen: (v: boolean) => void;
  setSeoOpen: (v: boolean) => void;
  setHistoryOpen: (v: boolean) => void;
  setPublishHistoryOpen: (v: boolean) => void;
  setDeleteConfirmOpen: (v: boolean) => void;
  setDiffMode: (v: boolean) => void;
  setDiffSelected: React.Dispatch<React.SetStateAction<string[]>>;
  handleHistoryOpenChange: (v: boolean) => void;

  // Operations
  handleSave: () => Promise<void>;
  handleDelete: () => Promise<void>;
  handleExportMd: () => void;
  handleCopyContent: () => Promise<void>;
  handleUndo: () => void;
  runAiEdit: (action: string, extra?: Record<string, unknown>) => Promise<void>;
  loadPublishHistory: (contentId: string) => Promise<void>;
  checkBannedBeforePublish: () => Promise<{ ok: boolean; words: Array<{ word: string }>; source: 'ai' | 'keyword' | 'none' }>;
  /** P0-1: 发布前置完整流程 — 检测违禁词后再决定是否打开发布框 */
  requestPublish: () => Promise<void>;

  // Derived
  contentStats: ReturnType<typeof computeContentStats>;
}

// ─── Hook ──────────────────────────────────────────────────

export function useContentEditor(id: string | undefined): UseContentEditorReturn {
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

  // ── Active platform ──
  const [activePlatform, setActivePlatform] = useState('xiaohongshu');

  // ── Version diff state ──
  const [diffMode, setDiffMode] = useState(false);
  const [diffSelected, setDiffSelected] = useState<string[]>([]);
  const [diffLines, setDiffLines] = useState<DiffLine[] | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);

  // ── History dialog ──
  const [historyOpen, setHistoryOpen] = useState(false);
  const handleHistoryOpenChange = useCallback((v: boolean) => {
    setHistoryOpen(v);
    if (!v) { setDiffMode(false); setDiffSelected([]); setDiffLines(null); }
  }, []);

  // ── P0-4: 用 ref 让早期定义的 AI 应用回调拿到 performAutosave，避开循环依赖 ──
  // 必须在 performAutosave / auto-save effect 之前声明
  const performAutosaveRef = useRef<(() => void) | null>(null);

  // ── P0-4: 显式 autosave 函数，可在 AI 应用后立即触发 ──
  // 必须在 auto-save effect 之前声明，否则 React 编译器会报"访问未声明变量"
  const performAutosave = useCallback(async () => {
    if (!id) return;
    setAutoSaveStatus('saving');
    try {
      await contentsApi.autosave(id, editContentMd, {
        title: editTitle,
        tags: editTags.join(','),
      });
      setAutoSaveStatus('saved');
      setIsDirty(false);
      setTimeout(() => setAutoSaveStatus((s) => (s === 'saved' ? 'idle' : s)), 2000);
    } catch (e: unknown) {
      setAutoSaveStatus('idle');
      const msg = e instanceof Error ? e.message : '自动保存失败';
      showToast(`自动保存失败：${msg}`, 'error');
    }
  }, [id, editContentMd, editTitle, editTags, showToast]);

  // ── Auto-save effect ──
  useEffect(() => {
    if (!isDirty || !id) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      // ── P0-4: 成功清 isDirty，失败 toast，不再静默吞错 ──
      performAutosave();
    }, 10_000);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [id, editContentMd, editTitle, editTags, isDirty, performAutosave]);

  useEffect(() => { performAutosaveRef.current = performAutosave; }, [performAutosave]);

  // ── AI state ──
  const [aiLoading, setAiLoading] = useState(false);
  const [seoResult, setSeoResult] = useState<SEOAnalysisResult | null>(null);
  const [seoOpen, setSeoOpen] = useState(false);
  const [headlines, setHeadlines] = useState<string[]>([]);
  const [headlinesOpen, setHeadlinesOpen] = useState(false);

  // ── AI Preview dialog (for rewrite/expand/summarize/translate/tone) ──
  const [aiPreviewOpen, setAiPreviewOpen] = useState(false);
  const [aiPreviewResult, setAiPreviewResult] = useState('');
  const [aiPreviewAction, setAiPreviewAction] = useState('');

  const handleApplyAiPreview = useCallback(async () => {
    if (!aiPreviewResult) return;
    setEditContentMd(aiPreviewResult);
    setIsDirty(true);
    setAiPreviewOpen(false);
    setAiPreviewResult('');
    showToast(`${getActionLabel(aiPreviewAction)}成功`, 'success');
    // ── P0-4: AI 应用后立即触发 autosave，避免用户离开页面导致内容丢失 ──
    // 异步触发，不 await（dialog 已关闭，无需等待）
    void performAutosaveRef.current?.();
  }, [aiPreviewResult, aiPreviewAction, showToast]);

  // ── Banned words dialog ──
  const [bannedWordsOpen, setBannedWordsOpen] = useState(false);
  const [bannedWordsList, setBannedWordsList] = useState<Array<{ word: string }>>([]);
  const handleApplyBannedReplace = useCallback(async () => {
    let md = editContentMd;
    for (const { word } of bannedWordsList) {
      md = md.replace(new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '***');
    }
    setEditContentMd(md);
    setIsDirty(true);
    setBannedWordsOpen(false);
    setBannedWordsList([]);
    showToast(`已替换 ${bannedWordsList.length} 个违规词`, 'success');
    // ── P0-4: 替换后立即触发 autosave ──
    void performAutosaveRef.current?.();
  }, [editContentMd, bannedWordsList, showToast]);

  // ── AI Edit dispatcher ──
  const runAiEdit = useCallback(async (action: string, extra?: Record<string, unknown>) => {
    if (!editContentMd.trim()) {
      showToast('请先输入内容', 'error');
      return;
    }
    setAiLoading(true);
    try {
      switch (action) {
        case 'rewrite': {
          // ── P1-2: 带上 activePlatform，让后端按平台 DNA 改写（保留小红书口语感 / 公众号深度等）──
          const res = await aiEditApi.rewrite(editContentMd, (extra?.instruction as string) || '', activePlatform);
          if (res.data.success) {
            const result = (res.data.data as { result: string }).result;
            setAiPreviewResult(result);
            setAiPreviewAction('rewrite');
            setAiPreviewOpen(true);
          }
          setAiLoading(false);
          return;
        }
        case 'expand': {
          const res = await aiEditApi.expand(editContentMd, activePlatform);
          if (res.data.success) {
            const result = (res.data.data as { result: string }).result;
            setAiPreviewResult(result);
            setAiPreviewAction('expand');
            setAiPreviewOpen(true);
          }
          setAiLoading(false);
          return;
        }
        case 'translate': {
          const lang = (extra?.lang as string) || 'en';
          const res = await aiEditApi.translate(editContentMd, lang, activePlatform);
          if (res.data.success) {
            const result = (res.data.data as { result: string }).result;
            setAiPreviewResult(result);
            setAiPreviewAction('translate');
            setAiPreviewOpen(true);
          }
          setAiLoading(false);
          return;
        }
        case 'tone': {
          const tone = (extra?.tone as string) || 'professional';
          const res = await aiEditApi.improveTone(editContentMd, tone, activePlatform);
          if (res.data.success) {
            const result = (res.data.data as { result: string }).result;
            setAiPreviewResult(result);
            setAiPreviewAction('tone');
            setAiPreviewOpen(true);
          }
          setAiLoading(false);
          return;
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
            setIsDirty(true);
            showToast(`已添加 ${data.tags?.length || 0} 个推荐标签`, 'success');
          }
          setAiLoading(false);
          return;
        }
        case 'banned': {
          // AI 检测（可理解上下文，检测隐晦变体和平台政策违规）
          let useAi = true;
          let found: Array<{ word: string }> = [];
          if (useAi) {
            try {
              const res = await aiEditApi.checkBannedWordsAi(editContentMd, activePlatform);
              if (res.data.success && res.data.data) {
                const data = res.data.data as { words: Array<{ word: string }>; total: number };
                found = data.words || [];
              }
            } catch {
              useAi = false;
            }
          }
          // 降级：关键词检测
          if (!useAi) {
            try {
              const res = await aiEditApi.checkBannedWords(editContentMd, activePlatform);
              if (res.data.success) {
                const data = res.data.data as { words: Array<{ word: string }>; total: number };
                found = data.words || [];
              }
            } catch {
              if (content?.id) {
                try {
                  const res = await contentsApi.checkBannedWords(content.id);
                  if (res.data.success) {
                    const data = res.data.data as { words: Array<{ word: string }>; total: number };
                    found = data.words || [];
                  }
                } catch {
                  showToast('违禁词检测服务暂不可用', 'error');
                  setAiLoading(false);
                  return;
                }
              } else {
                showToast('请先保存内容后再检测', 'error');
                setAiLoading(false);
                return;
              }
            }
          }

          if (found.length > 0) {
            setBannedWordsList(found);
            setBannedWordsOpen(true);
          } else {
            showToast('没有发现违规词 ✅', 'success');
          }
          setAiLoading(false);
          return;
        }
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
  }, [editContentMd, editTags, activePlatform, showToast, content]);

  // ── Publish history ──
  const [publishHistoryOpen, setPublishHistoryOpen] = useState(false);
  const [publishRecords, setPublishRecords] = useState<PublishRecord[]>([]);
  const [publishHistoryLoading, setPublishHistoryLoading] = useState(false);

  const loadPublishHistory = useCallback(async (contentId: string) => {
    setPublishHistoryLoading(true);
    setPublishHistoryOpen(true);
    try {
      const res = await publishApi.getContentHistory(contentId);
      setPublishRecords(res.data.data?.records || []);
    } catch {
      setPublishRecords([]);
    } finally {
      setPublishHistoryLoading(false);
    }
  }, []);

  // ── P0-1: 发布前检测改为纯函数。返回 { ok, words, source }，
//   由 ContentEditPage.onPublish 决定要不要弹违禁词 Dialog / 打开发布对话框。
//   避免之前那种"hook 内部 setState 触发 Dialog 与发布 Dialog 抢焦点"的混乱。
  const checkBannedBeforePublish = useCallback(async (): Promise<{
    ok: boolean;
    words: Array<{ word: string }>;
    source: 'ai' | 'keyword' | 'none';
  }> => {
    // 第一道：AI 检测（更精准，但慢且可能超时）
    try {
      const res = await aiEditApi.checkBannedWordsAi(editContentMd, activePlatform);
      if (res.data.success && res.data.data) {
        const data = res.data.data as { words: Array<{ word: string }>; total: number };
        if (data.total > 0) {
          return { ok: false, words: data.words, source: 'ai' };
        }
      }
    } catch { /* 降级到关键词 */ }
    // 第二道：关键词检测（快）
    try {
      const res = await aiEditApi.checkBannedWords(editContentMd, activePlatform);
      if (res.data.success) {
        const data = res.data.data as { words: Array<{ word: string }>; total: number };
        if (data.total > 0) {
          return { ok: false, words: data.words, source: 'keyword' };
        }
      }
    } catch { /* 忽略 */ }
    return { ok: true, words: [], source: 'none' };
  }, [editContentMd, activePlatform]);

  /**
   * P0-1: 发布前置完整流程：
   *   1. 触发检测
   *   2. 有违禁词 → 设置列表 + 打开违禁词 Dialog，**不**打开发布 Dialog
   *   3. 没违禁词 → 打开发布 Dialog
   * 集中在这里是为了让 onPublish 保持纯净。
   */
  const requestPublish = useCallback(async (): Promise<void> => {
    if (!content) return;
    const result = await checkBannedBeforePublish();
    if (!result.ok) {
      setBannedWordsList(result.words);
      setBannedWordsOpen(true);
      showToast(`发布前检测到 ${result.words.length} 个违禁词`, 'warning');
      return;
    }
    openPublishDialog(content.id);
  }, [checkBannedBeforePublish, showToast, content, openPublishDialog]);

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
        const data = res.data.data as Content & { versions?: ContentVersion[] };
        setContent(data);
        setEditTitle(data.title || '');
        setEditContentMd(data.content_md || '');
        setEditTags(data.tags || []);
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

  // ── Initial load effect ──
  useEffect(() => {
    if (!id) { navigate('/content'); return; }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadContent(id);
  }, [id, loadContent, navigate]);

  // ── Diff effect ──
  useEffect(() => {
    if (!diffMode || diffSelected.length !== 2 || !content) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
        } else if (!cancelled) {
          setDiffLines([]);
        }
      } catch {
        if (!cancelled) {
          setDiffLines([]);
          showToast('获取版本差异失败', 'error');
        }
      } finally {
        if (!cancelled) setDiffLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [content, diffMode, diffSelected, versions, showToast]);

  // ── Save ──
  // ── P0-3: 平台 dirty 标记 ──
  // 注意：这里不再用 useEffect 来 reset — 改在 handleSave 成功后显式清，
  // 避免 react-hooks/set-state-in-effect 警告。
  // 必须在 handleSave 之前声明，否则 react-hooks/immutability 报错
  const [platformDirty, setPlatformDirty] = useState(false);

  // ── P0-3: 内容平台/体裁变化也需要持久化 —— 用户切了平台后点保存时落库 ──
  const initialPlatformRef = useRef<string | null>(null);
  useEffect(() => {
    if (content && initialPlatformRef.current === null) {
      initialPlatformRef.current = activePlatform;
    }
  }, [content, activePlatform]);

  const handleSave = useCallback(async () => {
    if (!id) return;
    setSaving(true);
    try {
      const platformChanged = activePlatform !== initialPlatformRef.current;
      // 注意：contentsApi.update 的 platform_code 字段如果后端不支持则会被忽略，
      // 这里同时更新 activePlatform 本地状态，确保 preview 立刻生效。
      await contentsApi.update(id, {
        title: editTitle,
        content_md: editContentMd,
        tags: editTags.join(','),
        // 后端 Pydantic schema 可能没声明这两个字段，但 Pydantic 默认忽略未知字段
        // 如果想稳妥持久化，可以在后端 ContentUpdate schema 加 target_platform
        ...(platformChanged ? { platform_code: activePlatform } : {}),
      } as Record<string, unknown>);
      showToast(platformChanged ? `已切换为「${activePlatform}」风格并保存` : '保存成功', 'success');
      setIsDirty(false);
      setPlatformDirty(false);
      initialPlatformRef.current = activePlatform;
      loadContent(id);
    } catch {
      showToast('保存失败', 'error');
    } finally {
      setSaving(false);
    }
  }, [id, editTitle, editContentMd, editTags, activePlatform, showToast, loadContent, setPlatformDirty]);

  // ── Keyboard shortcut: Ctrl+S ──
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
  const handleExportMd = useCallback(() => {
    const blob = new Blob([editContentMd], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${editTitle || 'content'}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [editContentMd, editTitle]);

  const handleCopyContent = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(editContentMd);
      showToast('内容已复制到剪贴板', 'success');
    } catch {
      showToast('复制失败', 'error');
    }
  }, [editContentMd, showToast]);

  // ── Undo ──
  const handleUndo = useCallback(() => {
    setEditContentMd(content?.content_md || '');
    setEditTitle(content?.title || '');
    setEditTags(content?.tags || []);
    setIsDirty(false);
  }, [content]);

  // ── Change handlers ──
  // ── P0-3: 平台切换 — 只改本地 activePlatform + 标记 dirty，不弹窗 ──
  // 用户随后点「保存」时落库（handleSave 会把 platform_code 一起提交）。
  const handlePlatformChange = useCallback((platform: string) => {
    if (!platform || platform === activePlatform) return;
    setActivePlatform(platform);
    setPlatformDirty(true);
    setIsDirty(true);
    showToast(`已切换为「${platform}」风格（点保存生效）`, 'info');
  }, [activePlatform, setPlatformDirty, setActivePlatform, setIsDirty, showToast]);

  const handleTitleChange = useCallback((title: string) => {
    setEditTitle(title);
    setIsDirty(true);
  }, []);

  const handleContentChange = useCallback((content: string) => {
    setEditContentMd(content);
    setIsDirty(true);
  }, []);

  const handleTagsChange = useCallback((tags: string[]) => {
    setEditTags(tags);
    setIsDirty(true);
  }, []);

  return {
    // Core
    content, versions, loading, saving,
    // Edit
    editTitle, editContentMd, editTags, isDirty, autoSaveStatus, activePlatform,
    // ── P0-3: 暴露平台切换 / 当前 platform 标识 ──
    platformDirty, handlePlatformChange,
    // AI
    aiLoading, seoResult, seoOpen, headlines, headlinesOpen,
    aiPreviewOpen, aiPreviewResult, aiPreviewAction, setAiPreviewOpen, handleApplyAiPreview,
    bannedWordsOpen, bannedWordsList, setBannedWordsOpen, handleApplyBannedReplace,
    // Dialogs
    historyOpen, publishHistoryOpen, publishRecords, publishHistoryLoading, deleteConfirmOpen,
    // Diff
    diffMode, diffSelected, diffLines, diffLoading,
    // Handlers
    handleTitleChange, handleContentChange, handleTagsChange,
    setHeadlinesOpen, setSeoOpen,
    setHistoryOpen, setPublishHistoryOpen, setDeleteConfirmOpen,
    setDiffMode, setDiffSelected, handleHistoryOpenChange,
    // Ops
    handleSave, handleDelete, handleExportMd, handleCopyContent, handleUndo,
    runAiEdit, loadPublishHistory, checkBannedBeforePublish, requestPublish,
    // Derived
    contentStats,
  };
}
