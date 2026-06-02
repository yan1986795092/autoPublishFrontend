import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAgentStore } from '../stores/useAgentStore';
import { useEditorStore } from '../stores/useEditorStore';
import { useUIStore } from '../stores/useUIStore';
import { useWorkspaceMode } from '../hooks/useWorkspaceMode';
import { useExecutionEngine } from '../hooks/useExecutionEngine';
import { ChatPanel } from '../components/agent/ChatPanel';
import { CreatePanel } from '../components/agent/CreatePanel';
import { StudioPanel } from '../components/agent/StudioPanel';
import { AdvancedPanel } from '../components/agent/AdvancedPanel';
import { ResultPanel } from '../components/result/ResultPanel';
import { DecisionDialog } from '../components/agent/DecisionDialog';
import { RecoveryDialog } from '../components/agent/RecoveryDialog';
import { ExecutionPlanEditor } from '../components/agent/ExecutionPlanEditor';
import { AgentThinkingPanel } from '../components/agent/AgentThinkingPanel';
import { Button } from '../components/ui/button';
import { cn } from '../utils/helpers';
import {
  Bot, History, RotateCcw, Keyboard,
  Sparkles, MessageSquare, PenLine, Cpu, ChevronRight,
} from 'lucide-react';

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m${seconds % 60}s`;
}

const MODE_TABS = [
  { key: 'chat' as const, label: '对话', icon: MessageSquare },
  { key: 'create' as const, label: '创作', icon: PenLine },
  { key: 'studio' as const, label: '专业', icon: Cpu },
];

const PANEL_LEFT_WIDTH = 360;

export function HomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useUIStore();
  const { mode, setMode } = useWorkspaceMode();
  const engine = useExecutionEngine(mode);

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showPlanEditor, setShowPlanEditor] = useState(false);

  const {
    prompt, setPrompt,
    runningTime, isRunning,
    currentResult, currentPlan, currentTaskId,
    thinkingSteps, previousGenerations,
    appliedSkill, appliedSkillFull,
    pendingDecision, recoveryState,
    useStreaming, setUseStreaming,
    handleDirectExecute, handlePreviewPlan, handleConfirmPlan,
    handleStop, handleRetryStep, handleSkipStep,
    handleClearCurrent, handleClearDecision,
    handleSetAppliedSkill,
  } = engine;

  const llmChunks = useAgentStore((s) => s.llmChunks);
  const messages = useAgentStore((s) => s.messages);
  const updateMessage = useAgentStore((s) => s.updateMessage);
  const loadTaskStatus = useAgentStore((s) => s.loadTaskStatus);
  const currentTask = useAgentStore((s) => s.currentTask);

  // Restore task from URL params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const taskId = params.get('taskId');
    if (taskId) {
      loadTaskStatus(taskId);
      showToast('正在恢复任务状态...', 'info');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Receive template prompt from TemplatePage
  useEffect(() => {
    const state = location.state as { templatePrompt?: string } | null;
    if (state?.templatePrompt) {
      setPrompt(state.templatePrompt);
      window.history.replaceState({}, document.title);
    }
  }, [location.state, setPrompt]);

  // Open plan editor when plan is generated (studio mode)
  useEffect(() => {
    if (currentPlan && mode === 'studio') {
      setShowPlanEditor(true);
    }
  }, [currentPlan, mode]);

  // Stream bridge for create mode: push content to editor store
  const accumulatedRef = { current: '' };
  const lastEventCountRef = { current: 0 };

  useEffect(() => {
    const streamEvents = useAgentStore.getState().streamEvents;
    if (streamEvents.length === 0) {
      accumulatedRef.current = '';
      lastEventCountRef.current = 0;
      if (!useEditorStore.getState().isDirty) {
        useEditorStore.getState().setContent('', '');
      }
      return;
    }

    let hasNewContent = false;
    for (let i = lastEventCountRef.current; i < streamEvents.length; i++) {
      const e = streamEvents[i];
      if (e.type === 'llm_chunk' && e.content) {
        accumulatedRef.current += e.content;
        hasNewContent = true;
      } else if (e.type === 'result') {
        const output = (e.data as any)?.output || {};
        const fullText = output.full_text || output.content || '';
        if (fullText) {
          accumulatedRef.current = fullText;
          hasNewContent = true;
        }
      }
    }
    lastEventCountRef.current = streamEvents.length;

    if (hasNewContent && accumulatedRef.current) {
      const state = useEditorStore.getState();
      if (!state.isDirty) {
        state.setContent(accumulatedRef.current, accumulatedRef.current);
      }
    }
  }, [mode]);
  const handleDecisionSubmitLocal = useCallback(
    async (taskId: string, data: { decision_id: string; choice: string; text?: string }) => {
      return engine.handleDecisionSubmit(taskId, data);
    },
    [engine],
  );

  const handleExecute = useCallback(async () => {
    if (!prompt.trim() || isRunning) return;
    if (mode === 'create') {
      useEditorStore.getState().setContent('', '');
      useEditorStore.getState().setDirty(false);
      accumulatedRef.current = '';
      lastEventCountRef.current = 0;
      showToast('Agent 开始执行...', 'info');
    }
    await engine.handleExecute(prompt.trim());
  }, [prompt, isRunning, mode, engine, showToast]);

  const handleNewSession = useCallback(() => {
    handleClearCurrent();
    setPrompt('');
    if (mode === 'create') {
      useEditorStore.getState().setContent('', '');
      useEditorStore.getState().setDirty(false);
      accumulatedRef.current = '';
      lastEventCountRef.current = 0;
    }
  }, [handleClearCurrent, setPrompt, mode]);

  const handleEditContent = useCallback(
    (contentId: string) => navigate(`/content/${contentId}`),
    [navigate],
  );

  const hasEvents = useAgentStore((s) => s.streamEvents.length) > 0;
  const isCreateMode = mode === 'create';

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header with mode tabs */}
      <div className="flex items-center justify-between flex-shrink-0 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-app-text">创作中心</h1>
            <p className="text-[11px] text-app-text-secondary">
              {isRunning ? (
                <span className="inline-flex items-center gap-1.5">
                  <motion.span
                    className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block"
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                  执行中 {formatDuration(runningTime)}
                </span>
              ) : (
                '输入需求，Agent 将协作完成'
              )}
            </p>
          </div>
        </div>

        {/* Mode tabs */}
        <div className="flex items-center gap-1 rounded-lg bg-app-surface p-1">
          {MODE_TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setMode(key)}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-200',
                mode === key
                  ? 'bg-app-elevated text-app-text shadow-sm'
                  : 'text-app-text-secondary hover:text-app-text hover:bg-app-hover'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5">
          {/* Advanced panel toggle — hidden in create mode (has ResultPanel) */}
          {!isCreateMode && (
            <Button
              variant={showAdvanced ? 'ghost' : 'outline'}
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="h-8 px-3 text-xs gap-1"
            >
              <Sparkles className="w-3.5 h-3.5" />
              高级
              {showAdvanced ? '' : <ChevronRight className="w-3 h-3" />}
            </Button>
          )}

          {/* History */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/content')}
            className="h-8 px-3 text-xs"
          >
            <History className="w-3.5 h-3.5 mr-1" />
            内容
          </Button>

          {hasEvents && !isRunning && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleNewSession}
              className="h-8 px-3 text-xs"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              新会话
            </Button>
          )}

          <button
            onClick={() => window.dispatchEvent(new CustomEvent('shortcut:toggle-help'))}
            className="p-1.5 rounded-md text-app-text-tertiary hover:text-app-text-secondary hover:bg-white/5 transition-colors"
            title="键盘快捷键"
          >
            <Keyboard className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex gap-0 min-h-0">
        {/* Left panel — mode-specific */}
        {mode !== 'studio' ? (
          <motion.div
            key={`left-${mode}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className={cn(
              'flex-shrink-0 border-r border-app-border overflow-hidden',
              mode === 'create' ? 'w-[42%]' : 'w-full max-w-[420px]'
            )}
          >
            {mode === 'chat' && (
              <ChatPanel
                prompt={prompt}
                setPrompt={setPrompt}
                runningTime={runningTime}
                isRunning={isRunning}
                thinkingSteps={thinkingSteps}
                llmChunks={llmChunks}
                pendingDecision={pendingDecision}
                currentTaskId={currentTaskId}
                handleExecute={(text) => engine.handleExecute(text)}
                handleStop={handleStop}
                handlePreviewPlan={handlePreviewPlan}
                handleDecisionSubmit={handleDecisionSubmitLocal}
                handleClearDecision={handleClearDecision}
                addMessage={engine.addMessage}
                messages={messages}
                updateMessage={updateMessage}
              />
            )}
            {mode === 'create' && (
              <CreatePanel
                prompt={prompt}
                setPrompt={setPrompt}
                isRunning={isRunning}
                runningTime={runningTime}
                previousGenerations={previousGenerations}
                handleExecute={handleExecute}
                handleStop={handleStop}
                handleNewSession={handleNewSession}
                handleEditContent={handleEditContent}
              />
            )}
          </motion.div>
        ) : (
          /* Studio mode: left panel (StudioPanel) + center + advanced */
          <motion.div
            key="left-studio"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-shrink-0 border-r border-app-border overflow-hidden"
            style={{ width: PANEL_LEFT_WIDTH }}
          >
            <StudioPanel
              prompt={prompt}
              setPrompt={setPrompt}
              isRunning={isRunning}
              runningTime={runningTime}
              appliedSkill={appliedSkill}
              appliedSkillFull={appliedSkillFull}
              currentTask={currentTask}
              currentPlan={currentPlan}
              previousGenerations={previousGenerations}
              useStreaming={useStreaming}
              setUseStreaming={setUseStreaming}
              handleDirectExecute={handleDirectExecute}
              handlePreviewPlan={handlePreviewPlan}
              handleSetAppliedSkill={handleSetAppliedSkill}
              handleClearCurrent={handleClearCurrent}
              handleStop={handleStop}
              onShowPlanEditor={() => setShowPlanEditor(true)}
            />
          </motion.div>
        )}

        {/* Divider — only for create mode */}
        {mode === 'create' && <div className="w-px bg-app-border flex-shrink-0" />}

        {/* Center + Right area */}
        <div className="flex-1 min-w-0 flex">
          {/* Center: content area */}
          {mode === 'studio' ? (
            <div className="flex-1 min-w-0 flex flex-col">
              {/* Running indicator */}
              {isRunning && (
                <div className="flex-shrink-0 border-b border-app-border bg-app-surface/50 px-4 py-2">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    <span className="text-xs font-medium text-app-text">Agent 执行中</span>
                    <span className="ml-auto text-xs text-app-text-tertiary font-mono">
                      {formatDuration(runningTime)}
                    </span>
                  </div>
                </div>
              )}
              <div className="flex-1 overflow-y-auto p-6">
                {isRunning && thinkingSteps.length > 0 && (
                  <div className="max-w-2xl mx-auto">
                    <AgentThinkingPanel
                      result={{
                        task_id: currentTaskId || '',
                        status: 'running',
                        agent_type: 'ManagerAgent',
                        output: {},
                        usage: { tokens_used: 0, estimated_cost: 0, time_elapsed: runningTime, model: '' },
                        thinking_trace: { task_id: currentTaskId || '', total_elapsed: runningTime, steps: thinkingSteps },
                      }}
                    />
                  </div>
                )}
                {!isRunning && !currentResult && (
                  <div className="max-w-lg mx-auto text-center py-20">
                    <div className="flex justify-center mb-4">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center">
                        <Bot className="w-8 h-8 text-blue-400" />
                      </div>
                    </div>
                    <h2 className="text-base font-semibold text-app-text mb-1">Agent 工场</h2>
                    <p className="text-xs text-app-text-secondary">Multi-Agent 协作，透明执行过程</p>
                  </div>
                )}
              </div>
            </div>
          ) : mode === 'chat' ? (
            /* chat mode: center shows nothing extra (ChatPanel handles it) */
            <div className="flex-1" />
          ) : null}

          {/* Right: ResultPanel (create) or AdvancedPanel (chat/studio) */}
          {isCreateMode ? (
            <div className="flex-1 min-w-0 rounded-xl border border-app-border bg-app-surface overflow-hidden">
              <ResultPanel />
            </div>
          ) : (
            <AdvancedPanel isOpen={showAdvanced} onClose={() => setShowAdvanced(false)} />
          )}
        </div>
      </div>

      {/* Global dialogs */}
      <DecisionDialog
        decision={pendingDecision}
        taskId={currentTaskId}
        onSubmit={handleDecisionSubmitLocal}
        onClose={handleClearDecision}
      />

      <RecoveryDialog
        recovery={recoveryState}
        onRetry={handleRetryStep}
        onSkip={handleSkipStep}
        onCancel={handleClearCurrent}
        onClose={handleClearCurrent}
      />

      {currentPlan && (
        <ExecutionPlanEditor
          plan={currentPlan}
          open={showPlanEditor}
          onConfirm={async (plan) => {
            setShowPlanEditor(false);
            await handleConfirmPlan(plan);
          }}
          onCancel={() => setShowPlanEditor(false)}
        />
      )}
    </div>
  );
}
