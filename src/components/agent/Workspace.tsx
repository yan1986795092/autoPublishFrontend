import { useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { useAgentStore } from '../../stores/useAgentStore';
import { useExecutionEngine } from '../../hooks/useExecutionEngine';
import {
  Send, Square, Bot, Sparkles, Copy, Check,
  BookTemplate, Cpu, SlidersHorizontal, Upload,
} from 'lucide-react';
import { AdvancedPanel } from './AdvancedPanel';
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

// ── Toolbar items ──

const TOOLBAR_ITEMS = [
  { key: 'templates', label: '模板', icon: BookTemplate },
  { key: 'skills', label: '技能', icon: Cpu },
  { key: 'params', label: '参数', icon: SlidersHorizontal },
  { key: 'publish', label: '发布', icon: Upload },
] as const;

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
    messages, currentResult, thinkingSteps,
    handleExecute, handleStop,
  } = engine;

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = useCallback(async () => {
    if (!prompt.trim() || isRunning) return;
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

  const hasEvents = useAgentStore((s) => s.streamEvents.length) > 0;

  return (
    <div className="flex h-full">
      {/* Main conversation area */}
      <div className="flex-1 flex flex-col min-w-0">
        <ScrollArea className="flex-1 px-6 py-4">
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.length === 0 && !isRunning ? (
              <EmptyWorkspace onSelect={(s) => { setPrompt(s); inputRef.current?.focus(); }} />
            ) : (
              messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  copiedId={copiedId}
                  onCopy={handleCopy}
                />
              ))
            )}

            {/* Running indicator */}
            {isRunning && (
              <div className="rounded-xl border border-app-border/40 bg-app-surface/40 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Bot className="w-4 h-4 animate-pulse text-blue-400" />
                  <span className="text-xs font-medium text-app-text">Agent 执行中</span>
                  <span className="text-[10px] text-app-text-tertiary">{formatDuration(runningTime)}</span>
                </div>
                {thinkingSteps.length > 0 && (
                  <div className="space-y-1">
                    {thinkingSteps.map((step, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-[10px] text-app-text-tertiary">
                        <span className={cn(
                          'inline-block h-1 w-1 rounded-full',
                          step.status === 'running' ? 'bg-blue-400 animate-pulse' :
                          step.status === 'failed' ? 'bg-red-400' : 'bg-green-400'
                        )} />
                        <span className="font-medium text-app-text-secondary">{step.agent}:</span>
                        <span className="truncate">{step.action}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Result */}
            {currentResult && !isRunning && (
              <ResultBubble result={currentResult} copiedId={copiedId} onCopy={handleCopy} />
            )}
          </div>
        </ScrollArea>

        {/* Toolbar */}
        <div className="flex-shrink-0 flex items-center gap-2 px-6 py-2 border-t border-app-border/30 bg-app-surface/50">
          {TOOLBAR_ITEMS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-app-border/50 text-[10px] text-app-text-secondary hover:text-app-text hover:border-primary-500/30 transition-colors"
            >
              <Icon className="w-3 h-3" />
              {label}
            </button>
          ))}
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
                placeholder="输入需求，Agent 将自动拆解任务并执行..."
                className="flex-1 min-h-[44px] max-h-[120px] resize-none bg-transparent text-sm text-app-text placeholder:text-app-text-tertiary outline-none leading-relaxed"
                rows={1}
              />
              {isRunning ? (
                <Button onClick={handleStop} className="h-9 px-3 flex-shrink-0" variant="destructive" size="sm">
                  <Square className="w-3.5 h-3.5" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={!prompt.trim()}
                  className="h-9 px-4 flex-shrink-0"
                  size="sm"
                >
                  <Send className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
            <p className="mt-1 text-center text-[10px] text-app-text-tertiary/50">
              {isRunning ? `执行中 ${formatDuration(runningTime)}` : 'Ctrl+Enter 发送'}
            </p>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <AdvancedPanel />
    </div>
  );
}

// ── Sub-components ──

function EmptyWorkspace({ onSelect }: { onSelect: (s: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center mb-4">
        <Sparkles className="w-8 h-8 text-blue-400" />
      </div>
      <h2 className="text-lg font-semibold text-app-text mb-1">开始创作</h2>
      <p className="text-xs text-app-text-secondary leading-relaxed max-w-sm mb-6">
        输入需求，Agent 团队将自动拆解任务并协作完成
      </p>
      <div className="flex flex-wrap gap-2 justify-center">
        {['写一篇 AI 编程趋势分析', '小红书种草文案', '产品发布 Newsletter'].map((s) => (
          <button
            key={s}
            onClick={() => onSelect(s)}
            className="px-4 py-2 rounded-full border border-app-border/50 text-xs text-app-text-secondary hover:border-blue-500/30 hover:text-blue-400 transition-colors"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function MessageBubble({
  message, copiedId, onCopy,
}: {
  message: { id: string; role: string; content: string; timestamp: number; status?: string; result?: any };
  copiedId: string | null;
  onCopy: (id: string, text: string) => void;
}) {
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

  if (message.role === 'assistant' && message.content) {
    const sections = message.result?.output?.sections as any[] | undefined;
    const hasSections = sections && Array.isArray(sections) && sections.length > 0;
    const displayContent = hasSections
      ? sections.map((s) => s.output?.content || '').filter(Boolean).join('\n\n')
      : message.content;

    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="rounded-xl border border-app-border/40 bg-app-elevated p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              <span className="text-xs font-medium text-app-text">生成结果</span>
            </div>
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
          </div>
          <div className="prose prose-invert prose-xs max-w-none text-sm leading-relaxed text-app-text-secondary">
            <Markdown components={markdownComponents}>{displayContent}</Markdown>
          </div>
        </div>
      </motion.div>
    );
  }

  return null;
}

function ResultBubble({ result, copiedId, onCopy }: { result: any; copiedId: string | null; onCopy: (id: string, text: string) => void }) {
  const content = result.output?.full_text || result.output?.content || JSON.stringify(result.output, null, 2);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="rounded-xl border border-app-border/40 bg-app-elevated p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-yellow-400" />
            <span className="text-xs font-medium text-app-text">最终结果</span>
          </div>
          <button
            onClick={() => onCopy('result', content)}
            className="rounded p-1 text-app-text-tertiary hover:text-app-text-secondary transition-colors"
          >
            {copiedId === 'result' ? (
              <Check className="w-3.5 h-3.5 text-green-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
        <div className="prose prose-invert prose-xs max-w-none text-sm leading-relaxed text-app-text-secondary">
          <Markdown components={markdownComponents}>{content}</Markdown>
        </div>
        {result.usage && (
          <div className="mt-3 flex flex-wrap gap-4 border-t border-app-border/30 pt-3 text-[10px] text-app-text-tertiary">
            <span>Token: {result.usage.tokens_used}</span>
            <span>耗时: {result.usage.time_elapsed?.toFixed(1)}s</span>
            <span>模型: {result.usage.model || 'N/A'}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
