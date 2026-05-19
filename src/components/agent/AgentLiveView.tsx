import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAgentStore } from '../../stores/useAgentStore';
import { cn } from '../../utils/helpers';
import {
  Bot, CheckCircle, AlertCircle, Loader2, ChevronDown,
  Terminal, Type, Lightbulb, Zap, RotateCcw, Pause, Play
} from 'lucide-react';
import type { StreamEvent, LLMChunk, ReasoningChunk, StreamToolUse } from '../../types';
import { getAgentIcon, getAgentColor, getAgentActionDesc } from '../../config/agents';
import { ToolCard } from './ToolCard';

/* ─── LLM Chunk Line（打字机行，类似 Claude Code 终端行）── */
function LLMTerminalLine({ agent, chunks }: { agent: string; chunks: LLMChunk[] }) {
  const accumulated = chunks.map(c => c.content).join('');
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (chunks.length === 0) return;
    const last = chunks[chunks.length - 1];
    const target = last.content;
    if (displayed.length < target.length) {
      const timer = setTimeout(() => {
        setDisplayed(target.slice(0, displayed.length + 1));
      }, 8);
      return () => clearTimeout(timer);
    } else {
      setDone(true);
    }
  }, [chunks, displayed]);

  if (chunks.length === 0) return null;

  return (
    <div className="font-mono text-xs leading-relaxed pl-4 border-l-2 border-blue-500/40 ml-2 mt-1">
      <div className="flex items-center gap-1.5 mb-1 text-blue-400/60">
        <Type className="w-3 h-3" />
        <span className="text-[10px]">{getAgentIcon(agent)} {agent}</span>
        {done && <CheckCircle className="w-2.5 h-2.5 text-green-400 ml-auto" />}
        {!done && <Loader2 className="w-2.5 h-2.5 animate-spin ml-auto" />}
      </div>
      <pre className={cn(
        'text-gray-300 whitespace-pre-wrap break-words',
        !done && 'after:content-["▋"] after:text-blue-400 after:animate-pulse'
      )}>
        {displayed}
      </pre>
    </div>
  );
}

