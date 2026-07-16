import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/helpers';
import { formatDurationPrecise } from '../../utils/format';
import type { StageInfo, LLMChunk, ReasoningChunk } from '../../types';

/** 旋转的 Chevron 图标 */
function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      className={cn(
        'transition-transform duration-200',
        open && 'rotate-90',
      )}
      style={{ transformOrigin: 'center' }}
    >
      <path
        d="M3 1L7 5L3 9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

/** Props for the exported StageTimeline component */
interface StageTimelineProps {
  stages: StageInfo[];
  isRunning: boolean;
  llmChunks?: Record<string, LLMChunk[]>;
  reasoningChunks?: Record<string, ReasoningChunk[]>;
  currentStage?: string | null;
}

interface StageRowProps {
  stage: StageInfo;
  index: number;
  totalStages: number;
  expanded: boolean;
  onToggle: () => void;
  chunks?: LLMChunk[] | ReasoningChunk[];
  hasDetail: boolean;
  stageReasoning: string;
}

function StageRow({ stage, index, totalStages, expanded, onToggle, chunks, hasDetail, stageReasoning }: StageRowProps) {
  const isCurrent = stage.status === 'running';
  const isCompleted = stage.status === 'completed';

  // 多轮复审/润色显示轮次
  // reviewRound 从 1 开始计数（0 = 初审，1 = 第一次复审，2 = 第二次复审）
  // 显示时 +1 避免"第1轮"与初审混淆
  const roundLabel = stage.reviewRound && stage.reviewRound > 0
    ? `（第${stage.reviewRound + 1}轮）`
    : '';
  const displayLabel = `${stage.label}${roundLabel}`;

  return (
    <div className="relative">
      {/* 连接线 */}
      {index < totalStages - 1 && (
        <div className={cn(
          'absolute left-[7px] top-[18px] w-[2px]',
          isCompleted ? 'bg-green-400/30' : 'bg-app-border/10',
          expanded ? 'h-[calc(100%+4px)]' : 'h-[calc(100%-18px)]',
        )} />
      )}

      <div className="relative flex items-start gap-2.5 pb-2 group">
        {/* 状态圆点 */}
        <div className={cn(
          'mt-[5px] w-[16px] h-[16px] rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all duration-300',
          isCompleted && 'border-green-400 bg-green-400/20',
          isCurrent && 'border-blue-400 bg-blue-400/20',
          !isCompleted && !isCurrent && 'border-app-border/30 bg-app-surface/50',
        )}>
          {isCompleted ? (
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
              <path d="M1 4L3 6L7 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-400" />
            </svg>
          ) : isCurrent ? (
            <span className="w-[6px] h-[6px] rounded-full bg-blue-400 animate-pulse" />
          ) : null}
        </div>

        {/* 内容区 */}
        <div className="flex-1 min-w-0">
          {/* 标题行 */}
          <div
            role={hasDetail ? 'button' : undefined}
            tabIndex={hasDetail ? 0 : undefined}
            aria-expanded={hasDetail ? expanded : undefined}
            className={cn(
              'flex items-center gap-1.5 min-h-[26px]',
              hasDetail && 'cursor-pointer',
            )}
            onClick={() => {
              // P22: 之前在 rowClickHandlers 里 hard-guard "running 不响应"，
              //      那是稳定 handler 的代价。改在 StageRow 内判断，避免把
              //      llmChunks/reasoningChunks 放进 useMemo 依赖。
              if (!hasDetail || isCurrent) return;
              onToggle();
            }}
            onKeyDown={hasDetail ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (isCurrent) return;
                onToggle();
              }
            } : undefined}
          >
            <span className="text-xs text-app-text-tertiary flex-shrink-0">{stage.icon}</span>
            <span className={cn(
              'text-xs font-medium transition-colors',
              isCompleted && 'text-green-400',
              isCurrent && 'text-blue-400',
              !isCompleted && !isCurrent && 'text-app-text-secondary',
            )}>
              {displayLabel}
            </span>

            {/* 状态标签 */}
            {isCompleted && (
              <span className="text-[10px] text-green-400/60 ml-auto flex-shrink-0">
                {formatDurationPrecise(stage.duration!)}
              </span>
            )}
            {isCurrent && (
              <span className="text-[10px] text-blue-400 ml-auto flex-shrink-0">运行中</span>
            )}

            {/* 展开/折叠箭头 */}
            {hasDetail && !isCurrent && (
              <span className={cn(
                'ml-1 text-app-text-tertiary/40 transition-opacity',
                'opacity-0 group-hover:opacity-100',
              )}>
                <Chevron open={expanded} />
              </span>
            )}
          </div>

          {/* 未展开时的推理预览 — 折叠状态下也能看到 LLM 反馈 */}
          {!expanded && (chunks.length > 0 || stage.reasoning) && (
            <p className="mt-1 text-[11px] text-app-text-tertiary leading-relaxed line-clamp-2">
              {((stage.reasoning as string) || chunks.map(c => c.content).join('')).slice(0, 120)}...
            </p>
          )}

          {/* 展开区域 */}
          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div
                key="content"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="mt-1.5 space-y-2">
                  {/* 阶段产出内容 — 从 stage.reasoning 或 reasoningChunks 取 */}
                  {(stageReasoning || (chunks && chunks.length > 0)) && (
                    <div className={cn(
                      'rounded-lg px-3 py-2.5',
                      'border text-xs leading-relaxed whitespace-pre-wrap',
                      // 根据阶段类型着色
                      stage.agent === 'ManagerAgent' || stage.agent === 'PlannerAgent'
                        ? 'bg-blue-500/5 border-blue-500/20 text-blue-300'
                        : stage.agent === 'SearchAnalyzer' || stage.agent === 'AnalysisAgent'
                        ? 'bg-green-500/5 border-green-500/20 text-green-300'
                        : stage.agent === 'ReviewAgent'
                        ? 'bg-orange-500/5 border-orange-500/20 text-orange-300'
                        : stage.agent === 'FixAgent'
                        ? 'bg-red-500/5 border-red-500/20 text-red-300'
                        : stage.agent === 'WritingAgent'
                        ? 'bg-purple-500/5 border-purple-500/20 text-purple-300'
                        : 'bg-app-surface/30 border-app-border/30 text-app-text-secondary',
                    )}>
                      {/* 显示推理来源标签 */}
                      {stage.agent && (
                        <div className="text-[10px] font-medium mb-1 opacity-70">
                          {stage.agent === 'ManagerAgent' || stage.agent === 'PlannerAgent' ? '📋 规划'
                            : stage.agent === 'SearchAnalyzer' ? '🔍 搜索分析'
                            : stage.agent === 'AnalysisAgent' ? '📊 分析'
                            : stage.agent === 'WritingAgent' ? '✍️ 创作'
                            : stage.agent === 'ReviewAgent' ? '🔍 审核'
                            : stage.agent === 'FixAgent' ? '🔧 修正'
                            : stage.agent}
                        </div>
                      )}
                      <p className="leading-relaxed">
                        {stageReasoning}
                        {isCurrent && (
                          <span className="inline-block w-[2px] h-[13px] bg-blue-400 ml-0.5 animate-pulse align-text-bottom" />
                        )}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export function StageTimeline({ stages, isRunning, llmChunks, reasoningChunks, currentStage }: StageTimelineProps) {
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(() => new Set());
  // 记录上一次的 isRunning，仅在 true→false 翻转时才清空 expandedKeys，
  // 避免在父级任何无关渲染（例如新流触发时其它消息的 StageTimeline 重渲染）误清空。
  const prevIsRunningRef = useRef<boolean>(isRunning);
  // 修复 BUG-18：缓存上一次的 stages 指纹，避免 store 中 stages 数组引用变化
  // （比如推理 chunk 累积触发的不可变更新）就触发 expandedKeys 重算。
  // 真实情况下 stages 引用变化非常频繁（每个 SSE 事件都会生成新数组），
  // 用浅序列化指纹判断"内容是否真变"后再决定是否执行展开逻辑。
  const prevStagesFingerprintRef = useRef<string>('');

  // 运行中自动展开 running stage；完成后保持展开状态（让用户看完推理内容）
  // 用户可手动折叠已完成的阶段，但不再自动折叠
  useEffect(() => {
    if (!isRunning) return;
    // 用 stages 的关键字段（agent|status|reviewRound）做指纹
    const fingerprint = stages
      .map((s) => `${s.agent}|${s.reviewRound || 0}|${s.status}`)
      .join(';');
    if (fingerprint === prevStagesFingerprintRef.current) return;
    prevStagesFingerprintRef.current = fingerprint;

    setExpandedKeys((prev) => {
      const next = new Set(prev);
      let changed = false;
      for (const s of stages) {
        const key = `${s.agent}|${s.reviewRound || 0}`;
        if (s.status === 'running' && !next.has(key)) {
          next.add(key);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [stages, isRunning]);

  // 仅在 isRunning 由 true 翻转到 false 时清空（保持历史消息的展开状态）
  useEffect(() => {
    const prev = prevIsRunningRef.current;
    if (prev && !isRunning) {
      setExpandedKeys(new Set());
    }
    prevIsRunningRef.current = isRunning;
  }, [isRunning]);

  const toggleExpanded = useCallback((key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  if (stages.length === 0) return null;

  const completedCount = stages.filter(s => s.status === 'completed').length;

  // P22: rowClickHandlers 不要再把 llmChunks/reasoningChunks 放进依赖，
  //      否则这两个对象每次 flushReasoning（30ms）/ flushChunks（120ms）
  //      都会换引用，导致 useMemo 重算、所有 StageRow 失效、hover 抖动。
  //      真正的"是否有 detail"判断放到 StageRow 渲染处用最新的 chunks 计算，
  //      但 handler 自身的引用保持稳定（toggleExpanded 已经是 useCallback）。
  const rowClickHandlers = useMemo(() => {
    const handlers: Record<string, () => void> = {};
    for (const stage of stages) {
      const uniqueKey = `${stage.agent}|${stage.reviewRound || 0}`;
      handlers[uniqueKey] = () => toggleExpanded(uniqueKey);
    }
    return handlers;
  }, [stages, toggleExpanded]);

  return (
    <div className="my-3" aria-label="创作阶段进度">
      {stages.map((stage, i) => {
        const uniqueKey = `${stage.agent}|${stage.reviewRound || 0}`;
        // 读取 key 需与写入（runStreaming llm_chunk handler）保持一致，
        // review channel 写 llmChunks[uniqueKey]，reasoning delta 写 reasoningChunks[uniqueKey]
        const stageChunks = llmChunks?.[uniqueKey] || reasoningChunks?.[uniqueKey];
        const chunks = stageChunks || [];
        // 推理内容：优先用 stage.reasoning（随 stage:completed 事件绑定），
        // 没有则用 reasoningChunks 里查找
        const stageReasoning = (stage.reasoning as string) || (chunks.length > 0 ? chunks.map(c => c.content).join('') : '');
        const hasDetail = !!(chunks.length > 0 || stageReasoning);
        const isCurrent = stage.status === 'running';
        const expanded = expandedKeys.has(uniqueKey);

        return (
          <StageRow
            key={uniqueKey}
            stage={stage}
            index={i}
            totalStages={stages.length}
            expanded={expanded}
            onToggle={rowClickHandlers[uniqueKey]}
            chunks={chunks}
            hasDetail={hasDetail}
            stageReasoning={stageReasoning}
          />
        );
      })}

      {/* 进度条 */}
      {isRunning && stages.length > 0 && (
        <div className="mt-1 ml-[26px]">
          <div className="flex justify-between text-[10px] text-app-text-tertiary/50 mb-1">
            <span>{completedCount}/{stages.length}</span>
          </div>
          <div className="h-[2px] bg-app-border/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${(completedCount / Math.max(stages.length, 1)) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
