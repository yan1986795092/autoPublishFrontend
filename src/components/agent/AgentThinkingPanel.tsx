import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { cn } from '../../utils/helpers';
import { ChevronDown, Brain } from 'lucide-react';
import type { ThinkingStep, AgentResult } from '../../types';

interface AgentThinkingPanelProps {
  result?: AgentResult | null;
  className?: string;
  compact?: boolean;
}

const AGENT_ICONS: Record<string, string> = {
  ManagerAgent: '🧠',
  WritingAgent: '✍️',
  SEOAgent: '🔍',
  DiagramAgent: '📊',
  ReviewAgent: '✅',
  WebSearch: '🌐',
  PlatformAdapter: '🔌',
  ImageAgent: '🎨',
  CodeAgent: '💻',
  HotTopicAgent: '🔥',
};

const AGENT_COLORS: Record<string, string> = {
  ManagerAgent: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
  WritingAgent: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
  SEOAgent: 'text-green-400 border-green-500/30 bg-green-500/10',
  DiagramAgent: 'text-orange-400 border-orange-500/30 bg-orange-500/10',
  ReviewAgent: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
  WebSearch: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
  PlatformAdapter: 'text-pink-400 border-pink-500/30 bg-pink-500/10',
  ImageAgent: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10',
  CodeAgent: 'text-red-400 border-red-500/30 bg-red-500/10',
  HotTopicAgent: 'text-orange-400 border-orange-500/30 bg-orange-500/10',
};

const ACTION_LABELS: Record<string, string> = {
  decompose: '任务拆解',
  analyze_task: '分析任务',
  generate: '生成内容',
  execute_plan: '执行计划',
  merge_and_validate: '合并与验证',
  validate: '质量检查',
  choose_diagram_type: '选择图表类型',
  generate_diagram: '生成图表',
  keyword_research: '关键词研究',
  seo_score: 'SEO 评分',
  optimize: '优化建议',
  fetch_trending: '获取热榜',
  filter_topics: '筛选话题',
  analyze_trends: '趋势分析',
  validate_language: '语言验证',
};

function getAgentStyle(agent: string): string {
  for (const [key, value] of Object.entries(AGENT_COLORS)) {
    if (agent.includes(key)) return value;
  }
  return 'text-gray-400 border-gray-500/30 bg-gray-500/10';
}

function getAgentIcon(agent: string): string {
  for (const [key, value] of Object.entries(AGENT_ICONS)) {
    if (agent.includes(key)) return value;
  }
  return '🤖';
}

function getActionLabel(action: string): string {
  return ACTION_LABELS[action] || action;
}

