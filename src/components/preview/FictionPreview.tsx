/** 小说故事预览 — 电子书排版 */

import type { PlatformPreviewProps } from './index';

export function FictionPreview({ content }: PlatformPreviewProps) {
  const paragraphs = content.split('\n').filter(Boolean);

  return (
    <div className="max-w-lg mx-auto rounded-xl border border-app-border bg-amber-950/20 overflow-hidden">
      <div className="px-6 py-8">
        {paragraphs.map((p, i) => (
          <p
            key={i}
            className="text-sm text-app-text/90 leading-8 first-letter:text-2xl first-letter:font-serif first-letter:float-left first-letter:mr-1 first-letter:mt-1 whitespace-pre-wrap mb-4"
          >
            {p}
          </p>
        ))}
      </div>
      {/* 页码 */}
      <div className="px-6 py-3 border-t border-app-border/10 text-center text-[10px] text-app-text-tertiary">
        — {Math.ceil(content.length / 500)} —
      </div>
    </div>
  );
}
