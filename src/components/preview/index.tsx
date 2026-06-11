/** 平台专属预览组件统一导出 */
import type { ComponentType } from 'react';
import Markdown from 'react-markdown';

// ── 通用接口 ──
export interface PlatformPreviewProps {
  content: string;
}

// ── 默认降级组件 ──
export function DefaultPreview({ content }: PlatformPreviewProps) {
  return (
    <div className="prose prose-invert max-w-none text-sm leading-relaxed">
      <Markdown>{content || '*暂无内容*'}</Markdown>
    </div>
  );
}

// ── 平台 → 预览组件映射 ──
// 使用 dynamic/lazy 或直接注册。新增平台只需在此注册。
import { XiaohongshuPreview } from './XiaohongshuPreview';
import { WechatPreview } from './WechatPreview';
import { WeiboPreview } from './WeiboPreview';
import { DouyinPreview } from './DouyinPreview';
import { BilibiliPreview } from './BilibiliPreview';
import { CopywritingPreview } from './CopywritingPreview';
import { BrandStoryPreview } from './BrandStoryPreview';
import { AdCopyPreview } from './AdCopyPreview';
import { FictionPreview } from './FictionPreview';
import { ScriptPreview } from './ScriptPreview';
import { TechDocPreview } from './TechDocPreview';
import { TutorialPreview } from './TutorialPreview';
import { SEOPreview } from './SEOPreview';
import { EmailPreview } from './EmailPreview';

export const PREVIEW_MAP: Record<string, ComponentType<PlatformPreviewProps>> = {
  xiaohongshu: XiaohongshuPreview,
  wechat: WechatPreview,
  weibo: WeiboPreview,
  douyin: DouyinPreview,
  bilibili: BilibiliPreview,
  copywriting: CopywritingPreview,
  'brand-story': BrandStoryPreview,
  'ad-copy': AdCopyPreview,
  fiction: FictionPreview,
  script: ScriptPreview,
  'tech-doc': TechDocPreview,
  tutorial: TutorialPreview,
  seo: SEOPreview,
  email: EmailPreview,
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
  CopywritingPreview,
  BrandStoryPreview,
  AdCopyPreview,
  FictionPreview,
  ScriptPreview,
  TechDocPreview,
  TutorialPreview,
  SEOPreview,
  EmailPreview,
};
