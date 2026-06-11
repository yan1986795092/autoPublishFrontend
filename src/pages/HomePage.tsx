import { useState, useCallback } from 'react';
import { useAgentStore } from '../stores/useAgentStore';
import { ConversationHistory } from '../components/layout/ConversationHistory';
import { Workspace } from '../components/agent/Workspace';

export function HomePage() {
  const conversationId = useAgentStore((s) => s.conversationId);
  const switchConversation = useAgentStore((s) => s.switchConversation);
  const createConversation = useAgentStore((s) => s.createConversation);
  const clearCurrent = useAgentStore((s) => s.clearCurrent);

  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

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
    </div>
  );
}
