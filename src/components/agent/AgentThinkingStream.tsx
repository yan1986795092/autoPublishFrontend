import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAgentStore } from '../../stores/useAgentStore';
import { cn } from '../../utils/helpers';
import Markdown from 'react-markdown';
import {
  Brain, CheckCircle, AlertCircle, Loader2,
  ChevronDown, MessageSquare, ListChecks,
  FileText, Eye, Send
} from 'lucide-react';
import type { StreamEvent } from '../../types';
import { TimelineStep } from './TimelineStep';
import { AgentIcon } from './AgentIcon';
import { ToolCard } from './ToolCard';
import { getAgentMeta, getAgentActionDesc, getAgentColor } from '../../config/agents';

/* ─── Plan Summary (compact banner) ─── */
function PlanSummaryCard({ event }: { event: StreamEvent }) {
  const tasks = (event.data?.tasks as any[]) || [];
  const [expanded, setExpanded] = useState(false);

  if (tasks.length === 0) {
    return (
      <div className="flex items-center gap-2 px-1 py-2">
        <ListChecks className="w-3.5 h-3.5 text-purple-400" />
        <span className="text-xs text-app-text-secondary">正在规划执行方案...</span>
      </div>
    );
  }

  return (
    <div className="px-1 py-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full text-left"
      >
        <ListChecks className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
        <span className="text-xs font-medium text-app-text-secondary">
          执行计划 · {tasks.length} 个步骤
        </span>
        <ChevronDown className={cn('w-3 h-3 text-app-text-tertiary transition-transform ml-auto', expanded && 'rotate-180')} />
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap gap-1 mt-2">
              {tasks.map((task: any, i: number) => (
                <span
                  key={`${task.agent_type}-${i}`}
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium border border-app-border bg-app-surface text-app-text-secondary"
                >
                  <AgentIcon agentType={task.agent_type || ''} size={12} className="w-3 h-3" />
                  {getAgentMeta(task.agent_type || '').label}
                </span>
              ))}
            </div>
            {!!event.data?.reasoning && (
              <p className="mt-2 text-[11px] text-app-text-tertiary leading-relaxed">
                {event.data.reasoning as string}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── User Message ─── */
function UserMessageCard({ event }: { event: StreamEvent }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-start gap-2 px-1 py-2"
    >
      <MessageSquare className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
      <p className="text-xs text-app-text leading-relaxed whitespace-pre-wrap">
        {event.data?.content as string}
      </p>
    </motion.div>
  );
}

/* ─── Progress ─── */
function ProgressCard({ event }: { event: StreamEvent }) {
  const progress = (event.data?.progress as number) || 0;
  const message = (event.data?.progress_message as string) || '';
  return (
    <div className="flex items-center gap-2 px-1 py-1">
      <div className="flex-1 h-1 rounded-full bg-app-border overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-blue-500"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
      <span className="text-[10px] text-app-text-tertiary tabular-nums">{Math.round(progress)}%</span>
      {message && <span className="text-[10px] text-app-text-tertiary truncate">{message}</span>}
    </div>
  );
}

/* ─── Result Summary (compact, since right panel has full result) ─── */
function ResultCard({ event, onPublish }: {
  event: StreamEvent;
  onPublish?: (contentId: string) => void;
}) {
  const result = event.data as unknown as AgentResult;
  const contentId = (result?.output?._content_id as string) || '';
  const [expanded, setExpanded] = useState(false);
  const fullText = (result?.output?.full_text as string) || (result?.output?.content as string) || '';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="px-1 py-2"
    >
      <div className="flex items-center gap-2">
        <CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
        <span className="text-xs font-medium text-green-400">
          {result.status === 'completed' ? '生成完成' : result.status === 'partial' ? '部分完成' : '完成'}
        </span>
        {result.usage && (
          <span className="text-[10px] text-app-text-tertiary/60">
            tokens: {result.usage.tokens_used} · {(result.usage.time_elapsed || 0).toFixed(1)}s
          </span>
        )}

        <div className="ml-auto flex items-center gap-1">
          {contentId && (
            <button
              onClick={() => onPublish?.(contentId)}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors"
            >
              <Send className="w-2.5 h-2.5" />
              发布
            </button>
          )}
          {fullText && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium bg-app-surface text-app-text-tertiary hover:text-app-text-secondary border border-app-border transition-colors"
            >
              <Eye className="w-2.5 h-2.5" />
              {expanded ? '收起' : '预览'}
            </button>
          )}
        </div>
      </div>
      <AnimatePresence>
        {expanded && fullText && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden mt-2"
          >
            <div className="rounded-lg border border-app-border bg-app-surface p-3 max-h-40 overflow-y-auto">
              <div className="prose prose-invert max-w-none text-[11px] text-app-text-secondary leading-relaxed">
                <Markdown>{`${fullText.slice(0, 500)}${fullText.length > 500 ? '...' : ''}`}</Markdown>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─── Error ─── */
function ErrorCard({ event }: { event: StreamEvent }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-start gap-2 px-1 py-2"
    >
      <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
      <div>
        <span className="text-xs font-medium text-red-400">执行出错</span>
        <p className="text-[11px] text-red-400/70 mt-0.5">{String(event.data?.message ?? '未知错误')}</p>
      </div>
    </motion.div>
  );
}

/* ─── LLM Stream (compact typewriter) ─── */
function LLMStreamCard({ agent, chunks }: { agent: string; chunks: LLMChunk[] }) {
  const [expanded, setExpanded] = useState(true);
  const [displayed, setDisplayed] = useState('');
  const textRef = useRef<HTMLDivElement>(null);
  const accumulated = chunks.map(c => c.content).join('');

  useEffect(() => {
    if (displayed.length < accumulated.length) {
      const timer = setTimeout(() => {
        setDisplayed(accumulated.slice(0, displayed.length + 2));
      }, 15);
      return () => clearTimeout(timer);
    }
  }, [displayed, accumulated]);

  if (chunks.length === 0) return null;

  const meta = getAgentMeta(agent);

  return (
    <div className="pl-7 pr-1 pb-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="inline-flex items-center gap-1 text-[10px] text-blue-400/60 hover:text-blue-400/80 transition-colors"
      >
        <ChevronDown className={cn('w-2.5 h-2.5 transition-transform', expanded && 'rotate-180')} />
        <FileText className="w-2.5 h-2.5" />
        {meta.label} 内容输出 ({chunks.length} chunks)
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div
              ref={textRef}
              className="mt-1 text-[11px] text-app-text-secondary leading-relaxed rounded-lg bg-app-surface p-2.5 border border-app-border"
            >
              <div className="prose prose-invert max-w-none prose-xs [&_p]:text-[11px] [&_p]:text-app-text-secondary [&_p]:leading-relaxed [&_p]:my-0.5 [&_code]:bg-black/30 [&_code]:px-1 [&_code]:rounded [&_code]:text-[10px]">
                <Markdown>{displayed}</Markdown>
              </div>
              {displayed.length < accumulated.length && (
                <span className="inline-block w-1.5 h-3.5 bg-blue-400/60 ml-0.5 animate-pulse" />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Reasoning Chain (compact, default collapsed) ─── */
function ReasoningCard({ chunks }: { agent: string; chunks: ReasoningChunk[] }) {
  const [expanded, setExpanded] = useState(false);
  const text = chunks.map(c => c.content).join('');

  if (chunks.length === 0) return null;

  return (
    <div className="pl-7 pr-1 pb-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="inline-flex items-center gap-1 text-[10px] text-yellow-400/50 hover:text-yellow-400/70 transition-colors"
      >
        <Brain className="w-2.5 h-2.5" />
        <ChevronDown className={cn('w-2.5 h-2.5 transition-transform', expanded && 'rotate-180')} />
        思考过程 ({chunks.length} 片段)
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <p className="mt-1 text-[10px] text-yellow-300/40 leading-relaxed whitespace-pre-wrap pl-2 border-l border-yellow-500/20">
              {text as string}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Main Component ─── */
export function AgentThinkingStream({ onPublish }: {
  onPublish?: (contentId: string) => void;
}) {
  const { streamEvents } = useAgentStore();
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [streamEvents.length, autoScroll]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    setAutoScroll(scrollHeight - scrollTop - clientHeight < 60);
  };

  // Render groups: timeline steps + other event types
  const renderedGroups: Array<{ id: string; el: React.ReactNode }> = [];
  let chunkGroupCounter = 0;
  let pendingChunks: { id: string; llm: LLMChunk[]; reasoning: ReasoningChunk[]; agent: string } | null = null;

  // Track thinking_step count for "is last" logic
  const thinkingStepEvents = streamEvents.filter(e => e.type === 'thinking_step');
  let stepIndex = 0;

  for (const event of streamEvents) {
    if (event.type === 'thinking_step') {
      // Flush pending chunks
      if (pendingChunks) {
        renderedGroups.push({ id: pendingChunks.id, el: (
          <>
            {pendingChunks.reasoning.length > 0 && (
              <ReasoningCard agent={pendingChunks.agent} chunks={pendingChunks.reasoning} />
            )}
            {pendingChunks.llm.length > 0 && (
              <LLMStreamCard agent={pendingChunks.agent} chunks={pendingChunks.llm} />
            )}
          </>
        )});
      }

      const isLast = stepIndex === thinkingStepEvents.length - 1;
      stepIndex++;
      pendingChunks = { id: `chunks-${chunkGroupCounter++}`, llm: [], reasoning: [], agent: event.agent || '' };
      renderedGroups.push({ id: event.id, el: <TimelineStep key={event.id} event={event} isLast={isLast} /> });

    } else if (event.type === 'llm_chunk' && pendingChunks) {
      pendingChunks.llm.push({ agent: event.agent || '', content: event.content || '', timestamp: event.timestamp });
    } else if (event.type === 'reasoning' && pendingChunks) {
      pendingChunks.reasoning.push({ agent: event.agent || '', content: event.content || '', timestamp: event.timestamp });
    } else {
      // Flush pending chunks
      if (pendingChunks) {
        renderedGroups.push({ id: pendingChunks.id, el: (
          <>
            {pendingChunks.reasoning.length > 0 && (
              <ReasoningCard agent={pendingChunks.agent} chunks={pendingChunks.reasoning} />
            )}
            {pendingChunks.llm.length > 0 && (
              <LLMStreamCard agent={pendingChunks.agent} chunks={pendingChunks.llm} />
            )}
          </>
        )});
        pendingChunks = null;
      }

      renderedGroups.push({ id: event.id, el: (
        <>
          {event.type === 'user_message' && <UserMessageCard event={event} />}
          {event.type === 'plan' && (
            <>
              <PlanSummaryCard event={event} />
            </>
          )}
          {event.type === 'progress' && <ProgressCard event={event} />}
          {event.type === 'result' && <ResultCard event={event} onPublish={onPublish} />}
          {event.type === 'error' && <ErrorCard event={event} />}
          {event.type === 'tool_use' && (
            <div className="pl-7 pr-1 pb-2">
              <ToolCard tool={event.data as unknown as StreamToolUse} status="calling" />
            </div>
          )}
          {event.type === 'tool_result' && (
            <div className="pl-7 pr-1 pb-2">
              <ToolCard tool={event.data as unknown as StreamToolUse} status="result" />
            </div>
          )}
        </>
      )});
    }
  }

  // Flush remaining chunks
  if (pendingChunks) {
    renderedGroups.push({ id: pendingChunks.id, el: (
      <>
        {pendingChunks.reasoning.length > 0 && (
          <ReasoningCard agent={pendingChunks.agent} chunks={pendingChunks.reasoning} />
        )}
        {pendingChunks.llm.length > 0 && (
          <LLMStreamCard agent={pendingChunks.agent} chunks={pendingChunks.llm} />
        )}
      </>
    )});
  }

  return (
    <div className="relative h-full flex flex-col">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto"
      >
        {renderedGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-4 space-y-3">
            <div className="flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />
              <span className="text-xs text-app-text-secondary">等待 Agent 开始执行...</span>
            </div>
            <p className="text-[10px] text-app-text-tertiary text-center max-w-[160px] leading-relaxed">
              Manager Agent 正在理解你的需求，制定执行计划
            </p>
          </div>
        ) : (
          <div>
            {renderedGroups.map((item) => (
              <div key={item.id}>{item.el}</div>
            ))}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Scroll to bottom button — shown when user scrolled up */}
      {!autoScroll && renderedGroups.length > 0 && (
        <button
          onClick={() => {
            setAutoScroll(true);
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="absolute bottom-4 right-4 flex items-center gap-1 rounded-full bg-app-elevated border border-app-border px-3 py-1.5 text-[11px] text-app-text-secondary shadow-lg hover:bg-app-hover hover:text-app-text transition-colors"
        >
          <ChevronDown className="w-3 h-3" />
          滚动到底部
        </button>
      )}
    </div>
  );
}
