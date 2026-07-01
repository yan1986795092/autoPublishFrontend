import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  // < 768px: 左栏隐藏（单栏），通过 mobile 浮层打开
  // 768-1279px: 左栏 icon-only (64px)
  // >= 1280px: 左栏全宽 (260px) + 右栏可折叠
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightOpen, setRightOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Esc 关闭 mobile sidebar
  useEffect(() => {
    if (!mobileSidebarOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileSidebarOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [mobileSidebarOpen]);

  const handleSelectSession = useCallback(async (id: string) => {
    if (id !== conversationId) {
      await switchConversation(id);
    }
    // 移动端选完关闭浮层
    setMobileSidebarOpen(false);
  }, [conversationId, switchConversation]);

  const handleNewSession = useCallback(async () => {
    const newId = await createConversation();
    if (newId) {
      await switchConversation(newId);
    } else {
      clearMessages();
    }
    setMobileSidebarOpen(false);
  }, [createConversation, switchConversation, clearMessages]);

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: Conversation History (md+ 固定可见) */}
      <div
        className={cn(
          'relative z-10 transition-all duration-200 ease-smooth',
          'hidden md:flex flex-shrink-0',
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

      {/* 修复 BUG-11：mobile (<md) 浮层抽屉 — 此前窄屏完全无入口 */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <>
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileSidebarOpen(false)}
              className="fixed left-0 right-0 bottom-0 z-40 bg-black/50 backdrop-blur-sm md:hidden top-[52px]"
              aria-hidden
            />
            <motion.div
              key="drawer"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed left-0 z-50 w-[280px] shadow-2xl md:hidden top-[52px] bottom-0"
              role="dialog"
              aria-label="对话历史"
            >
              <ConversationHistory
                onSelectSession={handleSelectSession}
                onNewSession={handleNewSession}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Center: Workspace */}
      <div className="flex-1 min-w-0 relative z-0 flex flex-col">
        <Workspace
          rightPanelOpen={rightOpen}
          onToggleRightPanel={() => setRightOpen(o => !o)}
          mobileSidebarOpen={mobileSidebarOpen}
          onToggleMobileSidebar={() => setMobileSidebarOpen(o => !o)}
        />
      </div>
    </div>
  );
}
