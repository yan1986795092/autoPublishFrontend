import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { useAgentStore } from '../../stores/useAgentStore';
import { cn } from '../../utils/helpers';
import { Send, Square, Eye, Bot, X } from 'lucide-react';
import { SkillSelector } from '../skill/SkillSelector';
import { TaskProgressBar } from './TaskProgressBar';
import { GenerationHistory } from './GenerationHistory';
import { QuickTemplates } from './StudioComponents';

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m${s}s`;
}

interface StudioPanelProps {
  prompt: string;
  setPrompt: (v: string) => void;
  isRunning: boolean;
  runningTime: number;
  appliedSkill: ReturnType<typeof useAgentStore.getState>['appliedSkill'];
  appliedSkillFull: ReturnType<typeof useAgentStore.getState>['appliedSkillFull'];
  currentTask: ReturnType<typeof useAgentStore.getState>['currentTask'];
  currentPlan: ReturnType<typeof useAgentStore.getState>['currentPlan'];
  previousGenerations: ReturnType<typeof useAgentStore.getState>['previousGenerations'];
  useStreaming: boolean;
  setUseStreaming: (v: boolean) => void;
  handleDirectExecute: () => void;
  handlePreviewPlan: () => void;
  handleSetAppliedSkill: ReturnType<typeof useAgentStore.getState>['setAppliedSkill'];
  handleClearCurrent: () => void;
  handleStop: () => void;
  onShowPlanEditor?: () => void;
}

export function StudioPanel({
  prompt,
  setPrompt,
  isRunning,
  runningTime,
  appliedSkill,
  appliedSkillFull,
  currentTask,
  currentPlan,
  previousGenerations,
  useStreaming,
  setUseStreaming,
  handleDirectExecute,
  handlePreviewPlan,
  handleSetAppliedSkill,
  handleClearCurrent,
  handleStop,
}: StudioPanelProps) {
  const [textareaRef, setTextareaRef] = useState<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    textareaRef?.focus();
  }, [textareaRef]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-app-border">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-semibold text-app-text">创作中心</span>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        <div className="space-y-2">
          <textarea
            ref={setTextareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleDirectExecute();
            }}
            placeholder="输入需求，Agent 团队将协作完成..."
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
                <Button
                  onClick={handlePreviewPlan}
                  disabled={!prompt.trim()}
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs px-2"
                >
                  <Eye className="w-3 h-3 mr-1" /> 预览计划
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Applied skill indicator */}
        {appliedSkill && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-blue-500/30 bg-blue-500/5">
            <span className="text-sm">{appliedSkillFull?.icon || '✨'}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-blue-300 truncate">{appliedSkill.skill_name}</p>
              <p className="text-[9px] text-blue-400/60">Skill 已应用</p>
            </div>
            <button
              onClick={() => handleSetAppliedSkill(null, null)}
              className="p-1 text-blue-400/60 hover:text-blue-300 transition-colors"
              title="移除 Skill"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Skill selector */}
        <SkillSelector onApply={(applied, full) => {
          handleSetAppliedSkill(applied, full);
        }} />

        <QuickTemplates onSelect={(t) => setPrompt(t)} />

        {isRunning && currentTask && (
          <div className="space-y-2">
            <TaskProgressBar task={currentTask} />
            {currentPlan && (
              <div className="rounded-lg border border-app-border bg-app-surface p-3 space-y-2">
                <div className="text-[10px] text-app-text-tertiary font-medium">执行计划进度</div>
                <div className="space-y-1">
                  {currentPlan.tasks.map((task, i) => {
                    const isDone = i < currentTask.completed_steps;
                    const isCurrent = i === currentTask.completed_steps;
                    return (
                      <div key={i} className="flex items-center gap-2 text-[10px]">
                        <div className={cn(
                          'w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold flex-shrink-0',
                          isDone ? 'bg-green-500/20 text-green-400' :
                          isCurrent ? 'bg-blue-500/20 text-blue-400' :
                          'bg-app-border text-app-text-tertiary'
                        )}>
                          {isDone ? '✓' : i + 1}
                        </div>
                        <span className={cn(isDone && 'text-app-text-tertiary')}>
                          {task.agent_type.replace('Agent', '')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {!isRunning && previousGenerations.length > 0 && (
          <GenerationHistory generations={previousGenerations} />
        )}
      </div>

      <div className="border-t border-app-border px-4 py-2">
        <div className="flex items-center justify-between text-[10px] text-app-text-tertiary">
          <span>{isRunning ? `运行中 ${formatDuration(runningTime)}` : '就绪'}</span>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <Switch checked={useStreaming} onCheckedChange={setUseStreaming} />
            <span>SSE 流式</span>
          </label>
        </div>
      </div>
    </div>
  );
}
