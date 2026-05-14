import { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAgentStore } from '../../stores/useAgentStore';
import { cn } from '../../utils/helpers';
import {
  Bot, CheckCircle, AlertCircle, Loader2, ChevronDown,
  Terminal, Type, Lightbulb, Zap, RotateCcw, Pause, Play
} from 'lucide-react';
import type { StreamEvent, LLMChunk, ReasoningChunk } from '../../types';

/* ─── Agent Icons & Labels ─── */
const AGENT_ICONS: Record<string, string> = {
  ManagerAgent: '🧠', WritingAgent: '✍️', SEOAgent: '🔍',
  DiagramAgent: '📊', ReviewAgent: '✅', WebSearch: '🌐',
  ImageAgent: '🎨', CodeAgent: '💻', HotTopicAgent: '🔥',
  PlatformAdapter: '📱', TranslationAgent: '🌏', URLCrawler: '🔗',
};

function getAgentIcon(agent: string): string {
  for (const [key, icon] of Object.entries(AGENT_ICONS)) {
    if (agent.includes(key)) return icon;
  }
  return '🤖';
}

function getAgentColor(agent: string): string {
  if (agent.includes('Manager')) return 'text-purple-400 border-purple-500/40 bg-purple-500/10';
  if (agent.includes('Writing')) return 'text-blue-400 border-blue-500/40 bg-blue-500/10';
  if (agent.includes('SEO')) return 'text-green-400 border-green-500/40 bg-green-500/10';
  if (agent.includes('Diagram')) return 'text-orange-400 border-orange-500/40 bg-orange-500/10';
  if (agent.includes('Review')) return 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10';
  if (agent.includes('WebSearch') || agent.includes('Crawl')) return 'text-cyan-400 border-cyan-500/40 bg-cyan-500/10';
  if (agent.includes('Image')) return 'text-yellow-400 border-yellow-500/40 bg-yellow-500/10';
  if (agent.includes('Code')) return 'text-red-400 border-red-500/40 bg-red-500/10';
  if (agent.includes('Hot')) return 'text-orange-400 border-orange-500/40 bg-orange-500/10';
  if (agent.includes('Platform') || agent.includes('Translation')) return 'text-pink-400 border-pink-500/40 bg-pink-500/10';
  return 'text-gray-400 border-gray-500/40 bg-gray-500/10';
}

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
        <span>💭 Reasoning ({chunks.length} chunks)</span>
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

