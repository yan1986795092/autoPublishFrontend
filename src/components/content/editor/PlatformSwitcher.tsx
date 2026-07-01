import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PUBLISHABLE_PLATFORMS,
  CONTENT_STYLES,
  PROFESSIONAL_STYLES,
  type Platform,
} from '../../agent/PlatformSelector';
import { PlatformIcon } from '../../agent/PlatformIcons';

export interface PlatformSwitcherProps {
  /** 当前激活的 platform code */
  current: string;
  /** 切换回调 */
  onChange: (platform: string) => void;
  /** 已切但未保存的标记（用 dirty 文字提示） */
  pending?: boolean;
}

interface PlatformGroup {
  label: string;
  items: Platform[];
}

const GROUPS: PlatformGroup[] = [
  { label: '发布平台', items: PUBLISHABLE_PLATFORMS },
  { label: '内容体裁', items: CONTENT_STYLES },
  { label: '专业文体', items: PROFESSIONAL_STYLES },
];

/**
 * P0-3: 编辑页轻量平台切换入口
 *  - 只改本地 activePlatform + isDirty
 *  - 用户点「保存」时由 handleSave 一起把 platform_code 提交给后端
 *  - 不做任何破坏性操作（如 adapt-content），用户可手动触发 AI 工具来适配
 */
export function PlatformSwitcher({ current, onChange, pending }: PlatformSwitcherProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  const allItems = GROUPS.flatMap((g) => g.items);
  const currentDef = allItems.find((p) => p.id === current);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={[
          'flex items-center gap-1.5 h-7 px-2.5 rounded-md border text-xs',
          'transition-colors',
          pending
            ? 'border-amber-500/60 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20'
            : 'border-app-border bg-app-surface-hover/40 text-app-text-secondary hover:bg-app-surface-hover',
        ].join(' ')}
        title={pending ? '平台已切换，点保存生效' : '切换平台/体裁'}
      >
        {currentDef && <PlatformIcon id={currentDef.icon} size={14} colored={false} />}
        <span className="max-w-[80px] truncate">{currentDef?.label || current}</span>
        {pending && <span className="text-[10px] text-amber-600 dark:text-amber-400">·未保存</span>}
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-9 z-50 w-72 rounded-lg border border-app-border bg-app-surface shadow-xl overflow-hidden"
          >
            <div className="px-3 py-2 text-[11px] text-app-text-tertiary border-b border-app-border">
              切换后会立即更新预览，但内容不会自动改写。点「保存」后生效。
            </div>
            <div className="max-h-96 overflow-y-auto">
              {GROUPS.map((group) => (
                <div key={group.label} className="py-1.5">
                  <div className="px-3 py-1 text-[10px] uppercase tracking-wide text-app-text-tertiary">
                    {group.label}
                  </div>
                  {group.items.map((p) => {
                    const active = p.id === current;
                    return (
                      <button
                        key={p.id}
                        onClick={() => {
                          onChange(p.id);
                          setOpen(false);
                        }}
                        className={[
                          'w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left',
                          'hover:bg-app-surface-hover transition-colors',
                          active ? 'bg-app-primary/5 text-app-primary' : 'text-app-text-secondary',
                        ].join(' ')}
                      >
                        <PlatformIcon id={p.icon} size={14} colored={false} />
                        <span className="flex-1 truncate">{p.label}</span>
                        {active && <Check className="h-3.5 w-3.5 text-app-primary" />}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}