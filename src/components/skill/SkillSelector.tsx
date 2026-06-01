import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { cn } from '../../utils/helpers';
import { skillsApi } from '../../services/api';
import { useUIStore } from '../../stores/useUIStore';
import type { Skill, SkillMeta, SkillCategory, AppliedSkill } from '../../types';
import { SkillImportModal } from './SkillImportModal';
import { SkillEditModal } from './SkillEditModal';
import {
  Search, Plus, Download, ChevronDown, ChevronUp,
  BookOpen, BarChart2, Code2, Globe, Palette, Megaphone, Sparkles,
  Star, Trash2, X, Loader2, Check,
} from 'lucide-react';

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  writing: BookOpen,
  analysis: BarChart2,
  coding: Code2,
  research: Globe,
  design: Palette,
  social: Megaphone,
  custom: Sparkles,
};

const CATEGORY_COLORS: Record<string, string> = {
  writing: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
  analysis: 'text-green-400 border-green-500/30 bg-green-500/10',
  coding: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
  research: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
  design: 'text-pink-400 border-pink-500/30 bg-pink-500/10',
  social: 'text-orange-400 border-orange-500/30 bg-orange-500/10',
  custom: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10',
};

const SOURCE_LABELS: Record<string, string> = {
  builtin: '内置',
  user: '自定义',
  imported: '导入',
};

interface SkillSelectorProps {
  onApply?: (skill: AppliedSkill, fullSkill: Skill) => void;
  className?: string;
}

