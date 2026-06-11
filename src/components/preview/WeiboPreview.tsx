/** 微博预览 — 信息流短帖风格 */

import type { PlatformPreviewProps } from './index';

export function WeiboPreview({ content }: PlatformPreviewProps) {
  // 提取标签和正文
  const tags = content.match(/#[^#\s]+#/g) || [];
  const body = content.replace(/#[^#\s]+#/g, '').trim();

  return (
    <div className="rounded-xl border border-app-border bg-app-surface overflow-hidden max-w-lg mx-auto">
      {/* 头栏 */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white font-bold text-sm">
          W
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-app-text">微博用户</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/15 text-yellow-400 font-medium">博主</span>
          </div>
          <span className="text-[11px] text-app-text-tertiary">刚刚 来自 微博网页版</span>
        </div>
        <button className="text-xs font-semibold text-red-500 border border-red-500/30 rounded-full px-4 py-1 hover:bg-red-500/10 transition-colors">
          关注
        </button>
      </div>

      {/* 正文 */}
      <div className="px-4 py-2">
        <p className="text-sm text-app-text leading-relaxed whitespace-pre-wrap">{body}</p>
      </div>

      {/* 话题标签 */}
      {tags.length > 0 && (
        <div className="px-4 pb-1 flex flex-wrap gap-1">
          {tags.map((tag) => (
            <span key={tag} className="text-[12px] text-blue-400 hover:text-blue-300 cursor-pointer">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* 互动栏 */}
      <div className="flex items-center justify-around border-t border-app-border/30 px-4 py-2.5 mt-2 text-app-text-tertiary">
        <div className="flex items-center gap-1.5 text-xs cursor-pointer hover:text-red-400 transition-colors">
          <span>转发</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs cursor-pointer hover:text-green-400 transition-colors">
          <span>评论</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs cursor-pointer hover:text-yellow-400 transition-colors">
          <span>赞</span>
        </div>
      </div>
    </div>
  );
}
