import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { cn } from '../../utils/helpers';
import { useConversationStore } from '../../stores/useConversationStore';
import { useAuthStore } from '../../stores/useAuthStore';
import {
  Search, Plus, MessageSquare, PanelLeftClose, PanelLeft,
  Pin, PinOff, Trash2, ChevronDown, Loader2
} from 'lucide-react';
import type { ChatConversationSummary } from '../../services/api';
import { useUIStore } from '../../stores/useUIStore';

interface ConversationHistoryProps {
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

interface ConversationGroup {
  label: string;
  items: ChatConversationSummary[];
}

function groupByDate(conversations: ChatConversationSummary[]): ConversationGroup[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterday = today - 86400000;
  const thisWeek = today - 6 * 86400000;
  const thisMonth = today - 29 * 86400000;

  const groups: ConversationGroup[] = [];

  // 按置顶和非置顶分组
  const pinnedItems = conversations.filter(m => m.is_pinned);
  const unpinnedItems = conversations.filter(m => !m.is_pinned);

  // 置顶组
  if (pinnedItems.length > 0) {
    groups.push({ label: '置顶', items: pinnedItems });
  }

  // 非置顶按时间分组
  const todayItems = unpinnedItems.filter(m => new Date(m.updated_at).getTime() >= today);
  const yesterdayItems = unpinnedItems.filter(m => {
    const t = new Date(m.updated_at).getTime();
    return t >= yesterday && t < today;
  });
  const weekItems = unpinnedItems.filter(m => {
    const t = new Date(m.updated_at).getTime();
    return t >= thisWeek && t < yesterday;
  });
  const monthItems = unpinnedItems.filter(m => {
    const t = new Date(m.updated_at).getTime();
    return t >= thisMonth && t < thisWeek;
  });
  const olderItems = unpinnedItems.filter(m => new Date(m.updated_at).getTime() < thisMonth);

  if (todayItems.length) groups.push({ label: '今天', items: todayItems });
  if (yesterdayItems.length) groups.push({ label: '昨天', items: yesterdayItems });
  if (weekItems.length) groups.push({ label: '近 7 天', items: weekItems });
  if (monthItems.length) groups.push({ label: '近 30 天', items: monthItems });
  if (olderItems.length) groups.push({ label: '更早', items: olderItems });

  return groups;
}

export function ConversationHistory({
  onSelectSession,
  onNewSession,
  collapsed = false,
  onToggleCollapse,
}: ConversationHistoryProps) {
  const conversationId = useConversationStore((s) => s.conversationId);
  const conversations = useConversationStore((s) => s.conversations);
  const isLoading = useConversationStore((s) => s.isLoadingConversations);
  const isLoadingMore = useConversationStore((s) => s.isLoadingMore);
  const hasMore = useConversationStore((s) => s.hasMore);
  const searchQuery = useConversationStore((s) => s.searchQuery);
  const loadConversations = useConversationStore((s) => s.loadConversations);
  const loadMoreConversations = useConversationStore((s) => s.loadMoreConversations);
  const deleteConversation = useConversationStore((s) => s.deleteConversation);
  const pinConversation = useConversationStore((s) => s.pinConversation);
  const setSearchQuery = useConversationStore((s) => s.setSearchQuery);

  const showToast = useUIStore((s) => s.showToast);

  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 修复 BUG-19：见下方无限滚动 useEffect 中的说明
  const loadMoreConversationsRef = useRef(loadMoreConversations);
  useEffect(() => { loadMoreConversationsRef.current = loadMoreConversations; }, [loadMoreConversations]);

  // 初始加载 + 监听用户切换重新加载（防止切换账号后看到上一个用户的对话列表）
  const currentUserId = useAuthStore((s) => s.user?.id ?? null);
  useEffect(() => {
    // 用户切换时，重置本地搜索框状态（避免残留上一个用户的搜索词）
    setLocalSearchQuery('');
    loadConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId]);

  // 防抖搜索
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      setSearchQuery(localSearchQuery);
      loadConversations({ searchQuery: localSearchQuery });
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [localSearchQuery]);

