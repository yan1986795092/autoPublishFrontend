import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import Markdown from 'react-markdown';
import { Send, Bot, Sparkles, Plus, Copy, Check, AlertCircle, Square, Eye } from 'lucide-react';
import type { AsyncTask, ThinkingStep, LLMChunk, ChatMessage } from '../../types';
import { getAgentLabel } from '../../config/agents';
import { useAgentStore } from '../../stores/useAgentStore';

function formatTime(ts: number) {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m${s}s`;
}

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

interface ChatPanelProps {
  prompt: string;
  setPrompt: (v: string) => void;
  runningTime: number;
  isRunning: boolean;
  thinkingSteps: ThinkingStep[];
  llmChunks: Record<string, LLMChunk[]>;
  pendingDecision: ReturnType<typeof useAgentStore.getState>['pendingDecision'];
  currentTaskId: string | null;
  handleExecute: (text: string) => void;
  handleStop: () => void;
  handlePreviewPlan: () => void;
  handleDecisionSubmit: (taskId: string, data: { decision_id: string; choice: string; text?: string }) => Promise<boolean>;
  handleClearDecision: () => void;
  addMessage: ReturnType<typeof useAgentStore.getState>['addMessage'];
  messages: ChatMessage[];
  updateMessage: ReturnType<typeof useAgentStore.getState>['updateMessage'];
}

export function ChatPanel({
  prompt,
  setPrompt,
  runningTime,
  isRunning,
  thinkingSteps,
  llmChunks,
  pendingDecision,
  currentTaskId,
  handleExecute,
  handleStop,
  handlePreviewPlan,
  handleDecisionSubmit,
  handleClearDecision,
  addMessage,
  messages,
  updateMessage,
}: ChatPanelProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const streamEvents = useAgentStore((s) => s.streamEvents);
  const currentResult = useAgentStore((s) => s.currentResult);
  const currentTask = useAgentStore((s) => s.currentTask);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (!scrollRef.current) return;
    if (!autoScroll) return;
    const el = scrollRef.current;
    requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; });
  }, [messages, isRunning, thinkingSteps, autoScroll]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    setAutoScroll(scrollHeight - scrollTop - clientHeight < 60);
  };

  const handleSubmit = useCallback(async () => {
    if (!prompt.trim() || isRunning) return;
    const text = prompt.trim();
    setPrompt('');

    // Add assistant placeholder before execution starts
    const assistantId = crypto.randomUUID();
    const assistantMsg = {
      id: assistantId,
      role: 'assistant' as const,
      content: '',
      timestamp: Date.now(),
      status: 'running' as const,
    };
    addMessage(assistantMsg);

    handleExecute(text);
  }, [prompt, isRunning, setPrompt, handleExecute, addMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  const handleCopy = useCallback(async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  }, []);

  const handleDecisionSubmitLocal = useCallback(async (taskId: string, data: { decision_id: string; choice: string; text?: string }) => {
    return await handleDecisionSubmit(taskId, data);
  }, [handleDecisionSubmit]);

  const hasActiveTask = isRunning || !!currentResult;

  const error = streamEvents.length > 0 && streamEvents[streamEvents.length - 1]?.type === 'error'
    ? (streamEvents[streamEvents.length - 1] as any).message
    : null;

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <ScrollArea className="flex-1" ref={scrollRef} onScroll={handleScroll}>
        <div className="space-y-4 p-4">
          {messages.length === 0 && !isRunning ? (
            <EmptyState onSelect={(s) => setPrompt(s)} />
          ) : (
            messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                currentTask={msg.status === 'running' ? currentTask : null}
                runningTime={msg.status === 'running' ? runningTime : 0}
                thinkingSteps={msg.status === 'running' ? thinkingSteps : []}
                llmChunks={msg.status === 'running' ? llmChunks : {}}
                copiedId={copiedId}
                onCopy={handleCopy}
              />
            ))
          )}

          {error && messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 rounded-lg bg-red-500/10 p-3 text-xs text-red-400"
            >
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </motion.div>
          )}
        </div>
      </ScrollArea>

      {/* Fixed Input Bar */}
      <div className="border-t border-app-border/30 bg-app-bg p-3">
        <div className="flex items-end gap-2">
          <Textarea
            ref={inputRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入需求，Agent 团队将协作完成..."
            className="min-h-[44px] max-h-[120px] resize-none text-sm"
            disabled={isRunning}
            rows={1}
          />
          <div className="flex flex-col gap-1.5">
            {isRunning ? (
              <Button onClick={handleStop} className="h-[44px] flex-shrink-0 px-3" variant="outline">
                <Square className="h-4 w-4 text-red-400" />
              </Button>
            ) : (
              <>
                <Button
                  onClick={handleSubmit}
                  disabled={!prompt.trim()}
                  className="h-[44px] flex-shrink-0 px-3"
                >
                  <Send className="h-4 w-4" />
                </Button>
                <Button
                  onClick={handlePreviewPlan}
                  disabled={!prompt.trim()}
                  variant="outline"
                  size="sm"
                  className="h-6 px-2 text-[10px]"
                  title="预览执行计划"
                >
                  <Eye className="h-3 w-3 mr-0.5" />
                  计划
                </Button>
              </>
            )}
          </div>
        </div>
        <p className="mt-1 text-center text-[10px] text-app-text-secondary/50">
          {isRunning ? `执行中 ${formatDuration(runningTime)}` : 'Ctrl+Enter 发送 — 点击"计划"预览拆解'}
        </p>
      </div>
    </div>
  );
}

function EmptyState({ onSelect }: { onSelect: (s: string) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center gap-3 py-20 text-center"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 ring-1 ring-white/10">
        <Bot className="h-7 w-7 text-blue-400" />
      </div>
      <div>
        <p className="text-sm font-medium text-app-text">开始你的创作</p>
        <p className="mt-1 max-w-xs text-xs text-app-text-secondary">
          输入需求，Agent 团队将自动拆解任务、协作完成文案、配图与排版
        </p>
      </div>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        {['AI编程趋势分析', '小红书种草文案', '产品发布 Newsletter'].map((s) => (
          <button
            key={s}
            onClick={() => onSelect(s)}
            className="rounded-full border border-app-border/50 px-3 py-1 text-[11px] text-app-text-secondary transition-colors hover:border-blue-500/30 hover:text-blue-400"
          >
            {s}
          </button>
        ))}
      </div>
    </motion.div>
  );
}

function MessageBubble({
  message,
  currentTask,
  runningTime,
  thinkingSteps,
  llmChunks,
  copiedId,
  onCopy,
}: {
  message: ChatMessage;
  currentTask: AsyncTask | null;
  runningTime: number;
  thinkingSteps: ThinkingStep[];
  llmChunks: Record<string, LLMChunk[]>;
  copiedId: string | null;
  onCopy: (id: string, text: string) => void;
}) {
  const { role, content, status, result, id } = message;

  if (role === 'user') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        layout
        className="flex justify-end"
      >
        <div className="max-w-[80%] rounded-2xl rounded-tr-md bg-primary-600/15 px-4 py-2.5">
          <p className="text-sm text-app-text whitespace-pre-wrap">{content}</p>
          <p className="mt-0.5 text-right text-[10px] text-app-text-tertiary">{formatTime(message.timestamp)}</p>
        </div>
      </motion.div>
    );
  }

  if (status === 'running') {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} layout>
        <div className="rounded-xl border border-app-border/40 bg-app-surface/40 p-3">
          <div className="mb-2 flex items-center gap-2">
            <Bot className="h-4 w-4 animate-pulse text-blue-400" />
            <span className="text-xs font-medium text-app-text">Agent 执行中</span>
            <span className="text-[10px] text-app-text-tertiary">{formatDuration(runningTime)}</span>
          </div>
          {currentTask && (
            <div className="space-y-2">
              <ProgressBarInline task={currentTask} />
              {thinkingSteps.length > 0 && (
                <div className="max-h-32 overflow-y-auto space-y-0.5">
                  {thinkingSteps.map((step, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-[10px] text-app-text-tertiary">
                      <span className={cn(
                        'inline-block h-1 w-1 rounded-full',
                        step.status === 'running' ? 'bg-blue-400 animate-pulse' :
                        step.status === 'failed' ? 'bg-red-400' : 'bg-green-400'
                      )} />
                      <span className="font-medium text-app-text-secondary">{getAgentLabel(step.agent)}:</span>
                      <span className="truncate">{step.action}</span>
                    </div>
                  ))}
                </div>
              )}
              {Object.keys(llmChunks).length > 0 && (
                <div className="max-h-24 overflow-y-auto rounded bg-black/20 p-2 text-[10px] font-mono text-app-text-tertiary leading-relaxed">
                  {Object.entries(llmChunks).map(([agent, chunks]) => {
                    const lastChunk = chunks[chunks.length - 1];
                    return (
                      <div key={agent} className="truncate">
                        <span className="text-blue-400">{getAgentLabel(agent)}:</span> {lastChunk?.content || ''}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          {!currentTask && (
            <div className="flex items-center gap-2 text-[11px] text-app-text-tertiary">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
              正在分析需求并拆解任务...
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  if (status === 'failed') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        layout
        className="flex items-start gap-2 rounded-lg bg-red-500/8 p-3 text-xs text-red-400"
      >
        <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
        <span>{content || '任务执行失败'}</span>
      </motion.div>
    );
  }

  if (result || content) {
    const sections = result?.output?.sections as Array<{ agent: string; output: { content?: string }; status: string }> | undefined;
    const hasSections = sections && Array.isArray(sections) && sections.length > 0;
    const displayContent = hasSections
      ? sections.map((s) => s.output?.content || '').filter(Boolean).join('\n\n')
      : content;

    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} layout>
        <div className="rounded-xl border border-app-border/40 bg-app-elevated p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-yellow-400" />
              <span className="text-xs font-medium text-app-text">生成结果</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onCopy(id, displayContent)}
                className="rounded p-1 text-app-text-tertiary hover:text-app-text-secondary transition-colors"
              >
                {copiedId === id ? (
                  <Check className="h-3.5 w-3.5 text-green-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
              <Badge variant={status === 'completed' ? 'default' : 'secondary'} className="text-[10px]">
                {status === 'completed' ? '已完成' : status === 'partial' ? '部分完成' : '失败'}
              </Badge>
            </div>
          </div>
          <div className="prose prose-invert prose-xs max-w-none text-sm leading-relaxed text-app-text-secondary">
            <Markdown components={markdownComponents}>
              {displayContent}
            </Markdown>
          </div>
          {result?.usage && (
            <div className="mt-3 flex flex-wrap gap-4 border-t border-app-border/30 pt-3 text-[10px] text-app-text-tertiary">
              <span>Token: {result.usage.tokens_used}</span>
              <span>耗时: {result.usage.time_elapsed.toFixed(1)}s</span>
              <span>模型: {result.usage.model || 'N/A'}</span>
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  return null;
}

function ProgressBarInline({ task }: { task: AsyncTask }) {
  const { progress, progress_message, completed_steps, total_steps } = task;
  const pct = Math.min(progress, 100);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-app-text-secondary">{progress_message || '处理中...'}</span>
        <span className="text-app-text-tertiary">{completed_steps}/{total_steps} 步</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-app-border/50">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
        />
      </div>
      <div className="text-right text-[10px] text-app-text-tertiary">{Math.round(pct)}%</div>
    </div>
  );
}

function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
