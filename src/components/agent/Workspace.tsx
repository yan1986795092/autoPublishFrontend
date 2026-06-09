import { useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { useExecutionEngine } from '../../hooks/useExecutionEngine';
import {
  Send, Square, Bot, Sparkles, Copy, Check, X,
  BookTemplate, Cpu, SlidersHorizontal, Upload, Globe,
} from 'lucide-react';
import { AdvancedPanel } from './AdvancedPanel';
import { PlatformSelector, PLATFORM_MAP } from './PlatformSelector';
import Markdown from 'react-markdown';

// ── Format helpers ──

function formatTime(ts: number) {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m${seconds % 60}s`;
}

// ── Markdown components ──

const markdownComponents = {
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <a href={href} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">{children}</a>
  ),
  code: ({ className, children }: { className?: string; children?: React.ReactNode }) => {
    const isInline = !className;
    if (isInline) {
      return <code className="rounded bg-white/10 px-1 py-0.5 text-xs font-mono">{children}</code>;
    }
    return (
      <pre className="overflow-x-auto rounded-lg bg-black/30 p-3 text-xs">
        <code className={className}>{children}</code>
      </pre>
    );
  },
  pre: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
};

// ── Helpers ──

function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

// ── Component ──

export function Workspace() {
  const engine = useExecutionEngine('create');
  const {
    prompt, setPrompt, isRunning, runningTime,
    messages, currentResult, thinkingSteps, llmChunks,
    handleExecute, handleStop,
  } = engine;

  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const platform = selectedPlatform ? PLATFORM_MAP.get(selectedPlatform) : null;
  const canPublish = platform?.category === 'publishable';

  const handleSubmit = useCallback(async () => {
    if (!prompt.trim() || isRunning) return;
    // Pass raw prompt — enrichment handled by useExecutionEngine (skill template / content type config)
    await engine.handleExecute(prompt.trim());
    setPrompt('');
  }, [prompt, isRunning, engine, setPrompt]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  const handleCopy = useCallback(async (id: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const hasEvents = messages.length > 0 || thinkingSteps.length > 0 || currentResult !== null;
  const isIdle = messages.length === 0 && !isRunning;

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col min-w-0">
        {/* Platform selector area — prominent when idle, compact when active */}
        <div className={cn(
          'flex-shrink-0 border-b border-app-border/30',
          isIdle ? 'bg-app-surface' : 'bg-app-surface/50'
        )}>
          {isIdle || !selectedPlatform ? (
            <div className="px-6 py-4">
              <PlatformSelector
                selected={selectedPlatform}
                onSelect={setSelectedPlatform}
              />
            </div>
          ) : (
            /* Compact: show selected platform + change button */
            <div className="flex items-center gap-2 px-6 py-2">
              <Globe className="w-3.5 h-3.5 text-primary-400" />
              <span className="text-xs font-medium text-app-text">
                {platform?.icon} {platform?.label}
              </span>
              {canPublish && (
                <span className="text-[9px] text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded-full font-medium">
                  可发布
                </span>
              )}
              <button
                onClick={() => setSelectedPlatform(null)}
                className="ml-auto text-[10px] text-app-text-tertiary hover:text-app-text-secondary transition-colors flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                更换
              </button>
            </div>
          )}
        </div>

        {/* Messages area */}
        <ScrollArea className="flex-1 min-w-0 px-6 py-4">
          <div className="max-w-3xl mx-auto space-y-4">
            {isIdle ? (
              <EmptyWorkspace
                platform={platform}
                onSelect={(s) => { setPrompt(s); inputRef.current?.focus(); }}
              />
            ) : (
              messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  copiedId={copiedId}
                  onCopy={handleCopy}
                  thinkingSteps={thinkingSteps}
                  runningTime={runningTime}
                />
              ))
            )}

            {/* Running indicator (shown when assistant message exists) */}
            {isRunning && messages[messages.length - 1]?.status === 'running' && !messages[messages.length - 1]?.content && (
              <div className="flex items-center gap-2 text-xs text-app-text-tertiary px-1">
                <Bot className="w-4 h-4 text-blue-400 animate-pulse" />
                <span>思考中</span>
                <span className="flex gap-0.5">
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
                <span className="ml-auto text-[10px]">{formatDuration(runningTime)}</span>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Toolbar */}
        <div className="flex-shrink-0 flex items-center gap-2 px-6 py-2 border-t border-app-border/30 bg-app-surface/50">
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-app-border/50 text-[10px] text-app-text-secondary hover:text-app-text hover:border-primary-500/30 transition-colors">
            <BookTemplate className="w-3 h-3" />
            模板
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-app-border/50 text-[10px] text-app-text-secondary hover:text-app-text hover:border-primary-500/30 transition-colors">
            <SlidersHorizontal className="w-3 h-3" />
            参数
          </button>
          {selectedPlatform && (
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-app-border/50 text-[10px] text-app-text-secondary hover:text-app-text hover:border-primary-500/30 transition-colors">
              <Cpu className="w-3 h-3" />
              适配 {platform?.label}
            </button>
          )}
          {hasEvents && !isRunning && (
            <button
              onClick={() => { setPrompt(''); engine.handleClearCurrent(); }}
              className="ml-auto text-[10px] text-app-text-tertiary hover:text-app-text-secondary transition-colors"
            >
              新对话
            </button>
          )}
        </div>

        {/* Input */}
        <div className="flex-shrink-0 px-6 py-3 border-t border-app-border/30">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-end gap-2 rounded-xl border border-app-border bg-app-elevated px-4 py-3">
              <textarea
                ref={inputRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  platform
                    ? `为${platform.label}写一篇${platform.label === '小红书' ? '种草笔记' : platform.label === '公众号' ? '深度文章' : '内容'}...`
                    : '选择上面的平台，或直接输入需求...'
                }
                className="flex-1 min-h-[44px] max-h-[120px] resize-none bg-transparent text-sm text-app-text placeholder:text-app-text-tertiary outline-none leading-relaxed"
                rows={1}
              />
              {isRunning ? (
                <Button onClick={handleStop} className="h-9 px-3 flex-shrink-0" variant="destructive" size="sm">
                  <Square className="w-3.5 h-3.5" />
                </Button>
              ) : canPublish ? (
                <Button
                  onClick={handleSubmit}
                  disabled={!prompt.trim()}
                  className="h-9 px-4 flex-shrink-0 gap-1.5"
                  variant="gradient"
                  size="sm"
                >
                  <Upload className="w-3.5 h-3.5" />
                  生成并发布
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={!prompt.trim()}
                  className="h-9 px-4 flex-shrink-0 gap-1.5"
                  size="sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  生成
                </Button>
              )}
            </div>
            <p className="mt-1 text-center text-[10px] text-app-text-tertiary/50">
              {isRunning
                ? `执行中 ${formatDuration(runningTime)}`
                : canPublish
                  ? '内容将根据平台风格自动适配 · Ctrl+Enter 发送'
                  : 'Ctrl+Enter 发送'
              }
            </p>
          </div>
        </div>
      </div>

      <AdvancedPanel selectedPlatform={selectedPlatform} />
    </div>
  );
}

// ── Sub-components ──

function EmptyWorkspace({ platform, onSelect }: { platform: { icon: string; label: string } | null; onSelect: (s: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center mb-4">
        <Sparkles className="w-7 h-7 text-blue-400" />
      </div>
      <h2 className="text-base font-semibold text-app-text mb-1">
        {platform ? `开始${platform.label}创作` : '开始创作'}
      </h2>
      <p className="text-xs text-app-text-secondary leading-relaxed max-w-sm mb-5">
        {platform
          ? `为${platform.label}生成适配的内容，Agent 将自动调整风格和格式`
          : '选择一个平台，或直接输入需求，Agent 将自动拆解任务并执行'
        }
      </p>
      <div className="flex flex-wrap gap-2 justify-center">
        {platform?.label === '小红书' && (
          <button onClick={() => onSelect('为某款 AI 写作工具写一篇小红书种草笔记，要求标题吸引人，正文口语化')}
            className="px-4 py-2 rounded-full border border-app-border/50 text-xs text-app-text-secondary hover:border-red-500/30 hover:text-red-400 transition-colors">
            📕 写一篇种草笔记
          </button>
        )}
        {platform?.label === '公众号' && (
          <button onClick={() => onSelect('写一篇关于远程办公效率的深度长文，2000 字左右')}
            className="px-4 py-2 rounded-full border border-app-border/50 text-xs text-app-text-secondary hover:border-green-500/30 hover:text-green-400 transition-colors">
            📱 写一篇公众号文章
          </button>
        )}
        {platform?.label === '微博' && (
          <button onClick={() => onSelect('写一条关于 AI 热点的微博，140 字以内，带话题标签')}
            className="px-4 py-2 rounded-full border border-app-border/50 text-xs text-app-text-secondary hover:border-yellow-500/30 hover:text-yellow-400 transition-colors">
            🔵 写一条微博
          </button>
        )}
        {platform?.label === '抖音' && (
          <button onClick={() => onSelect('为一个 30 秒的科技产品宣传视频创作分镜脚本')}
            className="px-4 py-2 rounded-full border border-app-border/50 text-xs text-app-text-secondary hover:border-pink-500/30 hover:text-pink-400 transition-colors">
            🎵 写抖音脚本
          </button>
        )}
        {!platform && (
          <>
            <button onClick={() => onSelect('写一篇 AI 编程趋势分析')}
              className="px-4 py-2 rounded-full border border-app-border/50 text-xs text-app-text-secondary hover:border-blue-500/30 hover:text-blue-400 transition-colors">
              ✏️ 写一篇文章
            </button>
            <button onClick={() => onSelect('为一款智能笔记应用写产品推广文案')}
              className="px-4 py-2 rounded-full border border-app-border/50 text-xs text-app-text-secondary hover:border-purple-500/30 hover:text-purple-400 transition-colors">
              📝 写产品文案
            </button>
            <button onClick={() => onSelect('编写一份 REST API 设计规范文档')}
              className="px-4 py-2 rounded-full border border-app-border/50 text-xs text-app-text-secondary hover:border-cyan-500/30 hover:text-cyan-400 transition-colors">
              📘 写技术文档
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function MessageBubble({
  message, copiedId, onCopy,
  thinkingSteps, runningTime,
}: {
  message: { id: string; role: string; content: string; timestamp: number; status?: string; result?: any };
  copiedId: string | null;
  onCopy: (id: string, text: string) => void;
  thinkingSteps?: any[];
  runningTime?: number;
}) {
  const [showThinking, setShowThinking] = useState(false);

  if (message.role === 'user') {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex justify-end">
        <div className="max-w-[75%] rounded-2xl rounded-tr-md bg-primary-600/15 px-4 py-2.5">
          <p className="text-sm text-app-text whitespace-pre-wrap">{message.content}</p>
          <p className="mt-0.5 text-right text-[10px] text-app-text-tertiary">{formatTime(message.timestamp)}</p>
        </div>
      </motion.div>
    );
  }

  if (message.role === 'assistant') {
    const isRunning = message.status === 'running';
    const isFailed = message.status === 'failed';
    const displayContent = message.content || '';
    const hasThinking = thinkingSteps && thinkingSteps.length > 0;

    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
        <div className="max-w-[85%] w-full rounded-xl border border-app-border/40 bg-app-elevated p-4">
          {/* Header */}
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isRunning ? (
                <Bot className="w-4 h-4 text-blue-400 animate-pulse" />
              ) : isFailed ? (
                <span className="w-4 h-4 text-red-400">⚠️</span>
              ) : (
                <Sparkles className="w-4 h-4 text-yellow-400" />
              )}
              <span className="text-xs font-medium text-app-text">
                {isRunning ? '生成中...' : isFailed ? '生成失败' : '生成结果'}
              </span>
              {isRunning && runningTime !== undefined && (
                <span className="text-[10px] text-app-text-tertiary">{formatDuration(runningTime)}</span>
              )}
            </div>
            {!isRunning && displayContent && (
              <button
                onClick={() => onCopy(message.id, displayContent)}
                className="rounded p-1 text-app-text-tertiary hover:text-app-text-secondary transition-colors"
              >
                {copiedId === message.id ? (
                  <Check className="w-3.5 h-3.5 text-green-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            )}
          </div>

          {/* Content: Thinking animation (no content yet) */}
          {isRunning && !displayContent && (
            <div className="flex items-center gap-1.5 py-2">
              <span className="text-sm text-app-text-secondary">思考中</span>
              <span className="flex gap-0.5">
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            </div>
          )}

          {/* Content: streaming or completed */}
          {displayContent && (
            <div className="prose prose-invert prose-xs max-w-none text-sm leading-relaxed text-app-text-secondary">
              <Markdown components={markdownComponents}>{displayContent}</Markdown>
              {isRunning && <span className="inline-block w-1.5 h-4 bg-blue-400 animate-pulse ml-0.5 align-text-bottom" />}
            </div>
          )}

          {/* Failed message */}
          {isFailed && (
            <div className="text-sm text-red-400 py-1">{displayContent || '请求失败，请重试'}</div>
          )}

          {/* Collapsible thinking steps (DeepSeek style) */}
          {hasThinking && (
            <>
              <button
                onClick={() => setShowThinking(!showThinking)}
                className="mt-3 flex items-center gap-1 text-[10px] text-app-text-tertiary hover:text-app-text-secondary transition-colors"
              >
                <span className={cn('transition-transform text-[8px]', showThinking && 'rotate-90')}>▸</span>
                {showThinking ? '隐藏' : '显示'}思考过程（{thinkingSteps!.length} 步）
              </button>
              {showThinking && (
                <div className="mt-2 space-y-1.5 pl-3 border-l-2 border-app-border/30">
                  {thinkingSteps!.map((step, i) => (
                    <div key={i} className="text-[10px] text-app-text-tertiary flex items-start gap-1.5">
                      <span className={cn(
                        'inline-block mt-0.5 h-1.5 w-1.5 rounded-full flex-shrink-0',
                        step.status === 'running' ? 'bg-blue-400 animate-pulse' :
                        step.status === 'failed' ? 'bg-red-400' : 'bg-green-400'
                      )} />
                      <div className="min-w-0">
                        <span className="font-medium text-app-text-secondary">{step.agent}</span>
                        <span className="ml-1">{step.action}</span>
                        {step.output_summary && (
                          <p className="truncate text-[9px] text-app-text-tertiary mt-0.5">{step.output_summary}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Usage info for completed */}
          {!isRunning && message.result?.usage && (
            <div className="mt-3 flex flex-wrap gap-4 border-t border-app-border/30 pt-2 text-[10px] text-app-text-tertiary">
              <span>Token: {message.result.usage.tokens_used}</span>
              <span>耗时: {message.result.usage.time_elapsed?.toFixed(1)}s</span>
              <span>模型: {message.result.usage.model || 'N/A'}</span>
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  return null;
}

