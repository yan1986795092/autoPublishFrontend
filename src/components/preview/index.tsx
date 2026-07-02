/** 平台预览组件统一导出 */
import type { ComponentType } from 'react';

export { Avatar } from './Avatar';

// ── 通用接口 ──
export interface AdapterData {
  cover?: string | null;
  title?: string | null;
  tags?: string[];
  metrics?: {
    likes?: number | null;
    comments?: number | null;
    shares?: number | null;
    views?: number | null;
    collects?: number | null;
  } | null;
  author?: {
    name?: string;
    avatar?: string;
    verified?: boolean;
  } | null;
  publishTime?: string | null;
  /** 模拟正文：选平台但未生成时，平台组件用此字段作为 content */
  mockContent?: string | null;
  extras?: Record<string, unknown>;
}

export interface PlatformPreviewProps {
  content: string;
  contentType?: string;  // 内容类型（copywriting/tech-doc 等），用于组合渲染
  data?: AdapterData;    // 平台结构化数据（封面、互动数、作者等）
  isPlaceholder?: boolean; // true 时为占位骨架态，内容可能为空
}

export const PUBLISHABLE_PLATFORM_IDS = new Set([
  'xiaohongshu', 'wechat', 'weibo', 'douyin', 'bilibili',
]);
export const WRITING_STYLE_IDS = new Set([
  'copywriting', 'brand-story', 'ad-copy', 'fiction', 'script',
  'tech-doc', 'tutorial', 'email', 'seo',
]);

export function isPublishablePlatform(id: string | null | undefined): boolean {
  return !!id && PUBLISHABLE_PLATFORM_IDS.has(id);
}
export function isWritingStyle(id: string | null | undefined): boolean {
  return !!id && WRITING_STYLE_IDS.has(id);
}

// ── 缺封面占位（统一降级 UI — 模仿真实 App 的图片加载骨架） ──
export function CoverPlaceholder({
  platform,
  topic,
  ratio = 'aspect-[4/3]',
}: {
  platform: string;
  topic?: string | null;
  ratio?: string;
}) {
  const gradientMap: Record<string, string> = {
    xiaohongshu: 'from-pink-100 via-rose-50 to-pink-50',
    wechat: 'from-green-100 via-emerald-50 to-green-50',
    weibo: 'from-orange-100 via-amber-50 to-orange-50',
    douyin: 'from-cyan-100 via-sky-50 to-cyan-50',
    bilibili: 'from-pink-100 via-fuchsia-50 to-pink-50',
  };
  const gradient = gradientMap[platform] ?? 'from-gray-100 via-gray-50 to-gray-100';
  return (
    <div className={cn(
      'relative w-full overflow-hidden flex items-center justify-center',
      ratio,
      'bg-gradient-to-br',
      gradient,
    )}>
      <div className="absolute inset-0 opacity-[0.15]" style={{
        backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 12px, rgba(0,0,0,0.03) 12px, rgba(0,0,0,0.03) 24px)',
      }} />
      <div className="relative text-center px-4">
        <div className="mb-2 flex justify-center">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-300">
            <rect x="3" y="3" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" stroke="none"/>
            <path d="M21 15l-5-5L5 21" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <p className="text-[11px] font-medium text-gray-400/80">封面区域</p>
        {topic && <p className="text-[10px] mt-0.5 text-gray-300 max-w-[160px] mx-auto truncate">{topic}</p>}
      </div>
    </div>
  );
}

// ── 模拟模式水印 — 未使用，保留导出以防扩展 ──
// export function PreviewMockWatermark() { ... }

// cn 辅助函数（避免循环依赖到 utils/helpers）
function cn(...inputs: Array<string | undefined | null | false>): string {
  return inputs.filter(Boolean).join(' ');
}

// ── 默认降级组件 ──
export function DefaultPreview({ content, contentType }: PlatformPreviewProps) {
  return (
    <div className="text-sm leading-relaxed text-gray-700">
      {contentType ? (
        <DefaultContentRenderer content={content} contentType={contentType} />
      ) : (
        <div className="whitespace-pre-wrap">{content || '*暂无内容*'}</div>
      )}
    </div>
  );
}

