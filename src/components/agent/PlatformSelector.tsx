import { cn } from '../../utils/helpers';

// ── Platform data ──

export interface Platform {
  id: string;
  label: string;
  icon: string;
  category: 'publishable' | 'content' | 'professional';
}

export const PLATFORM_GROUPS: { key: Platform['category']; label: string; badge: string; platforms: Platform[] }[] = [
  {
    key: 'publishable',
    label: '社交平台',
    badge: '可一键发布',
    platforms: [
      { id: 'xiaohongshu', label: '小红书', icon: '📕', category: 'publishable' },
      { id: 'wechat', label: '公众号', icon: '📱', category: 'publishable' },
      { id: 'weibo', label: '微博', icon: '🔵', category: 'publishable' },
      { id: 'douyin', label: '抖音', icon: '🎵', category: 'publishable' },
      { id: 'bilibili', label: 'B站', icon: '🅱️', category: 'publishable' },
    ],
  },
  {
    key: 'content',
    label: '内容创作',
    badge: '提供文案',
    platforms: [
      { id: 'copywriting', label: '产品文案', icon: '📝', category: 'content' },
      { id: 'brand-story', label: '品牌故事', icon: '💼', category: 'content' },
      { id: 'ad-copy', label: '广告文案', icon: '📢', category: 'content' },
      { id: 'fiction', label: '小说故事', icon: '📖', category: 'content' },
      { id: 'script', label: '剧本脚本', icon: '🎬', category: 'content' },
    ],
  },
  {
    key: 'professional',
    label: '专业写作',
    badge: '提供文案',
    platforms: [
      { id: 'tech-doc', label: '技术文档', icon: '📘', category: 'professional' },
      { id: 'tutorial', label: '教程指南', icon: '📗', category: 'professional' },
      { id: 'seo', label: 'SEO文章', icon: '🔍', category: 'professional' },
      { id: 'email', label: '邮件营销', icon: '📧', category: 'professional' },
    ],
  },
];

export const ALL_PLATFORMS = PLATFORM_GROUPS.flatMap(g => g.platforms);
export const PLATFORM_MAP = new Map(ALL_PLATFORMS.map(p => [p.id, p]));

// ── Component ──

interface PlatformSelectorProps {
  selected: string | null;
  onSelect: (id: string | null) => void;
}

export function PlatformSelector({ selected, onSelect }: PlatformSelectorProps) {
  return (
    <div className="space-y-2">
      {PLATFORM_GROUPS.map((group) => (
        <div key={group.key}>
          {/* Category header */}
          <div className="flex items-center gap-2 mb-1.5 px-1">
            <span className="text-[10px] font-medium text-app-text-tertiary uppercase tracking-wider">
              {group.label}
            </span>
            <span className={cn(
              'text-[9px] px-1.5 py-0.5 rounded-full font-medium',
              group.key === 'publishable'
                ? 'bg-green-500/10 text-green-400'
                : 'bg-blue-500/10 text-blue-400'
            )}>
              {group.badge}
            </span>
          </div>

          {/* Platform pills */}
          <div className="flex flex-wrap gap-1.5">
            {group.platforms.map((p) => (
              <button
                key={p.id}
                onClick={() => onSelect(selected === p.id ? null : p.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all',
                  selected === p.id
                    ? 'border-primary-500/50 bg-primary-600/15 text-primary-400 shadow-sm'
                    : 'border-app-border bg-app-surface text-app-text-secondary hover:text-app-text hover:border-app-border-light'
                )}
              >
                <span className="text-sm">{p.icon}</span>
                {p.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
