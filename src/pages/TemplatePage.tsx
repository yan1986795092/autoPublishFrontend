import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { templatesApi } from '../services/api';
import type { PromptTemplate, PromptTemplateDetail } from '../types';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Switch } from '../components/ui/switch';
import { SkeletonList } from '../components/ui/Skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '../components/ui/dialog';
import { Pagination } from '../components/ui/pagination';
import {
  Library, Layers, Clock, AlertTriangle,
  RefreshCw, Pencil, Search,
} from 'lucide-react';
import { cn } from '../utils/helpers';

// ── Category & platform definitions ─────────────────────────
const CATEGORIES = {
  publishable:  { label: '社交平台', badge: '可一键发布', gradient: 'from-pink-500 to-rose-500',  icon: '📱' },
  content:      { label: '内容创作', badge: '提供文案',   gradient: 'from-purple-500 to-violet-500', icon: '📝' },
  professional: { label: '专业写作', badge: '提供文案',   gradient: 'from-cyan-500 to-blue-500',    icon: '📋' },
} as const;

type CategoryKey = keyof typeof CATEGORIES;

const CATEGORY_PLATFORMS: Record<CategoryKey, { id: string; label: string; icon: string }[]> = {
  publishable: [
    { id: 'xiaohongshu', label: '小红书', icon: '📕' },
    { id: 'wechat', label: '公众号', icon: '📱' },
    { id: 'weibo', label: '微博', icon: '🔵' },
    { id: 'douyin', label: '抖音', icon: '🎵' },
    { id: 'bilibili', label: 'B站', icon: '🅱️' },
  ],
  content: [
    { id: 'copywriting', label: '产品文案', icon: '📝' },
    { id: 'brand-story', label: '品牌故事', icon: '💼' },
    { id: 'ad-copy', label: '广告文案', icon: '📢' },
    { id: 'fiction', label: '小说故事', icon: '📖' },
    { id: 'script', label: '剧本脚本', icon: '🎬' },
  ],
  professional: [
    { id: 'tech-doc', label: '技术文档', icon: '📘' },
    { id: 'tutorial', label: '教程指南', icon: '📗' },
    { id: 'seo', label: 'SEO文章', icon: '🔍' },
    { id: 'email', label: '邮件营销', icon: '📧' },
  ],
};

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

/** Look up which category a platform_code belongs to, using the 3-category system */
function platformCategory(platformCode: string): string {
  for (const [cat, platforms] of Object.entries(CATEGORY_PLATFORMS)) {
    if (platforms.some(p => p.id === platformCode)) return cat;
  }
  return 'uncategorized';
}

