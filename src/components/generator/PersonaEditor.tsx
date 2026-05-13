import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGeneratorStore } from '../../stores/useGeneratorStore';
import { personasApi } from '../../services/api';
import { cn } from '../../utils/helpers';
import type { Persona } from '../../types';
import { UserCircle, Loader2, Plus, Check, Trash2, Edit3, X } from 'lucide-react';

export function PersonaEditor({ disabled }: { disabled?: boolean }) {
  const { draft, setPersonaId, setParameters } = useGeneratorStore();
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newTone, setNewTone] = useState('friendly');
  const [newStyleNotes, setNewStyleNotes] = useState('');

  useEffect(() => {
    loadPersonas();
  }, []);

  const loadPersonas = async () => {
    setLoading(true);
    try {
      const res = await personasApi.list();
      if (res.data.success && res.data.data) {
        setPersonas(res.data.data);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      const res = await personasApi.create({
        name: newName,
        description: newDescription || undefined,
        tone: newTone,
        style_notes: newStyleNotes || undefined,
      });
      if (res.data.success && res.data.data) {
        setCreating(false);
        setNewName('');
        setNewDescription('');
        setNewStyleNotes('');
        await loadPersonas();
      }
    } catch {
      // silently fail
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await personasApi.delete(id);
      if (draft.persona_id === id) {
        setPersonaId(null);
      }
      await loadPersonas();
    } catch {
      // silently fail
    }
  };

  const handleSelect = (persona: Persona) => {
    if (draft.persona_id === persona.id) {
      setPersonaId(null);
      setParameters({ persona_id: undefined });
    } else {
      setPersonaId(persona.id);
      setParameters({ persona_id: persona.id });
    }
  };

  return (
    <div className="rounded-xl bg-app-surface border border-white/[0.04] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-white/[0.04]">
        <UserCircle className="w-3.5 h-3.5 text-primary-400" />
        <span className="text-[11px] font-semibold text-app-text">人设管理</span>
        <button
          onClick={() => { setCreating(!creating); }}
          disabled={disabled}
          className="ml-auto p-1 rounded-md text-app-text-tertiary hover:text-primary-400 hover:bg-white/[0.06] transition-all disabled:opacity-50"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>

      {/* Create form */}
      <AnimatePresence>
        {creating && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-3.5 py-2.5 space-y-2 border-b border-white/[0.04]"
          >
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="人设名称（如：知性学姐）"
              className="w-full rounded-lg border border-app-border bg-app-surface text-[10px] text-app-text placeholder:text-app-text-tertiary px-2.5 py-1.5 focus:outline-none focus:border-primary-500/50"
            />
            <input
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="一句话描述（如：温柔耐心的知识分享者）"
              className="w-full rounded-lg border border-app-border bg-app-surface text-[10px] text-app-text placeholder:text-app-text-tertiary px-2.5 py-1.5 focus:outline-none focus:border-primary-500/50"
            />
            <div className="flex gap-1">
              {['friendly', 'professional', 'humorous'].map((t) => (
                <button
                  key={t}
                  onClick={() => setNewTone(t)}
                  className={cn(
                    'flex-1 py-1 rounded-lg border text-[9px] font-medium transition-all',
                    newTone === t
                      ? 'border-primary-500/50 bg-primary-600/15 text-primary-400'
                      : 'border-app-border bg-app-surface text-app-text-tertiary'
                  )}
                >
                  {t === 'friendly' ? '亲切' : t === 'professional' ? '专业' : '幽默'}
                </button>
              ))}
            </div>
            <textarea
              value={newStyleNotes}
              onChange={(e) => setNewStyleNotes(e.target.value)}
              placeholder="风格备注（选填）：如语言习惯、常用词汇、禁忌话题等"
              rows={2}
              className="w-full resize-none rounded-lg border border-app-border bg-app-surface text-[10px] text-app-text placeholder:text-app-text-tertiary px-2.5 py-1.5 focus:outline-none focus:border-primary-500/50"
            />
            <div className="flex gap-1.5">
              <button
                onClick={handleCreate}
                disabled={!newName.trim()}
                className="flex-1 py-1.5 rounded-lg bg-primary-600/20 border border-primary-500/30 text-primary-400 text-[10px] font-medium hover:bg-primary-600/30 transition-colors disabled:opacity-50"
              >
                创建
              </button>
              <button
                onClick={() => setCreating(false)}
                className="py-1.5 px-2.5 rounded-lg border border-app-border text-app-text-tertiary text-[10px] hover:text-app-text-secondary transition-colors"
              >
                取消
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Persona list */}
      <div className="px-3.5 py-2 space-y-1 max-h-[200px] overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-3">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-app-text-tertiary" />
          </div>
        ) : personas.length === 0 ? (
          <p className="text-[10px] text-app-text-tertiary text-center py-3">
            还没有人设，点击右上角 + 创建
          </p>
        ) : (
          personas.map((persona) => {
            const isSelected = draft.persona_id === persona.id;
            return (
              <div
                key={persona.id}
                className={cn(
                  'flex items-center gap-2 px-2.5 py-2 rounded-lg transition-all group',
                  isSelected
                    ? 'bg-primary-600/15 border border-primary-500/30'
                    : 'hover:bg-white/[0.04] border border-transparent'
                )}
              >
                <button
                  onClick={() => handleSelect(persona)}
                  disabled={disabled}
                  className="flex-1 min-w-0 text-left"
                >
                  <div className="flex items-center gap-1.5">
                    <span className={cn(
                      'text-[10px] font-medium',
                      isSelected ? 'text-primary-400' : 'text-app-text'
                    )}>
                      {persona.name}
                    </span>
                    {isSelected && <Check className="w-2.5 h-2.5 text-primary-400" />}
                  </div>
                  {persona.description && (
                    <p className="text-[9px] text-app-text-tertiary truncate mt-0.5">{persona.description}</p>
                  )}
                </button>
                <button
                  onClick={() => handleDelete(persona.id)}
                  disabled={disabled}
                  className="p-1 rounded-md text-app-text-tertiary opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-500/10 transition-all"
                >
                  <Trash2 className="w-2.5 h-2.5" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
