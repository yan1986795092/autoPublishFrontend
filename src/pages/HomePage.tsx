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
import { useAutoSaveDraft } from '../hooks/useAutoSaveDraft';
import { usePromptHistory } from '../hooks/usePromptHistory';
import { cn } from '../utils/helpers';
import { Bot, Send, Square, History, RotateCcw, Sparkles, Clock, Terminal, LayoutGrid } from 'lucide-react';

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m${seconds % 60}s`;
}

interface Template {
  title: string;
  prompt: string;
  icon: string;
}

const QUICK_TEMPLATES: Record<string, Template[]> = {
  social: [
    { title: '小红书种草', prompt: '为某款 AI 写作工具写一篇小红书种草笔记，要求标题吸引人，正文口语化', icon: '📕' },
    { title: '公众号文章', prompt: '写一篇关于远程办公效率的微信公众号深度长文，2000 字左右', icon: '📱' },
  ],
  tech: [
    { title: '技术博客', prompt: '写一篇关于 AI 编程最新趋势的技术博客，包含代码示例和架构图', icon: '💻' },
    { title: '分析报告', prompt: '分析 2026 年大模型在各行业的落地情况，输出一份结构化报告', icon: '📊' },
  ],
  marketing: [
    { title: '产品文案', prompt: '为一款智能笔记应用写产品推广文案，突出 AI 自动整理功能', icon: '✨' },
  ],
};

const CATEGORY_LABELS: Record<string, string> = {
  social: '社交媒体',
  tech: '技术文章',
  marketing: '营销文案',
};

export function HomePage() {
  const navigate = useNavigate();
  const { showToast } = useUIStore();

  const {
    isRunning, streamEvents,
    runStreaming, clearCurrent,
  } = useAgentStore();

  const [prompt, setPrompt] = useState('');
  const [runningTimeState, setRunningTimeState] = useState(0);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('social');
  const [historyDropdownOpen, setHistoryDropdownOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'terminal'>('cards');
  const inputRef = useRef<HTMLTextAreaElement>(null);

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
    await runStreaming(prompt.trim());
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
  const currentTemplates = QUICK_TEMPLATES[selectedCategory] || [];

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
              {isRunning ? `执行中 ${formatDuration(runningTimeState)}` : hasEvents ? '就绪' : '输入需求，Agent 将协作完成'}
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
              <div className="max-w-3xl mx-auto py-2">
                {viewMode === 'terminal' ? (
                  <AgentLiveView onEdit={handleEditContent} onPublish={handlePublishContent} />
                ) : (
                  <AgentThinkingStream
                    onEdit={handleEditContent}
                    onPublish={handlePublishContent}
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
                  {Object.entries(QUICK_TEMPLATES).map(([key, _]) => (
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
                      {CATEGORY_LABELS[key]}
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
              disabled={isRunning}
              rows={Math.min(3, prompt.split('\n').length)}
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
            <span>Cmd/Ctrl + Enter 发送</span>
            {isRunning && (
              <span className="text-blue-400">{formatDuration(runningTimeState)}</span>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
