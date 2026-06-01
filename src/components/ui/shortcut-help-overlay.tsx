import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Keyboard } from 'lucide-react';

interface ShortcutItem {
  keys: string[];
  label: string;
  scope?: string;
}

const shortcuts: ShortcutItem[] = [
  { keys: ['Ctrl', 'Enter'], label: '快速执行', scope: '首页' },
  { keys: ['Ctrl', 'N'], label: '新建会话', scope: '首页' },
  { keys: ['Esc'], label: '停止 Agent', scope: '执行中' },
  { keys: ['Ctrl', 'S'], label: '保存内容', scope: '编辑页' },
  { keys: ['Ctrl', '/'], label: '显示/隐藏此面板', scope: '全局' },
  { keys: ['Ctrl', 'K'], label: '打开快捷命令', scope: '全局' },
];

export function ShortcutHelpOverlay() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onToggle = () => setOpen((prev) => !prev);
    const onClose = () => setOpen(false);
    window.addEventListener('shortcut:toggle-help', onToggle);
    window.addEventListener('shortcut:close-help', onClose);
    return () => {
      window.removeEventListener('shortcut:toggle-help', onToggle);
      window.removeEventListener('shortcut:close-help', onClose);
    };
  }, []);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="bg-app-elevated border border-app-border rounded-2xl shadow-2xl shadow-black/50 w-[320px] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-app-border">
              <div className="flex items-center gap-2 text-sm font-semibold text-app-text">
                <Keyboard className="w-4 h-4 text-primary-400" />
                键盘快捷键
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-md text-app-text-tertiary hover:text-app-text hover:bg-app-hover transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-2">
              {shortcuts.map((s, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {s.scope && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-app-surface text-app-text-tertiary border border-app-border">
                        {s.scope}
                      </span>
                    )}
                    <span className="text-xs text-app-text-secondary">{s.label}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {s.keys.map((key, j) => (
                      <kbd
                        key={j}
                        className="px-1.5 py-0.5 rounded border border-app-border bg-app-surface text-[10px] font-mono text-app-text-secondary shadow-sm"
                      >
                        {key}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="px-4 pb-3 text-center">
              <span className="text-[10px] text-app-text-tertiary">按 Ctrl+/ 或 Esc 关闭</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
