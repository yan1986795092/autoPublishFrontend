import { motion } from 'framer-motion';
import { cn } from '../../utils/helpers';
import type { StageInfo } from '../../types';

interface StageTimelineProps {
  stages: StageInfo[];
  currentStage: string | null;
  isRunning: boolean;
}

function formatDuration(seconds?: number): string {
  if (seconds == null) return '';
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  return `${Math.floor(seconds / 60)}m${Math.round(seconds % 60)}s`;
}

export function StageTimeline({ stages, currentStage, isRunning }: StageTimelineProps) {
  if (stages.length === 0) return null;

  const completedCount = stages.filter(s => s.status === 'completed').length;

  return (
    <div className="my-3">
      {/* Timeline */}
      <div className="relative pl-5 border-l-2 border-app-border/30">
        {stages.map((stage, i) => {
          const isCurrent = stage.agent === currentStage;
          const isCompleted = stage.status === 'completed';

          return (
            <div key={stage.agent} className={cn('relative pb-4', i === stages.length - 1 && 'pb-0')}>
              {/* Dot indicator */}
              <div className={cn(
                'absolute -left-[13px] w-6 h-6 rounded-full border-2 border-app-bg flex items-center justify-center transition-all',
                isCompleted && 'bg-green-500 border-green-500',
                isCurrent && 'bg-blue-500 border-blue-500',
                !isCompleted && !isCurrent && 'bg-gray-600 border-gray-500',
              )}>
                {isCompleted ? (
                  <span className="text-[10px] text-white font-bold">✓</span>
                ) : isCurrent ? (
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                ) : (
                  <span className="w-2 h-2 bg-gray-400 rounded-full" />
                )}
              </div>

              {/* Label + duration */}
              <div className="flex items-center gap-2 mb-1">
                <span className={cn(
                  'text-sm font-medium transition-colors',
                  isCompleted && 'text-green-400',
                  isCurrent && 'text-blue-400',
                  !isCompleted && !isCurrent && 'text-app-text-tertiary',
                )}>
                  {stage.icon} {stage.label}
                </span>
                {isCompleted && stage.duration != null && (
                  <span className="text-[10px] text-app-text-tertiary">{formatDuration(stage.duration)}</span>
                )}
                {isCurrent && (
                  <span className="text-[10px] text-blue-400/70">进行中...</span>
                )}
              </div>

              {/* Reasoning content (for current or completed stage) */}
              {(isCurrent || isCompleted) && stage.reasoning && (
                <div className="ml-0 mb-1.5 bg-app-elevated/50 rounded-lg px-3 py-2 border border-app-border/20">
                  <div className="flex items-start gap-1.5">
                    <span className="text-[10px] text-app-text-tertiary mt-0.5">💭</span>
                    <p className="text-[11px] text-app-text-secondary leading-relaxed m-0 italic">
                      {stage.reasoning}
                      {isCurrent && (
                        <span className="inline-block w-[3px] h-[11px] bg-blue-400 ml-0.5 animate-pulse align-text-bottom" />
                      )}
                    </p>
                  </div>
                </div>
              )}

              {/* Sub-steps */}
              {stage.substeps && stage.substeps.length > 0 && (
                isCurrent ? (
                  /* Current stage — expanded sub-steps */
                  <div className="mt-1 space-y-0.5 pl-2 border-l border-blue-500/20">
                    {stage.substeps.map((step, si) => (
                      <div key={si} className="flex items-start gap-1.5 text-[10px] text-app-text-tertiary">
                        {step.status === 'running' ? (
                          <div className="mt-0.5 w-1.5 h-1.5 rounded-full border border-blue-400 border-t-transparent animate-spin flex-shrink-0" />
                        ) : (
                          <span className={cn(
                            'mt-0.5 w-1.5 h-1.5 rounded-full flex-shrink-0',
                            step.status === 'failed' ? 'bg-red-400' : 'bg-blue-400/60',
                          )} />
                        )}
                        <span className="min-w-0">
                          <span className="font-medium text-app-text-secondary/80">{step.agent}</span>
                          <span className="ml-1">{step.action}</span>
                          {step.output_summary && (
                            <span className="text-[9px] text-app-text-tertiary block truncate max-w-[300px]">
                              {step.output_summary}
                            </span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Completed stage — collapsible sub-steps */
                  <details className="ml-0">
                    <summary className="text-[10px] text-app-text-tertiary cursor-pointer hover:text-app-text-secondary transition-colors">
                      {stage.substeps.length} 个子步骤
                    </summary>
                    <div className="mt-1 space-y-0.5 pl-2 border-l border-app-border/20">
                      {stage.substeps.map((step, si) => (
                        <div key={si} className="flex items-start gap-1.5 text-[10px] text-app-text-tertiary">
                          <span className={cn(
                            'mt-0.5 w-1.5 h-1.5 rounded-full flex-shrink-0',
                            step.status === 'failed' ? 'bg-red-400' : 'bg-green-400/60',
                          )} />
                          <span className="min-w-0">
                            <span className="font-medium text-app-text-secondary/80">{step.agent}</span>
                            <span className="ml-1">{step.action}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </details>
                )
              )}
            </div>
          );
        })}
      </div>

      {/* Progress bar (only when running) */}
      {isRunning && stages.length > 0 && (
        <div className="mt-2">
          <div className="flex justify-between text-[10px] text-app-text-tertiary mb-1">
            <span>{completedCount}/{stages.length} 阶段</span>
            <span>{stages.find(s => s.agent === currentStage)?.label || ''}</span>
          </div>
          <div className="h-1 bg-app-border/20 rounded-full overflow-hidden">
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
