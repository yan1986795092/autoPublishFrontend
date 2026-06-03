import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { templatesApi, platformsApi } from '../services/api';
import type { PromptTemplate, PromptTemplateDetail, Platform } from '../types';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Switch } from '../components/ui/switch';
import { SkeletonList } from '../components/ui/Skeleton';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '../components/ui/dialog';
import {
  Library, Sparkles, Layers, Clock, AlertTriangle,
  RefreshCw, Plus, Pencil, Trash2, Search,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '../utils/helpers';

// ── Category definitions ──────────────────────────────────────────
const CATEGORIES = {
  social_media:     { label: '社交媒体', gradient: 'from-pink-500 to-rose-500',     icon: '📱' },
  creative_writing: { label: '创意写作', gradient: 'from-purple-500 to-violet-500', icon: '✍️' },
  marketing:        { label: '营销内容', gradient: 'from-orange-500 to-amber-500',  icon: '📢' },
  technical:        { label: '技术内容', gradient: 'from-cyan-500 to-blue-500',     icon: '⚙️' },
} as const;

type CategoryKey = keyof typeof CATEGORIES;

/** Pills shown in the filter bar – "全部" first, then each known category. */
const FILTER_PILLS: Array<{ key: CategoryKey | 'all'; label: string }> = [
  { key: 'all', label: '全部' },
  ...(Object.entries(CATEGORIES).map(([k, v]) => ({ key: k as CategoryKey, label: v.label }))),
];

function categoryGradient(cat: string): string {
  return (CATEGORIES as Record<string, { gradient: string }>)[cat]?.gradient ?? 'from-gray-500 to-gray-600';
}
function categoryIcon(cat: string): string {
  return (CATEGORIES as Record<string, { icon: string }>)[cat]?.icon ?? '📄';
}
function categoryLabel(cat: string): string {
  return (CATEGORIES as Record<string, { label: string }>)[cat]?.label ?? cat;
}

// ── Default form state ───────────────────────────────────────────
interface FormState {
  name: string;
  platform_code: string;
  description: string;
  system_prompt: string;
  user_template: string;
  temperature: number;
  max_tokens: number;
  is_public: boolean;
}

const DEFAULT_FORM: FormState = {
  name: '',
  platform_code: '',
  description: '',
  system_prompt: '',
  user_template: '',
  temperature: 0.7,
  max_tokens: 2048,
  is_public: true,
};

// ── Component ─────────────────────────────────────────────────────
export function TemplatePage() {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<CategoryKey | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  // Detail dialog
  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplateDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  // Create/Edit dialog
  const [formOpen, setFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplateDetail | null>(null);
  const [form, setForm] = useState<FormState>({ ...DEFAULT_FORM });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<PromptTemplate | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // ── data fetching ──
  const fetchData = () => {
    setError(null);
    setLoading(true);
    Promise.all([templatesApi.list(), platformsApi.list()])
      .then(([tRes, pRes]) => {
        if (tRes.data.success) setTemplates(tRes.data.data || []);
        if (pRes.data.success) setPlatforms(pRes.data.data || []);
      })
      .catch((err) => {
        setError(err?.message || '加载模板失败，请稍后重试');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ── derived data ──
  const platformMap = useMemo(() => {
    const m = new Map<string, Platform>();
    platforms.forEach((p) => m.set(p.code, p));
    return m;
  }, [platforms]);

  const enriched = useMemo(
    () => templates.map((t) => ({
      ...t,
      _category: t.platform_code ? platformMap.get(t.platform_code)?.category ?? 'uncategorized' : 'uncategorized',
    })),
    [templates, platformMap],
  );

  const filtered = useMemo(() => {
    let result = activeFilter === 'all' ? enriched : enriched.filter((t) => t._category === activeFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (t) => t.name.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q),
      );
    }
    return result;
  }, [enriched, activeFilter, searchQuery]);

  const catCounts = useMemo(() => {
    const counts: Record<string, number> = { all: enriched.length };
    FILTER_PILLS.forEach((p) => {
      if (p.key !== 'all') counts[p.key] = enriched.filter((t) => t._category === p.key).length;
    });
    return counts;
  }, [enriched]);

  const uniqueCategoryCount = useMemo(
    () => new Set(enriched.map((t) => t._category).filter((c) => c !== 'uncategorized')).size,
    [enriched],
  );

  // ── detail dialog ──
  const handleViewTemplate = async (template: PromptTemplate) => {
    setDetailLoading(true);
    setDetailOpen(true);
    try {
      const res = await templatesApi.get(template.id);
      if (res.data.success) setSelectedTemplate(res.data.data as PromptTemplateDetail);
    } catch {
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  // ── create / edit dialog ──
  const openCreateDialog = () => {
    setEditingTemplate(null);
    setForm({ ...DEFAULT_FORM });
    setFormError(null);
    setFormOpen(true);
  };

  const openEditDialog = async (e: React.MouseEvent, template: PromptTemplate) => {
    e.stopPropagation();
    setFormError(null);
    try {
      const res = await templatesApi.get(template.id);
      if (res.data.success) {
        const detail = res.data.data as PromptTemplateDetail;
        setEditingTemplate(detail);
        setForm({
          name: detail.name || '',
          platform_code: detail.platform_code || '',
          description: detail.description || '',
          system_prompt: detail.system_prompt || '',
          user_template: detail.user_template || '',
          temperature: detail.temperature ?? 0.7,
          max_tokens: detail.max_tokens ?? 2048,
          is_public: detail.is_public ?? true,
        });
        setFormOpen(true);
      }
    } catch {
      setFormError('加载模板详情失败');
    }
  };

  const handleFormChange = (field: keyof FormState, value: string | number | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setFormError('模板名称不能为空');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        platform_code: form.platform_code || undefined,
        description: form.description.trim() || undefined,
        system_prompt: form.system_prompt || undefined,
        user_template: form.user_template || undefined,
        temperature: form.temperature,
        max_tokens: form.max_tokens,
        is_public: form.is_public,
      };

      if (editingTemplate) {
        await templatesApi.update(editingTemplate.id, payload);
      } else {
        await templatesApi.create(payload);
      }
      setFormOpen(false);
      fetchData();
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { error?: { message?: string }; detail?: string } } };
      const msg = apiErr?.response?.data?.detail
        || apiErr?.response?.data?.error?.message
        || '操作失败，请稍后重试';
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  };

  // ── delete ──
  const openDeleteDialog = (e: React.MouseEvent, template: PromptTemplate) => {
    e.stopPropagation();
    setDeleteTarget(template);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await templatesApi.delete(deleteTarget.id);
      setDeleteTarget(null);
      fetchData();
    } catch {
      setFormError('删除失败，请稍后重试');
    }
  };

  // ── loading state ──
  if (loading) {
    return <SkeletonList count={4} />;
  }

  // ── render ──
  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* ── Error banner ── */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="w-3.5 h-3.5" />
            重试
          </Button>
        </motion.div>
      )}

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center shadow-[0_0_12px_rgba(59,130,246,0.2)]">
              <Library className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-sm font-bold text-gradient">模板管理</h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-app-text-tertiary pointer-events-none" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索模板..."
                className="w-48 pl-8 h-8 text-xs"
              />
            </div>
            <Button variant="gradient" size="sm" onClick={openCreateDialog}>
              <Plus className="w-3.5 h-3.5" />
              新建模板
            </Button>
          </div>
        </div>

        {/* ── Stats bar ── */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            {
              label: '总模板数',
              value: templates.length,
              icon: Library,
              accent: 'text-blue-400',
              gradient: 'from-blue-500/20 to-blue-600/10',
            },
            {
              label: '分类',
              value: uniqueCategoryCount,
              icon: Layers,
              accent: 'text-purple-400',
              gradient: 'from-purple-500/20 to-purple-600/10',
            },
            {
              label: '最近更新',
              value: '实时',
              icon: Clock,
              accent: 'text-green-400',
              gradient: 'from-green-500/20 to-green-600/10',
            },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="rounded-lg border border-app-border bg-app-elevated p-3.5"
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  'w-9 h-9 rounded-lg bg-gradient-to-br flex items-center justify-center',
                  stat.gradient,
                )}>
                  <stat.icon className={cn('w-4 h-4', stat.accent)} />
                </div>
                <div>
                  <p className="text-lg font-bold text-app-text -mt-0.5">
                    {typeof stat.value === 'number' ? stat.value : stat.value}
                  </p>
                  <p className="text-[10px] text-app-text-tertiary">{stat.label}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ── Category filter pills ── */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {FILTER_PILLS.map((pill) => {
            const isActive = activeFilter === pill.key;
            const count = catCounts[pill.key] ?? 0;
            const isAll = pill.key === 'all';
            const grad = !isAll ? categoryGradient(pill.key) : 'from-primary-500 to-blue-600';
            return (
              <button
                key={pill.key}
                onClick={() => setActiveFilter(pill.key)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200',
                  isActive
                    ? cn('bg-gradient-to-br text-white shadow-sm', grad)
                    : 'bg-app-surface border border-app-border text-app-text-secondary hover:bg-app-elevated hover:text-app-text',
                )}
              >
                {!isAll && <span>{categoryIcon(pill.key)}</span>}
                {pill.label}
                {count > 0 && (
                  <span className={cn(
                    'inline-flex items-center justify-center min-w-[1.125rem] h-[1.125rem] rounded-full text-[9px] font-semibold px-1',
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-app-elevated text-app-text-tertiary',
                  )}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* ── Table ── */}
      {filtered.length > 0 ? (
        <div className="rounded-lg border border-app-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-app-border bg-app-elevated/60">
                <th className="text-left text-xs font-semibold text-app-text-secondary px-4 py-3 w-[22%]">模板名称</th>
                <th className="text-left text-xs font-semibold text-app-text-secondary px-4 py-3 w-[16%]">平台</th>
                <th className="text-left text-xs font-semibold text-app-text-secondary px-4 py-3">描述</th>
                <th className="text-center text-xs font-semibold text-app-text-secondary px-4 py-3 w-[12%]">使用次数</th>
                <th className="text-center text-xs font-semibold text-app-text-secondary px-4 py-3 w-[16%]">操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((template) => {
                const platform = template.platform_code ? platformMap.get(template.platform_code) : undefined;
                const cat = template._category;
                const platIcon = categoryIcon(cat);
                const platName = platform?.name ?? categoryLabel(cat);

                return (
                  <motion.tr
                    key={template.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={() => handleViewTemplate(template)}
                    className="border-b border-app-border last:border-b-0 hover:bg-app-elevated/50 transition-colors cursor-pointer"
                  >
                    {/* 模板名称 */}
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-app-text">{template.name}</span>
                    </td>

                    {/* 平台 */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">{platIcon}</span>
                        <span className="text-xs text-app-text-secondary">{platName}</span>
                      </div>
                    </td>

                    {/* 描述 */}
                    <td className="px-4 py-3">
                      {template.description ? (
                        <span className="text-xs text-app-text-tertiary line-clamp-1">{template.description}</span>
                      ) : (
                        <span className="text-xs text-app-text-tertiary/50">-</span>
                      )}
                    </td>

                    {/* 使用次数 */}
                    <td className="px-4 py-3 text-center">
                      <Badge variant="secondary" size="xs">
                        {template.use_count ?? 0}
                      </Badge>
                    </td>

                    {/* 操作 */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={(e) => openEditDialog(e, template)}
                          title="编辑"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={(e) => openDeleteDialog(e, template)}
                          title="删除"
                          className="hover:text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20">
          <Library className="w-10 h-10 text-app-text-tertiary mb-4" />
          <p className="text-sm text-app-text-secondary">
            {searchQuery.trim() ? '未找到匹配的模板' : '暂无可用模板'}
          </p>
        </div>
      )}

      {/* ── Create / Edit Dialog ── */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-sm">
              {editingTemplate ? '编辑模板' : '新建模板'}
            </DialogTitle>
          </DialogHeader>

          {/* Form error */}
          {formError && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2">
              <p className="text-xs text-red-300">{formError}</p>
            </div>
          )}

          <div className="flex-1 overflow-auto space-y-4 pr-1">
            {/* 模板名称 */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-app-text-secondary">
                模板名称 <span className="text-red-400">*</span>
              </label>
              <Input
                value={form.name}
                onChange={(e) => handleFormChange('name', e.target.value)}
                placeholder="输入模板名称"
              />
            </div>

            {/* 所属平台 */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-app-text-secondary">所属平台</label>
              <Select
                value={form.platform_code}
                onValueChange={(v) => handleFormChange('platform_code', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择平台（可选）" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">无</SelectItem>
                  {platforms.map((p) => (
                    <SelectItem key={p.code} value={p.code}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 描述 */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-app-text-secondary">描述</label>
              <Textarea
                value={form.description}
                onChange={(e) => handleFormChange('description', e.target.value)}
                placeholder="模板描述（可选）"
                rows={2}
              />
            </div>

            {/* 系统提示词 */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-app-text-secondary">系统提示词</label>
              <Textarea
                value={form.system_prompt}
                onChange={(e) => handleFormChange('system_prompt', e.target.value)}
                placeholder="输入系统提示词（可选）"
                className="min-h-[120px] font-mono text-xs leading-relaxed"
                rows={6}
              />
            </div>

            {/* 用户模板 */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-app-text-secondary">用户模板</label>
              <Textarea
                value={form.user_template}
                onChange={(e) => handleFormChange('user_template', e.target.value)}
                placeholder="输入用户模板（可选）"
                rows={4}
              />
            </div>

            {/* Temperature & Max tokens row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-app-text-secondary">温度</label>
                <Input
                  type="number"
                  min={0}
                  max={1}
                  step={0.1}
                  value={form.temperature}
                  onChange={(e) => handleFormChange('temperature', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-app-text-secondary">最大Token</label>
                <Input
                  type="number"
                  min={1}
                  step={1}
                  value={form.max_tokens}
                  onChange={(e) => handleFormChange('max_tokens', parseInt(e.target.value) || 0)}
                />
              </div>
            </div>

            {/* 是否公开 */}
            <div className="flex items-center justify-between rounded-lg border border-app-border bg-app-surface px-4 py-3">
              <div>
                <p className="text-xs font-medium text-app-text">是否公开</p>
                <p className="text-[10px] text-app-text-tertiary">公开后其他用户可见</p>
              </div>
              <Switch
                checked={form.is_public}
                onCheckedChange={(v) => handleFormChange('is_public', v)}
              />
            </div>
          </div>

          {/* Footer buttons */}
          <div className="flex justify-end gap-2 pt-3 border-t border-app-border">
            <Button variant="outline" size="sm" onClick={() => setFormOpen(false)}>
              取消
            </Button>
            <Button variant="gradient" size="sm" onClick={handleSave} disabled={saving}>
              {saving ? '保存中...' : '保存'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ── */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="确定删除此模板?"
        description={deleteTarget ? `「${deleteTarget.name}」删除后将无法恢复` : ''}
        confirmLabel="删除"
        cancelLabel="取消"
        variant="danger"
        onConfirm={handleDelete}
      />

      {/* ── Template Detail Dialog ── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-sm">{selectedTemplate?.name}</DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <div className="flex-1 space-y-3 py-4">
              <SkeletonList count={2} />
            </div>
          ) : selectedTemplate ? (
            <div className="flex-1 overflow-auto space-y-4 pr-1">
              {selectedTemplate.description && (
                <div className="rounded-lg border border-app-border bg-app-elevated p-3">
                  <p className="text-xs text-app-text-secondary">{selectedTemplate.description}</p>
                </div>
              )}
              {selectedTemplate.system_prompt && (
                <div className="space-y-2">
                  <span className="text-[9px] text-app-text-tertiary uppercase tracking-wider font-medium">系统提示词</span>
                  <div className="p-4 bg-app-surface rounded-xl text-xs text-app-text-secondary border border-white/[0.06] font-mono leading-relaxed">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{selectedTemplate.system_prompt}</ReactMarkdown>
                  </div>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setDetailOpen(false)} className="flex-1">
                  关闭
                </Button>
                <Button variant="gradient" className="flex-1" onClick={() => { setDetailOpen(false); navigate('/', { state: { templatePrompt: selectedTemplate?.system_prompt } }); }}>
                  <Sparkles className="h-4 w-4" />使用此模板
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