/* ─── Reasoning Block（LLM 思考过程，类似 Cursor AI 的思考显示）── */
function ReasoningBlock({ agent, chunks }: { agent: string; chunks: ReasoningChunk[] }) {
  const [expanded, setExpanded] = useState(true);
  const text = chunks.map(c => c.content).join('');

  if (chunks.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-2 ml-2 text-[10px]"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 w-full text-yellow-400/70 hover:text-yellow-400 transition-colors"
      >
        <Lightbulb className="w-3 h-3" />
        <span>💭 思考过程 ({chunks.length} 片段)</span>
        <ChevronDown className={cn('w-3 h-3 ml-auto transition-transform', expanded && '-rotate-180')} />
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-1.5 overflow-hidden font-mono text-yellow-300/60 whitespace-pre-wrap leading-relaxed"
          >
            {text}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─── Rich Agent Line（DeepSeek 风格终端行）── */
function RichAgentLine({ event }: { event: StreamEvent }) {
  const [showInterim, setShowInterim] = useState(false);
  const isDone = event.status === 'done' || event.status === 'completed';
  const isFailed = event.status === 'failed';
  const isRunning = event.status === 'running';
  const agent = event.agent || '';
  const actionDesc = getAgentActionDesc(agent, event.status || 'running');
  const inputSummary = (event.data?.input_summary as string) || '';
  const outputSummary = (event.data?.output_summary as string) || '';
  const reasoning = event.reasoning || (event.data?.reasoning as string) || '';
  const intermediateOutput = (event.data?.intermediate_output as string) || '';

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
      className="py-1.5 px-2 rounded hover:bg-white/5 transition-colors"
    >
      {/* ── Top line: status + agent + description ── */}
      <div className="flex items-start gap-2 min-w-0">
        <span className="flex-shrink-0 mt-0.5">
          {isDone ? (
            <CheckCircle className="w-3.5 h-3.5 text-green-400" />
          ) : isFailed ? (
            <AlertCircle className="w-3.5 h-3.5 text-red-400" />
          ) : (
            <motion.span
              animate={{ scale: [1, 1.25, 1], opacity: [1, 0.6, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />
            </motion.span>
          )}
        </span>
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span className={cn(
            'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium border flex-shrink-0',
            getAgentColor(agent),
          )}>
            {getAgentIcon(agent)} {agent.replace('Agent', '')}
          </span>
          <span className={cn(
            'text-xs truncate',
            isDone ? 'text-green-400/80' : isFailed ? 'text-red-400' : 'text-gray-300'
          )}>
            {actionDesc}
          </span>
          {event.data?.time_elapsed && (
            <span className="ml-auto text-[10px] text-gray-500 tabular-nums flex-shrink-0">
              {(event.data.time_elapsed as number).toFixed(1)}s
            </span>
          )}
        </div>
      </div>

      {/* ── Reasoning（默认可见） ── */}
      {reasoning && (
        <div className="ml-8 mt-1 text-[10px] text-yellow-400/50 font-mono leading-relaxed whitespace-pre-wrap">
          {'// '}{reasoning}
        </div>
      )}

      {/* ── Input summary（搜索词等） ── */}
      {isRunning && inputSummary && (
        <div className="ml-8 mt-0.5 text-[10px] text-gray-500 italic truncate">
          &ldquo;{inputSummary.slice(0, 150)}&rdquo;
        </div>
      )}

      {/* ── Output summary ── */}
      {isDone && outputSummary && (
        <div className="ml-8 mt-0.5 text-[10px] text-gray-500 leading-relaxed line-clamp-1">
          {outputSummary.slice(0, 200)}
        </div>
      )}

      {/* ── Intermediate output (collapsible) ── */}
      {intermediateOutput && (
        <div className="ml-8 mt-1 rounded border border-cyan-500/20 bg-cyan-500/5 p-2">
          <button
            onClick={() => setShowInterim(!showInterim)}
            className="text-[10px] text-cyan-400/70 hover:text-cyan-400 flex items-center gap-1 transition-colors"
          >
            <ChevronDown className={cn('w-2.5 h-2.5 transition-transform', showInterim && 'rotate-180')} />
            查看中间结果
          </button>
          {showInterim && (
            <pre className="text-[10px] mt-1 text-gray-400 font-mono whitespace-pre-wrap leading-relaxed max-h-32 overflow-y-auto">
              {intermediateOutput}
            </pre>
          )}
        </div>
      )}
    </motion.div>
  );
}

/* ─── Progress Bar（终端风格）── */
function LiveProgressBar({ progress, message }: { progress: number; message: string }) {
  const filled = Math.round(progress / 100 * 40);
  const bar = '█'.repeat(filled) + '░'.repeat(40 - filled);
  return (
    <div className="px-2 py-1 font-mono text-[10px] text-gray-500">
      <span className="text-green-400">[{bar}]</span>
      <span className="ml-2 text-gray-400">{Math.round(progress)}%</span>
      {message && <span className="ml-2 text-gray-600">{message}</span>}
    </div>
  );
}

/* ─── Plan Summary with Step States（终端风格，带执行状态）── */
interface StepState { agent_type: string; status: 'pending' | 'running' | 'done' | 'failed' }

function PlanSummary({ event, stepStates }: { event: StreamEvent; stepStates: StepState[] }) {
  const tasks = (event.data?.tasks as any[]) || [];
  if (tasks.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="px-2 py-1.5 border-l-2 border-purple-500/50"
    >
      <div className="flex items-center gap-1.5 mb-1">
        <Zap className="w-3 h-3 text-purple-400" />
        <span className="text-[10px] font-semibold text-purple-400 font-mono">
          ▶ 执行计划 — {tasks.length} 步
        </span>
      </div>
      <div className="flex flex-col gap-1">
        {tasks.map((task: any, i: number) => {
          const state = stepStates[i];
          const isCurrent = state?.status === 'running';
          const isDone = state?.status === 'done' || state?.status === 'completed';
          const isFailed = state?.status === 'failed';
          return (
            <motion.div
              key={i}
              animate={isCurrent ? { opacity: [1, 0.6, 1] } : {}}
              transition={isCurrent ? { duration: 1.5, repeat: Infinity } : {}}
              className={cn(
                'flex items-center gap-2 px-1.5 py-1 rounded text-[10px] font-mono transition-all',
                isCurrent ? 'bg-blue-500/10 text-blue-300 border-l-2 border-blue-400' :
                isDone ? 'text-gray-400 border-l-2 border-green-500/40' :
                isFailed ? 'text-red-400 border-l-2 border-red-500/40' :
                'text-gray-600 border-l-2 border-transparent'
              )}
            >
              <span className="w-4 text-center flex-shrink-0">
                {isDone ? '✓' : isFailed ? '✗' : isCurrent ? '→' : '○'}
              </span>
              <span>{getAgentIcon(task.agent_type || '')}</span>
              <span className="truncate">{task.agent_type?.replace('Agent', '') || '?'}</span>
              {task.input?.query && (
                <span className="text-[9px] text-gray-600 truncate ml-1 hidden sm:inline">
                  &ldquo;{(task.input.query as string).slice(0, 40)}&rdquo;
                </span>
              )}
            </motion.div>
          );
        })}
      </div>
      {event.data?.reasoning && (
        <p className="mt-1 text-[9px] text-gray-600 font-mono leading-relaxed">
          {'// '}{event.data.reasoning as string}
        </p>
      )}
    </motion.div>
  );
}

/* ─── Main Component ─── */
export function AgentLiveView({ onEdit, onPublish }: {
  onEdit?: (contentId: string) => void;
  onPublish?: (contentId: string) => void;
}) {
  const { streamEvents, llmChunks, reasoningChunks, currentTask, isRunning, wsConnectionState } = useAgentStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [paused, setPaused] = useState(false);

  // Auto-scroll
  useEffect(() => {
    if (autoScroll && !paused && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [streamEvents.length, autoScroll, paused]);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const nearBottom = scrollHeight - scrollTop - clientHeight < 80;
    setAutoScroll(nearBottom);
  }, []);

  // Track plan tasks and their execution states
  const [planTasks, setPlanTasks] = useState<StepState[]>([]);
  const planEvent = streamEvents.find(e => e.type === 'plan');

  // Update step states from thinking_step events
  useEffect(() => {
    if (!planEvent) { setPlanTasks([]); return; }
    const tasks = (planEvent.data?.tasks as any[]) || [];
    const stepStates: StepState[] = tasks.map((t: any) => ({
      agent_type: t.agent_type || '',
      status: 'pending' as const,
    }));

    // Process thinking_step events to update states
    for (const evt of streamEvents) {
      if (evt.type !== 'thinking_step' || !evt.agent) continue;
      const agentName = evt.agent;
      const idx = stepStates.findIndex(s => agentName.includes(s.agent_type.replace('Agent', '')) || s.agent_type === agentName);
      if (idx === -1) continue;
      const status = evt.status || 'running';
      if (status === 'done' || status === 'completed') stepStates[idx].status = 'done';
      else if (status === 'failed') stepStates[idx].status = 'failed';
      else if (stepStates[idx].status === 'pending') stepStates[idx].status = 'running';
    }

    setPlanTasks(stepStates);
  }, [streamEvents, planEvent]);

  // Group events for rendering
  const renderItems: Array<{
    id: string; type: string; agent?: string;
    llmChunks?: LLMChunk[]; reasoningChunks?: ReasoningChunk[];
    event?: StreamEvent;
  }> = [];
  let lastAgent: string | null = null;
  let flushCounter = 0;
  let planRendered = false;

  for (const evt of streamEvents) {
    if (evt.type === 'thinking_step') {
      const agent = evt.agent || '';
      // Emit plan first if not yet rendered and we have it
      if (planEvent && !planRendered) {
        renderItems.push({ id: 'plan-summary', type: 'plan', event: planEvent });
        planRendered = true;
      }
      // Flush pending chunks for previous agent
      if (lastAgent && (llmChunks[lastAgent]?.length || reasoningChunks[lastAgent]?.length)) {
        renderItems.push({
          id: `flush-${flushCounter++}`,
          type: 'flush',
          agent: lastAgent,
          llmChunks: [...(llmChunks[lastAgent] || [])],
          reasoningChunks: [...(reasoningChunks[lastAgent] || [])],
        });
      }
      renderItems.push({ id: evt.id, type: 'step', agent, event: evt });
      lastAgent = agent;
    } else if (evt.type === 'llm_chunk' || evt.type === 'reasoning') {
      // Skip individual, will be grouped
    } else if (evt.type === 'tool_use' || evt.type === 'tool_result') {
      renderItems.push({ id: evt.id, type: evt.type, event: evt });
    } else if (evt.type === 'plan') {
      // Don't emit here; emit before first thinking_step
    } else if (evt.type === 'progress') {
      renderItems.push({ id: evt.id, type: 'progress', event: evt });
    } else if (evt.type === 'result' || evt.type === 'error' || evt.type === 'done') {
      if (lastAgent) {
        renderItems.push({
          id: `flush-${flushCounter++}`,
          type: 'flush',
          agent: lastAgent,
          llmChunks: [...(llmChunks[lastAgent] || [])],
          reasoningChunks: [...(reasoningChunks[lastAgent] || [])],
        });
        lastAgent = null;
      }
      renderItems.push({ id: evt.id, type: evt.type, event: evt });
    }
  }

  // Flush remaining
  if (lastAgent && (llmChunks[lastAgent]?.length || reasoningChunks[lastAgent]?.length)) {
    renderItems.push({
      id: `flush-${flushCounter++}`,
      type: 'flush',
      agent: lastAgent,
      llmChunks: [...(llmChunks[lastAgent] || [])],
      reasoningChunks: [...(reasoningChunks[lastAgent] || [])],
    });
  }

  const progress = currentTask?.progress || 0;
  const totalSteps = planTasks.length;
  const doneSteps = planTasks.filter(s => s.status === 'done' || s.status === 'completed').length;
  const failedSteps = planTasks.filter(s => s.status === 'failed').length;
  const message = currentTask?.progress_message || '';

  return (
    <div className="flex flex-col h-full bg-[#0d1117] rounded-xl overflow-hidden border border-[#30363d]">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#30363d] bg-[#161b22] flex-shrink-0">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-green-400" />
          <span className="text-xs font-mono font-semibold text-gray-300">
            Agent 实时视图
          </span>
          {isRunning && (
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[10px] text-gray-500 font-mono">运行中</span>
            </span>
          )}
          {/* WebSocket Connection Status */}
          {wsConnectionState && wsConnectionState !== 'connected' && (
            <span className="flex items-center gap-1 ml-1">
              <span className={cn(
                'w-1.5 h-1.5 rounded-full',
                wsConnectionState === 'connecting' ? 'bg-yellow-400 animate-pulse' : 'bg-red-500'
              )} />
              <span className="text-[10px] font-mono text-gray-500">
                {wsConnectionState === 'connecting' ? '连接中...' : '已断开'}
              </span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {progress > 0 && (
            <span className="text-[10px] font-mono text-gray-500">
              {Math.round(progress)}%
            </span>
          )}
          <button
            onClick={() => setPaused(!paused)}
            className="p-1 rounded hover:bg-white/10 transition-colors"
            title={paused ? '恢复自动滚动' : '暂停自动滚动'}
          >
            {paused
              ? <Play className="w-3 h-3 text-gray-500" />
              : <Pause className="w-3 h-3 text-gray-500" />
            }
          </button>
          {autoScroll !== true && (
            <button
              onClick={() => { setAutoScroll(true); setPaused(false); }}
              className="text-[10px] font-mono text-blue-400 hover:text-blue-300 transition-colors"
            >
              ↓ 滚动
            </button>
          )}
        </div>
      </div>

      {/* ── Terminal body ── */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto min-h-0 px-2 py-2 space-y-0.5"
      >
        {/* ── Overall progress bar（step summary）── */}
        {totalSteps > 0 && (
          <div className="px-2 py-1.5 border-b border-[#30363d]/50 mb-1">
            <div className="flex items-center justify-between text-[10px] font-mono text-gray-500 mb-1">
              <span>步骤进度</span>
              <span>{doneSteps + failedSteps}/{totalSteps} {failedSteps > 0 ? `(${failedSteps} 失败)` : ''}</span>
            </div>
            <div className="h-1.5 rounded-full bg-[#30363d] overflow-hidden">
              <motion.div
                className={cn(
                  'h-full rounded-full transition-colors',
                  failedSteps > 0 ? 'bg-orange-400' : 'bg-green-500'
                )}
                initial={{ width: 0 }}
                animate={{ width: `${((doneSteps + failedSteps) / totalSteps) * 100}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            </div>
          </div>
        )}

        <AnimatePresence>
          {renderItems.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15 }}
            >
              {item.type === 'plan' && item.event && (
                <PlanSummary event={item.event} stepStates={planTasks} />
              )}
              {item.type === 'progress' && item.event && (
                <LiveProgressBar
                  progress={(item.event.data?.progress as number) || 0}
                  message={(item.event.data?.progress_message as string) || ''}
                />
              )}
              {item.type === 'step' && item.event && (
                <RichAgentLine event={item.event} />
              )}
              {(item.type === 'flush') && item.agent && (
                <div className="pl-2">
                  {item.reasoningChunks && item.reasoningChunks.length > 0 && (
                    <ReasoningBlock agent={item.agent} chunks={item.reasoningChunks} />
                  )}
                  {item.llmChunks && item.llmChunks.length > 0 && (
                    <LLMTerminalLine agent={item.agent} chunks={item.llmChunks} />
                  )}
                </div>
              )}
              {item.type === 'tool_use' && item.event && (
                <div className="pl-2 mt-1 mb-1">
                  <ToolCard
                    tool={item.event.data as unknown as StreamToolUse}
                    status="calling"
                  />
                </div>
              )}
              {item.type === 'tool_result' && item.event && (
                <div className="pl-2 mt-1 mb-1">
                  <ToolCard
                    tool={item.event.data as unknown as StreamToolUse}
                    status="result"
                  />
                </div>
              )}
              {item.type === 'result' && item.event && (
                <div className="mt-2 px-2 py-1 rounded border border-green-500/30 bg-green-500/5">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="w-3 h-3 text-green-400" />
                    <span className="text-[10px] font-mono text-green-400">
                      完成 — {(item.event.data as any)?.status === 'partial' ? '部分完成' : '已完成'}
                    </span>
                  </div>
                  {onEdit && (
                    <button
                      onClick={() => onEdit((item.event!.data as any)?.output?._content_id || '')}
                      className="mt-1 text-[9px] font-mono text-blue-400 hover:text-blue-300 transition-colors ml-4"
                    >
                      → 编辑内容
                    </button>
                  )}
                </div>
              )}
              {item.type === 'error' && item.event && (
                <div className="mt-1 px-2 py-1 rounded border border-red-500/30 bg-red-500/5">
                  <div className="flex items-center gap-1.5">
                    <AlertCircle className="w-3 h-3 text-red-400" />
                    <span className="text-[10px] font-mono text-red-400">
                      ✗ 错误: {(item.event.data as any)?.message || '未知'}
                    </span>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Connecting state before first event */}
        {isRunning && streamEvents.length === 0 && (
          <div className="flex items-center gap-2 py-3 px-2">
            <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
            <span className="text-[10px] font-mono text-gray-500">正在连接 Agent...</span>
          </div>
        )}

        {/* Cursor at bottom when running */}
        {isRunning && streamEvents.length > 0 && (
          <div className="flex items-center gap-1 py-0.5">
            <span className="text-gray-500 font-mono text-xs">›</span>
            <motion.span
              className="text-green-400 font-mono text-xs"
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
            >
              ▋
            </motion.span>
          </div>
        )}
      </div>
    </div>
  );
}
