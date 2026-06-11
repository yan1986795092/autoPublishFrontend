/** SEO文章预览 — Google搜索结果卡片 + 文章双栏 */

import type { PlatformPreviewProps } from './index';

function extractTitle(content: string) {
  const lines = content.split('\n').filter(Boolean);
  return lines[0] || '';
}

export function SEOPreview({ content }: PlatformPreviewProps) {
  const title = extractTitle(content);

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Google 搜索结果卡片 */}
      <div className="rounded-xl border border-app-border bg-app-surface p-4">
        <div className="flex items-center gap-1.5 text-[10px] text-app-text-tertiary mb-1">
          <span className="w-3 h-3 rounded-full bg-green-600 flex-shrink-0" />
          <span>example.com</span>
          <span>›</span>
          <span>文章路径</span>
        </div>
        <h3 className="text-sm text-blue-400 font-medium leading-snug mb-0.5 hover:underline cursor-pointer">
          {title}
        </h3>
        <p className="text-[11px] text-app-text-secondary leading-relaxed line-clamp-2">
          {content.replace(title, '').trim().slice(0, 160)}...
        </p>
      </div>

      {/* 文章正文 */}
      <div className="rounded-xl border border-app-border bg-app-surface p-5">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-app-border/20 text-[10px] text-app-text-tertiary">
          <span>🔍 SEO 优化建议</span>
          <span className="ml-auto">关键词密度: 2.1%</span>
          <span>·</span>
          <span>可读性: 良好</span>
        </div>
        <div className="prose prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap">
          {content}
        </div>
      </div>
    </div>
  );
}
