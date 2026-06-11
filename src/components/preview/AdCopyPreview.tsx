/** 广告文案预览 — 信息流广告卡片 */

import type { PlatformPreviewProps } from './index';

export function AdCopyPreview({ content }: PlatformPreviewProps) {
  const lines = content.split('\n').filter(Boolean);
  const headline = lines[0] || '';
  const body = lines.slice(1).join('\n');

  return (
    <div className="rounded-xl border border-app-border bg-app-surface overflow-hidden max-w-sm mx-auto shadow-sm">
      {/* 广告标签 */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-app-elevated/50 border-b border-app-border/20">
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 font-medium">广告</span>
          <span className="text-[10px] text-app-text-tertiary">赞助商</span>
        </div>
        <span className="text-[9px] text-app-text-tertiary/60">···</span>
      </div>

      {/* 图片占位 */}
      <div className="h-36 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center border-b border-app-border/10">
        <div className="text-center">
          <span className="text-3xl">🖼️</span>
          <p className="text-[10px] text-app-text-tertiary mt-1">广告图片</p>
        </div>
      </div>

      {/* 文案 */}
      <div className="px-4 py-3">
        <h3 className="text-sm font-bold text-app-text mb-1.5 leading-snug">{headline}</h3>
        <p className="text-xs text-app-text-secondary leading-relaxed line-clamp-3">{body}</p>
      </div>

      {/* CTA 按钮 */}
      <div className="px-4 pb-3">
        <button className="w-full py-2 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-semibold hover:shadow-lg hover:shadow-orange-500/20 transition-all">
          立即了解
        </button>
      </div>

      {/* 互动数据 */}
      <div className="flex items-center gap-3 px-4 py-2 border-t border-app-border/20 text-[10px] text-app-text-tertiary">
        <span>🔥 2.3k 赞</span>
        <span>💬 156 评论</span>
        <span>📌 推广</span>
      </div>
    </div>
  );
}
