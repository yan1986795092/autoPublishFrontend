import { useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAgentStore } from '../stores/useAgentStore';
import { ConversationHistory } from '../components/layout/ConversationHistory';
import { Workspace } from '../components/agent/Workspace';
import { DecisionDialog } from '../components/agent/DecisionDialog';
import { RecoveryDialog } from '../components/agent/RecoveryDialog';
import { ExecutionPlanEditor } from '../components/agent/ExecutionPlanEditor';
import { useExecutionEngine } from '../hooks/useExecutionEngine';

export function HomePage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [showPlanEditor, setShowPlanEditor] = useState(false);

  const {
    currentPlan, pendingDecision, recoveryState,
    currentTaskId, handleConfirmPlan,
    handleClearCurrent, handleClearDecision,
  } = useExecutionEngine('create');

  const handleNewSession = useCallback(() => {
    handleClearCurrent();
    setActiveSessionId(null);
  }, [handleClearCurrent]);

  const handleDecisionSubmitLocal = useCallback(
    async (taskId: string, data: { decision_id: string; choice: string; text?: string }) => {
      const store = useAgentStore.getState();
      if (store.pendingDecision && store.pendingDecision.decision_id === data.decision_id) {
        store.submitDecision(data);
      }
    },
    [],
  );

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: Conversation History */}
      <div className="w-[260px] flex-shrink-0 hidden md:flex">
        <ConversationHistory
          activeSessionId={activeSessionId}
          onSelectSession={setActiveSessionId}
          onNewSession={handleNewSession}
        />
      </div>

      {/* Right: Workspace */}
      <div className="flex-1 min-w-0">
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
        onRetry={async () => {}}
        onSkip={async () => {}}
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