function StepCard({ step, index }: { step: ThinkingStep; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const isDone = step.status === 'done';
  const isFailed = step.status === 'failed';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, delay: index * 0.03 }}
      className={cn(
        'rounded-lg border p-3 transition-colors',
        isFailed
          ? 'border-red-500/30 bg-red-500/5'
          : isDone
            ? 'border-app-border/50'
            : 'border-blue-500/30 bg-blue-500/5'
      )}
    >
      <div className="flex items-start gap-3">
        {/* Status indicator */}
        <motion.div
          className="flex-shrink-0 pt-0.5"
          animate={!isDone && !isFailed ? { scale: [1, 1.15, 1] } : {}}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          {isDone ? (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500/20 text-xs text-green-400">✓</span>
          ) : isFailed ? (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500/20 text-xs text-red-400">✗</span>
          ) : (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500/20 text-xs text-blue-400">...</span>
          )}
        </motion.div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium border',
              getAgentStyle(step.agent)
            )}>
              {getAgentIcon(step.agent)} {step.agent.replace('Agent', '')}
            </span>
            <span className="text-xs font-medium text-app-text">
              {getActionLabel(step.action)}
            </span>
            {step.time_elapsed > 0 && (
              <span className="ml-auto text-[10px] text-app-text-secondary tabular-nums">
                {step.time_elapsed.toFixed(1)}s
              </span>
            )}
          </div>

          {/* Reasoning */}
          {step.reasoning && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-1 flex w-full items-start gap-1 text-left text-xs text-app-text-secondary hover:text-app-text transition-colors"
            >
              <Brain className="mt-0.5 h-3 w-3 flex-shrink-0 opacity-60" />
              <span className="flex-1">
                {expanded
                  ? step.reasoning
                  : step.reasoning.length > 80
                    ? step.reasoning.slice(0, 80) + '...'
                    : step.reasoning}
              </span>
              <ChevronDown
                className={cn(
                  'mt-0.5 h-3 w-3 flex-shrink-0 transition-transform',
                  expanded && 'rotate-180'
                )}
              />
            </button>
          )}

          {/* Output summary */}
          <AnimatePresence>
            {expanded && step.output_summary && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-2 overflow-hidden rounded bg-app-surface/50 p-2 text-[11px] text-app-text-secondary"
              >
                <span className="text-[10px] opacity-60">📋 </span>
                {step.output_summary}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tokens & Time */}
          <AnimatePresence>
            {expanded && step.tokens_used > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-1 flex gap-3 text-[10px] text-app-text-secondary"
              >
                <span>Token 数: {step.tokens_used}</span>
                {step.time_elapsed > 0 && <span>耗时: {step.time_elapsed.toFixed(1)}s</span>}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

export function AgentThinkingPanel({ result, className, compact = false }: AgentThinkingPanelProps) {
  const [showAll, setShowAll] = useState(false);

  if (!result?.thinking_trace) {
    return null;
  }

  const { steps, total_elapsed } = result.thinking_trace;
  if (!steps || steps.length === 0) return null;

  const completedSteps = steps.filter(s => s.status === 'done').length;
  const failedSteps = steps.filter(s => s.status === 'failed').length;
  const displaySteps = compact && !showAll ? steps.slice(0, 3) : steps;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card variant="glass" className={cn('w-full', className)}>
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Brain className="h-4 w-4 text-purple-400" />
              <span>Agent 思考过程</span>
              <span className={cn(
                'rounded-full px-2 py-0.5 text-[10px] font-medium',
                result.status === 'completed' ? 'bg-green-500/10 text-green-400' :
                result.status === 'failed' ? 'bg-red-500/10 text-red-400' :
                result.status === 'partial' ? 'bg-yellow-500/10 text-yellow-400' :
                'bg-blue-500/10 text-blue-400'
              )}>
                {result.status === 'completed' ? '完成' :
                 result.status === 'failed' ? '失败' :
                 result.status === 'partial' ? '部分完成' : '执行中'}
              </span>
            </CardTitle>
            <div className="flex items-center gap-3 text-[10px] text-app-text-secondary tabular-nums">
              <span>{completedSteps}/{steps.length} 步骤</span>
              {failedSteps > 0 && <span className="text-red-400">{failedSteps} 失败</span>}
              {total_elapsed > 0 && <span>⏱ {total_elapsed.toFixed(1)}s</span>}
            </div>
          </div>

          {/* Mini progress bar */}
          <div className="mt-2 flex h-1 gap-0.5">
            {steps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: i * 0.03, duration: 0.2 }}
                className={cn(
                  'flex-1 rounded-full origin-left',
                  step.status === 'done' ? 'bg-green-500' :
                  step.status === 'failed' ? 'bg-red-500' :
                  'bg-blue-500/50'
                )}
              />
            ))}
          </div>
        </CardHeader>

        <CardContent className="space-y-2 p-4 pt-2">
          {displaySteps.map((step, i) => (
            <StepCard key={i} step={step} index={i} />
          ))}

          {compact && steps.length > 3 && !showAll && (
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => setShowAll(true)}
              className="w-full rounded-lg border border-dashed border-app-border py-2 text-[11px] text-app-text-secondary hover:text-app-text transition-colors"
            >
              展开全部 {steps.length} 步
            </motion.button>
          )}

          {compact && showAll && steps.length > 3 && (
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => setShowAll(false)}
              className="w-full rounded-lg border border-dashed border-app-border py-2 text-[11px] text-app-text-secondary hover:text-app-text transition-colors"
            >
              收起
            </motion.button>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