/* ─── Thinking Step Line（终端风格一行）── */
function ThinkingStepLine({ event }: { event: StreamEvent }) {
  const isDone = event.status === 'done';
  const isFailed = event.status === 'failed';
  const agent = event.agent || '';

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
      className="flex items-start gap-2 py-1 px-2 rounded hover:bg-white/5 transition-colors"
    >
      <span className="flex-shrink-0 mt-0.5">
        {isDone ? (
          <CheckCircle className="w-3.5 h-3.5 text-green-400" />
        ) : isFailed ? (
          <AlertCircle className="w-3.5 h-3.5 text-red-400" />
        ) : (
          <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />
        )}
      </span>
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        <span className={cn(
          'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium border flex-shrink-0',
          getAgentColor(agent),
        )}>
          {getAgentIcon(agent)} {agent.replace('Agent', '')}
        </span>
        <span className="text-xs text-gray-300 truncate">
          {event.action || '执行中...'}
        </span>
        {event.data?.time_elapsed && (
          <span className="ml-auto text-[10px] text-gray-500 tabular-nums flex-shrink-0">
            {(event.data.time_elapsed as number).toFixed(1)}s
          </span>
        )}
      </div>
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

/* ─── Plan Summary（终端风格）── */
function PlanSummary({ event }: { event: StreamEvent }) {
  const tasks = (event.data?.tasks as any[]) || [];
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="px-2 py-1.5 border-l-2 border-purple-500/50"
    >
      <div className="flex items-center gap-1.5 mb-1">
        <Zap className="w-3 h-3 text-purple-400" />
        <span className="text-[10px] font-semibold text-purple-400 font-mono">
          ▶ PLAN — {tasks.length} steps
        </span>
      </div>
      <div className="flex flex-wrap gap-1">
        {tasks.map((task: any, i: number) => (
          <span key={i} className={cn(
            'inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-mono border',
            getAgentColor(task.agent_type || ''),
          )}>
            <span className="text-gray-500">{i + 1}.</span>
            {getAgentIcon(task.agent_type || '')} {task.agent_type?.replace('Agent', '') || '?'}
          </span>
        ))}
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
  const { streamEvents, llmChunks, reasoningChunks, currentTask, isRunning } = useAgentStore();
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

  // Group events for rendering
  const renderItems: Array<{
    id: string; type: string; agent?: string;
    llmChunks?: LLMChunk[]; reasoningChunks?: ReasoningChunk[];
    event?: StreamEvent;
  }> = [];
  let lastAgent: string | null = null;

  for (const evt of streamEvents) {
    if (evt.type === 'thinking_step') {
      const agent = evt.agent || '';
      // Flush pending chunks for previous agent
      if (lastAgent && (llmChunks[lastAgent]?.length || reasoningChunks[lastAgent]?.length)) {
        renderItems.push({
          id: `flush-${lastAgent}`,
          type: 'flush',
          agent: lastAgent,
          llmChunks: llmChunks[lastAgent],
          reasoningChunks: reasoningChunks[lastAgent],
        });
      }
      renderItems.push({ id: evt.id, type: 'step', agent, event: evt });
      lastAgent = agent;
    } else if (evt.type === 'llm_chunk' || evt.type === 'reasoning') {
      // Skip individual, will be grouped
    } else if (evt.type === 'plan') {
      if (lastAgent) {
        renderItems.push({
          id: `flush-${lastAgent}`,
          type: 'flush',
          agent: lastAgent,
          llmChunks: llmChunks[lastAgent],
          reasoningChunks: reasoningChunks[lastAgent],
        });
        lastAgent = null;
      }
      renderItems.push({ id: evt.id, type: 'plan', event: evt });
    } else if (evt.type === 'progress') {
      renderItems.push({ id: evt.id, type: 'progress', event: evt });
    } else if (evt.type === 'result' || evt.type === 'error' || evt.type === 'done') {
      if (lastAgent) {
        renderItems.push({
          id: `flush-${lastAgent}`,
          type: 'flush',
          agent: lastAgent,
          llmChunks: llmChunks[lastAgent],
          reasoningChunks: reasoningChunks[lastAgent],
        });
        lastAgent = null;
      }
      renderItems.push({ id: evt.id, type: evt.type, event: evt });
    }
  }

  // Flush remaining
  if (lastAgent && (llmChunks[lastAgent]?.length || reasoningChunks[lastAgent]?.length)) {
    renderItems.push({
      id: `flush-${lastAgent}`,
      type: 'flush',
      agent: lastAgent,
      llmChunks: llmChunks[lastAgent],
      reasoningChunks: reasoningChunks[lastAgent],
    });
  }

  const progress = currentTask?.progress || 0;
  const message = currentTask?.progress_message || '';

  return (
    <div className="flex flex-col h-full bg-[#0d1117] rounded-xl overflow-hidden border border-[#30363d]">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#30363d] bg-[#161b22] flex-shrink-0">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-green-400" />
          <span className="text-xs font-mono font-semibold text-gray-300">
            Agent Live View
          </span>
          {isRunning && (
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[10px] text-gray-500 font-mono">running</span>
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
            title={paused ? 'Resume auto-scroll' : 'Pause auto-scroll'}
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
              ↓ scroll
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
        <AnimatePresence>
          {renderItems.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15 }}
            >
              {item.type === 'plan' && item.event && (
                <PlanSummary event={item.event} />
              )}
              {item.type === 'progress' && item.event && (
                <LiveProgressBar
                  progress={(item.event.data?.progress as number) || 0}
                  message={(item.event.data?.progress_message as string) || ''}
                />
              )}
              {item.type === 'step' && item.event && (
                <ThinkingStepLine event={item.event} />
              )}
              {(item.type === 'flush') && item.agent && (
                <div className="pl-2">
                  {reasoningChunks[item.agent]?.length > 0 && (
                    <ReasoningBlock agent={item.agent} chunks={reasoningChunks[item.agent]} />
                  )}
                  {llmChunks[item.agent]?.length > 0 && (
                    <LLMTerminalLine agent={item.agent} chunks={llmChunks[item.agent]} />
                  )}
                </div>
              )}
              {item.type === 'result' && item.event && (
                <div className="mt-2 px-2 py-1 rounded border border-green-500/30 bg-green-500/5">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="w-3 h-3 text-green-400" />
                    <span className="text-[10px] font-mono text-green-400">
                      Done — {(item.event.data as any)?.status || 'completed'}
                    </span>
                  </div>
                  {onEdit && (
                    <button
                      onClick={() => onEdit((item.event!.data as any)?.output?._content_id || '')}
                      className="mt-1 text-[9px] font-mono text-blue-400 hover:text-blue-300 transition-colors ml-4"
                    >
                      → edit content
                    </button>
                  )}
                </div>
              )}
              {item.type === 'error' && item.event && (
                <div className="mt-1 px-2 py-1 rounded border border-red-500/30 bg-red-500/5">
                  <div className="flex items-center gap-1.5">
                    <AlertCircle className="w-3 h-3 text-red-400" />
                    <span className="text-[10px] font-mono text-red-400">
                      ✗ Error: {(item.event.data as any)?.message || 'unknown'}
                    </span>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Cursor at bottom when running */}
        {isRunning && (
          <div className="flex items-center gap-1 py-0.5">
            <span className="text-gray-500 font-mono text-xs">›</span>
            <motion.span
              className="text-blue-400 font-mono text-xs"
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
