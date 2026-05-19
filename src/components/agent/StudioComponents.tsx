import { motion } from 'framer-motion';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { cn } from '../../utils/helpers';
import Markdown from 'react-markdown';
import { Bot, Sparkles, Copy, Check } from 'lucide-react';
import type { ExecutionPlan, AsyncTask, AgentResult } from '../../types';
import { getAgentLabel, getAgentIcon } from '../../config/agents';

export function EmptyStudioState({ onSelect }: { onSelect: (s: string) => void }) {
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

export function QuickTemplates({ onSelect }: { onSelect: (s: string) => void }) {
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

export function PlanProgressStrip({ plan, currentTask }: { plan: ExecutionPlan; currentTask: AsyncTask }) {
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
                {getAgentLabel(task.agent_type)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PlanSummaryCard({ plan, onStart }: { plan: ExecutionPlan; onStart: () => void }) {
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
            <span className="text-base">{getAgentIcon(task.agent_type)}</span>
            <span className="font-medium text-app-text">{getAgentLabel(task.agent_type)}</span>
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

export function ResultSection({ result, copiedId, onCopy }: {
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
