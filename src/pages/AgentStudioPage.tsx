import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../components/ui/button';
import { ScrollArea } from '../components/ui/scroll-area';
import { useAgentStore } from '../stores/useAgentStore';
import { useUIStore } from '../stores/useUIStore';
import { useWebSocketAgent } from '../hooks/useWebSocketAgent';
import { cn } from '../utils/helpers';
import { AgentThinkingStream } from '../components/agent/AgentThinkingStream';
import {
  Send, Square, Code2, Sparkles,
  Bot, ChevronRight, X,
} from 'lucide-react';
import type { ExecutionPlan, ChatMessage } from '../types';
import { AgentThinkingPanel } from '../components/agent/AgentThinkingPanel';
import { AgentLiveView } from '../components/agent/AgentLiveView';
import { AgentDebugView } from '../components/agent/AgentDebugView';
import { Switch } from '../components/ui/switch';
import { SkillSelector } from '../components/skill/SkillSelector';
import { TaskProgressBar } from '../components/agent/TaskProgressBar';
import { ResultPreview } from '../components/agent/ResultPreview';
import { GenerationHistory } from '../components/agent/GenerationHistory';
import { EmptyStudioState, QuickTemplates, PlanProgressStrip, PlanSummaryCard, ResultSection } from '../components/agent/StudioComponents';

