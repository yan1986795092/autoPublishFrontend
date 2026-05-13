import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../components/ui/button';
import { ScrollArea } from '../components/ui/scroll-area';
import { Badge } from '../components/ui/badge';
import { useAgentStore } from '../stores/useAgentStore';
import { useUIStore } from '../stores/useUIStore';
import { cn } from '../utils/helpers';
import Markdown from 'react-markdown';
import {
  Send, Square, Plus, Eye, Code2, Sparkles,
  Bot, ChevronRight, Copy, Check, X,
} from 'lucide-react';
import type { ExecutionPlan, AsyncTask, ChatMessage, ThinkingStep, AgentResult } from '../types';
import { DecisionDialog } from '../components/agent/DecisionDialog';
import { AgentThinkingPanel } from '../components/agent/AgentThinkingPanel';
import { AgentDebugView } from '../components/agent/AgentDebugView';
import { ContentTypeSelector } from '../components/agent/ContentTypeSelector';
import { TaskProgressBar } from '../components/agent/TaskProgressBar';
import { ExecutionPlanEditor } from '../components/agent/ExecutionPlanEditor';
import { StreamingOutput } from '../components/agent/StreamingOutput';
import { ResultPreview } from '../components/agent/ResultPreview';

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m${s}s`;
}

const AGENT_LABELS: Record<string, string> = {
  ManagerAgent: '🧠 规划',
  WritingAgent: '✍️ 写作',
  SEOAgent: '🔍 SEO',
  DiagramAgent: '📊 图表',
  ReviewAgent: '✅ 审核',
  WebSearch: '🌐 搜索',
  ImageAgent: '🎨 配图',
  CodeAgent: '💻 代码',
  HotTopicAgent: '🔥 热点',
  PlatformAdapter: '📱 适配',
};

const AGENT_ICONS: Record<string, string> = {
  WritingAgent: '✍️',
  SEOAgent: '🔍',
  DiagramAgent: '📊',
  ReviewAgent: '✅',
  WebSearch: '🌐',
  ImageAgent: '🎨',
  CodeAgent: '💻',
  HotTopicAgent: '🔥',
  PlatformAdapter: '📱',
  ManagerAgent: '🧠',
};

export function AgentStudioPage() {
  const {
    currentTaskId, currentTask, currentResult,
    isRunning, error, pendingDecision,
    thinkingSteps,
    addMessage, clearMessages,
    runAsync, runStreaming,
    submitDecision, clearDecision, cancelTask,
    connectWebSocket, disconnectWebSocket,
    previewPlan,
  } = useAgentStore();

  const showToast = useUIStore((s) => s.showToast);

  const [prompt, setPrompt] = useState('');
  const [showPlanEditor, setShowPlanEditor] = useState(false);
  const [runningTime, setRunningTime] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeRightTab, setActiveRightTab] = useState<'preview' | 'trace' | 'debug'>('preview');
  const [panelCollapsed, setPanelCollapsed] = useState({ left: false, right: false });
  const [useStreaming, setUseStreaming] = useState(true);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  // Running timer
  useEffect(() => {
    if (!isRunning) { setRunningTime(0); return; }
    const start = Date.now();
    const timer = setInterval(() => setRunningTime(Math.round((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [isRunning]);

  // WebSocket fallback for async tasks
  useEffect(() => {
    if (!currentTaskId || !isRunning || useStreaming) return;
    let reconnectAttempt = 0;
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout>;

    const connect = () => {
      ws = connectWebSocket(currentTaskId!);
      if (!ws) return;
      ws.onopen = () => { reconnectAttempt = 0; };
      ws.onclose = () => {
        if (reconnectAttempt < 5 && useAgentStore.getState().isRunning) {
          reconnectTimer = setTimeout(() => { reconnectAttempt++; connect(); }, Math.min(1000 * 2 ** reconnectAttempt, 30000));
        }
      };
    };
    connect();
    return () => { clearTimeout(reconnectTimer); disconnectWebSocket(); };
  }, [currentTaskId, isRunning, useStreaming, connectWebSocket, disconnectWebSocket]);

  // Preview plan
  const handlePreviewPlan = useCallback(async () => {
    if (!prompt.trim()) return;
    showToast('正在生成执行计划...', 'info');
    const plan = await previewPlan(prompt.trim());
    if (plan) {
      setShowPlanEditor(true);
      showToast(`计划包含 ${plan.tasks.length} 个步骤`, 'info');
    } else {
      showToast('生成计划失败', 'error');
    }
  }, [prompt, previewPlan, showToast]);

  // Confirm plan → execute
  const handleConfirmPlan = useCallback(async (adjustedPlan: ExecutionPlan) => {
    setShowPlanEditor(false);
    showToast(`执行计划已确认，共 ${adjustedPlan.tasks.length} 个步骤`, 'info');

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: prompt.trim(),
      timestamp: Date.now(),
    };
    addMessage(userMsg);

    if (useStreaming) {
      await runStreaming(prompt.trim());
    } else {
      const taskId = await runAsync(prompt.trim());
      if (!taskId) showToast('提交任务失败', 'error');
    }
  }, [prompt, runAsync, runStreaming, useStreaming, addMessage, showToast]);

  // Direct execute (skip plan)
  const handleDirectExecute = useCallback(async () => {
    if (!prompt.trim()) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: prompt.trim(),
      timestamp: Date.now(),
    };
    addMessage(userMsg);

    if (useStreaming) {
      await runStreaming(prompt.trim());
    } else {
      const taskId = await runAsync(prompt.trim());
      if (!taskId) showToast('提交任务失败', 'error');
    }
  }, [prompt, runAsync, runStreaming, useStreaming, addMessage, showToast]);

  // Stop
  const handleStop = useCallback(() => {
    if (currentTaskId) cancelTask(currentTaskId);
    disconnectWebSocket();
    showToast('任务已终止', 'info');
  }, [currentTaskId, cancelTask, disconnectWebSocket, showToast]);

  // New session
  const handleNewSession = useCallback(() => {
    clearMessages();
    setPrompt('');
    setActiveRightTab('preview');
    inputRef.current?.focus();
  }, [clearMessages]);

  // Copy
  const handleCopy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId('main');
      setTimeout(() => setCopiedId(null), 2000);
    } catch { /* fallback */ }
  }, []);

  // Decision
  const handleDecisionSubmit = useCallback(async (taskId: string, data: { decision_id: string; choice: string; text?: string }) => {
    const ok = await submitDecision(taskId, data);
    showToast(ok ? '决定已提交' : '提交失败', ok ? 'success' : 'error');
  }, [submitDecision, showToast]);

  const displayContent = currentResult
    ? ((currentResult.output?.full_text as string) || (currentResult.output?.content as string) || '')
    : '';

  return (
    <div className="flex h-full gap-0">
      {/* ── Left Panel: Input + Config ── */}
      <AnimatePresence>
        {!panelCollapsed.left && (
          <motion.div
            key="left-panel"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 360, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="flex-shrink-0 border-r border-app-border overflow-hidden"
          >
            <div className="w-[360px] h-full flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b border-app-border">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-semibold text-app-text">Agent 工场</span>
                </div>
                <button
                  onClick={() => setPanelCollapsed(p => ({ ...p, left: true }))}
                  className="text-app-text-tertiary hover:text-app-text"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-auto p-4 space-y-4">
                <div className="space-y-2">
                  <textarea
                    ref={inputRef}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleDirectExecute();
                    }}
                    placeholder="输入需求，Agent 团队将协作完成...&#10;&#10;例如：写一篇关于 AI 编程趋势的公众号文章"
                    className="w-full min-h-[120px] resize-none rounded-lg border border-app-border bg-app-surface p-3 text-sm text-app-text placeholder:text-app-text-tertiary focus:border-blue-500/50 focus:outline-none transition-colors"
                    disabled={isRunning}
                  />
                  <div className="flex gap-2">
                    {isRunning ? (
                      <Button onClick={handleStop} className="flex-1 h-8 text-xs" variant="destructive">
                        <Square className="w-3 h-3 mr-1" /> 停止
                      </Button>
                    ) : (
                      <>
                        <Button onClick={handleDirectExecute} disabled={!prompt.trim()} className="flex-1 h-8 text-xs">
                          <Send className="w-3 h-3 mr-1" /> 直接执行
                        </Button>
                        <Button onClick={handlePreviewPlan} disabled={!prompt.trim()} variant="outline" size="sm" className="h-8 text-xs px-2">
                          <Eye className="w-3 h-3 mr-1" /> 预览计划
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                <ContentTypeSelector onChange={() => {}} />

                <QuickTemplates onSelect={(t) => setPrompt(t)} />

                {isRunning && currentTask && (
                  <div className="space-y-2">
                    <TaskProgressBar task={currentTask} />
                    {currentPlan && (
                      <PlanProgressStrip plan={currentPlan} currentTask={currentTask} />
                    )}
                  </div>
                )}
              </div>

              <div className="border-t border-app-border px-4 py-2">
                <div className="flex items-center justify-between text-[10px] text-app-text-tertiary">
                  <span>{isRunning ? `运行中 ${formatDuration(runningTime)}` : '就绪'}</span>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useStreaming}
                      onChange={(e) => setUseStreaming(e.target.checked)}
                      className="w-3 h-3"
                    />
                    <span>SSE 流式</span>
                  </label>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {panelCollapsed.left && (
        <button
          onClick={() => setPanelCollapsed(p => ({ ...p, left: false }))}
          className="flex-shrink-0 w-8 border-r border-app-border flex items-center justify-center text-app-text-tertiary hover:text-app-text hover:bg-app-hover transition-colors"
        >
          <Bot className="w-4 h-4" />
        </button>
      )}

      {/* ── Center: Execution + Result ── */}
      <div className="flex-1 min-w-0 flex flex-col">
        {isRunning && (
          <div className="flex-shrink-0 border-b border-app-border bg-app-surface/50 px-4 py-2">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-xs font-medium text-app-text">Agent 执行中</span>
              {currentTask && (
                <span className="text-xs text-app-text-secondary">{currentTask.progress_message || currentTask.current_step}</span>
              )}
              <span className="ml-auto text-xs text-app-text-tertiary font-mono">{formatDuration(runningTime)}</span>
            </div>
          </div>
        )}

        <ScrollArea className="flex-1">
          <div className="p-6">
            {!isRunning && !currentResult && !currentPlan && (
              <EmptyStudioState onSelect={(s) => setPrompt(s)} />
            )}

            {currentPlan && !isRunning && !currentResult && (
              <PlanSummaryCard plan={currentPlan} onStart={handleDirectExecute} />
            )}

            {isRunning && thinkingSteps.length > 0 && (
              <div className="max-w-2xl mx-auto space-y-3">
                <AgentThinkingPanel
                  result={{
                    task_id: currentTaskId || '',
                    status: 'running',
                    agent_type: 'ManagerAgent',
                    output: {},
                    usage: { tokens_used: 0, estimated_cost: 0, time_elapsed: runningTime, model: '' },
                    thinking_trace: { task_id: currentTaskId || '', total_elapsed: runningTime, steps: thinkingSteps },
                  }}
                />
              </div>
            )}

            {currentResult && (
              <div className="max-w-2xl mx-auto space-y-4">
                <ResultSection result={currentResult} copiedId={copiedId} onCopy={handleCopy} />
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* ── Right Panel: Preview + Debug ── */}
      <AnimatePresence>
        {!panelCollapsed.right && (
          <motion.div
            key="right-panel"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 420, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="flex-shrink-0 border-l border-app-border overflow-hidden"
          >
            <div className="w-[420px] h-full flex flex-col">
              <div className="flex-shrink-0 border-b border-app-border px-2 py-2">
                <div className="flex gap-1 rounded-lg bg-app-surface p-1">
                  {[
                    { key: 'preview', label: '预览', icon: Eye },
                    { key: 'trace', label: '思考链路', icon: Code2 },
                    { key: 'debug', label: '调试', icon: Sparkles },
                  ].map(({ key, label, icon: Icon }) => (
                    <button
                      key={key}
                      onClick={() => setActiveRightTab(key as typeof activeRightTab)}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-1.5 rounded-md py-1.5 text-[11px] font-medium transition-colors',
                        activeRightTab === key
                          ? 'bg-app-elevated text-app-text shadow-sm'
                          : 'text-app-text-secondary hover:text-app-text'
                      )}
                    >
                      <Icon className="w-3 h-3" />
                      {label}
                    </button>
                  ))}
                  <button
                    onClick={() => setPanelCollapsed(p => ({ ...p, right: true }))}
                    className="px-1 text-app-text-tertiary hover:text-app-text"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <ScrollArea className="flex-1 p-4">
                {activeRightTab === 'preview' && <ResultPreview result={currentResult} />}
                {activeRightTab === 'trace' && <AgentThinkingPanel result={currentResult} />}
                {activeRightTab === 'debug' && <AgentDebugView result={currentResult} />}
              </ScrollArea>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {panelCollapsed.right && (
        <button
          onClick={() => setPanelCollapsed(p => ({ ...p, right: false }))}
          className="flex-shrink-0 w-8 border-l border-app-border flex items-center justify-center text-app-text-tertiary hover:text-app-text hover:bg-app-hover transition-colors"
        >
          <Eye className="w-4 h-4" />
        </button>
      )}

      <DecisionDialog
        decision={pendingDecision}
        taskId={currentTaskId}
        onSubmit={handleDecisionSubmit}
        onClose={clearDecision}
      />

      <ExecutionPlanEditor
        plan={currentPlan!}
        open={showPlanEditor}
        onConfirm={handleConfirmPlan}
        onCancel={() => setShowPlanEditor(false)}
      />
    </div>
  );
}

/* ─── Sub-components ─── */

function EmptyStudioState({ onSelect }: { onSelect: (s: string) => void }) {
  const templates = [
    { title: '技术博客', prompt: '写一篇关于 AI 编程最新趋势的技术博客，包含代码示例和架构图' },
    { title: '小红书种草', prompt: '为某款 AI 写作工具写一篇小红书种草笔记' },
    { title: '分析报告', prompt: '分析 2026 年大模型在各行业的落地情况，输出一份结构化报告' },
  ];

  return (
    <div className="max-w-lg mx-auto text-center py-20 space-y-6">
      <div className="flex justify-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center">
          <Bot className="w-8 h-8 text-blue-400" />
        </div>
      </div>
      <div>
        <h2 className="text-base font-semibold text-app-text mb-1">Agent 工场</h2>
        <p className="text-xs text-app-text-secondary">Multi-Agent 协作，透明执行过程 — 输入需求即可开始</p>
      </div>
      <div className="grid grid-cols-1 gap-2">
        {templates.map((t) => (
          <button
            key={t.title}
            onClick={() => onSelect(t.prompt)}
            className="rounded-lg border border-app-border bg-app-surface p-3 text-left hover:border-blue-500/30 hover:bg-app-hover transition-all group"
          >
            <p className="text-xs font-medium text-app-text group-hover:text-blue-400 transition-colors">{t.title}</p>
            <p className="text-[10px] text-app-text-tertiary mt-0.5 truncate">{t.prompt}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function QuickTemplates({ onSelect }: { onSelect: (s: string) => void }) {
  const templates = ['写一篇技术博客', '生成小红书笔记', '绘制架构图', '分析行业趋势', '写产品文案'];
  return (
    <div className="space-y-2">
      <span className="text-[10px] text-app-text-tertiary uppercase tracking-wider font-medium">快捷模板</span>
      <div className="flex flex-wrap gap-1.5">
        {templates.map((t) => (
          <button
            key={t}
            onClick={() => onSelect(t)}
            className="rounded-full border border-app-border/50 px-2.5 py-1 text-[10px] text-app-text-secondary hover:border-blue-500/30 hover:text-blue-400 transition-colors"
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}

function PlanProgressStrip({ plan, currentTask }: { plan: ExecutionPlan; currentTask: AsyncTask }) {
  const currentStepIndex = currentTask.completed_steps;
  return (
    <div className="rounded-lg border border-app-border bg-app-surface p-3 space-y-2">
      <div className="text-[10px] text-app-text-tertiary font-medium">执行计划进度</div>
      <div className="space-y-1">
        {plan.tasks.map((task, i) => {
          const isDone = i < currentStepIndex;
          const isCurrent = i === currentStepIndex;
          const isPending = i > currentStepIndex;
          return (
            <div key={i} className="flex items-center gap-2 text-[10px]">
              <div className={cn(
                'w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold flex-shrink-0',
                isDone ? 'bg-green-500/20 text-green-400' :
                isCurrent ? 'bg-blue-500/20 text-blue-400 animate-pulse' :
                'bg-app-border text-app-text-tertiary'
              )}>
                {isDone ? '✓' : i + 1}
              </div>
              <span className={cn(isPending && 'text-app-text-tertiary')}>
                {AGENT_LABELS[task.agent_type] || task.agent_type}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PlanSummaryCard({ plan, onStart }: { plan: ExecutionPlan; onStart: () => void }) {
  return (
    <div className="max-w-lg mx-auto rounded-xl border border-app-border bg-app-elevated p-5 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-app-text mb-1">执行计划</h3>
        <p className="text-xs text-app-text-secondary">{plan.goal}</p>
      </div>
      <div className="space-y-1.5">
        {plan.tasks.map((task, i) => (
          <div key={i} className="flex items-center gap-2 rounded-lg border border-app-border/50 bg-app-surface p-2 text-xs">
            <span className="text-app-text-tertiary w-5">{i + 1}.</span>
            <span className="text-base">{AGENT_ICONS[task.agent_type] || '🤖'}</span>
            <span className="font-medium text-app-text">{AGENT_LABELS[task.agent_type] || task.agent_type}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-app-text-tertiary">{plan.tasks.length} 个步骤</span>
        <Button onClick={onStart} size="sm" className="text-xs">
          <Sparkles className="w-3 h-3 mr-1" /> 开始执行
        </Button>
      </div>
    </div>
  );
}

function ResultSection({ result, copiedId, onCopy }: {
  result: AgentResult;
  copiedId: string | null;
  onCopy: (text: string) => void;
}) {
  const displayContent =
    (result.output?.full_text as string) ||
    (result.output?.content as string) ||
    JSON.stringify(result.output, null, 2);

  return (
    <div className="rounded-xl border border-app-border bg-app-elevated overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-app-border bg-app-surface/50">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-yellow-400" />
          <span className="text-sm font-medium text-app-text">生成结果</span>
          <Badge variant={result.status === 'completed' ? 'default' : result.status === 'partial' ? 'secondary' : 'destructive'} className="text-[10px]">
            {result.status === 'completed' ? '已完成' : result.status === 'partial' ? '部分完成' : '失败'}
          </Badge>
        </div>
        <button
          onClick={() => onCopy(displayContent)}
          className="flex items-center gap-1 rounded px-2 py-1 text-xs text-app-text-secondary hover:text-app-text hover:bg-app-hover transition-colors"
        >
          {copiedId === 'main' ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
          {copiedId === 'main' ? '已复制' : '复制'}
        </button>
      </div>
      <div className="p-5">
        <div className="prose prose-invert max-w-none text-sm leading-relaxed text-app-text-secondary">
          <Markdown>{displayContent}</Markdown>
        </div>
      </div>
      {result.usage && (
        <div className="flex flex-wrap gap-4 px-4 py-3 border-t border-app-border bg-app-surface/30 text-[10px] text-app-text-tertiary">
          <span>Token: {result.usage.tokens_used}</span>
          <span>耗时: {result.usage.time_elapsed.toFixed(1)}s</span>
          <span>模型: {result.usage.model || 'N/A'}</span>
        </div>
      )}
    </div>
  );
}
