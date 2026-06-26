/** 平台专属预览组件统一导出 */
import type { ComponentType } from 'react';

// ── 通用接口 ──
export interface PlatformPreviewProps {
  content: string;
  contentType?: string;  // 内容类型（copywriting/tech-doc 等），用于组合渲染
}

// ── 默认降级组件 ──
export function DefaultPreview({ content, contentType }: PlatformPreviewProps) {
  return (
    <div className="text-sm leading-relaxed text-gray-700">
      {contentType ? (
        // ContentRenderer 在下面引入，动态加载避免循环依赖
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

  // fiction, tech-doc, email 等可以直接用更复杂的样式
  // 降级：纯文本
  return <div className="whitespace-pre-wrap">{lines.map((l, i) => <p key={i} className="mb-1">{l || ' '}</p>)}</div>;
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
