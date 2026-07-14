import { useRef, useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useConversationStore } from '../stores/useConversationStore';
import { useAuthStore } from '../stores/useAuthStore';
import { useUIStore } from '../stores/useUIStore';
import { ConversationHistory } from '../components/layout/ConversationHistory';
import { Workspace } from '../components/agent/Workspace';
import { cn } from '../utils/helpers';

export function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const conversationId = useConversationStore((s) => s.conversationId);
  const switchConversation = useConversationStore((s) => s.switchConversation);
  const createConversation = useConversationStore((s) => s.createConversation);
  const clearMessages = useConversationStore((s) => s.clearMessages);
  const loadConversations = useConversationStore((s) => s.loadConversations);
  const showToast = useUIStore((s) => s.showToast);

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

  // 集中触发一次对话列表加载（而非在 ConversationHistory 内部调用，避免移动端抽屉与桌面侧栏重复触发）
  const currentUserId = useAuthStore((s) => s.user?.id ?? null);
  const loadConvRef = useRef(loadConversations);
  useEffect(() => { loadConvRef.current = loadConversations; }, [loadConversations]);
  useEffect(() => {
    if (currentUserId) loadConvRef.current();
  }, [currentUserId]);

  // 修复 #9（URL 深链接）：页面加载时从 `?c=` 读取对话 ID 并切换
  // 用 ref 标记已处理，避免 StrictMode 下 effect 重复执行导致 switchConversation 重复触发
  const urlInitHandledRef = useRef(false);
  useEffect(() => {
    if (urlInitHandledRef.current) return;
    urlInitHandledRef.current = true;
    const cid = searchParams.get('c');
    if (cid && cid !== conversationId) {
      switchConversation(cid).catch(() => {});
    }
  }, [conversationId, switchConversation, searchParams]);

  // 修复 #9 + BUG-H：conversationId 变化时同步到 URL；
  // null 时也要清掉 URL（用户切账号 / 删除最后一个对话）
  useEffect(() => {
    if (conversationId) {
      if (searchParams.get('c') !== conversationId) {
        setSearchParams({ c: conversationId }, { replace: true });
      }
    } else if (searchParams.has('c')) {
      const next = new URLSearchParams(searchParams);
      next.delete('c');
      setSearchParams(next, { replace: true });
    }
  }, [conversationId, searchParams, setSearchParams]);

  // 修复 BUG-I：从 store 实时读取 conversationId 而非闭包旧值，
  // 避免快速切换时闭包过期导致不必要的 switchConversation 调用
  const handleSelectSession = useCallback(async (id: string) => {
    if (id !== useConversationStore.getState().conversationId) {
      await switchConversation(id);
    }
    // 移动端选完关闭浮层
    setMobileSidebarOpen(false);
  }, [switchConversation]);

  const handleNewSession = useCallback(async () => {
    // 修复 #10：失败时给 toast，不静默清空消息
    const newId = await createConversation();
    if (newId) {
      await switchConversation(newId);
    } else {
      showToast('创建对话失败，请检查网络后重试', 'error');
      // 注意：失败时不调用 clearMessages()，保留用户当前消息
    }
    setMobileSidebarOpen(false);
  }, [createConversation, switchConversation, showToast]);

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

      {/* 修复 BUG-11：mobile (<md) 浮层抽屉 — 此此前窄屏完全无入口 */}
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
