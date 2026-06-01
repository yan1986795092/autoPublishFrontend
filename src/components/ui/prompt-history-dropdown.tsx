import { useEffect, useRef, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, History, Search, Clock } from 'lucide-react';
import { formatRelativeTime } from '../../utils/helpers';

interface HistoryItem {
  id: string;
  prompt: string;
  timestamp: string;
}

interface PromptHistoryDropdownProps {
  history: HistoryItem[];
  onSelect: (prompt: string) => void;
  onClear: () => void;
  open: boolean;
  onClose: () => void;
}

function groupByDate(items: HistoryItem[]): Record<string, HistoryItem[]> {
  const groups: Record<string, HistoryItem[]> = {};
  const now = new Date();
  const today = now.toDateString();
  const yesterday = new Date(now.getTime() - 86400000).toDateString();

  for (const item of items) {
    const d = new Date(item.timestamp);
    const dateStr = d.toDateString();
    let label: string;
    if (dateStr === today) label = '今天';
    else if (dateStr === yesterday) label = '昨天';
    else label = d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });

    if (!groups[label]) groups[label] = [];
    groups[label].push(item);
  }
  return groups;
}

export function PromptHistoryDropdown({
  history,
  onSelect,
  onClear,
  open,
  onClose,
}: PromptHistoryDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const grouped = useMemo(() => groupByDate(history), [history]);
  const groupEntries = Object.entries(grouped);

  // Filter by search
  const filteredGroups = useMemo(() => {
    if (!searchQuery) return groupEntries;
    const q = searchQuery.toLowerCase();
    return groupEntries
      .map(([label, items]) => [label, items.filter(i => i.prompt.toLowerCase().includes(q))] as [string, HistoryItem[]])
      .filter(([, items]) => items.length > 0);
  }, [groupEntries, searchQuery]);

  // Click outside to close
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, onClose]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={dropdownRef}
          initial={{ opacity: 0, y: -6, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.96 }}
          transition={{ duration: 0.12 }}
          className="absolute right-0 top-full mt-2 w-80 overflow-hidden rounded-xl border border-app-border bg-app-elevated shadow-xl z-50"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-app-border">
            <div className="flex items-center gap-1.5 text-xs font-medium text-app-text-secondary">
              <Clock className="w-3.5 h-3.5" />
              <span>执行历史</span>
              {history.length > 0 && (
                <span className="text-[10px] text-app-text-tertiary font-normal ml-0.5">{history.length}</span>
              )}
            </div>
            <button onClick={onClose} className="p-1 rounded-md hover:bg-white/[0.06] text-app-text-tertiary hover:text-app-text transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Search */}
          {history.length > 5 && (
            <div className="px-3 py-2 border-b border-app-border/50">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-app-text-tertiary pointer-events-none" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索历史..."
                  className="w-full h-7 pl-7 pr-2 text-xs bg-app-surface rounded-md border border-app-border outline-none text-app-text placeholder:text-app-text-tertiary/60 focus:border-primary-500/40 transition-colors"
                />
              </div>
            </div>
          )}

          {/* List */}
          <div className="max-h-72 overflow-y-auto py-1">
            {filteredGroups.length === 0 ? (
              <div className="px-3 py-8 text-center">
                <History className="w-5 h-5 text-app-text-tertiary/50 mx-auto mb-2" />
                <p className="text-xs text-app-text-tertiary">
                  {searchQuery ? '未找到匹配的历史' : '暂无历史记录'}
                </p>
              </div>
            ) : (
              filteredGroups.map(([label, items]) => (
                <div key={label}>
                  <div className="px-3 py-1.5 text-[10px] font-medium text-app-text-tertiary/60 uppercase tracking-wider">
                    {label}
                  </div>
                  {items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => { onSelect(item.prompt); onClose(); }}
                      className="w-full px-3 py-2 text-left hover:bg-white/[0.04] transition-colors group"
                    >
                      <p className="text-xs text-app-text truncate group-hover:text-primary-400 transition-colors">
                        {item.prompt}
                      </p>
                      <p className="text-[10px] text-app-text-tertiary/60 mt-0.5">
                        {formatRelativeTime(item.timestamp)}
                      </p>
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {history.length > 0 && (
            <div className="border-t border-app-border px-1 py-1">
              <button onClick={() => { onClear(); onClose(); }}
                className="flex items-center gap-1.5 w-full px-2 py-1.5 rounded-md text-xs text-app-text-tertiary hover:text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                清除全部
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

