import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAgentStore } from '../../stores/useAgentStore';
import { chatApi } from '../../services/api';
import { ConversationItem } from './ConversationItem';
import type { ChatConversationSummary } from '../../services/api';

interface GroupedConversations {
  pinned: ChatConversationSummary[];
  today: ChatConversationSummary[];
  yesterday: ChatConversationSummary[];
  thisWeek: ChatConversationSummary[];
  thisMonth: ChatConversationSummary[];
  older: ChatConversationSummary[];
}

function groupByDate(conversations: ChatConversationSummary[]): GroupedConversations {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 86400000);
  const weekStart = new Date(todayStart.getTime() - 7 * 86400000);
  const monthStart = new Date(todayStart.getTime() - 30 * 86400000);

  const result: GroupedConversations = {
    pinned: [],
    today: [],
    yesterday: [],
    thisWeek: [],
    thisMonth: [],
    older: [],
  };

  for (const conv of conversations) {
    const d = new Date(conv.updated_at);
    if (d >= todayStart) {
      result.today.push(conv);
    } else if (d >= yesterdayStart) {
      result.yesterday.push(conv);
    } else if (d >= weekStart) {
      result.thisWeek.push(conv);
    } else if (d >= monthStart) {
      result.thisMonth.push(conv);
    } else {
      result.older.push(conv);
    }
  }

  return result;
}

function GroupSection({ title, conversations, activeId, onSelect, onDelete, onRename }: {
  title: string;
  conversations: ChatConversationSummary[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string) => void;
}) {
  if (conversations.length === 0) return null;

  return (
    <div className="mb-3">
      <p className="px-3 py-1 text-[10px] font-medium text-app-text-tertiary uppercase tracking-wider">
        {title}
      </p>
      <div className="space-y-0.5">
        {conversations.map((conv) => (
          <ConversationItem
            key={conv.id}
            conversation={conv}
            onSelect={onSelect}
            onDelete={onDelete}
            onRename={onRename}
            isActive={conv.id === activeId}
          />
        ))}
      </div>
    </div>
  );
}

interface ConversationSidebarProps {
  onClose?: () => void;
}

