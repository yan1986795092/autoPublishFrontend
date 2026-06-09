import { useState, useCallback, useRef, useEffect } from 'react';
import type { ChatConversationSummary } from '../../services/api';

interface ConversationItemProps {
  conversation: ChatConversationSummary;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string) => void;
  isActive: boolean;
}

export function ConversationItem({ conversation, onSelect, onDelete, onRename, isActive }: ConversationItemProps) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMenu]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    onDelete(conversation.id);
  }, [conversation.id, onDelete]);

  const handleRename = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    onRename(conversation.id);
  }, [conversation.id, onRename]);

  const handleSelect = useCallback(() => {
    onSelect(conversation.id);
  }, [conversation.id, onSelect]);

  const title = conversation.title || '新对话';
  const lastMsgPreview = conversation.last_message?.content
    ? conversation.last_message.content.slice(0, 40) + (conversation.last_message.content.length > 40 ? '...' : '')
    : '暂无消息';

  return (
    <div className="group relative" ref={menuRef}>
      <div
        onClick={handleSelect}
        className={`
          flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 mx-1
          transition-colors duration-150
          ${isActive
            ? 'bg-primary-600/20 text-primary-400'
            : 'text-app-text-secondary hover:bg-app-surface hover:text-app-text'
          }
        `}
      >
        <svg className="h-4 w-4 flex-shrink-0 text-app-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>

        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium leading-tight">{title}</p>
          <p className="truncate text-[10px] text-app-text-tertiary leading-tight mt-0.5">{lastMsgPreview}</p>
        </div>

        <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
          <button
            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
            className="rounded p-1 text-app-text-tertiary hover:bg-app-border/30 hover:text-app-text transition-colors"
            title="更多操作"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
        </div>
      </div>

      {showMenu && (
        <div className="absolute right-2 top-full z-50 mt-1 w-36 rounded-lg border border-app-border/30 bg-app-elevated py-1 shadow-xl">
          <button
            onClick={handleRename}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-app-text-secondary hover:bg-app-surface transition-colors"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            重命名
          </button>
          <button
            onClick={handleDelete}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            删除对话
          </button>
        </div>
      )}
    </div>
  );
}