/** 内联轻量 ContentRenderer，避免 DefaultPreview 和 ContentRenderer 的循环引用问题 */
function DefaultContentRenderer({ content, contentType }: { content: string; contentType: string }) {
  const lines = content.split('\n');
  const isBullet = (l: string) => /^[·\-*•]\s/.test(l) || /^\d[\.、]\s/.test(l);
  const isPrice = (l: string) => /^[\$¥￥]/.test(l) || /限时|特惠|到手/.test(l);
  const isCTA = (l: string) => /^(立即|马上|限时|点击|注册|购买|下载|免费|试用|抢购|获取|咨询|了解|下单)/i.test(l) && l.length < 50;
  const isSubHeadline = (l: string) => l.trim().length > 0 && l.trim().length <= 40 && !/[。！？，、：；]$/.test(l.trim()) && !/^[\s*·\-•\d.]+$/.test(l.trim());

  if (contentType === 'copywriting') {
    return (
      <div>
        {lines.map((line, i) => {
          if (!line.trim()) return <p key={i} className="mb-1">&nbsp;</p>;
          if (isCTA(line)) return <p key={i} className="mb-2 mt-1"><span className="inline-block px-4 py-1.5 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 text-white text-[12px] font-bold shadow">{line}</span></p>;
          if (isPrice(line)) return <p key={i} className="mb-1.5"><span className="inline-flex items-baseline gap-1 px-2 py-0.5 rounded bg-red-50 text-red-500 font-bold text-[18px]">¥{line.replace(/[^0-9.]/g, '')}</span></p>;
          if (isBullet(line)) return <p key={i} className="flex items-start gap-1.5 mb-1.5"><span className="w-4 h-4 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center flex-shrink-0 mt-0.5"><svg width="8" height="8" viewBox="0 0 24 24" fill="#3B82F6"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg></span><span className="flex-1">{line.replace(/^[·\-*•\d、.\s]+/, '')}</span></p>;
          if (isSubHeadline(line)) return <p key={i} className="text-[14px] font-bold text-gray-800 mb-1 mt-2">{line}</p>;
          return <p key={i} className="mb-1">{line}</p>;
        })}
      </div>
    );
  }

  return <div className="whitespace-pre-wrap">{lines.map((l, i) => <p key={i} className="mb-1">{l || ' '}</p>)}</div>;
}

// ── 平台 → 预览组件映射 ──
import { XiaohongshuPreview } from './XiaohongshuPreview';
import { WechatPreview } from './WechatPreview';
import { WeiboPreview } from './WeiboPreview';
import { DouyinPreview } from './DouyinPreview';
import { BilibiliPreview } from './BilibiliPreview';
import { StyleSkinPreview } from './StyleSkinPreview';

export const PREVIEW_MAP: Record<string, ComponentType<PlatformPreviewProps>> = {
  // 发布平台 → 模拟壳
  xiaohongshu: XiaohongshuPreview,
  wechat: WechatPreview,
  weibo: WeiboPreview,
  douyin: DouyinPreview,
  bilibili: BilibiliPreview,
  // 写作文体 → 统一 StyleSkin（按 contentType 切皮肤）
  copywriting: StyleSkinPreview,
  'brand-story': StyleSkinPreview,
  'ad-copy': StyleSkinPreview,
  fiction: StyleSkinPreview,
  script: StyleSkinPreview,
  'tech-doc': StyleSkinPreview,
  tutorial: StyleSkinPreview,
  email: StyleSkinPreview,
  seo: StyleSkinPreview,
};

export function getPreviewComponent(platform: string | null | undefined): ComponentType<PlatformPreviewProps> {
  if (platform && PREVIEW_MAP[platform]) {
    return PREVIEW_MAP[platform];
  }
  return DefaultPreview;
}

// 补导出各组件，方便单独使用
export {
  XiaohongshuPreview,
  WechatPreview,
  WeiboPreview,
  DouyinPreview,
  BilibiliPreview,
  StyleSkinPreview,
};

// 格式化互动数（>1000 用 k / w）
export function formatMetric(n: number | null | undefined): string {
  if (n == null) return '–';
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}