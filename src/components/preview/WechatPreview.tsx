/** 公众号预览 — 宽屏文章排版 */

import { useId } from 'react';
import type { PlatformPreviewProps } from './index';

export function WechatPreview({ content }: PlatformPreviewProps) {
  // 每次渲染生成随机数会抖动，用 content 的长度作确定性种子
  const seed = content.length;
  const rand = (n: number) => Math.floor(((seed * 9301 + 49297) % 233280) / 233280 * n);
  const likes = Math.floor(rand(8000) + 1000);
  const views = Math.floor(rand(9000) + 2000);

  const lines = content.split('\n').filter(Boolean);
  const title = lines[0] || '';

  return (
    <div className="max-w-xl mx-auto rounded-xl border border-app-border bg-app-surface overflow-hidden">
      {/* 头图 */}
      <div className="h-32 bg-gradient-to-br from-green-600/20 via-emerald-500/10 to-teal-600/20 flex items-center justify-center">
        <span className="text-3xl">📱</span>
      </div>

      {/* 公众号信息 */}
      <div className="flex items-center gap-2 px-5 pt-4 pb-1">
        <div className="w-5 h-5 rounded bg-green-600 flex items-center justify-center text-white text-[8px] font-bold">微</div>
        <span className="text-xs font-semibold text-app-text">公众号</span>
        <span className="text-[9px] text-app-text-tertiary ml-auto">···</span>
      </div>

      {/* 标题 */}
      <div className="px-5 py-2">
        <h1 className="text-lg font-bold text-app-text leading-snug">{title}</h1>
      </div>

      {/* 作者栏 */}
      <div className="flex items-center gap-2 px-5 pb-3 text-[10px] text-app-text-tertiary">
        <span>公众号作者</span>
        <span>·</span>
        <span>原创</span>
        <span className="ml-auto">{new Date().toLocaleDateString('zh-CN')}</span>
      </div>

      {/* 正文 */}
      <div className="px-5 pb-6">
        <div className="prose prose-invert max-w-none text-sm leading-7 text-app-text tracking-wide whitespace-pre-wrap">
          {lines.slice(1).join('\n\n')}
        </div>
      </div>

      {/* 底部 */}
      <div className="px-5 py-3 border-t border-app-border/20 text-center text-[10px] text-app-text-tertiary">
        阅读 {views.toLocaleString()} · 分享 · 在看
      </div>
    </div>
  );
}
