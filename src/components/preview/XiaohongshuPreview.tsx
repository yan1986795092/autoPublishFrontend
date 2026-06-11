/** 小红书预览 — 手机竖屏笔记卡片 */

import type { PlatformPreviewProps } from './index';

export function XiaohongshuPreview({ content }: PlatformPreviewProps) {
  const lines = content.split('\n').filter(Boolean);
  const title = lines[0] || '';
  const body = lines.slice(1).join('\n\n');

  return (
    <div className="max-w-sm mx-auto rounded-2xl border border-app-border bg-app-surface overflow-hidden shadow-lg">
      {/* 封面占位 */}
      <div className="h-44 bg-gradient-to-br from-pink-500/20 via-red-500/10 to-orange-500/20 flex items-center justify-center">
        <span className="text-4xl">📸</span>
      </div>

      {/* 用户信息 */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-1">
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-400 to-red-500" />
        <span className="text-xs font-medium text-app-text">小红书博主</span>
        <span className="text-[10px] text-app-text-tertiary ml-auto">关注</span>
      </div>

      {/* 标题 */}
      <div className="px-4 py-1">
        <h2 className="text-sm font-bold text-app-text leading-snug">{title}</h2>
      </div>

      {/* 正文 */}
      <div className="px-4 pb-3">
        <p className="text-xs text-app-text-secondary leading-relaxed whitespace-pre-wrap">{body}</p>
      </div>

      {/* 互动栏 */}
      <div className="flex items-center justify-around border-t border-app-border/20 px-4 py-2.5 text-app-text-tertiary text-xs">
        <span>♥️ {Math.floor(Math.random() * 1000 + 100)}</span>
        <span>💬 {Math.floor(Math.random() * 100 + 10)}</span>
        <span>⭐ 收藏</span>
      </div>
    </div>
  );
}
