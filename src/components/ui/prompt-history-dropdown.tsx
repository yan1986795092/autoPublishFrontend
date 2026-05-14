import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, Clock } from 'lucide-react';
import { cn, truncate, formatRelativeTime } from '../../utils/helpers';

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

export function PromptHistoryDropdown({
  history,
  onSelect,
  onClear,
  open,
  onClose,
}: PromptHistoryDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Click outside to close
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    // Delay to prevent immediate close on open
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open, onClose]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={dropdownRef}
          initial={{ opacity: 0, y: -8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.96 }}
          transition={{ duration: 0.15 }}
          className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-hidden rounded-xl border border-app-border bg-app-elevated shadow-xl z-50"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-app-border">
            <div className="flex items-center gap-1.5 text-xs text-app-text-secondary">
              <Clock className="w-3.5 h-3.5" />
              <span>执行历史</span>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-app-hover text-app-text-tertiary hover:text-app-text transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* History list */}
          <div className="max-h-72 overflow-y-auto">
            {history.length === 0 ? (
              <div className="px-3 py-8 text-center">
                <p className="text-xs text-app-text-tertiary">暂无历史记录</p>
              </div>
            ) : (
              <div className="py-1">
                {history.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSelect(item.prompt);
                      onClose();
                    }}
                    className={cn(
                      'w-full px-3 py-2 text-left hover:bg-app-hover transition-colors group',
                      'border-b border-app-border/50 last:border-b-0'
                    )}
                  >
                    <p className="text-xs text-app-text truncate group-hover:text-blue-400 transition-colors">
                      {truncate(item.prompt, 60)}
                    </p>
                    <p className="text-[10px] text-app-text-tertiary mt-0.5">
                      {formatRelativeTime(item.timestamp)}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer - Clear all */}
          {history.length > 0 && (
            <div className="px-3 py-2 border-t border-app-border">
              <button
                onClick={() => {
                  onClear();
                  onClose();
                }}
                className="flex items-center gap-1.5 w-full px-2 py-1.5 rounded text-xs text-app-text-tertiary hover:text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                <span>清除全部</span>
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