  // 无限滚动检测
  useEffect(() => {
    const list = listRef.current;
    if (!list || !hasMore || isLoadingMore) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = list;
      if (scrollHeight - scrollTop - clientHeight < 100) {
        // 修复 BUG-19：loadMoreConversations 来自 zustand selector，
        // 每次 store 更新都会返回新引用（无 useShallow），导致外层 useEffect
        // 重跑重绑监听。用 ref 持有稳定引用。
        loadMoreConversationsRef.current();
      }
    };

    list.addEventListener('scroll', handleScroll);
    return () => list.removeEventListener('scroll', handleScroll);
  }, [hasMore, isLoadingMore]);

  const filtered = useMemo(() => {
    if (!localSearchQuery.trim()) return conversations;
    const q = localSearchQuery.toLowerCase();
    return conversations.filter(c => c.title.toLowerCase().includes(q));
  }, [conversations, localSearchQuery]);

  const groups = useMemo(() => groupByDate(filtered), [filtered]);

  const handleSelect = useCallback((id: string) => {
    onSelectSession(id);
  }, [onSelectSession]);

  const handleNewConversation = useCallback(() => {
    onNewSession();
  }, [onNewSession]);

  const handlePin = useCallback(async (e: React.MouseEvent, id: string, currentPinned: boolean) => {
    e.stopPropagation();
    await pinConversation(id, !currentPinned, {
      showErrorToast: (msg) => showToast(msg, 'error'),
    });
  }, [pinConversation, showToast]);

  const handleDelete = useCallback(async (e: React.MouseEvent, id: string, title?: string) => {
    e.stopPropagation();
    const ok = await deleteConversation(id, {
      showErrorToast: (msg) => showToast(msg, 'error'),
    });
    if (ok) {
      // 删除成功：给用户一个明确反馈。不再提供撤销按钮。
      showToast(`"${title || '对话'}" 已删除`, 'info');
    }
  }, [deleteConversation, showToast]);

  // 折叠状态
  if (collapsed) {
    return (
      <aside className="flex flex-col h-full overflow-hidden border-r border-app-border bg-app-surface items-center py-3 gap-2">
        <button
          onClick={handleNewConversation}
          className="w-10 h-10 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center hover:bg-primary-500/20 transition-colors"
          title="新对话"
        >
          <Plus className="w-4 h-4 text-primary-400" />
        </button>
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-app-text-tertiary hover:text-app-text hover:bg-app-hover transition-colors"
            title="展开侧边栏"
          >
            <PanelLeft className="w-4 h-4" />
          </button>
        )}
      </aside>
    );
  }

  return (
    <aside className="flex flex-col h-full overflow-hidden border-r border-app-border bg-app-surface">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2.5 border-b border-app-border">
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="w-7 h-7 rounded-md flex items-center justify-center text-app-text-tertiary hover:text-app-text hover:bg-app-hover transition-colors flex-shrink-0"
            title="收起侧边栏"
          >
            <PanelLeftClose className="w-3.5 h-3.5" />
          </button>
        )}
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-app-text-tertiary pointer-events-none" />
          <input
            value={localSearchQuery}
            onChange={(e) => setLocalSearchQuery(e.target.value)}
            placeholder="搜索对话"
            className="w-full h-8 rounded-lg border border-app-border bg-app-elevated pl-8 pr-3 text-xs text-app-text placeholder:text-app-text-tertiary outline-none focus:border-primary-500/50 transition-colors"
          />
        </div>
        <button
          onClick={handleNewConversation}
          className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary-500 hover:bg-primary-400 flex items-center justify-center transition-colors"
          title="新对话"
        >
          <Plus className="w-4 h-4 text-white" />
        </button>
      </div>

      {/* Conversation list */}
      <div ref={listRef} className="flex-1 overflow-y-auto py-2">
        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 text-app-text-tertiary animate-spin" />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && groups.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <MessageSquare className="w-8 h-8 text-app-text-tertiary mb-2" />
            <p className="text-xs text-app-text-tertiary">
              {localSearchQuery ? '未找到匹配的对话' : '暂无对话历史'}
            </p>
            {!localSearchQuery && (
              <p className="text-[10px] text-app-text-tertiary mt-1">发送消息开启新的对话</p>
            )}
          </div>
        )}

        {/* Groups */}
        {groups.map((group) => (
          <div key={group.label}>
            <div className="px-4 py-1.5 flex items-center gap-1">
              <span className="text-[10px] font-medium text-app-text-tertiary uppercase tracking-wider">
                {group.label}
              </span>
              <span className="text-[10px] text-app-text-tertiary/50">{group.items.length}</span>
            </div>
            {group.items.map((conv) => (
              <div
                key={conv.id}
                onMouseEnter={() => setHoveredId(conv.id)}
                onMouseLeave={() => setHoveredId(null)}
                className="group"
              >
                {/* 选中对话的容器：使用 div+role=button 而非嵌套 <button>
                    否则内部的置顶/删除按钮（也是 <button>）会触发 HTML 嵌套错误 */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => handleSelect(conv.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSelect(conv.id);
                    }
                  }}
                  className={cn(
                    'w-full text-left px-4 py-2 transition-colors border-l-2 flex items-start gap-2 cursor-pointer',
                    conv.id === conversationId
                      ? 'bg-primary-500/10 border-l-primary-500'
                      : 'border-l-transparent hover:bg-app-hover'
                  )}
                >
                  {/* 主内容 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {/* 置顶图标 */}
                      {conv.is_pinned && (
                        <Pin className="w-3 h-3 text-amber-500 flex-shrink-0" />
                      )}
                      <p className="text-xs font-medium text-app-text truncate">
                        {conv.title || '新对话'}
                      </p>
                    </div>
                    <p className="text-[10px] text-app-text-tertiary truncate mt-0.5">
                      {conv.last_message
                        ? conv.last_message.content.slice(0, 40)
                        : `${conv.message_count} 条消息`}
                    </p>
                  </div>

                  {/* 操作按钮 */}
                  <div
                    className={cn(
                      'flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0',
                      conv.id === conversationId && 'opacity-100'
                    )}
                  >
                    {/* 置顶/取消置顶 */}
                    <button
                      onClick={(e) => handlePin(e, conv.id, conv.is_pinned)}
                      className={cn(
                        'w-6 h-6 rounded flex items-center justify-center transition-colors',
                        conv.is_pinned
                          ? 'text-amber-500 hover:bg-amber-500/20'
                          : 'text-app-text-tertiary hover:text-amber-500 hover:bg-amber-500/10'
                      )}
                      title={conv.is_pinned ? '取消置顶' : '置顶'}
                    >
                      {conv.is_pinned ? (
                        <PinOff className="w-3 h-3" />
                      ) : (
                        <Pin className="w-3 h-3" />
                      )}
                    </button>

                    {/* 删除 */}
                    <button
                      onClick={(e) => handleDelete(e, conv.id)}
                      className="w-6 h-6 rounded flex items-center justify-center text-app-text-tertiary hover:text-red-500 hover:bg-red-500/10 transition-colors"
                      title="删除"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}

        {/* Load more */}
        {hasMore && !isLoading && (
          <div className="px-4 py-3 flex justify-center">
            <button
              onClick={() => loadMoreConversations()}
              disabled={isLoadingMore}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-app-text-tertiary hover:text-app-text hover:bg-app-hover rounded-lg transition-colors disabled:opacity-50"
            >
              {isLoadingMore ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  加载中...
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3" />
                  加载更多
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Empty state hint */}
      {conversations.length === 0 && !localSearchQuery && !isLoading && (
        <div className="flex-shrink-0 px-4 py-3 border-t border-app-border">
          <p className="text-[10px] text-app-text-tertiary text-center">
            发送消息开始新的对话
          </p>
        </div>
      )}
    </aside>
  );
}
