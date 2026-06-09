import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { useAgentStore } from '../stores/useAgentStore';
import { useUIStore } from '../stores/useUIStore';
import { getAgentEventSummary } from '../utils/agentEvents';
import Markdown from 'react-markdown';
import { Send, Bot, Sparkles, Plus, Copy, Check, AlertCircle, Square } from 'lucide-react';
import type { AsyncTask, PendingDecision, DecisionSubmitRequest, ChatMessage, AgentResult } from '../types';
import { DecisionDialog } from '../components/agent/DecisionDialog';
import { RecoveryDialog } from '../components/agent/RecoveryDialog';
import { AgentThinkingStream } from '../components/agent/AgentThinkingStream';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { getAgentLabel } from '../config/agents';
import { useWebSocketAgent } from '../hooks/useWebSocketAgent';
import { ConversationSidebar } from '../components/chat/ConversationSidebar';

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

function AgentEventBadges({ result }: { result?: AgentResult | null }) {
  const stats = getAgentEventSummary(result);
  if (!result?.agent_events?.events?.length) return null;
  return (
    <div className="mb-3 flex flex-wrap gap-1.5">
      {stats.map((item) => (
        <Badge key={item.label} variant="secondary" className="text-[10px]">
          {item.label} {item.value}
        </Badge>
      ))}
    </div>
  );
}

const markdownComponents = {
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <a href={href} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">{children}</a>
  ),
  code: ({ className, children, ...props }: { className?: string; children?: React.ReactNode }) => {
    const isInline = !className;
    if (isInline) {
      return <code className="rounded bg-white/10 px-1 py-0.5 text-xs font-mono">{children}</code>;
    }
    return (
      <pre className="overflow-x-auto rounded-lg bg-black/30 p-3 text-xs">
        <code className={className} {...props}>{children}</code>
      </pre>
    );
  },
  pre: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
};

