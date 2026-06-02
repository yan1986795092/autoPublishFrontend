import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScrollArea } from '../ui/scroll-area';
import { cn } from '../../utils/helpers';
import { Eye, Code2, Sparkles, X } from 'lucide-react';
import { useAgentStore } from '../../stores/useAgentStore';
import { AgentThinkingPanel } from './AgentThinkingPanel';
import { AgentLiveView } from './AgentLiveView';
import { AgentDebugView } from './AgentDebugView';
import { ResultPreview } from './ResultPreview';

const PANEL_WIDTH = 420;

type RightTab = 'preview' | 'trace' | 'debug';

interface AdvancedPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdvancedPanel({ isOpen, onClose }: AdvancedPanelProps) {
  const [activeTab, setActiveTab] = useState<RightTab>('preview');

  const isRunning = useAgentStore((s) => s.isRunning);
  const thinkingSteps = useAgentStore((s) => s.thinkingSteps);
  const currentResult = useAgentStore((s) => s.currentResult);
  const currentTaskId = useAgentStore((s) => s.currentTaskId);

  const tabButtons: { key: RightTab; label: string; icon: typeof Eye }[] = [
    { key: 'preview', label: '预览', icon: Eye },
    { key: 'trace', label: '思考链路', icon: Code2 },
    { key: 'debug', label: '调试', icon: Sparkles },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="advanced-panel"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: PANEL_WIDTH, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          className="flex-shrink-0 border-l border-app-border overflow-hidden"
        >
          <div style={{ width: PANEL_WIDTH }} className="h-full flex flex-col">
            {/* Tab bar */}
            <div className="flex-shrink-0 border-b border-app-border px-2 py-2">
              <div className="flex items-center gap-1 rounded-lg bg-app-surface p-1">
                {tabButtons.map(({ key, label, icon: Icon }) => (
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
                <button
                  onClick={onClose}
                  className="px-1 text-app-text-tertiary hover:text-app-text transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <ScrollArea className="flex-1 p-4">
              {isRunning ? (
                activeTab === 'trace' ? (
                  <AgentThinkingPanel
                    result={{
                      task_id: currentTaskId || '',
                      status: 'running',
                      agent_type: 'ManagerAgent',
                      output: {},
                      usage: { tokens_used: 0, estimated_cost: 0, time_elapsed: 0, model: '' },
                      thinking_trace: { task_id: currentTaskId || '', total_elapsed: 0, steps: thinkingSteps },
                    }}
                  />
                ) : activeTab === 'debug' ? (
                  <AgentLiveView />
                ) : (
                  <p className="text-xs text-app-text-tertiary text-center py-8">内容生成中，完成后显示预览...</p>
                )
              ) : (
                <>
                  {activeTab === 'preview' && <ResultPreview result={currentResult} />}
                  {activeTab === 'trace' && <AgentThinkingPanel result={currentResult} />}
                  {activeTab === 'debug' && <AgentDebugView result={currentResult} />}
                </>
              )}
            </ScrollArea>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
