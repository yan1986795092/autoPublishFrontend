import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/helpers';
import type { StageInfo, LLMChunk, ReasoningChunk } from '../../types';

interface StageTimelineProps {
  stages: StageInfo[];
  currentStage: string | null;
  isRunning: boolean;
  llmChunks?: Record<string, LLMChunk[]>;
  reasoningChunks?: Record<string, ReasoningChunk[]>;
}

function formatDuration(seconds?: number): string {
  if (seconds == null) return '';
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  return `${Math.floor(seconds / 60)}m${Math.round(seconds % 60)}s`;
}

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

interface StageRowProps {
  stage: StageInfo;
  index: number;
  totalStages: number;
  expanded: boolean;
  onToggle: () => void;
  chunks?: LLMChunk[] | ReasoningChunk[];
  hasDetail: boolean;
}

function StageRow({ stage, index, totalStages, expanded, onToggle, chunks, hasDetail }: StageRowProps) {
  const isCurrent = stage.status === 'running';
  const isCompleted = stage.status === 'completed';

  // 多轮复审/润色显示轮次
  const roundLabel = stage.reviewRound && stage.reviewRound > 0
    ? `（第${stage.reviewRound}轮）`
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
            className={cn(
              'flex items-center gap-1.5 min-h-[26px]',
              hasDetail && 'cursor-pointer',
            )}
            onClick={onToggle}
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
                {formatDuration(stage.duration!)}
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
                <div className="mt-1.5 space-y-1.5">
                  {/* 阶段产出内容 */}
                  {chunks && chunks.length > 0 && (
                    <div className="rounded-lg px-3 py-2.5 bg-white/[0.03] border border-white/[0.06]">
                      <p className="text-xs text-app-text-secondary leading-relaxed whitespace-pre-wrap">
                        {(() => {
                          const full = chunks.map(c => c.content).join('');
                          const isSearch = stage.agent === 'WebSearch' || stage.agent === 'HotTopicAgent';
                          if (isSearch && full.length > 300) {
                            const trimmed = full.slice(0, 300);
                            const lastBreak = trimmed.lastIndexOf('\n');
                            return (lastBreak > 100 ? trimmed.slice(0, lastBreak) : trimmed) + '\n...（共 ' + full.length + ' 字）';
                          }
                          return full;
                        })()}
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

export function StageTimeline({ stages, isRunning, llmChunks, reasoningChunks }: StageTimelineProps) {
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(() => new Set());

  // 运行中自动展开，完成立即折叠
  useEffect(() => {
    if (!isRunning) return; // 全部完成由下面的 effect 处理
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      let changed = false;
      for (const s of stages) {
        const key = `${s.agent}|${s.reviewRound || 0}`;
        if (s.status === 'running' && !next.has(key)) {
          next.add(key);
          changed = true;
        } else if (s.status === 'completed' && next.has(key)) {
          next.delete(key);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [stages, isRunning]);

  // 生成完毕 → 全部折叠（避免消息太长）
  useEffect(() => {
    if (!isRunning) {
      setExpandedKeys(new Set());
    }
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

  return (
    <div className="my-3">
      {stages.map((stage, i) => {
        const uniqueKey = `${stage.agent}|${stage.reviewRound || 0}`;
        const rawChunks = llmChunks?.[stage.agent] || reasoningChunks?.[uniqueKey];
        // ReviewAgent 的 chunks 拼接后去掉评分明细，只保留结论+问题+建议
        const isReview = stage.agent.includes('Review');
        const cleanContent = isReview
          ? (rawChunks || []).map(c => c.content).join('').replace(/\*\*各维度评分[\s\S]*?(?=\*\*审核结论：)/, '')
          : undefined;
        const chunks = isReview && cleanContent
          ? [{ agent: stage.agent, content: cleanContent, timestamp: Date.now() }]
          : (rawChunks || []);
        const hasDetail = !!(chunks && chunks.length > 0);
        const isCurrent = stage.status === 'running';
        const expanded = expandedKeys.has(uniqueKey);

        const handleRowClick = () => {
          if (!hasDetail || isCurrent) return;
          toggleExpanded(uniqueKey);
        };

        return (
          <StageRow
            key={uniqueKey}
            stage={stage}
            index={i}
            totalStages={stages.length}
            expanded={expanded}
            onToggle={handleRowClick}
            chunks={chunks}
            hasDetail={hasDetail}
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