export function AgentPage() {
  const {
    currentTaskId, currentTask,
    isRunning, error, pendingDecision, messages,
    recoveryState, wsConnectionState,
    addMessage, updateMessage,
    runAsync, runStreaming, clearCurrent,
    retryStep, skipStep,
    submitDecision, clearDecision, cancelTask,
    disconnectWebSocket, loadConversations, createConversation,
  } = useAgentStore();

  const showToast = useUIStore((s) => s.showToast);
  const [prompt, setPrompt] = useState('');
  const [runningTime, setRunningTime] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [useStreaming, setUseStreaming] = useState(true);
  const [showSidebar, setShowSidebar] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Load conversations on mount, restore last session
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await loadConversations();
      const store = useAgentStore.getState();
      if (!cancelled && !store.conversationId && store.conversationList.length > 0) {
        await store.switchConversation(store.conversationList[0].id);
      }
    })();
    return () => { cancelled = true; };
  }, [loadConversations]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      const el = scrollRef.current;
      requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; });
    }
  }, [messages, isRunning]);

  // WebSocket
  useWebSocketAgent(currentTaskId, {
    onMessage(data) {
      const store = useAgentStore.getState();
      switch (data.type) {
        case 'progress':
          store.setCurrentTask(data.data as AsyncTask);
          break;
        case 'decision_required':
          store.setPendingDecision(data.data as PendingDecision);
          showToast('Agent 需要你的决定', 'info');
          break;
        case 'result': {
          const result = data.data as AgentResult;
          store.setCurrentResult(result);
          store.loadTaskHistory();
          const assistantMsg = store.messages.find((m) => m.role === 'assistant' && m.status === 'running');
          if (assistantMsg) {
            store.updateMessage(assistantMsg.id, {
              status: 'completed',
              content: (result.output as any)?.full_text || (result.output as any)?.content || JSON.stringify(result.output, null, 2),
              result,
            });
          }
          showToast('Agent 任务已完成', 'success');
          break;
        }
        case 'error':
          showToast((data.message as string) || '任务执行出错', 'error');
          break;
      }
    },
  });

  // Running timer
  useEffect(() => {
    if (!isRunning) {
      setRunningTime(0);
      return;
    }
    const start = Date.now();
    const timer = setInterval(() => {
      setRunningTime(Math.round((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [isRunning]);

  const handleSubmit = useCallback(async () => {
    if (!prompt.trim() || isRunning) return;

    const text = prompt.trim();
    setPrompt('');

    if (useStreaming) {
      await runStreaming(text);
    } else {
      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: text,
        timestamp: Date.now(),
      };
      addMessage(userMsg);

      const assistantId = crypto.randomUUID();
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        status: 'running',
      };
      addMessage(assistantMsg);

      const taskId = await runAsync(text);
      if (!taskId) {
        updateMessage(assistantId, { status: 'failed', content: '提交任务失败，请重试' });
      }
    }
  }, [prompt, isRunning, useStreaming, addMessage, updateMessage, runAsync, runStreaming]);

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

  const handleDecisionSubmit = useCallback(async (taskId: string, data: DecisionSubmitRequest) => {
    const ok = await submitDecision(taskId, data);
    showToast(ok ? '决定已提交，Agent 继续执行' : '提交决定失败，请重试', ok ? 'success' : 'error');
  }, [submitDecision, showToast]);

  const handleStop = useCallback(() => {
    if (currentTaskId) cancelTask(currentTaskId);
    disconnectWebSocket();
    showToast('任务已终止', 'info');
  }, [currentTaskId, cancelTask, disconnectWebSocket, showToast]);

  const handleNewTask = useCallback(async () => {
    const newId = await createConversation();
    if (newId) {
      await useAgentStore.getState().switchConversation(newId);
    } else {
      clearCurrent();
    }
    setPrompt('');
    setShowPreview(false);
    inputRef.current?.focus();
  }, [createConversation, clearCurrent]);

  return (
    <div className="flex h-full overflow-hidden">
      {/* Fixed Sidebar */}
      <div className={`${showSidebar ? 'w-64' : 'w-0'} flex-shrink-0 transition-all duration-300 overflow-hidden`}>
        <ConversationSidebar onClose={() => setShowSidebar(false)} />
      </div>

      {/* Main Chat Area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-app-border/30 px-1 py-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="rounded-lg p-1.5 text-app-text-secondary hover:bg-app-surface hover:text-app-text transition-colors"
              title="对话历史"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
              </svg>
            </button>
            <div>
              <h1 className="text-base font-semibold text-app-text">快速助手</h1>
              <p className="text-[11px] text-app-text-secondary">轻量问答 · 快速生成</p>
            </div>
          </div>
          <button
            onClick={handleNewTask}
            className="flex items-center gap-1 rounded-lg border border-app-border/30 bg-app-surface px-2.5 py-1.5 text-xs text-app-text-secondary hover:border-primary-500/30 hover:text-primary-400 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            新建
          </button>
        </div>

        {/* Messages Area */}
        <ScrollArea className="flex-1 -mx-4 px-4" ref={scrollRef}>
          <div className="space-y-4 py-4">
            <AnimatePresence mode="wait">
              {messages.length === 0 && !isRunning ? (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <EmptyState onSelect={(s) => setPrompt(s)} />
                </motion.div>
              ) : (
                <motion.div key="messages" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {messages.map((msg) => (
                    <MessageBubble
                      key={msg.id}
                      message={msg}
                      currentTask={msg.status === 'running' ? currentTask : null}
                      runningTime={msg.status === 'running' ? runningTime : 0}
                      copiedId={copiedId}
                      onCopy={handleCopy}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error */}
            <AnimatePresence mode="wait">
              {error && messages.length === 0 && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="flex items-center gap-2 rounded-lg bg-red-500/10 p-3 text-xs text-red-400"
                >
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </ScrollArea>

        {/* Input Bar */}
        <div className="border-t border-app-border/30 bg-app-bg pb-2 pt-3">
          <div className="flex items-end gap-2 max-w-3xl mx-auto">
            <Textarea
              ref={inputRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入需求，Agent 团队将协作完成..."
              className="min-h-[44px] max-h-[120px] resize-none text-sm flex-1"
              disabled={isRunning}
              rows={1}
            />
            <div className="flex flex-col gap-1.5 flex-shrink-0">
              {isRunning ? (
                <Button onClick={handleStop} className="h-[44px] px-3" variant="outline">
                  <Square className="h-4 w-4 text-red-400" />
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={!prompt.trim()} className="h-[44px] px-3">
                  <Send className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between max-w-3xl mx-auto mt-1 px-1">
            <p className="text-[10px] text-app-text-secondary/50">
              {isRunning ? `执行中 ${formatDuration(runningTime)}` : 'Ctrl+Enter 发送'}
            </p>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useStreaming}
                  onChange={(e) => setUseStreaming(e.target.checked)}
                  disabled={isRunning}
                  className="rounded border-app-border"
                />
                <span className="text-[10px] text-app-text-tertiary">SSE 流式</span>
              </label>
              {wsConnectionState === 'connected' && (
                <span className="flex items-center gap-1 text-[10px] text-green-400">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400" />
                  WebSocket
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <DecisionDialog
        decision={pendingDecision}
        taskId={currentTaskId}
        onSubmit={handleDecisionSubmit}
        onClose={clearDecision}
      />

      <RecoveryDialog
        recovery={recoveryState}
        onRetry={retryStep}
        onSkip={skipStep}
        onCancel={clearCurrent}
        onClose={clearCurrent}
      />

      <PlanPreviewDialog open={showPreview} onClose={() => setShowPreview(false)} />
    </div>
  );
}

function PlanPreviewDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { currentPlan } = useAgentStore();

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-sm">执行计划</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-app-text-secondary mb-3">
          {currentPlan?.goal || '正在生成计划...'}
        </p>
        {currentPlan ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[11px] text-app-text-tertiary">
              <span>预计 {currentPlan.estimated_steps} 步</span>
              <span>·</span>
              <span>{currentPlan.tasks.length} 个子任务</span>
            </div>
            <div className="max-h-64 space-y-1.5 overflow-auto">
              {currentPlan.tasks.map((task, i) => {
                const label = getAgentLabel(task.agent_type);
                return (
                  <div key={i} className="flex items-center gap-2 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-xs">
                    <span className="text-app-text-tertiary">#{i + 1}</span>
                    <span className="font-medium text-app-text">{label}</span>
                    <span className="ml-auto text-app-text-tertiary">
                      {task.dependencies.length > 0 ? `依赖: ${task.dependencies.join(', ')}` : '无依赖'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="py-4 text-center text-xs text-app-text-tertiary">加载中...</p>
        )}
      </DialogContent>
    </Dialog>
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
  copiedId,
  onCopy,
}: {
  message: ChatMessage;
  currentTask: AsyncTask | null;
  runningTime: number;
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
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        layout
      >
        <div className="rounded-xl border border-app-border/40 bg-app-surface/40 p-3">
          <div className="mb-2 flex items-center gap-2">
            <Bot className="h-4 w-4 animate-pulse text-blue-400" />
            <span className="text-xs font-medium text-app-text">Agent 执行中</span>
            <span className="text-[10px] text-app-text-tertiary">{formatDuration(runningTime)}</span>
          </div>

          {currentTask ? (
            <div className="space-y-2">
              <ProgressBarInline task={currentTask} />
              <div className="rounded-lg border border-app-border/40 bg-black/10 p-2">
                <div className="mb-2 flex items-center justify-between text-[10px] text-app-text-tertiary">
                  <span>结构化事件时间线</span>
                  <span>{formatDuration(runningTime)}</span>
                </div>
                <div className="max-h-80 overflow-hidden rounded-md">
                  <AgentThinkingStream />
                </div>
              </div>
            </div>
          ) : (
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

  // Completed result
  if (result || content) {
    const sections = result?.output?.sections as Array<{ agent: string; output: { content?: string }; status: string }> | undefined;
    const hasSections = sections && Array.isArray(sections) && sections.length > 0;
    const displayContent = hasSections
      ? sections.map((s) => s.output?.content || '').filter(Boolean).join('\n\n')
      : content;

    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        layout
      >
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

          <AgentEventBadges result={result} />

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
