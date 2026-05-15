import { useRef, useEffect, useState } from 'react';
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAgentStore } from '../../stores/useAgentStore';
import { cn } from '../../utils/helpers';
import Markdown from 'react-markdown';
import { InlineDecision } from './InlineDecision';
import { Brain, CheckCircle, AlertCircle, Loader2, ChevronDown, ChevronRight, Type } from 'lucide-react';
import type { StreamEvent, AgentResult, LLMChunk, ReasoningChunk } from '../../types';

/* ─── Agent Action Descriptions（同 AgentLiveView）── */
const AGENT_ACTION_DESC: Record<string, { running: string; done: string }> = {
  WebSearch: { running: '🔍 正在搜索相关文章...', done: '✓ 搜索完成' },
  URLCrawler: { running: '🔗 正在抓取网页内容...', done: '✓ 抓取完成' },
  WritingAgent: { running: '✍️ 正在根据素材撰写内容...', done: '✓ 内容撰写完成' },
  SEOAgent: { running: '🔍 正在优化 SEO 关键词...', done: '✓ SEO 优化完成' },
  ReviewAgent: { running: '✅ 正在审核内容质量...', done: '✓ 审核通过' },
  ManagerAgent: { running: '🧠 正在规划任务...', done: '✓ 任务规划完成' },
  DiagramAgent: { running: '📊 正在生成图表...', done: '✓ 图表生成完成' },
  HotTopicAgent: { running: '🔥 正在分析热点话题...', done: '✓ 热点分析完成' },
  ImageAgent: { running: '🎨 正在生成配图...', done: '✓ 配图生成完成' },
  CodeAgent: { running: '💻 正在编写代码...', done: '✓ 代码编写完成' },
  PlatformAdapter: { running: '📱 正在适配平台格式...', done: '✓ 平台适配完成' },
  TranslationAgent: { running: '🌏 正在翻译内容...', done: '✓ 翻译完成' },
};

function getAgentActionDescription(agent: string, status: string): string {
  for (const [key, desc] of Object.entries(AGENT_ACTION_DESC)) {
    if (agent.includes(key)) {
      if (status === 'done' || status === 'completed') return desc.done;
      if (status === 'failed') return '✗ 执行失败';
      return desc.running;
    }
  }
  if (status === 'done' || status === 'completed') return '✓ 完成';
  if (status === 'failed') return '✗ 失败';
  return '⏳ 执行中...';
}

const AGENT_ICONS: Record<string, string> = {
  ManagerAgent: '🧠',
  WritingAgent: '✍️',
  SEOAgent: '🔍',
  DiagramAgent: '📊',
  ReviewAgent: '✅',
  WebSearch: '🌐',
  ImageAgent: '🎨',
  CodeAgent: '💻',
  HotTopicAgent: '🔥',
  PlatformAdapter: '📱',
  TranslationAgent: '🌏',
  URLCrawler: '🔗',
};

const AGENT_LABELS: Record<string, string> = {
  ManagerAgent: '规划',
  WritingAgent: '写作',
  SEOAgent: 'SEO',
  DiagramAgent: '图表',
  ReviewAgent: '审核',
  WebSearch: '搜索',
  ImageAgent: '配图',
  CodeAgent: '代码',
  HotTopicAgent: '热点',
  PlatformAdapter: '适配',
  TranslationAgent: '翻译',
  URLCrawler: '爬虫',
};

function getAgentIcon(agent: string): string {
  for (const [key, icon] of Object.entries(AGENT_ICONS)) {
    if (agent.includes(key)) return icon;
  }
  return '🤖';
}

function getAgentLabel(agent: string): string {
  for (const [key, label] of Object.entries(AGENT_LABELS)) {
    if (agent.includes(key)) return label;
  }
  return agent;
}

