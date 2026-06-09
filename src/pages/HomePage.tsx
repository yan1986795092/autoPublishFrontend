import { useState, useCallback } from 'react';
import { useAgentStore } from '../stores/useAgentStore';
import { ConversationHistory } from '../components/layout/ConversationHistory';
import { Workspace } from '../components/agent/Workspace';
import { DecisionDialog } from '../components/agent/DecisionDialog';
import { RecoveryDialog } from '../components/agent/RecoveryDialog';
import { ExecutionPlanEditor } from '../components/agent/ExecutionPlanEditor';
import { useExecutionEngine } from '../hooks/useExecutionEngine';

export function HomePage() {
  const conversationId = useAgentStore((s) => s.conversationId);
  const switchConversation = useAgentStore((s) => s.switchConversation);
  const createConversation = useAgentStore((s) => s.createConversation);
  const clearCurrent = useAgentStore((s) => s.clearCurrent);

  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [showPlanEditor, setShowPlanEditor] = useState(false);

  const {
    currentPlan, pendingDecision, recoveryState,
    currentTaskId, handleConfirmPlan,
    handleClearCurrent, handleClearDecision,
    handleRetryStep, handleSkipStep,
  } = useExecutionEngine('create');

  const handleSelectSession = useCallback(async (id: string) => {
    setActiveSessionId(id);
    if (id !== conversationId) {
      await switchConversation(id);
    }
  }, [conversationId, switchConversation]);

  const handleNewSession = useCallback(async () => {
    const newId = await createConversation();
    if (newId) {
      setActiveSessionId(newId);
      await switchConversation(newId);
    } else {
      clearCurrent();
      setActiveSessionId(null);
    }
  }, [createConversation, switchConversation, clearCurrent]);

  const handleDecisionSubmitLocal = useCallback(
    async (_taskId: string, data: { decision_id: string; choice: string; text?: string }) => {
      const store = useAgentStore.getState();
      if (store.pendingDecision && store.pendingDecision.decision_id === data.decision_id) {
        store.submitDecision(_taskId, data);
      }
    },
    [],
  );

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: Conversation History */}
      <div className="w-[260px] flex-shrink-0 hidden md:flex relative z-10">
        <ConversationHistory
          activeSessionId={activeSessionId}
          onSelectSession={handleSelectSession}
          onNewSession={handleNewSession}
        />
      </div>

      {/* Right: Workspace */}
      <div className="flex-1 min-w-0 relative z-0">
        <Workspace />
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
