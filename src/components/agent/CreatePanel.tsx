import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '../ui/button';
import { platformsApi } from '../../services/api';
import type { Platform } from '../../types';
import { cn } from '../../utils/helpers';
import { Send, Square, Sparkles, Bot, LayoutGrid, Terminal, ChevronUp, ChevronDown } from 'lucide-react';
import { useAutoSaveDraft } from '../../hooks/useAutoSaveDraft';
import { usePromptHistory } from '../../hooks/usePromptHistory';
import { PromptHistoryDropdown } from '../ui/prompt-history-dropdown';
import { AgentThinkingStream } from './AgentThinkingStream';
import { AgentLiveView } from './AgentLiveView';
import { GenerationHistory } from './GenerationHistory';
import { useAgentStore } from '../../stores/useAgentStore';
import { motion, AnimatePresence } from 'framer-motion';

const CATEGORY_LABELS: Record<string, string> = {
  social_media: '社交媒体',
  creative_writing: '创意写作',
  marketing: '营销内容',
  technical: '技术文章',
};

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

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m${seconds % 60}s`;
}

interface CreatePanelProps {
  prompt: string;
  setPrompt: (v: string) => void;
  isRunning: boolean;
  runningTime: number;
  previousGenerations: ReturnType<typeof useAgentStore.getState>['previousGenerations'];
  handleExecute: () => void;
  handleStop: () => void;
  handleNewSession: () => void;
  handleEditContent: (contentId: string) => void;
}

export function CreatePanel({
  prompt,
  setPrompt,
  isRunning,
  runningTime,
  previousGenerations,
  handleExecute,
  handleStop,
  handleNewSession,
  handleEditContent,
}: CreatePanelProps) {
  const streamEvents = useAgentStore((s) => s.streamEvents);
  const [selectedCategory, setSelectedCategory] = useState<string>('social_media');
  const [viewMode, setViewMode] = useState<'cards' | 'terminal'>('cards');
  const [thinkingDockOpen, setThinkingDockOpen] = useState(true);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { clearDraft, getDraft } = useAutoSaveDraft(prompt);

  useEffect(() => {
    platformsApi.list().then((res) => {
      if (res.data.success && res.data.data) {
        setPlatforms(res.data.data);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const savedDraft = getDraft();
    if (savedDraft) setPrompt(savedDraft);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const categoryKeys = [...new Set(platforms.map((p) => p.category || 'social_media'))];
  const categoryOrder = ['social_media', 'creative_writing', 'marketing', 'technical'];
  const sortedCategories = categoryOrder.filter((c) => categoryKeys.includes(c));
  const displayCategories = sortedCategories.length > 0 ? sortedCategories : Object.keys(CATEGORY_LABELS);

  const currentTemplates = (() => {
    if (platforms.length > 0) {
      const catPlatforms = platforms.filter((p) => (p.category || 'social_media') === selectedCategory);
      const result: { title: string; prompt: string; icon: string }[] = [];
      for (const p of catPlatforms) {
        const prompts = QUICK_PROMPTS[p.code];
        if (prompts) result.push(...prompts);
      }
      if (result.length > 0) return result;
    }
    const fallback: { title: string; prompt: string; icon: string }[] = [];
    for (const code of Object.keys(QUICK_PROMPTS)) {
      const prompts = QUICK_PROMPTS[code];
      if (prompts) fallback.push(...prompts);
    }
    return fallback;
  })();

  const hasEvents = streamEvents.length > 0;

  const handleSubmit = useCallback(async () => {
    if (!prompt.trim() || isRunning) return;
    clearDraft();
    handleExecute();
  }, [prompt, isRunning, clearDraft, handleExecute]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  const handleTemplateSelect = useCallback((template: string) => {
    setPrompt(template);
    inputRef.current?.focus();
  }, [setPrompt]);

  return (
    <div className="flex flex-col h-full">
      {/* Top: scrollable content area */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {!hasEvents ? (
          <div className="min-h-full text-center py-8 space-y-6">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-blue-400" />
              </div>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-app-text mb-1">开始创作</h2>
              <p className="text-xs text-app-text-secondary leading-relaxed max-w-sm mx-auto">
                Multi-Agent 协作，实时思考过程 — 输入需求，Agent 团队将自动拆解任务并执行
              </p>
            </div>

            <div className="max-w-sm mx-auto text-left">
              <p className="text-[10px] text-app-text-tertiary uppercase tracking-wider mb-3">你可以这样开始</p>
              <div className="space-y-2">
                {[
                  { label: '直接描述你的需求', hint: '写一篇关于 AI 辅助编程的技术博客，2000字', icon: '✏️' },
                  { label: '多轮对话迭代优化', hint: '生成后继续对话，修改完善', icon: '💬' },
                  { label: '跟踪实时执行进度', hint: '底部可展开面板实时展示 Agent 思考过程', icon: '⏱️' },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl border border-app-border bg-app-elevated/60 p-3 text-left">
                    <p className="text-xs font-medium text-app-text">{item.label}</p>
                    <p className="text-[10px] text-app-text-tertiary mt-0.5 leading-relaxed">{item.hint}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="max-w-sm mx-auto text-left">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] text-app-text-tertiary uppercase tracking-wider">试试这些示例</p>
                <div className="flex gap-1">
                  {displayCategories.slice(0, 3).map((key) => (
                    <button
                      key={key}
                      onClick={() => setSelectedCategory(key)}
                      className={cn(
                        'px-2 py-1 rounded-md text-[10px] font-medium transition-all duration-200',
                        selectedCategory === key
                          ? 'bg-primary-600/15 text-primary-400 border border-primary-500/30'
                          : 'text-app-text-tertiary hover:text-app-text-secondary border border-transparent'
                      )}
                    >
                      {CATEGORY_LABELS[key] || key}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                {currentTemplates.slice(0, 4).map((t) => (
                  <button
                    key={t.title}
                    onClick={() => handleTemplateSelect(t.prompt)}
                    className="w-full rounded-xl border border-app-border bg-app-elevated p-3 hover:border-blue-500/40 hover:bg-app-hover transition-all group text-left"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{t.icon}</span>
                      <div>
                        <p className="text-sm font-medium text-app-text group-hover:text-blue-400 transition-colors">{t.title}</p>
                        <p className="text-[11px] text-app-text-tertiary mt-0.5 leading-relaxed line-clamp-1">{t.prompt}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {previousGenerations.length > 0 && (
              <GenerationHistory
                generations={previousGenerations}
                onRestore={(gen) => gen.result?.task_id && handleEditContent(gen.result.task_id)}
              />
            )}
          </div>
        ) : (
          <div className="px-4 py-3">
            {/* Inline hint when dock is collapsed */}
            {!thinkingDockOpen && (
              <button
                onClick={() => setThinkingDockOpen(true)}
                className="w-full flex items-center justify-center gap-2 py-2 mb-3 rounded-lg border border-dashed border-app-border text-[11px] text-app-text-tertiary hover:text-app-text-secondary hover:border-blue-500/30 transition-colors"
              >
                <Bot className="w-3.5 h-3.5 text-blue-400" />
                <span>查看 Agent 思考过程</span>
                <ChevronUp className="w-3 h-3" />
              </button>
            )}
            {previousGenerations.length > 0 && (
              <GenerationHistory
                generations={previousGenerations}
                onRestore={(gen) => gen.result?.task_id && handleEditContent(gen.result.task_id)}
              />
            )}
          </div>
        )}
      </div>

      {/* Bottom section: thinking dock + fixed input */}
      <div className="flex-shrink-0 border-t border-app-border/50">
        {/* Thinking dock — collapsible panel */}
        <AnimatePresence>
          {hasEvents && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: thinkingDockOpen ? 280 : 0, opacity: thinkingDockOpen ? 1 : 0 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              style={{ overflow: 'hidden' }}
            >
              <div className="flex flex-col h-[280px]">
                {/* Dock header */}
                <div className="flex items-center gap-3 px-4 py-2 flex-shrink-0 border-b border-app-border/30">
                  {isRunning ? (
                    <span className="flex items-center gap-1.5 text-[11px] text-blue-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                      执行中
                      <span className="text-app-text-tertiary tabular-nums">{formatDuration(runningTime)}</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-[11px] text-app-text-tertiary">
                      <Bot className="w-3.5 h-3.5 text-blue-400" />
                      执行历史
                    </span>
                  )}

                  <div className="ml-auto flex items-center gap-1">
                    <button
                      onClick={() => setViewMode('cards')}
                      className={cn(
                        'p-1 rounded transition-colors',
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
                        'p-1 rounded transition-colors',
                        viewMode === 'terminal'
                          ? 'bg-green-500/20 text-green-400'
                          : 'text-app-text-tertiary hover:text-app-text hover:bg-white/5'
                      )}
                      title="终端视图"
                    >
                      <Terminal className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setThinkingDockOpen(false)}
                      className="p-1 rounded text-app-text-tertiary hover:text-app-text hover:bg-white/5 transition-colors"
                      title="收起"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Dock content */}
                <div className="flex-1 overflow-hidden px-2 pb-2">
                  <div className="h-full rounded-lg bg-app-surface border border-app-border overflow-hidden">
                    {viewMode === 'terminal' ? (
                      <AgentLiveView />
                    ) : (
                      <AgentThinkingStream onPublish={handleEditContent} />
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input bar — always fixed at bottom */}
        <div className="p-3 space-y-2">
          {!prompt && !isRunning && (
            <div className="flex items-center gap-2 px-1 overflow-x-auto scrollbar-hide">
              {['写作', '改写', '分析', '续写', '润色'].map((label, i) => {
                const hints = ['帮我写一篇...', '把这篇文章改得更...', '分析一下这篇内容...', '继续写下去...', '帮我润色这段文字...'];
                return (
                  <button
                    key={label}
                    onClick={() => { setPrompt(hints[i]); inputRef.current?.focus(); }}
                    className="flex-shrink-0 px-2.5 py-1 rounded-full border border-app-border/60 bg-app-elevated/40 text-[10px] text-app-text-tertiary hover:text-app-text hover:border-blue-500/30 hover:bg-blue-500/5 transition-all duration-150"
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}

          <div className="rounded-xl border border-app-border bg-app-elevated p-3">
            <div className="flex gap-3">
              <textarea
                ref={inputRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  isRunning
                    ? 'Agent 正在执行中，可继续输入新的需求...'
                    : hasEvents
                      ? '输入后续指令，例如：「把开头改得更吸引人」...'
                      : '描述你想创作的内容，Agent 团队会自动规划并执行...'
                }
                className="flex-1 min-h-[44px] max-h-[120px] resize-none bg-transparent text-sm text-app-text placeholder:text-app-text-tertiary outline-none leading-relaxed"
                rows={Math.min(3, prompt.split('\n').length)}
              />
              <div className="flex flex-col justify-end gap-1.5">
                {isRunning ? (
                  <Button onClick={handleStop} className="h-9 px-3 text-xs" variant="destructive">
                    <Square className="w-3.5 h-3.5 mr-1" /> 停止
                  </Button>
                ) : (
                  <Button onClick={handleSubmit} disabled={!prompt.trim()} className="h-9 px-4 text-xs">
                    <Send className="w-3.5 h-3.5 mr-1" /> 执行
                  </Button>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between mt-2 text-[10px] text-app-text-tertiary">
              <span>
                {isRunning
                  ? <span className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-blue-400 animate-pulse" />执行中</span>
                  : hasEvents ? '继续对话或 Ctrl+Enter 发送新指令' : '↑↓ 选择提示词 · Ctrl+Enter 发送'}
              </span>
              {isRunning && <span className="text-blue-400 tabular-nums">{formatDuration(runningTime)}</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
