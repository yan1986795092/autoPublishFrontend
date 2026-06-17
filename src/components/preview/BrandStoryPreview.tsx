/** 品牌故事预览 — 叙事排版 */

import type { PlatformPreviewProps } from './index';

export function BrandStoryPreview({ content }: PlatformPreviewProps) {
  const paragraphs = content.split('\n').filter(Boolean);

  return (
    <div className="max-w-lg mx-auto rounded-xl border border-app-border bg-app-surface overflow-hidden">
      <div className="px-6 py-8">
        <div className="w-12 h-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mb-6" />
        <p className="text-xs text-app-text-tertiary uppercase tracking-[0.2em] mb-3">品牌故事</p>
        <div className="prose prose-invert max-w-none text-sm leading-8 text-app-text/90 font-serif tracking-wide whitespace-pre-wrap">
          {content}
        </div>
      </div>
    </div>
  );
}
