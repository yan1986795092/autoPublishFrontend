import { useState, useEffect } from 'react';
import { ScrollArea } from '../ui/scroll-area';
import { cn } from '../../utils/helpers';
import { PANELS } from '../../config/layout';
import { Eye, Code2, Sparkles, Bot } from 'lucide-react';
import { useAgentStore } from '../../stores/useAgentStore';
import { AgentThinkingPanel } from './AgentThinkingPanel';
import { AgentLiveView } from './AgentLiveView';
import { AgentDebugView } from './AgentDebugView';
import { ResultPreview } from './ResultPreview';

type RightTab = 'preview' | 'trace' | 'debug';

const TAB_BUTTONS: { key: RightTab; label: string; icon: typeof Eye }[] = [
  { key: 'preview', label: '预览', icon: Eye },
  { key: 'trace', label: '思考链路', icon: Code2 },
  { key: 'debug', label: '调试', icon: Sparkles },
];

/** 空闲状态：无任务、无结果时显示的引导界面 */
function IdleState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center mb-4">
        <Bot className="w-7 h-7 text-blue-400" />
      </div>
      <h3 className="text-sm font-semibold text-app-text mb-1">创作中心</h3>
      <p className="text-xs text-app-text-secondary leading-relaxed max-w-[240px]">
        输入需求，Agent 团队将自动拆解任务并协作完成
      </p>
      <div className="mt-5 space-y-2 text-left w-full max-w-[240px]">
        <p className="text-[10px] text-app-text-tertiary uppercase tracking-wider">使用提示</p>
        <div className="space-y-2">
          {[
            { icon: '✏️', text: '直接描述你的创作需求' },
            { icon: '💬', text: '多轮对话迭代优化结果' },
            { icon: '⏱️', text: '运行时查看实时思考链路' },
          ].map((tip) => (
            <div
              key={tip.text}
              className="rounded-lg border border-app-border bg-app-elevated/60 p-2.5"
            >
              <p className="text-xs font-medium text-app-text">
                {tip.icon} {tip.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface AdvancedPanelProps {
  selectedPlatform?: string | null;
}

export function AdvancedPanel({ selectedPlatform }: AdvancedPanelProps) {
  const [activeTab, setActiveTab] = useState<RightTab>('preview');

  const isRunning = useAgentStore((s) => s.isRunning);
  const thinkingSteps = useAgentStore((s) => s.thinkingSteps);
  const currentResult = useAgentStore((s) => s.currentResult);
  const currentTaskId = useAgentStore((s) => s.currentTaskId);

  // Auto-switch tab based on agent state
  useEffect(() => {
    if (isRunning) {
      setActiveTab('trace');
    } else if (currentResult) {
      setActiveTab('preview');
    }
  }, [isRunning, currentResult]);

  const isIdle = !isRunning && !currentResult && !thinkingSteps.length;

  return (
    <div
      className="flex-shrink-0 border-l border-app-border overflow-hidden"
      style={{ width: PANELS.RIGHT_WIDTH }}
    >
      <div className="h-full flex flex-col">
        {/* Tab bar */}
        <div className="flex-shrink-0 border-b border-app-border px-2 py-2">
          <div className="flex items-center gap-1 rounded-lg bg-app-surface p-1">
            {TAB_BUTTONS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 rounded-md py-1.5 text-[11px] font-medium transition-colors',
                  activeTab === key
                    ? 'bg-app-elevated text-app-text shadow-sm'
                    : 'text-app-text-secondary hover:text-app-text'
                )}
              >
                <Icon className="w-3 h-3" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 p-4">
          {isIdle ? (
            <IdleState />
          ) : isRunning ? (
            <>
              {activeTab === 'trace' && (
                <AgentThinkingPanel
                  result={{
                    task_id: currentTaskId || '',
                    status: 'running',
                    agent_type: 'ManagerAgent',
                    output: {},
                    usage: { tokens_used: 0, estimated_cost: 0, time_elapsed: 0, model: '' },
                    thinking_trace: {
                      task_id: currentTaskId || '',
                      total_elapsed: 0,
                      steps: thinkingSteps,
                    },
                  }}
                />
              )}
              {activeTab === 'debug' && <AgentLiveView />}
              {activeTab === 'preview' && (
                <p className="text-xs text-app-text-tertiary text-center py-8">
                  内容生成中，完成后显示预览...
                </p>
              )}
            </>
          ) : (
            <>
              {activeTab === 'preview' && <ResultPreview result={currentResult} selectedPlatform={selectedPlatform ?? null} />}
              {activeTab === 'trace' && <AgentThinkingPanel result={currentResult} />}
              {activeTab === 'debug' && <AgentDebugView result={currentResult} />}
            </>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
