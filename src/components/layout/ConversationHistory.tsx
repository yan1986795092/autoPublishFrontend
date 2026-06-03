import { useState, useMemo } from 'react';
import { cn } from '../../utils/helpers';
import { useAgentStore } from '../../stores/useAgentStore';
import { Search, Plus, MessageSquare } from 'lucide-react';

interface ConversationHistoryProps {
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
}

function groupByDate(messages: Array<{ id: string; title: string; preview: string; timestamp: number }>) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterday = today - 86400000;
  const thisWeek = today - 6 * 86400000;

  const groups: { label: string; items: typeof messages }[] = [];
  const todayItems = messages.filter(m => m.timestamp >= today);
  const yesterdayItems = messages.filter(m => m.timestamp >= yesterday && m.timestamp < today);
  const weekItems = messages.filter(m => m.timestamp >= thisWeek && m.timestamp < yesterday);
  const olderItems = messages.filter(m => m.timestamp < thisWeek);

  if (todayItems.length) groups.push({ label: '今天', items: todayItems });
  if (yesterdayItems.length) groups.push({ label: '昨天', items: yesterdayItems });
  if (weekItems.length) groups.push({ label: '最近 7 天', items: weekItems });
  if (olderItems.length) groups.push({ label: '更早', items: olderItems });

  return groups;
}

export function ConversationHistory({
  activeSessionId,
  onSelectSession,
  onNewSession,
}: ConversationHistoryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const messages = useAgentStore((s) => s.messages);

  // Build session list from messages
  const sessions = useMemo(() => {
    if (messages.length === 0) {
      return [];
    }
    const firstMsg = messages[0];
    return [{
      id: 'current',
      title: firstMsg.content?.slice(0, 30) || '新对话',
      preview: firstMsg.content?.slice(0, 40) || '',
      timestamp: firstMsg.timestamp,
    }];
  }, [messages]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return sessions;
    const q = searchQuery.toLowerCase();
    return sessions.filter(s => s.title.toLowerCase().includes(q));
  }, [sessions, searchQuery]);

  const groups = groupByDate(filtered);

  return (
    <aside className="flex flex-col h-full border-r border-app-border bg-app-surface">
      {/* Search + New */}
      <div className="flex-shrink-0 p-3 border-b border-app-border">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-app-text-tertiary pointer-events-none" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索历史"
              className="w-full h-8 rounded-lg border border-app-border bg-app-elevated pl-8 pr-3 text-xs text-app-text placeholder:text-app-text-tertiary outline-none focus:border-primary-500/50 transition-colors"
            />
          </div>
          <button
            onClick={onNewSession}
            className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary-600 hover:bg-primary-500 flex items-center justify-center transition-colors"
            title="新对话"
          >
            <Plus className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto py-2">
        {groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <MessageSquare className="w-8 h-8 text-app-text-tertiary mb-2" />
            <p className="text-xs text-app-text-tertiary">
              {searchQuery ? '未找到匹配的对话' : '暂无对话历史'}
            </p>
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.label}>
              <div className="px-4 py-1.5">
                <span className="text-[10px] font-medium text-app-text-tertiary uppercase tracking-wider">
                  {group.label}
                </span>
              </div>
              {group.items.map((session) => (
                <button
                  key={session.id}
                  onClick={() => onSelectSession(session.id)}
                  className={cn(
                    'w-full text-left px-4 py-2 transition-colors border-l-2',
                    session.id === activeSessionId
                      ? 'bg-primary-600/10 border-l-primary-500'
                      : 'border-l-transparent hover:bg-app-hover'
                  )}
                >
                  <p className="text-xs font-medium text-app-text truncate">
                    {session.title}
                  </p>
                  <p className="text-[10px] text-app-text-tertiary truncate mt-0.5">
                    {session.preview || '空对话'}
                  </p>
                </button>
              ))}
            </div>
          ))
        )}
      </div>

      {/* Empty state hint */}
      {messages.length === 0 && !searchQuery && (
        <div className="flex-shrink-0 px-4 py-3 border-t border-app-border">
          <p className="text-[10px] text-app-text-tertiary text-center">
            输入需求开始新的对话
          </p>
        </div>
      )}
    </aside>
  );
}
