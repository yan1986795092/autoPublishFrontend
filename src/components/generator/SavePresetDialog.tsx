import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePresetStore } from '../../stores/usePresetStore';
import { useGeneratorStore } from '../../stores/useGeneratorStore';
import { Button } from '../ui/button';
import { X, Loader2 } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function SavePresetDialog({ open, onClose }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const { savePreset } = usePresetStore();
  const { draft } = useGeneratorStore();

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await savePreset(
        name.trim(),
        description.trim(),
        { topic: draft.topic, ...draft.parameters } as Record<string, unknown>,
        draft.platform_code,
        draft.template_id ?? undefined,
      );
      onClose();
      setName('');
      setDescription('');
    } catch { /* ignore */ } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-80 bg-app-elevated border border-white/[0.08] rounded-xl shadow-2xl p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-app-text">保存预设</h3>
              <button onClick={onClose} className="text-app-text-tertiary hover:text-app-text-secondary">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2.5">
              <div>
                <span className="text-[9px] text-app-text-tertiary">名称</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例如：小红书标准模式"
                  className="w-full h-8 mt-0.5 rounded-lg border border-app-border bg-app-surface px-2 text-[11px] text-app-text placeholder:text-app-text-tertiary outline-none focus:border-primary-500/50"
                  autoFocus
                />
              </div>
              <div>
                <span className="text-[9px] text-app-text-tertiary">描述（可选）</span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="简短描述这个预设的用途..."
                  rows={2}
                  className="w-full mt-0.5 rounded-lg border border-app-border bg-app-surface px-2 py-1.5 text-[10px] text-app-text placeholder:text-app-text-tertiary outline-none focus:border-primary-500/50 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={onClose} className="flex-1 h-8 text-[10px]">
                取消
              </Button>
              <Button
                variant="gradient"
                size="sm"
                onClick={handleSave}
                disabled={!name.trim() || saving}
                className="flex-1 h-8 text-[10px]"
              >
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                {saving ? '保存中...' : '保存'}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