export function SkillSelector({ onApply, className }: SkillSelectorProps) {
  const showToast = useUIStore((s) => s.showToast);
  const [skills, setSkills] = useState<SkillMeta[]>([]);
  const [builtins, setBuiltins] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [filterCategory, setFilterCategory] = useState<SkillCategory | 'all'>('all');
  const [showImport, setShowImport] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  // Load skills
  const loadSkills = useCallback(async () => {
    setLoading(true);
    try {
      const [userRes, builtinRes] = await Promise.all([
        skillsApi.list(filterCategory !== 'all' ? { category: filterCategory } : undefined),
        skillsApi.listBuiltins(),
      ]);
      if (userRes.data.success) setSkills(userRes.data.data || []);
      if (builtinRes.data.success) setBuiltins(builtinRes.data.data || []);
    } catch {
      showToast('加载 Skill 失败', 'error');
    } finally {
      setLoading(false);
    }
  }, [filterCategory, showToast]);

  useEffect(() => { loadSkills(); }, [loadSkills]);

  const allSkills = [
    ...builtins.map(b => ({
      id: b.id, name: b.name, description: b.description,
      category: b.category as SkillCategory, icon: b.icon,
      source: 'builtin' as const, author: b.author,
      version: b.version, tags: b.tags,
      is_enabled: b.is_enabled, use_count: b.use_count,
      created_at: b.created_at || '', updated_at: b.updated_at || '',
    })),
    ...skills,
  ];

  const filtered = allSkills.filter(s => {
    if (filter && !s.name.toLowerCase().includes(filter.toLowerCase()) &&
        !s.description.toLowerCase().includes(filter.toLowerCase())) return false;
    if (filterCategory !== 'all' && s.category !== filterCategory) return false;
    return true;
  });

  // Apply a skill instantly on click
  const handleApply = useCallback(async (skillMeta: SkillMeta) => {
    if (applyingId) return; // prevent double-click
    setApplyingId(skillMeta.id);
    try {
      const res = skillMeta.source === 'builtin'
        ? await skillsApi.getBuiltin(skillMeta.id)
        : await skillsApi.get(skillMeta.id);
      if (res.data.success) {
        const full = res.data.data;
        await skillsApi.recordUse(skillMeta.id);
        onApply?.({
          skill_id: skillMeta.id,
          skill_name: skillMeta.name,
        }, full);
        showToast(`${skillMeta.icon} ${skillMeta.name} 已应用`, 'success', 1500);
      }
    } catch {
      showToast('加载 Skill 失败', 'error');
    } finally {
      setApplyingId(null);
    }
  }, [applyingId, onApply, showToast]);

  const handleDelete = useCallback(async (skillId: string) => {
    if (!confirm('确定删除此 Skill？')) return;
    try {
      await skillsApi.delete(skillId);
      showToast('已删除', 'success');
      loadSkills();
    } catch {
      showToast('删除失败', 'error');
    }
  }, [loadSkills, showToast]);

  const handleExpand = useCallback((skillId: string) => {
    setExpanded(prev => prev === skillId ? null : skillId);
  }, []);

  return (
    <div className={cn('space-y-3', className)}>
      {/* Import / Create secondary actions */}
      <div className="flex gap-2">
        <button
          onClick={() => setShowImport(v => !v)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-app-border text-[11px] text-app-text-secondary hover:text-app-text hover:border-blue-500/40 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          导入 Skill
        </button>
        <button
          onClick={() => setShowCreate(v => !v)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-app-border text-[11px] text-app-text-secondary hover:text-app-text hover:border-blue-500/40 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          创建 Skill
        </button>
      </div>

      {/* Import panel */}
      <AnimatePresence>
        {showImport && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-1">
              <button
                onClick={() => setShowImport(false)}
                className="mb-2 text-[10px] text-app-text-tertiary hover:text-app-text transition-colors flex items-center gap-1"
              >
                <ChevronUp className="w-3 h-3" /> 收起
              </button>
              <SkillImportModal onImported={() => { loadSkills(); setShowImport(false); }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create panel */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-1">
              <button
                onClick={() => setShowCreate(false)}
                className="mb-2 text-[10px] text-app-text-tertiary hover:text-app-text transition-colors flex items-center gap-1"
              >
                <ChevronUp className="w-3 h-3" /> 收起
              </button>
              <SkillEditModal onSaved={() => { loadSkills(); setShowCreate(false); }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Divider */}
      {(!showImport && !showCreate) && (
        <div className="border-t border-app-border" />
      )}

      {/* Search + Filter */}
      {(!showImport && !showCreate) && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-app-text-tertiary" />
              <input
                value={filter}
                onChange={e => setFilter(e.target.value)}
                placeholder="搜索 Skill..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-app-border bg-app-surface text-xs text-app-text placeholder:text-app-text-tertiary focus:border-blue-500/50 focus:outline-none"
              />
            </div>
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value as SkillCategory | 'all')}
              className="px-2 py-1.5 rounded-lg border border-app-border bg-app-surface text-xs text-app-text"
            >
              <option value="all">全部分类</option>
              {Object.keys(CATEGORY_ICONS).map(cat => (
                <option key={cat} value={cat}>{cat === 'writing' ? '写作' : cat === 'analysis' ? '分析' : cat === 'coding' ? '代码' : cat === 'research' ? '研究' : cat === 'design' ? '设计' : cat === 'social' ? '社媒' : '自定义'}</option>
              ))}
            </select>
          </div>

          {/* Skill list */}
          <ScrollArea className="max-h-[320px]">
            {loading ? (
              <div className="space-y-2 p-1">
                {[1,2,3].map(i => (
                  <div key={i} className="h-14 rounded-lg bg-app-surface animate-pulse" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-8 space-y-1">
                <Sparkles className="w-6 h-6 mx-auto text-app-text-tertiary/50" />
                <p className="text-xs text-app-text-tertiary">没有找到匹配的 Skill</p>
                <p className="text-[10px] text-app-text-tertiary">试试导入一个 SKILL.md</p>
              </div>
            ) : (
              <div className="space-y-1.5 p-1">
                {filtered.map(skill => {
                  const isExpanded = expanded === skill.id;
                  const isApplying = applyingId === skill.id;
                  const Icon = CATEGORY_ICONS[skill.category] || Sparkles;
                  const colorClass = CATEGORY_COLORS[skill.category] || CATEGORY_COLORS.custom;

                  return (
                    <div key={skill.id}>
                      <button
                        onClick={() => handleApply(skill)}
                        className={cn(
                          'w-full rounded-lg border p-2.5 text-left transition-all',
                          isApplying
                            ? 'border-blue-500/50 bg-blue-500/10 opacity-70'
                            : 'border-app-border bg-app-surface hover:border-blue-500/30 hover:bg-blue-500/5'
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          {/* Icon */}
                          <span className="text-base leading-none">{skill.icon}</span>

                          {/* Main info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-medium text-app-text truncate">{skill.name}</span>
                              <Badge variant="outline" className={cn('text-[9px] h-4', colorClass)}>
                                {SOURCE_LABELS[skill.source] || skill.source}
                              </Badge>
                              {skill.source === 'builtin' && (
                                <Star className="w-2.5 h-2.5 text-yellow-400/70 flex-shrink-0" />
                              )}
                              {isApplying && (
                                <Loader2 className="w-3 h-3 animate-spin text-blue-400 flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-[10px] text-app-text-secondary truncate mt-0.5">{skill.description}</p>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-0.5 flex-shrink-0">
                            {skill.source !== 'builtin' && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDelete(skill.id); }}
                                className="p-1 text-app-text-tertiary hover:text-red-400 transition-colors"
                                title="删除"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); handleExpand(skill.id); }}
                              className="p-1 text-app-text-tertiary hover:text-app-text transition-colors"
                            >
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                          </div>
                        </div>

                        {/* Tags on hover/selected */}
                        <div className="flex items-center gap-1 mt-1.5">
                          {skill.tags.slice(0, 4).map(tag => (
                            <span key={tag} className="text-[9px] text-app-text-tertiary bg-app-border/30 px-1.5 py-0.5 rounded">
                              {tag}
                            </span>
                          ))}
                          {skill.tags.length > 4 && (
                            <span className="text-[9px] text-app-text-tertiary">+{skill.tags.length - 4}</span>
                          )}
                        </div>
                      </button>

                      {/* Expanded detail */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-1 p-2.5 rounded-lg border border-app-border bg-app-surface/50 space-y-2">
                              <p className="text-[10px] text-app-text-secondary leading-relaxed">{skill.description}</p>
                              {skill.preset_plan && (
                                <div className="text-[10px] text-app-text-tertiary">
                                  <span className="font-medium">Agent 流程:</span>{' '}
                                  {((skill as any).preset_plan?.agent_sequence as string[] || []).join(' → ')}
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
