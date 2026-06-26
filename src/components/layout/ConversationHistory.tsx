import { useEffect, useState, useMemo } from 'react';
import { cn } from '../../utils/helpers';
import { useAgentStore } from '../../stores/useAgentStore';
import { Search, Plus, MessageSquare, PanelLeftClose, PanelLeft } from 'lucide-react';
import type { ChatConversationSummary } from '../../services/api';

interface ConversationHistoryProps {
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

function groupByDate(conversations: ChatConversationSummary[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterday = today - 86400000;
  const thisWeek = today - 6 * 86400000;
  const thisMonth = today - 29 * 86400000;

  const groups: { label: string; items: ChatConversationSummary[] }[] = [];
  const todayItems = conversations.filter(m => new Date(m.updated_at).getTime() >= today);
  const yesterdayItems = conversations.filter(m => {
    const t = new Date(m.updated_at).getTime();
    return t >= yesterday && t < today;
  });
  const weekItems = conversations.filter(m => {
    const t = new Date(m.updated_at).getTime();
    return t >= thisWeek && t < yesterday;
  });
  const monthItems = conversations.filter(m => {
    const t = new Date(m.updated_at).getTime();
    return t >= thisMonth && t < thisWeek;
  });
  const olderItems = conversations.filter(m => new Date(m.updated_at).getTime() < thisMonth);

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
  const [searchQuery, setSearchQuery] = useState('');
  const conversationList = useAgentStore((s) => s.conversationList);
  const conversationId = useAgentStore((s) => s.conversationId);
  const loadConversations = useAgentStore((s) => s.loadConversations);
  useEffect(() => {
    loadConversations();
  }, []);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return conversationList;
    const q = searchQuery.toLowerCase();
    return conversationList.filter(c => c.title.toLowerCase().includes(q));
  }, [conversationList, searchQuery]);

  const groups = useMemo(() => groupByDate(filtered), [filtered]);

  const handleSelect = (id: string) => {
    onSelectSession(id);
  };

  const handleNewConversation = () => {
    onNewSession();
  };

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
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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
      <div className="flex-1 overflow-y-auto py-2">
        {groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <MessageSquare className="w-8 h-8 text-app-text-tertiary mb-2" />
            <p className="text-xs text-app-text-tertiary">
              {searchQuery ? '未找到匹配的对话' : '暂无对话历史'}
            </p>
            {!searchQuery && (
              <p className="text-[10px] text-app-text-tertiary mt-1">发送消息开启新的对话</p>
            )}
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.label}>
              <div className="px-4 py-1.5">
                <span className="text-[10px] font-medium text-app-text-tertiary uppercase tracking-wider">
                  {group.label}
                </span>
              </div>
              {group.items.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => handleSelect(conv.id)}
                  className={cn(
                    'w-full text-left px-4 py-2 transition-colors border-l-2',
                    conv.id === conversationId
                      ? 'bg-primary-500/10 border-l-primary-500'
                      : 'border-l-transparent hover:bg-app-hover'
                  )}
                >
                  <p className="text-xs font-medium text-app-text truncate">
                    {conv.title || '新对话'}
                  </p>
                  <p className="text-[10px] text-app-text-tertiary truncate mt-0.5">
                    {conv.last_message
                      ? conv.last_message.content.slice(0, 40)
                      : `${conv.message_count} 条消息`}
                  </p>
                </button>
              ))}
            </div>
          ))
        )}
      </div>

      {/* Empty state hint */}
      {conversationList.length === 0 && !searchQuery && (
        <div className="flex-shrink-0 px-4 py-3 border-t border-app-border">
          <p className="text-[10px] text-app-text-tertiary text-center">
            发送消息开始新的对话
          </p>
        </div>
      )}
    </aside>
  );
}
