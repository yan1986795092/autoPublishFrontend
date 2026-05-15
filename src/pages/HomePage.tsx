import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAgentStore } from '../stores/useAgentStore';
import { useUIStore } from '../stores/useUIStore';
import { AgentThinkingStream } from '../components/agent/AgentThinkingStream';
import { AgentLiveView } from '../components/agent/AgentLiveView';
import { PreviewPanel } from '../components/preview/PreviewPanel';
import { Button } from '../components/ui/button';
import { PromptHistoryDropdown } from '../components/ui/prompt-history-dropdown';
import { platformsApi } from '../services/api';
import type { Platform } from '../types';
import { useAutoSaveDraft } from '../hooks/useAutoSaveDraft';
import { usePromptHistory } from '../hooks/usePromptHistory';
import { cn } from '../utils/helpers';
import type { PreviousGeneration } from '../types';
import { Bot, Send, Square, History, RotateCcw, Sparkles, Clock, Terminal, LayoutGrid, FileText } from 'lucide-react';

function PreviousResultsList({ generations, onEdit }: { generations: PreviousGeneration[]; onEdit: (id: string) => void }) {
  return (
    <div className="pt-4 border-t border-app-border/50">
      <div className="flex items-center gap-2 mb-3">
        <History className="w-4 h-4 text-app-text-secondary" />
        <span className="text-xs font-semibold text-app-text-secondary">历史生成记录</span>
      </div>
      <div className="space-y-2 text-left">
        {[...generations].reverse().map((gen) => {
          const output = gen.result?.output;
          const title = (output?.title as string) || ((output?.full_text as string)?.slice(0, 60)) || gen.prompt.slice(0, 60);
          return (
            <button
              key={gen.id}
              onClick={() => gen.result?.task_id && onEdit(gen.result.task_id)}
              className="w-full rounded-xl border border-app-border bg-app-elevated p-3 hover:border-blue-500/40 hover:bg-app-hover transition-all duration-200 text-left group"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-app-text-tertiary flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-app-text truncate group-hover:text-blue-400 transition-colors">
                    {title}
                  </p>
                  <p className="text-xs text-app-text-tertiary mt-0.5 line-clamp-1">
                    {gen.prompt || '未知提示'}
                  </p>
                </div>
                <span className="text-[10px] text-app-text-tertiary flex-shrink-0">
                  {new Date(gen.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m${seconds % 60}s`;
}

interface Template {
  title: string;
  prompt: string;
  icon: string;
}

// 各类别下的默认快速模板（按平台 code 映射）
const QUICK_PROMPTS: Record<string, { title: string; prompt: string; icon: string }[]> = {
  xiaohongshu: [{ title: '小红书种草', prompt: '为某款 AI 写作工具写一篇小红书种草笔记，要求标题吸引人，正文口语化', icon: '📕' }],
  wechat: [{ title: '公众号文章', prompt: '写一篇关于远程办公效率的微信公众号深度长文，2000 字左右', icon: '📱' }],
  zhihu: [{ title: '知乎回答', prompt: '回答「AI是否会取代程序员？」这个问题，要求专业有见地', icon: '💡' }],
  fiction: [{ title: '短篇小说', prompt: '写一篇以「时间旅行者」为主题的短篇小说，3000 字左右，有反转结局', icon: '📖' }],
  storyboard: [{ title: '分镜脚本', prompt: '为一个 30 秒的科技产品宣传视频创作分镜脚本，包含 8 个镜头', icon: '🎬' }],
  script: [{ title: '剧本创作', prompt: '写一个关于「咖啡馆偶遇」的短剧剧本，3 个角色，5 分钟时长', icon: '🎭' }],
  copywriting: [{ title: '产品文案', prompt: '为一款智能笔记应用写产品推广文案，突出 AI 自动整理功能', icon: '📝' }],
  newsletter: [{ title: '邮件通讯', prompt: '写一期关于 AI 工具推荐的 Newsletter，包含 5 个工具推荐', icon: '📧' }],
  technical_doc: [{ title: '技术文档', prompt: '编写一份 REST API 设计规范文档，包含认证、错误码、限流等章节', icon: '📘' }],
  tutorial: [{ title: '教程指南', prompt: '写一篇 Git 入门教程，从安装到分支管理，适合零基础读者', icon: '📗' }],
};

const CATEGORY_LABELS: Record<string, string> = {
  social_media: '社交媒体',
  creative_writing: '创意写作',
  marketing: '营销内容',
  technical: '技术文章',
};

export function HomePage() {
  const navigate = useNavigate();
  const { showToast } = useUIStore();

  const {
    isRunning, streamEvents,
    runStreaming, clearCurrent,
    previousGenerations,
  } = useAgentStore();

  const [prompt, setPrompt] = useState('');
  const [runningTimeState, setRunningTimeState] = useState(0);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('social_media');
  const [historyDropdownOpen, setHistoryDropdownOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'terminal'>('cards');
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Fetch platforms for quick templates
  useEffect(() => {
    platformsApi.list().then((res) => {
      if (res.data.success && res.data.data) {
        setPlatforms(res.data.data);
      }
    }).catch(() => {});
  }, []);

  // Build category list from platforms
  const categoryKeys = [...new Set(platforms.map((p) => p.category || 'social_media'))];
  const categoryOrder = ['social_media', 'creative_writing', 'marketing', 'technical'];
  const sortedCategories = categoryOrder.filter((c) => categoryKeys.includes(c));

  // Draft auto-save
  const { clearDraft, getDraft } = useAutoSaveDraft(prompt);

  // Prompt history
  const { history, addToHistory, clearHistory } = usePromptHistory();

  // Restore draft on mount
  useEffect(() => {
    const savedDraft = getDraft();
    if (savedDraft) {
      setPrompt(savedDraft);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Running timer
  useEffect(() => {
    if (!isRunning) { setRunningTimeState(0); return; }
    const start = Date.now();
    const timer = setInterval(() => setRunningTimeState(Math.round((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [isRunning]);

  // Focus input on mount
  useEffect(() => { inputRef.current?.focus(); }, []);

  // Execute
  const handleExecute = useCallback(async () => {
    if (!prompt.trim() || isRunning) return;
    showToast('Agent 开始执行...', 'info');
    // Add to history before executing
    addToHistory(prompt.trim());
    // Clear draft after successful execution trigger
    clearDraft();
    console.log('[DEBUG] runStreaming started');
    await runStreaming(prompt.trim());
    console.log('[DEBUG] runStreaming finished');
    const st = useAgentStore.getState();
    console.log('[DEBUG] isRunning:', st.isRunning, 'streamEvents:', st.streamEvents.length, 'currentResult:', !!st.currentResult);
    const revt = st.streamEvents.find(e => e.type === 'result');
    if (revt) console.log('[DEBUG] result data keys:', Object.keys(revt.data), 'has full_text:', !!(revt.data as any)?.output?.full_text);
    else console.log('[DEBUG] NO result event in streamEvents');
  }, [prompt, isRunning, runStreaming, showToast, addToHistory, clearDraft]);

  // Stop
  const handleStop = useCallback(async () => {
    const state = useAgentStore.getState();
    if (state.currentTaskId) {
      await state.cancelTask(state.currentTaskId);
    }
    showToast('已停止', 'info');
  }, [showToast]);

  // New session
  const handleNewSession = useCallback(() => {
    clearCurrent();
    setPrompt('');
    clearDraft();
    inputRef.current?.focus();
  }, [clearCurrent, clearDraft]);

  // Listen for Escape keyboard shortcut to stop agent
  useEffect(() => {
    const handler = () => { if (isRunning) handleStop(); };
    window.addEventListener('shortcut:stop-agent', handler);
    return () => window.removeEventListener('shortcut:stop-agent', handler);
  }, [isRunning, handleStop]);

  // Edit content
  const handleEditContent = useCallback((contentId: string) => {
    navigate(`/content/${contentId}`);
  }, [navigate]);

  // Publish content
  const handlePublishContent = useCallback((contentId: string) => {
    navigate(`/content/${contentId}`);
  }, [navigate]);

  // Quick template click
  const handleTemplateSelect = useCallback((template: string) => {
    setPrompt(template);
    inputRef.current?.focus();
  }, []);

  // History select
  const handleHistorySelect = useCallback((selectedPrompt: string) => {
    setPrompt(selectedPrompt);
    inputRef.current?.focus();
  }, []);

  // Keyboard shortcut
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleExecute();
    }
  }, [handleExecute]);

  const hasEvents = streamEvents.length > 0;

  // Build quick templates from platform data
  const currentTemplates: Template[] = (() => {
    const catPlatforms = platforms.filter((p => (p.category || 'social_media') === selectedCategory));
    const result: Template[] = [];
    for (const p of catPlatforms) {
      const prompts = QUICK_PROMPTS[p.code];
      if (prompts) result.push(...prompts);
    }
    return result;
  })();

  // Fallback category tabs if platforms loaded but empty
  const displayCategories = sortedCategories.length > 0 ? sortedCategories : Object.keys(CATEGORY_LABELS);

  return (
    <div className="h-full flex flex-col">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-shrink-0 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-app-text">创作工场</h1>
            <p className="text-[11px] text-app-text-secondary">
              {isRunning ? (
                <span className="inline-flex items-center gap-1.5">
                  <motion.span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block"
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ duration: 1, repeat: Infinity }} />
                  执行中 {formatDuration(runningTimeState)}
                </span>
              ) : hasEvents ? (
                <motion.span
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-green-400"
                >
                  ✓ 完成
                </motion.span>
              ) : '输入需求，Agent 将协作完成'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 relative">
          {/* View mode toggle */}
          {hasEvents && (
            <div className="flex items-center gap-0.5 mr-1">
              <button
                onClick={() => setViewMode('cards')}
                className={cn(
                  'p-1.5 rounded-md transition-colors',
                  viewMode === 'cards'
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'text-app-text-tertiary hover:text-app-text hover:bg-white/5'
                )}
                title="卡片视图"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('terminal')}
                className={cn(
                  'p-1.5 rounded-md transition-colors',
                  viewMode === 'terminal'
                    ? 'bg-green-500/20 text-green-400'
                    : 'text-app-text-tertiary hover:text-app-text hover:bg-white/5'
                )}
                title="终端视图（Claude Code 风格）"
              >
                <Terminal className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <div className="relative">
            <Button
              variant="outline" size="sm"
              onClick={() => setHistoryDropdownOpen(!historyDropdownOpen)}
              className="h-8 px-3 text-xs"
            >
              <Clock className="w-3.5 h-3.5 mr-1" />
              历史
            </Button>
            <PromptHistoryDropdown
              history={history}
              onSelect={handleHistorySelect}
              onClear={clearHistory}
              open={historyDropdownOpen}
              onClose={() => setHistoryDropdownOpen(false)}
            />
          </div>
          <Button
            variant="outline" size="sm"
            onClick={() => navigate('/content')}
            className="h-8 px-3 text-xs"
            aria-label="查看历史"
          >
            <History className="w-3.5 h-3.5 mr-1" />
            内容
          </Button>
          {hasEvents && !isRunning && (
            <Button
              variant="outline" size="sm"
              onClick={handleNewSession}
              className="h-8 px-3 text-xs"
              aria-label="新会话"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              新会话
            </Button>
          )}
          {previewOpen && (
            <Button
              variant="outline" size="sm"
              onClick={() => setPreviewOpen(false)}
              className="h-8 px-3 text-xs"
            >
              关闭预览
            </Button>
          )}
        </div>
      </div>

      {/* ── Main area: thinking stream or empty ── */}
      <div className="flex-1 relative min-h-0 flex">
        <div className={cn(
          'flex-1 min-w-0 h-full flex flex-col transition-all duration-300',
          previewOpen && 'pr-[420px]'
        )}>
          {hasEvents ? (
            /* Thinking stream — view mode toggle */
            <div className="flex-1 overflow-y-auto px-2">
              <div className="max-w-3xl mx-auto py-2 space-y-6">
                {viewMode === 'terminal' ? (
                  <AgentLiveView onEdit={handleEditContent} onPublish={handlePublishContent} />
                ) : (
                  <AgentThinkingStream
                    onEdit={handleEditContent}
                    onPublish={handlePublishContent}
                  />
                )}

                {/* Previous generations — shown below active stream */}
                {previousGenerations.length > 0 && (
                  <PreviousResultsList
                    generations={previousGenerations}
                    onEdit={handleEditContent}
                  />
                )}
              </div>
            </div>
          ) : (
            /* Empty state with quick templates */
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-2xl mx-auto text-center py-16 space-y-8">
                <div className="flex justify-center">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center animate-float shadow-[0_0_40px_rgba(59,130,246,0.15)]">
                    <Sparkles className="w-10 h-10 text-blue-400" />
                  </div>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-app-text mb-2">开始创作</h2>
                  <p className="text-sm text-app-text-secondary leading-relaxed">
                    Multi-Agent 协作，实时思考过程 — 输入需求，Agent 团队将自动拆解任务并执行
                  </p>
                </div>

                {/* Category tabs */}
                <div className="flex justify-center gap-1.5 flex-wrap">
                  {displayCategories.map((key) => (
                    <button
                      key={key}
                      onClick={() => setSelectedCategory(key)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200',
                        selectedCategory === key
                          ? 'bg-primary-600/15 text-primary-400 border border-primary-500/30'
                          : 'bg-app-surface text-app-text-secondary hover:bg-app-hover border border-transparent'
                      )}
                    >
                      {CATEGORY_LABELS[key] || key}
                    </button>
                  ))}
                </div>

                {/* Template grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                  {currentTemplates.map((t) => (
                    <button
                      key={t.title}
                      onClick={() => handleTemplateSelect(t.prompt)}
                      className="rounded-xl border border-app-border bg-app-elevated p-4 hover:border-blue-500/40 hover:bg-app-hover hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 group"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{t.icon}</span>
                        <div>
                          <p className="text-sm font-medium text-app-text group-hover:text-blue-400 transition-colors">{t.title}</p>
                          <p className="text-[11px] text-app-text-tertiary mt-0.5 leading-relaxed">{t.prompt}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Previous generations */}
                {previousGenerations.length > 0 && (
                  <PreviousResultsList
                    generations={previousGenerations}
                    onEdit={handleEditContent}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Right preview panel (slide-in) ── */}
        <AnimatePresence>
          {previewOpen && (
            <motion.div
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="absolute right-0 top-0 bottom-0 w-[420px] z-10 overflow-hidden border-l border-app-border bg-app-bg rounded-r-lg"
            >
              <div className="h-full overflow-auto p-4">
                <PreviewPanel />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Input bar ── */}
      <div className="flex-shrink-0 pt-4">
        <div className="rounded-xl border border-app-border bg-app-elevated p-3">
          <div className="flex gap-3">
            <textarea
              ref={inputRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isRunning ? 'Agent 正在执行中...' : '输入需求，按 Cmd/Ctrl + Enter 快速执行...'}
              className="flex-1 min-h-[44px] max-h-[120px] resize-none bg-transparent text-sm text-app-text placeholder:text-app-text-tertiary outline-none leading-relaxed"
              disabled={false}
              rows={Math.min(3, prompt.split('\n').length)}
              aria-label="输入提示"
            />
            <div className="flex flex-col justify-end gap-1.5">
              {isRunning ? (
                <Button onClick={handleStop} className="h-9 px-3 text-xs" variant="destructive" aria-label="停止" aria-disabled={false}>
                  <Square className="w-3.5 h-3.5 mr-1" /> 停止
                </Button>
              ) : (
              <Button
                onClick={handleExecute}
                disabled={!prompt.trim()}
                className="h-9 px-4 text-xs"
                aria-label="执行"
              >
                <Send className="w-3.5 h-3.5 mr-1" /> 执行
              </Button>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between mt-2 text-[10px] text-app-text-tertiary">
            <span>{isRunning ? '执行中，可输入下个需求' : 'Cmd/Ctrl + Enter 发送'}</span>
            {isRunning && (
              <span className="text-blue-400">{formatDuration(runningTimeState)}</span>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