export function ConversationSidebar({ onClose }: ConversationSidebarProps) {
  const {
    conversationList,
    conversationId,
    switchConversation,
    deleteConversation,
    createConversation,
  } = useAgentStore();

  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<ChatConversationSummary[] | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const handleSearch = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearch(val);
    if (!val.trim()) {
      setSearchResults(null);
      return;
    }
    try {
      const res = await chatApi.listConversations({ q: val.trim() });
      if (res.data.success && res.data.data) {
        setSearchResults(res.data.data.conversations);
      }
    } catch { /* ignore */ }
  }, []);

  const handleNewConversation = useCallback(async () => {
    const newId = await createConversation();
    if (newId) {
      await switchConversation(newId);
      setRenameValue('');
      setRenamingId(newId);
    }
  }, [createConversation, switchConversation]);

  const handleSelect = useCallback(async (id: string) => {
    await switchConversation(id);
    onClose?.();
  }, [switchConversation, onClose]);

  const handleDelete = useCallback(async (id: string) => {
    if (confirm('删除后不可恢复，确定删除此对话？')) {
      await deleteConversation(id);
    }
  }, [deleteConversation]);

  const handleRename = useCallback(async (id: string) => {
    if (renameValue.trim()) {
      await useAgentStore.getState().updateConversationTitle(id, renameValue.trim());
    }
    setRenamingId(null);
    setRenameValue('');
  }, [renameValue]);

  const filtered = search.trim() && searchResults
    ? searchResults
    : conversationList;

  const grouped = groupByDate(filtered);

  return (
    <div className="flex h-full flex-col bg-app-bg-secondary">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-app-border/20 px-3 py-3">
        <div className="flex items-center gap-2">
          <svg className="h-5 w-5 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span className="text-sm font-semibold text-app-text">对话历史</span>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1 text-app-text-tertiary hover:bg-app-surface hover:text-app-text transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-app-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={handleSearch}
            placeholder="搜索对话..."
            className="w-full rounded-lg border border-app-border/30 bg-app-surface pl-8 pr-3 py-1.5 text-xs text-app-text placeholder:text-app-text-tertiary focus:border-primary-500/50 focus:outline-none focus:ring-1 focus:ring-primary-500/30"
          />
        </div>
      </div>

      {/* New Conversation */}
      <div className="px-3 pb-2">
        <button
          onClick={handleNewConversation}
          className="flex w-full items-center gap-2 rounded-lg bg-primary-600/20 px-3 py-2 text-xs font-medium text-primary-400 hover:bg-primary-600/30 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          新建对话
        </button>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto px-1">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <svg className="h-10 w-10 text-app-text-tertiary/30 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-xs text-app-text-tertiary">
              {search ? '没有找到匹配的对话' : '暂无对话记录'}
            </p>
          </div>
        ) : (
          <>
            {grouped.pinned.length > 0 && (
              <GroupSection
                title="置顶"
                conversations={grouped.pinned}
                activeId={conversationId}
                onSelect={handleSelect}
                onDelete={handleDelete}
                onRename={(id) => { setRenamingId(id); setRenameValue(conversationList.find(c => c.id === id)?.title || ''); }}
              />
            )}
            {grouped.today.length > 0 && (
              <GroupSection
                title="今天"
                conversations={grouped.today}
                activeId={conversationId}
                onSelect={handleSelect}
                onDelete={handleDelete}
                onRename={(id) => { setRenamingId(id); setRenameValue(conversationList.find(c => c.id === id)?.title || ''); }}
              />
            )}
            {grouped.yesterday.length > 0 && (
              <GroupSection
                title="昨天"
                conversations={grouped.yesterday}
                activeId={conversationId}
                onSelect={handleSelect}
                onDelete={handleDelete}
                onRename={(id) => { setRenamingId(id); setRenameValue(conversationList.find(c => c.id === id)?.title || ''); }}
              />
            )}
            {grouped.thisWeek.length > 0 && (
              <GroupSection
                title="近 7 天"
                conversations={grouped.thisWeek}
                activeId={conversationId}
                onSelect={handleSelect}
                onDelete={handleDelete}
                onRename={(id) => { setRenamingId(id); setRenameValue(conversationList.find(c => c.id === id)?.title || ''); }}
              />
            )}
            {grouped.thisMonth.length > 0 && (
              <GroupSection
                title="近 30 天"
                conversations={grouped.thisMonth}
                activeId={conversationId}
                onSelect={handleSelect}
                onDelete={handleDelete}
                onRename={(id) => { setRenamingId(id); setRenameValue(conversationList.find(c => c.id === id)?.title || ''); }}
              />
            )}
            {grouped.older.length > 0 && (
              <GroupSection
                title="更早"
                conversations={grouped.older}
                activeId={conversationId}
                onSelect={handleSelect}
                onDelete={handleDelete}
                onRename={(id) => { setRenamingId(id); setRenameValue(conversationList.find(c => c.id === id)?.title || ''); }}
              />
            )}
          </>
        )}
      </div>

      {/* Rename Dialog */}
      {renamingId && (
        <RenameDialog
          value={renameValue}
          onChange={setRenameValue}
          onConfirm={() => handleRename(renamingId)}
          onCancel={() => { setRenamingId(null); setRenameValue(''); }}
        />
      )}
    </div>
  );
}

function RenameDialog({ value, onChange, onConfirm, onCancel }: {
  value: string;
  onChange: (v: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-10">
      <div className="w-[calc(100%-24px)] rounded-xl border border-app-border/30 bg-app-elevated p-4 shadow-xl">
        <p className="mb-3 text-sm font-medium text-app-text">重命名对话</p>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') onConfirm(); if (e.key === 'Escape') onCancel(); }}
          autoFocus
          className="mb-3 w-full rounded-lg border border-app-border/30 bg-app-surface px-3 py-2 text-sm text-app-text placeholder:text-app-text-tertiary focus:border-primary-500/50 focus:outline-none focus:ring-1 focus:ring-primary-500/30"
          placeholder="输入对话标题..."
        />
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg px-3 py-1.5 text-xs text-app-text-secondary hover:bg-app-surface transition-colors"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700 transition-colors"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