// ── Default form state ───────────────────────────────────────────
interface FormState {
  name: string;
  category: CategoryKey | '';
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
  category: '',
  platform_code: '__none__',
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<CategoryKey | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPlatforms, setTotalPlatforms] = useState(0);
  const PAGE_SIZE = 10;
  const navigate = useNavigate();

  // Edit dialog
  const [formOpen, setFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplateDetail | null>(null);
  const [form, setForm] = useState<FormState>({ ...DEFAULT_FORM });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // ── server-side data fetching ──
  const fetchData = () => {
    setError(null);
    setLoading(true);
    const cat = activeFilter === 'all' ? undefined : activeFilter;
    const q = searchQuery.trim() || undefined;
    templatesApi.list({ page, page_size: PAGE_SIZE, category: cat, search: q })
      .then((res) => {
        if (res.data.success && res.data.data) {
          setTemplates(res.data.data.items || []);
          setTotal(res.data.data.total || 0);
          setTotalPages(res.data.data.total_pages || 1);
          setTotalPlatforms(res.data.data.total_platforms || 0);
        }
      })
      .catch((err) => {
        setError(err?.message || '加载模板失败，请稍后重试');
      })
      .finally(() => setLoading(false));
  };

  // Re-fetch when page, filter, or search changes
  useEffect(() => {
    fetchData();
  }, [page, activeFilter, searchQuery]);

  // Reset to page 1 when filter or search changes
  useEffect(() => {
    setPage(1);
  }, [activeFilter, searchQuery]);

  // ── enrich templates with category for display ──
  const enriched = useMemo(
    () => templates.map((t) => ({
      ...t,
      _category: t.platform_code ? platformCategory(t.platform_code) : 'uncategorized',
    })),
    [templates],
  );

  // ── edit dialog ──
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
          category: (detail.platform_code ? platformCategory(detail.platform_code) : '') as CategoryKey,
          platform_code: detail.platform_code || '__none__',
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
    if (!editingTemplate) return;
    setSaving(true);
    setFormError(null);
    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        system_prompt: form.system_prompt || undefined,
        user_template: form.user_template || undefined,
        temperature: form.temperature,
        max_tokens: form.max_tokens,
        is_public: form.is_public,
      };
      await templatesApi.update(editingTemplate.id, payload);
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
            <span className="text-[10px] text-app-text-tertiary">共 {total} 个模板</span>
          </div>
        </div>

        {/* ── Stats bar ── */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            {
              label: '总模板数',
              value: total,
              icon: Library,
              accent: 'text-blue-400',
              gradient: 'from-blue-500/20 to-blue-600/10',
            },
            {
              label: '平台数',
              value: totalPlatforms,
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
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* ── Table ── */}
      {enriched.length > 0 ? (
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
              {templates.map((template) => {
                const cat = template._category;
                // Look up platform from CATEGORY_PLATFORMS, fallback to backend platformMap
                let platIcon = categoryIcon(cat);
                let platName = categoryLabel(cat);
                if (template.platform_code) {
                  for (const platforms of Object.values(CATEGORY_PLATFORMS)) {
                    const found = platforms.find(p => p.id === template.platform_code);
                    if (found) { platIcon = found.icon; platName = found.label; break; }
                  }
                }

                return (
                  <motion.tr
                    key={template.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-b border-app-border last:border-b-0 hover:bg-app-elevated/50 transition-colors"
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
                      <div className="flex items-center justify-center">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={(e) => openEditDialog(e, template)}
                          title="编辑"
                        >
                          <Pencil className="w-3.5 h-3.5" />
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

      {/* ── Pagination ── */}
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {/* ── Create / Edit Dialog ── */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-sm">编辑模板</DialogTitle>
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

            {/* 所属分类（只读） */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-app-text-secondary">所属分类</label>
              <div className="flex items-center gap-2 rounded-lg border border-app-border/50 bg-app-elevated/50 px-3 py-2.5">
                {form.category && CATEGORIES[form.category as CategoryKey] ? (
                  <>
                    <span className="text-base">{CATEGORIES[form.category as CategoryKey].icon}</span>
                    <span className="text-xs text-app-text-secondary">{CATEGORIES[form.category as CategoryKey].label}</span>
                  </>
                ) : (
                  <span className="text-xs text-app-text-tertiary">未分类</span>
                )}
              </div>
            </div>

            {/* 所属平台（只读） */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-app-text-secondary">所属平台</label>
              <div className="flex items-center gap-2 rounded-lg border border-app-border/50 bg-app-elevated/50 px-3 py-2.5">
                {form.platform_code && form.platform_code !== '__none__' ? (
                  (() => {
                    let found: { icon: string; label: string } | undefined;
                    for (const platforms of Object.values(CATEGORY_PLATFORMS)) {
                      found = platforms.find(p => p.id === form.platform_code);
                      if (found) break;
                    }
                    return found ? (
                      <>
                        <span className="text-base">{found.icon}</span>
                        <span className="text-xs text-app-text-secondary">{found.label}</span>
                      </>
                    ) : (
                      <span className="text-xs text-app-text-tertiary">{form.platform_code}</span>
                    );
                  })()
                ) : (
                  <span className="text-xs text-app-text-tertiary">无（自动匹配分类）</span>
                )}
              </div>
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

    </div>
  );
}
