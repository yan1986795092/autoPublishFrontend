import { cn } from '../../utils/helpers';
import { PlatformIcon } from './PlatformIcons';

// ── Platform data ──

export interface Platform {
  id: string;
  label: string;
  icon: string;
  category: 'publishable' | 'content' | 'professional';
  /** 简短描述，显示在选择器下方 */
  hint: string;
}

export const PLATFORM_GROUPS: { key: Platform['category']; label: string; badge: string; platforms: Platform[] }[] = [
  // ═══════════════════════════════════════════════════════════════
  // 🌐 真实发布平台 — 可一键发布到外部渠道，有独立视觉预览
  // ═══════════════════════════════════════════════════════════════
  {
    key: 'publishable',
    label: '社交平台',
    badge: '可发布',
    platforms: [
      { id: 'xiaohongshu', label: '小红书', icon: '📕', category: 'publishable', hint: '种草笔记 · 口语化 · 短段落' },
      { id: 'wechat', label: '公众号', icon: '📱', category: 'publishable', hint: '深度长文 · 专业温暖 · 小标题' },
      { id: 'weibo', label: '微博', icon: '🔵', category: 'publishable', hint: '短平快 · 140字 · 话题标签' },
      { id: 'douyin', label: '抖音', icon: '🎵', category: 'publishable', hint: '口播脚本 · 3秒钩子 · 节奏感' },
      { id: 'bilibili', label: 'B站', icon: '🅱️', category: 'publishable', hint: 'UP主风格 · 弹幕文化 · 专业有趣' },
    ],
  },
  // ═══════════════════════════════════════════════════════════════
  // 📄 写作体裁 — AI 按对应结构/语气生成，非发布渠道，无独立预览
  // ═══════════════════════════════════════════════════════════════
  {
    key: 'content',
    label: '营销体裁',
    badge: '写作风格',
    platforms: [
      { id: 'copywriting', label: '产品文案', icon: '📝', category: 'content', hint: '卖点清晰 · 价值主张 · CTA' },
      { id: 'brand-story', label: '品牌故事', icon: '💼', category: 'content', hint: '叙事感 · 品牌调性 · 情感共鸣' },
      { id: 'ad-copy', label: '广告文案', icon: '📢', category: 'content', hint: '标题党 · 转化导向 · 紧迫感' },
      { id: 'fiction', label: '小说故事', icon: '📖', category: 'content', hint: '人物对白 · 情节节奏 · 叙事' },
      { id: 'script', label: '剧本脚本', icon: '🎬', category: 'content', hint: '镜头语言 · 景别标注 · 对白' },
    ],
  },
  {
    key: 'professional',
    label: '专业文体',
    badge: '写作风格',
    platforms: [
      { id: 'tech-doc', label: '技术文档', icon: '📘', category: 'professional', hint: '结构清晰 · 术语规范 · 示例' },
      { id: 'tutorial', label: '教程指南', icon: '📗', category: 'professional', hint: '循序渐进 · 步骤清晰 · 学练' },
      { id: 'email', label: '邮件营销', icon: '📧', category: 'professional', hint: '问候语 · 价值内容 · CTA' },
      { id: 'seo', label: 'SEO 优化', icon: '🔍', category: 'professional', hint: '关键词策略 · 搜索引擎排名 · 优化' },
    ],
  },
];

export const ALL_PLATFORMS = PLATFORM_GROUPS.flatMap(g => g.platforms);
export const PUBLISHABLE_PLATFORMS = PLATFORM_GROUPS.find(g => g.key === 'publishable')?.platforms ?? [];
export const CONTENT_STYLES = PLATFORM_GROUPS.find(g => g.key === 'content')?.platforms ?? [];
export const PROFESSIONAL_STYLES = PLATFORM_GROUPS.find(g => g.key === 'professional')?.platforms ?? [];
export const PLATFORM_MAP = new Map(ALL_PLATFORMS.map(p => [p.id, p]));

/** 判断一个 code 是否为可发布平台 */
export function isPublishable(code: string): boolean {
  return PUBLISHABLE_PLATFORMS.some(p => p.id === code);
}

// ── Component ──

interface PlatformSelectorProps {
  selected: string | null;
  onSelect: (id: string | null) => void;
}

export function PlatformSelector({ selected, onSelect }: PlatformSelectorProps) {
  return (
    <div className="space-y-4">
      {PLATFORM_GROUPS.map((group) => (
        <div key={group.key}>
          {/* Category header */}
          <div className="flex items-center gap-2 mb-2 px-1">
            <span className="text-xs font-semibold text-app-text uppercase tracking-wider">
              {group.label}
            </span>
            <span className={cn(
              'text-[10px] px-2 py-0.5 rounded-full font-medium',
              group.key === 'publishable'
                ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
            )}>
              {group.badge}
            </span>
          </div>

          {/* Platform pills — enhanced with hints */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {group.platforms.map((p) => {
              const isSelected = selected === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => onSelect(isSelected ? null : p.id)}
                  className={cn(
                    'flex flex-col items-start gap-1 rounded-xl border px-4 py-3 text-left transition-all duration-200',
                    isSelected
                      ? cn(
                          'border-primary-500/60 bg-gradient-to-br from-primary-600/20 to-primary-600/5 shadow-lg shadow-primary-500/10',
                          'ring-2 ring-primary-500/30'
                        )
                      : 'border-app-border/50 bg-app-surface/50 hover:bg-app-elevated/60 hover:border-app-border-light text-app-text-secondary'
                  )}
                >
                  <div className="flex items-center gap-2 w-full">
                    <PlatformIcon id={p.id} size={20} />
                    <span className={cn(
                      'text-sm font-semibold',
                      isSelected ? 'text-primary-300' : 'text-app-text'
                    )}>
                      {p.label}
                    </span>
                    {isSelected && (
                      <span className="ml-auto text-[10px] text-primary-400 font-medium bg-primary-500/15 px-2 py-0.5 rounded-full">
                        已选
                      </span>
                    )}
                  </div>
                  <span className={cn(
                    'text-[11px] leading-relaxed',
                    isSelected ? 'text-primary-300/70' : 'text-app-text-tertiary'
                  )}>
                    {p.hint}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