const PANEL_LEFT_WIDTH = 360;
const PANEL_RIGHT_WIDTH = 420;

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m${s}s`;
}

export function AgentStudioPage() {
  const {
    currentTaskId, currentTask, currentResult, currentPlan,
    isRunning,
    thinkingSteps, previousGenerations,
    addMessage,
    runAsync, runStreaming,
    cancelTask,
    disconnectWebSocket, clearCurrent,
    loadTaskStatus,
    appliedSkill, appliedSkillFull,
    setAppliedSkill,
  } = useAgentStore();

  const showToast = useUIStore((s) => s.showToast);

  const [prompt, setPrompt] = useState('');
  const [runningTime, setRunningTime] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeRightTab, setActiveRightTab] = useState<'preview' | 'trace' | 'debug'>('preview');
  const [panelCollapsed, setPanelCollapsed] = useState({ left: false, right: false });
  const [useStreaming, setUseStreaming] = useState(true);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Enrich prompt with skill template + content type context
  // Note: For streaming mode, skill_id is sent separately and skill_system_prompt
  // is injected by the backend. For non-streaming mode, we enrich here (but skill
  // is not loaded server-side in that path, so this mainly applies content config).
  const enrichPrompt = useCallback((text: string) => {
    const parts: string[] = [];

    // Skill: only apply template (not system_prompt — that's injected server-side)
    const skill = appliedSkillFull;
    if (skill) {
      if (skill.user_prompt_template) {
        // Replace placeholders in template
        let template = skill.user_prompt_template;
        template = template.replace(/\{topic\}/g, text.split('\n')[0]);
        template = template.replace(/\{content\}/g, text);
        return template;
      }
      // No template but has system_prompt → pass through; backend handles injection
      return text;
    }

    // Content type config (fallback when no skill)
    const config = useAgentStore.getState().contentTypeConfig;
    if (config && config.type !== 'auto') {
      const typeParts = [`[内容类型: ${config.type}]`];
      if (config.style) typeParts.push(`[写作风格: ${config.style}]`);
      if (config.length) typeParts.push(`[篇幅: ${config.length}]`);
      const enabled = Object.entries(config.features || {})
        .filter(([, v]) => v)
        .map(([k]) => k);
      if (enabled.length > 0) typeParts.push(`[附加功能: ${enabled.join(', ')}]`);
      parts.push(...typeParts);
    }

    return parts.length > 0 ? `${text}\n\n${parts.join('\n')}` : text;
  }, [appliedSkillFull]);

  useEffect(() => { inputRef.current?.focus(); }, []);

  // Mount: restore task from URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const taskId = params.get('taskId');
    if (taskId) {
      loadTaskStatus(taskId);
      showToast('正在恢复任务状态...', 'info');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally runs once on mount

  // Running timer
  useEffect(() => {
    if (!isRunning) { setRunningTime(0); return; }
    const start = Date.now();
    const timer = setInterval(() => setRunningTime(Math.round((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [isRunning]);

  // WebSocket fallback (仅非 streaming 模式)
  useWebSocketAgent(currentTaskId, { enabled: !useStreaming });

  // Direct execute
  const handleDirectExecute = useCallback(async () => {
    if (!prompt.trim()) return;

    const text = enrichPrompt(prompt.trim());

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: prompt.trim(),
      timestamp: Date.now(),
    };
    addMessage(userMsg);

    if (useStreaming) {
      await runStreaming(text);
    } else {
      const taskId = await runAsync(text);
      if (!taskId) showToast('提交任务失败', 'error');
    }
  }, [prompt, enrichPrompt, runAsync, runStreaming, useStreaming, addMessage, showToast]);

  // Stop
  const handleStop = useCallback(() => {
    if (currentTaskId) cancelTask(currentTaskId);
    disconnectWebSocket();
    showToast('任务已终止', 'info');
  }, [currentTaskId, cancelTask, disconnectWebSocket, showToast]);

  // Copy
  const handleCopy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId('main');
      setTimeout(() => setCopiedId(null), 2000);
    } catch { /* fallback */ }
  }, []);

  return (
    <div className="flex h-full gap-0">
      {/* ── Left Panel: Input + Config ── */}
      <AnimatePresence>
        {!panelCollapsed.left && (
          <motion.div
            key="left-panel"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: PANEL_LEFT_WIDTH, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="flex-shrink-0 border-r border-app-border overflow-hidden"
          >
            <div style={{ width: PANEL_LEFT_WIDTH }} className="h-full flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b border-app-border">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-semibold text-app-text">Agent 工场</span>
                </div>
                <button
                  onClick={() => setPanelCollapsed(p => ({ ...p, left: true }))}
                  className="text-app-text-tertiary hover:text-app-text"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-auto p-4 space-y-4">
                <div className="space-y-2">
                  <textarea
                    ref={inputRef}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleDirectExecute();
                    }}
                    placeholder="输入需求，Agent 团队将协作完成...&#10;&#10;例如：写一篇关于 AI 编程趋势的公众号文章"
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
                      onClick={() => setAppliedSkill(null, null)}
                      className="p-1 text-blue-400/60 hover:text-blue-300 transition-colors"
                      title="移除 Skill"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Skill selector */}
                <SkillSelector onApply={(applied, full) => {
                  setAppliedSkill(applied, full);
                }} />

                <QuickTemplates onSelect={(t) => setPrompt(t)} />

                {isRunning && currentTask && (
                  <div className="space-y-2">
                    <TaskProgressBar task={currentTask} />
                    {currentPlan && (
                      <PlanProgressStrip plan={currentPlan} currentTask={currentTask} />
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
          </motion.div>
        )}
      </AnimatePresence>

      {panelCollapsed.left && (
        <button
          onClick={() => setPanelCollapsed(p => ({ ...p, left: false }))}
          className="flex-shrink-0 w-8 border-r border-app-border flex items-center justify-center text-app-text-tertiary hover:text-app-text hover:bg-app-hover transition-colors"
        >
          <Bot className="w-4 h-4" />
        </button>
      )}

      {/* ── Center: Execution + Result ── */}
      <div className="flex-1 min-w-0 flex flex-col">
        {isRunning && (
          <div className="flex-shrink-0 border-b border-app-border bg-app-surface/50 px-4 py-2">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-xs font-medium text-app-text">Agent 执行中</span>
              {currentTask && (
                <span className="text-xs text-app-text-secondary">{currentTask.progress_message || currentTask.current_step}</span>
              )}
              <span className="ml-auto text-xs text-app-text-tertiary font-mono">{formatDuration(runningTime)}</span>
            </div>
          </div>
        )}

        <ScrollArea className="flex-1">
          <div className="p-6">
            {!isRunning && !currentResult && !currentPlan && (
              <EmptyStudioState onSelect={(s) => setPrompt(s)} />
            )}

            {currentPlan && !isRunning && !currentResult && (
              <PlanSummaryCard plan={currentPlan} onStart={handleDirectExecute} />
            )}

            {isRunning && thinkingSteps.length > 0 && (
              <div className="max-w-2xl mx-auto space-y-3">
                <AgentThinkingPanel
                  result={{
                    task_id: currentTaskId || '',
                    status: 'running',
                    agent_type: 'ManagerAgent',
                    output: {},
                    usage: { tokens_used: 0, estimated_cost: 0, time_elapsed: runningTime, model: '' },
                    agent_events: { events: [] },
                  }}
                  thinkingSteps={thinkingSteps}
                />
              </div>
            )}

            {currentResult && (
              <div className="max-w-2xl mx-auto space-y-4">
                <ResultSection result={currentResult} copiedId={copiedId} onCopy={handleCopy} />
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* ── Right Panel: Preview + Debug ── */}
      <AnimatePresence>
        {!panelCollapsed.right && (
          <motion.div
            key="right-panel"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: PANEL_RIGHT_WIDTH, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="flex-shrink-0 border-l border-app-border overflow-hidden"
          >
            <div style={{ width: PANEL_RIGHT_WIDTH }} className="h-full flex flex-col">
              <div className="flex-shrink-0 border-b border-app-border px-2 py-2">
                <div className="flex gap-1 rounded-lg bg-app-surface p-1">
                  {[
                    { key: 'preview', label: '预览', icon: Eye },
                    { key: 'trace', label: '思考链路', icon: Code2 },
                    { key: 'debug', label: '调试', icon: Sparkles },
                  ].map(({ key, label, icon: Icon }) => (
                    <button
                      key={key}
                      onClick={() => setActiveRightTab(key as typeof activeRightTab)}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-1.5 rounded-md py-1.5 text-[11px] font-medium transition-colors',
                        activeRightTab === key
                          ? 'bg-app-elevated text-app-text shadow-sm'
                          : 'text-app-text-secondary hover:text-app-text'
                      )}
                    >
                      <Icon className="w-3 h-3" />
                      {label}
                    </button>
                  ))}
                  <button
                    onClick={() => setPanelCollapsed(p => ({ ...p, right: true }))}
                    className="px-1 text-app-text-tertiary hover:text-app-text"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <ScrollArea className="flex-1 p-4">
                {isRunning ? (
                  activeRightTab === 'trace' ? (
                    <div className="h-[520px] rounded-lg overflow-hidden">
                      <AgentThinkingStream />
                    </div>
                  ) : activeRightTab === 'debug' ? (
                    <AgentLiveView />
                  ) : (
                    <p className="text-xs text-app-text-tertiary text-center py-8">内容生成中，完成后显示预览...</p>
                  )
                ) : (
                  <>
                    {activeRightTab === 'preview' && <ResultPreview result={currentResult} selectedPlatform={null} />}
                    {activeRightTab === 'trace' && (
                      currentResult?.agent_events?.events?.length ? <AgentThinkingStream /> : <AgentThinkingPanel result={currentResult} />
                    )}
                    {activeRightTab === 'debug' && <AgentDebugView result={currentResult} />}
                  </>
                )}
              </ScrollArea>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {panelCollapsed.right && (
        <button
          onClick={() => setPanelCollapsed(p => ({ ...p, right: false }))}
          className="flex-shrink-0 w-8 border-l border-app-border flex items-center justify-center text-app-text-tertiary hover:text-app-text hover:bg-app-hover transition-colors"
        >
          <Eye className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
