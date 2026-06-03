import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { templatesApi, platformsApi } from '../services/api';
import type { PromptTemplate, PromptTemplateDetail, Platform } from '../types';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { SkeletonList } from '../components/ui/Skeleton';
import { Library, Sparkles, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '../utils/helpers';

// 平台 emoji 映射
const platformEmojis: Record<string, string> = {
  xiaohongshu: '🎨',
  wechat: '📱',
  fiction: '📖',
  storyboard: '🎬',
  script: '🎭',
  copywriting: '📝',
  newsletter: '📧',
  technical_doc: '📘',
  tutorial: '📗',
};

const categoryConfig: Record<string, { label: string; gradient: string }> = {
  social_media: { label: '社交媒体', gradient: 'from-pink-500 to-rose-500' },
  creative_writing: { label: '创意写作', gradient: 'from-purple-500 to-violet-500' },
  marketing: { label: '营销内容', gradient: 'from-orange-500 to-amber-500' },
  technical: { label: '技术内容', gradient: 'from-cyan-500 to-blue-500' },
};

export function TemplatePage() {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplateDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      templatesApi.list(),
      platformsApi.list(),
    ])
      .then(([tRes, pRes]) => {
        if (tRes.data.success) setTemplates(tRes.data.data || []);
        if (pRes.data.success) setPlatforms(pRes.data.data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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

  // Build platform groups from API data
  const platformGroups = platforms
    .filter((p) => templates.some((t) => t.platform_code === p.code))
    .map((p) => ({
      code: p.code,
      label: p.name,
      emoji: platformEmojis[p.code] || '📄',
      gradient: categoryConfig[p.category]?.gradient || 'from-gray-500 to-gray-500',
    }));

  // If no platforms from API, fallback to showing all templates as uncategorized

  if (loading) {
    return <SkeletonList count={4} />;
  }

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center shadow-[0_0_12px_rgba(59,130,246,0.2)]">
            <Library className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-gradient">模板管理</h1>
            <p className="text-[10px] text-app-text-tertiary">选择适合你的内容创作模板</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: '可用模板', value: templates.length, icon: Sparkles, color: 'text-primary-400' },
            { label: '公共模板', value: templates.filter((t) => t.is_public).length, icon: Library, color: 'text-blue-400' },
            { label: '总使用次数', value: templates.reduce((sum, t) => sum + t.use_count, 0), icon: Sparkles, color: 'text-green-400' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="rounded-lg border border-app-border bg-app-elevated p-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-app-surface border border-white/[0.06] flex items-center justify-center">
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                </div>
                <div>
                  <motion.p
                    className="text-xl font-bold text-app-text"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    {stat.value}
                  </motion.p>
                  <p className="text-[10px] text-app-text-tertiary">{stat.label}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Platform Groups */}
      {platformGroups.map((group) => {
        const filtered = templates.filter((t) => t.platform_code === group.code);
        if (filtered.length === 0) return null;
        return (
          <div key={group.code} className="space-y-2.5">
            <div className="flex items-center gap-2">
              <div className={cn('w-7 h-7 rounded-lg bg-gradient-to-br flex items-center justify-center', group.gradient)}>
                <span className="text-sm">{group.emoji}</span>
              </div>
              <h2 className="text-sm font-semibold text-app-text">{group.label}</h2>
              <Badge variant="secondary" size="sm">{filtered.length}</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {filtered.map((template, idx) => (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  onClick={() => handleViewTemplate(template)}
                  className="rounded-lg border border-app-border bg-app-elevated p-4 cursor-pointer group hover:border-primary-500/30 transition-all duration-200"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-sm font-semibold text-app-text group-hover:text-primary-400 transition-colors">
                      {template.name}
                    </h3>
                    <ChevronRight className="w-4 h-4 text-app-text-tertiary group-hover:text-app-text-secondary transition-colors flex-shrink-0" />
                  </div>
                  {template.description && (
                    <p className="text-[11px] text-app-text-tertiary line-clamp-2 mb-2">{template.description}</p>
                  )}
                  <Badge variant="secondary" size="xs">使用 {template.use_count} 次</Badge>
                </motion.div>
              ))}
            </div>
          </div>
        );
      })}

      {templates.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20">
          <Library className="w-10 h-10 text-app-text-tertiary mb-4" />
          <p className="text-sm text-app-text-secondary">暂无可用模板</p>
        </div>
      )}

      {/* Template Detail Dialog */}
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