function getAgentColor(agent: string): string {
  if (agent.includes('Manager')) return 'text-purple-400 border-purple-500/30 bg-purple-500/10';
  if (agent.includes('Writing')) return 'text-blue-400 border-blue-500/30 bg-blue-500/10';
  if (agent.includes('SEO')) return 'text-green-400 border-green-500/30 bg-green-500/10';
  if (agent.includes('Diagram')) return 'text-orange-400 border-orange-500/30 bg-orange-500/10';
  if (agent.includes('Review')) return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
  if (agent.includes('WebSearch') || agent.includes('Crawl')) return 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10';
  if (agent.includes('Image')) return 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10';
  if (agent.includes('Code')) return 'text-red-400 border-red-500/30 bg-red-500/10';
  if (agent.includes('Hot')) return 'text-orange-400 border-orange-500/30 bg-orange-500/10';
  if (agent.includes('Platform') || agent.includes('Translation')) return 'text-pink-400 border-pink-500/30 bg-pink-500/10';
  return 'text-gray-400 border-gray-500/30 bg-gray-500/10';
}

/* ─── Thinking Step Card ─── */
function ThinkingStepCard({ event }: { event: StreamEvent }) {
  const [showReasoning, setShowReasoning] = useState(true);
  const isRunning = event.status === 'running';
  const isDone = event.status === 'done' || event.status === 'completed';
  const isFailed = event.status === 'failed';
  const agent = event.agent || '';
  const actionDesc = getAgentActionDescription(agent, event.status || 'running');

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className={cn(
        'rounded-xl border p-4 transition-colors shadow-sm',
        isFailed
          ? 'border-red-500/40 bg-red-500/10'
          : isDone
            ? 'border-app-border bg-app-surface'
            : 'border-blue-500/30 bg-blue-500/[0.06]'
      )}
    >
      <div className="flex items-start gap-3">
        {/* Status icon */}
        <div className="flex-shrink-0 pt-0.5">
          {isDone ? (
            <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle className="w-3.5 h-3.5 text-green-400" />
            </div>
          ) : isFailed ? (
            <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center">
              <AlertCircle className="w-3.5 h-3.5 text-red-400" />
            </div>
          ) : (
            <motion.div
              className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />
            </motion.div>
          )}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={cn(
              'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border',
              getAgentColor(agent),
            )}>
              {getAgentIcon(agent)} {getAgentLabel(agent)}
            </span>
            <span className={cn(
              'text-sm font-medium transition-colors',
              isDone ? 'text-green-400' : isFailed ? 'text-red-400' : 'text-app-text'
            )}>
              {actionDesc}
            </span>
            {event.data?.time_elapsed && (
              <span className="ml-auto text-[10px] text-app-text-secondary tabular-nums">
                {(event.data.time_elapsed as number).toFixed(1)}s
              </span>
            )}
          </div>

          {/* Reasoning (默认展开) */}
          {event.reasoning && (
            <div className="mt-2 flex items-start gap-1.5">
              <Brain className="mt-0.5 w-3 h-3 flex-shrink-0 text-yellow-400/50" />
              <div className="flex-1 min-w-0">
                <p className={cn(
                  'text-xs leading-relaxed text-yellow-400/60',
                  !showReasoning && 'line-clamp-2'
                )}>
                  {event.reasoning}
                </p>
                {event.reasoning.length > 200 && (
                  <button
                    onClick={() => setShowReasoning(!showReasoning)}
                    className="mt-0.5 text-[10px] text-yellow-400/40 hover:text-yellow-400/60 transition-colors"
                  >
                    {showReasoning ? '收起' : '展开全部'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Output summary (when reasoning is long, show below) */}
          {isDone && event.output_summary && (
            <div className="mt-2 rounded-lg bg-app-surface/50 p-2.5 text-xs text-app-text-secondary leading-relaxed border border-app-border/30">
              <span className="text-[10px] text-app-text-tertiary font-medium mb-1 block">输出摘要</span>
              {event.output_summary}
            </div>
          )}

          {/* Tokens */}
          {event.data?.tokens_used && (
            <div className="mt-1.5 text-[10px] text-app-text-tertiary">
              Token 数: {event.data.tokens_used as number}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Plan Summary Card ─── */
function PlanSummaryCard({ event }: { event: StreamEvent }) {
  const tasks = (event.data?.tasks as any[]) || [];
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-4 shadow-sm"
    >
      <div className="flex items-center gap-2 mb-2">
        <Brain className="w-4 h-4 text-purple-400" />
        <span className="text-xs font-semibold text-app-text">执行计划</span>
        <span className="text-[10px] text-app-text-tertiary ml-auto">{tasks.length} 个步骤</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {tasks.map((task: any, i: number) => (
          <span key={i} className={cn(
            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium border',
            getAgentColor(task.agent_type || ''),
          )}>
            {getAgentIcon(task.agent_type || '')} {getAgentLabel(task.agent_type || '')}
          </span>
        ))}
      </div>
      {event.data?.reasoning && (
        <p className="mt-2 text-[11px] text-app-text-secondary leading-relaxed">
          {event.data.reasoning as string}
        </p>
      )}
    </motion.div>
  );
}

/* ─── Progress Card ─── */
function ProgressCard({ event }: { event: StreamEvent }) {
  const progress = (event.data?.progress as number) || 0;
  const message = (event.data?.progress_message as string) || '';
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center gap-3 px-4 py-2"
    >
      <div className="flex-1 h-1.5 rounded-full bg-app-border overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-blue-500"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
      <span className="text-[10px] text-app-text-secondary whitespace-nowrap">{Math.round(progress)}%</span>
      {message && <span className="text-[10px] text-app-text-tertiary truncate">{message}</span>}
    </motion.div>
  );
}

/* ─── Result Card ─── */
function ResultCard({ event, onEdit, onPublish }: {
  event: StreamEvent;
  onEdit?: (contentId: string) => void;
  onPublish?: (contentId: string) => void;
}) {
  const result = event.data as AgentResult;
  const fullText = (result?.output?.full_text as string) || (result?.output?.content as string) || '';
  const contentId = (result?.output?._content_id as string) || '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-app-border bg-app-elevated overflow-hidden shadow-md"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-app-border bg-app-surface/50">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-400" />
          <span className="text-sm font-medium text-app-text">生成结果</span>
          {result.status && (
            <span className={cn(
              'rounded-full px-2 py-0.5 text-[10px] font-medium',
              result.status === 'completed' ? 'bg-green-500/10 text-green-400' :
              result.status === 'partial' ? 'bg-yellow-500/10 text-yellow-400' :
              'bg-red-500/10 text-red-400'
            )}>
              {result.status === 'completed' ? '完成' : result.status === 'partial' ? '部分完成' : '失败'}
            </span>
          )}
        </div>
      </div>
      <div className="p-5 max-h-96 overflow-y-auto">
        {fullText ? (
          <div className="prose prose-invert max-w-none text-sm leading-relaxed text-app-text-secondary">
            <Markdown>{fullText}</Markdown>
          </div>
        ) : (
          <p className="text-xs text-app-text-tertiary">无输出内容</p>
        )}
      </div>
      {result.usage && (
        <div className="flex flex-wrap gap-4 px-4 py-2.5 border-t border-app-border bg-app-surface/30 text-[10px] text-app-text-tertiary">
          <span>Token 数: {result.usage.tokens_used}</span>
          <span>耗时: {result.usage.time_elapsed?.toFixed(1)}s</span>
          <span>模型: {result.usage.model || '未知'}</span>
        </div>
      )}
      {/* Actions */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-app-border bg-app-surface/30">
        {contentId && (
          <button
            onClick={() => onEdit?.(contentId)}
            className="rounded-lg px-3 py-1.5 text-xs font-medium bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
          >
            继续编辑
          </button>
        )}
        {contentId && (
          <button
            onClick={() => onPublish?.(contentId)}
            className="rounded-lg px-3 py-1.5 text-xs font-medium bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors"
          >
            发布
          </button>
        )}
      </div>
    </motion.div>
  );
}

/* ─── Error Card ─── */
function ErrorCard({ event }: { event: StreamEvent }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 shadow-sm"
    >
      <div className="flex items-center gap-2">
        <AlertCircle className="w-4 h-4 text-red-400" />
        <span className="text-sm font-medium text-red-400">执行出错</span>
      </div>
      <p className="mt-1 text-xs text-red-400/80">
        {event.data?.message || '未知错误'}
      </p>
    </motion.div>
  );
}

/* ─── User Message Bubble ─── */
function UserMessageCard({ event }: { event: StreamEvent }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex justify-end"
    >
      <div className="max-w-[80%] rounded-2xl rounded-br-md bg-blue-500/15 border border-blue-500/20 px-4 py-2.5">
        <p className="text-sm text-app-text leading-relaxed whitespace-pre-wrap">
          {event.data?.content as string}
        </p>
      </div>
    </motion.div>
  );
}

/* ─── LLM Token Streaming Card（写作内容流式输出）── */
function LLMStreamCard({ agent, chunks }: { agent: string; chunks: LLMChunk[] }) {
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 mt-1"
    >
      <div className="flex items-center gap-1.5 mb-2">
        <Type className="w-3 h-3 text-blue-400" />
        <span className={cn(
          'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium border',
          getAgentColor(agent),
        )}>
          {getAgentIcon(agent)} {getAgentLabel(agent)} 正在写作...
        </span>
        <span className="ml-auto text-[10px] text-blue-400/60 tabular-nums">
          {chunks.length} token
        </span>
      </div>
      <div
        ref={textRef}
        className={cn(
          'text-xs text-app-text-secondary leading-relaxed whitespace-pre-wrap',
          displayed.length < accumulated.length && 'after:content-["▋"] after:text-blue-400 after:animate-pulse'
        )}
      >
        {displayed}
      </div>
    </motion.div>
  );
}

/* ─── Reasoning Card（LLM 思考过程，默认展开）── */
function ReasoningCard({ agent, chunks }: { agent: string; chunks: ReasoningChunk[] }) {
  const [expanded, setExpanded] = useState(true);
  const text = chunks.map(c => c.content).join('');

  if (chunks.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-2 mt-1"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 w-full text-left hover:opacity-80 transition-opacity"
      >
        <Brain className="w-3 h-3 text-yellow-400/70 flex-shrink-0" />
        <span className="text-[10px] text-yellow-400/60">
          💭 思考过程 ({chunks.length} 片段)
        </span>
        <ChevronDown className={cn(
          'w-3 h-3 text-yellow-400/40 ml-auto transition-transform flex-shrink-0',
          expanded && 'rotate-180'
        )} />
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-2 overflow-hidden rounded bg-yellow-500/5 p-2 text-[10px] text-yellow-300/50 leading-relaxed whitespace-pre-wrap"
          >
            {text}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─── Agent Progress Overview（步骤总览）── */
function AgentProgressOverview({ events }: { events: StreamEvent[] }) {
  const planEvent = events.find(e => e.type === 'plan');
  if (!planEvent) return null;
  const tasks = (planEvent.data?.tasks as any[]) || [];
  if (tasks.length === 0) return null;

  // Track step states
  const stepStates = tasks.map((t: any) => {
    const agentName = t.agent_type || '';
    let status: 'pending' | 'running' | 'done' | 'failed' = 'pending';
    for (const evt of events) {
      if (evt.type !== 'thinking_step' || !evt.agent) continue;
      if (!agentName.includes(evt.agent.replace('Agent', '')) && evt.agent !== agentName) continue;
      const s = evt.status || 'running';
      if (s === 'done' || s === 'completed') status = 'done';
      else if (s === 'failed') status = 'failed';
      else if (status === 'pending') status = 'running';
    }
    return { agent_type: agentName, status, icon: getAgentIcon(agentName), label: getAgentLabel(agentName) };
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-app-border/50 bg-app-surface/50 p-3"
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] font-semibold text-app-text-secondary uppercase tracking-wider">执行进度</span>
        <span className="text-[10px] text-app-text-tertiary">
          {stepStates.filter(s => s.status === 'done' || s.status === 'completed').length}/{stepStates.length}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {stepStates.map((s, i) => (
          <motion.div
            key={i}
            layout
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium border transition-all',
              s.status === 'done' || s.status === 'completed'
                ? 'border-green-500/30 bg-green-500/10 text-green-400'
                : s.status === 'failed'
                  ? 'border-red-500/30 bg-red-500/10 text-red-400'
                  : s.status === 'running'
                    ? 'border-blue-500/30 bg-blue-500/10 text-blue-400'
                    : 'border-app-border/30 bg-app-surface text-app-text-tertiary'
            )}
          >
            {s.status === 'done' || s.status === 'completed' ? '✓' :
             s.status === 'failed' ? '✗' :
             s.status === 'running' ? '→' : '○'}
            {' '}{s.icon} {s.label}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

/* ─── Main Component ─── */
export function AgentThinkingStream({ onEdit, onPublish }: {
  onEdit?: (contentId: string) => void;
  onPublish?: (contentId: string) => void;
}) {
  const { streamEvents, currentTaskId, pendingDecision, submitDecision, llmChunks, reasoningChunks } = useAgentStore();
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Auto-scroll to bottom on new events
  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [streamEvents.length, autoScroll]);

  // Detect manual scroll-up
  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setAutoScroll(isNearBottom);
  };

  // Handle decision from within the stream
  const handleDecision = async (decisionId: string, choice: string) => {
    if (!currentTaskId) return;
    await submitDecision(currentTaskId, { decision_id: decisionId, choice });
  };

  // Group thinking_step events with their associated llm/reasoning chunks
  const renderedGroups: Array<{ id: string; el: React.ReactNode }> = [];
  let chunkGroupCounter = 0;
  let pendingChunks: { id: string; llm: LLMChunk[]; reasoning: ReasoningChunk[]; agent: string } | null = null;

  for (const event of streamEvents) {
    if (event.type === 'thinking_step') {
      // Flush previous pending chunks
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
      // Reset for this agent's chunks
      pendingChunks = { id: `chunks-${chunkGroupCounter++}`, llm: [], reasoning: [], agent: event.agent || '' };
      renderedGroups.push({ id: event.id, el: <ThinkingStepCard key={event.id} event={event} /> });
    } else if (event.type === 'llm_chunk' && pendingChunks) {
      pendingChunks.llm.push({ agent: event.agent || '', content: event.content || '', timestamp: event.timestamp });
    } else if (event.type === 'reasoning' && pendingChunks) {
      pendingChunks.reasoning.push({ agent: event.agent || '', content: event.content || '', timestamp: event.timestamp });
    } else {
      // Flush any pending chunks before non-thinking events
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
              <AgentProgressOverview events={streamEvents} />
            </>
          )}
          {event.type === 'progress' && <ProgressCard event={event} />}
          {event.type === 'result' && <ResultCard event={event} onEdit={onEdit} onPublish={onPublish} />}
          {event.type === 'error' && <ErrorCard event={event} />}
          {event.type === 'decision_required' && (
            <InlineDecision
              event={event}
              onSubmit={handleDecision}
            />
          )}
        </>
      )});
    }
  }
  // Flush remaining
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
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="space-y-3 overflow-y-auto"
      style={{ maxHeight: '100%' }}
    >
      <AnimatePresence mode="popLayout">
        {renderedGroups.map((item) => (
          <div key={item.id}>{item.el}</div>
        ))}
      </AnimatePresence>

      {/* Pending decision from store (if not already in streamEvents) */}
      {pendingDecision && !streamEvents.some(e => e.type === 'decision_required') && (
        <InlineDecision
          event={{
            id: 'pending-decision',
            type: 'decision_required',
            timestamp: Date.now(),
            data: pendingDecision,
          }}
          onSubmit={handleDecision}
        />
      )}

      <div ref={bottomRef} />
    </div>
  );
}
