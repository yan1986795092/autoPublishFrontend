import { useState, useCallback } from 'react';
import { useConversationStore } from '../stores/useConversationStore';
import { ConversationHistory } from '../components/layout/ConversationHistory';
import { Workspace } from '../components/agent/Workspace';
import { cn } from '../utils/helpers';

export function HomePage() {
  const conversationId = useConversationStore((s) => s.conversationId);
  const switchConversation = useConversationStore((s) => s.switchConversation);
  const createConversation = useConversationStore((s) => s.createConversation);
  const clearMessages = useConversationStore((s) => s.clearMessages);

  // 三档布局状态
  // < 768px: 左栏隐藏（单栏）
  // 768-1279px: 左栏 icon-only (64px)
  // >= 1280px: 左栏全宽 (260px) + 右栏可折叠
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightOpen, setRightOpen] = useState(true);

  const handleSelectSession = useCallback(async (id: string) => {
    if (id !== conversationId) {
      await switchConversation(id);
    }
  }, [conversationId, switchConversation]);

  const handleNewSession = useCallback(async () => {
    const newId = await createConversation();
    if (newId) {
      await switchConversation(newId);
    } else {
      clearMessages();
    }
  }, [createConversation, switchConversation, clearMessages]);

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: Conversation History */}
      {/* 768px+: 左栏，折叠时 icon-only (64px)，展开时全宽 (260px) */}
      <div
        className={cn(
          'relative z-10 transition-all duration-200 ease-smooth',
          // Mobile: always hidden (shown via mobile nav)
          'hidden md:flex flex-shrink-0',
          // 折叠时 icon-only (64px)，展开时全宽 (260px)
          leftCollapsed ? 'w-[64px]' : 'w-[260px]',
        )}
      >
        <ConversationHistory
          onSelectSession={handleSelectSession}
          onNewSession={handleNewSession}
          onToggleCollapse={() => setLeftCollapsed(c => !c)}
          collapsed={leftCollapsed}
        />
      </div>

      {/* Center: Workspace */}
      <div className="flex-1 min-w-0 relative z-0 flex flex-col">
        <Workspace
          rightPanelOpen={rightOpen}
          onToggleRightPanel={() => setRightOpen(o => !o)}
        />
      </div>
    </div>
  );
}
