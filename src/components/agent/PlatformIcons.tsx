import { Icon } from '@iconify/react';
import { cn } from '../../utils/helpers';

// 所有平台对应的 Iconify 图标
// 品牌平台用 Simple Icons，功能类用 MDI/Lucide/Phosphor
const PLATFORM_ICON_NAMES: Record<string, string> = {
  // 社交/品牌平台 — Simple Icons（官方品牌 Logo）
  xiaohongshu: 'simple-icons:xiaohongshu',
  wechat:      'simple-icons:wechat',
  weibo:       'simple-icons:sinaweibo',
  douyin:      'simple-icons:tiktok',
  bilibili:    'simple-icons:bilibili',
  // 内容创作类 — MDI 功能图标
  copywriting:  'mdi:pen',
  fiction:     'mdi:book-open-page-variant',
  script:      'mdi:script-text',
  tutorial:    'mdi:school',
  // 专业写作类 — MDI / Lucide
  'tech-doc':  'mdi:language-markdown',
  seo:         'lucide:search',
  email:       'mdi:email-outline',
  // 品牌故事 — MDI
  'brand-story': 'mdi:auto-stories',
  // 广告文案 — MDI
  'ad-copy':   'mdi:bullhorn',
};

// 官方品牌色（用于图标背景）
const PLATFORM_BG: Record<string, string> = {
  xiaohongshu: '#FF2442',
  wechat:      '#07C160',
  weibo:       '#E6162D',
  douyin:      '#000000',
  bilibili:    '#00A1D6',
  copywriting: '#6366F1',
  'brand-story':'#8B5CF6',
  'ad-copy':   '#F59E0B',
  fiction:     '#10B981',
  script:      '#EC4899',
  'tech-doc':  '#3B82F6',
  tutorial:    '#14B8A6',
  seo:         '#4285F4',
  email:       '#64748B',
};

interface PlatformIconProps {
  id: string;
  size?: number;
  className?: string;
  /** 默认为 true：带圆角背景方块。传 false 用纯图标色（跟随文字色） */
  colored?: boolean;
}

export function PlatformIcon({ id, size = 20, className, colored = true }: PlatformIconProps) {
  const iconName = PLATFORM_ICON_NAMES[id];
  if (!iconName) return null;

  if (!colored) {
    return (
      <Icon
        icon={iconName}
        width={size}
        height={size}
        className={className}
      />
    );
  }

  const bg = PLATFORM_BG[id] ?? '#374151';

  return (
    <span
      className={cn('inline-flex items-center justify-center rounded-md flex-shrink-0', className)}
      style={{
        width: size + 4,
        height: size + 4,
        background: bg,
      }}
    >
      <Icon
        icon={iconName}
        width={Math.max(size - 4, 10)}
        height={Math.max(size - 4, 10)}
        style={{ color: 'white' }}
      />
    </span>
  );
}

export type PlatformId = keyof typeof PLATFORM_ICON_NAMES;
