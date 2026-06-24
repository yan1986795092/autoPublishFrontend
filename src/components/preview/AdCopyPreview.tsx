/** 广告文案预览 — 微信朋友圈信息流广告样式 */

import type { PlatformPreviewProps } from './index';

function seedRand(seed: number) {
  return (n: number) => Math.floor(((seed * 9301 + 49297) % 233280) / 233280 * n);
}

export function AdCopyPreview({ content }: PlatformPreviewProps) {
  const rand = seedRand(content.length);
  const likes = rand(2300) + 100;
  const comments = rand(156) + 20;
  const shares = rand(89) + 10;

  const lines = content.split('\n').filter(Boolean);
  const headline = lines[0] || '广告标题';
  const body = lines.slice(1).join('\n') || content;

  return (
    <div className="max-w-sm mx-auto rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
      {/* 朋友圈用户信息 */}
      <div className="flex items-center gap-3 px-4 pt-3 pb-2">
        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center flex-shrink-0">
          <span className="text-white text-sm font-bold">广</span>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-gray-800">广告主</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-500 font-medium">广告</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="#508AC9">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 1c2.06 0 3.97.75 5.44 1.97l-1.41 1.41C14.68 4.99 13.39 4.5 12 4.5c-1.39 0-2.68.49-3.72 1.38l-1.42-1.42C8.03 3.75 9.94 3 12 3z"/>
            </svg>
          </div>
          <p className="text-[10px] text-gray-400">赞助内容 · 刚刚</p>
        </div>
        <button className="text-gray-400">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
        </button>
      </div>

      {/* 广告文案 */}
      <div className="px-4 pb-2">
        <p className="text-[13px] text-gray-700 leading-5 whitespace-pre-wrap mb-2">{body}</p>
        {/* 话题标签 */}
        {content.includes('#') && (
          <p className="text-[12px] text-blue-500 mb-2">{content.match(/#[^#\n]+/g)?.join(' ')}</p>
        )}
      </div>

      {/* 广告卡片主体 */}
      <div className="mx-4 mb-3 rounded-2xl overflow-hidden border border-gray-100">
        {/* 图片区 */}
        <div className="relative h-40 bg-gradient-to-br from-gray-800 via-gray-900 to-black overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-900/40 via-transparent to-purple-900/30" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-2xl">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49A1.003 1.003 0 0 0 20 4H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/></svg>
            </div>
          </div>
          {/* 广告角标 */}
          <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/50 text-white text-[9px] backdrop-blur-sm">
            广告
          </div>
        </div>

        {/* 链接信息 */}
        <div className="px-3 py-2 bg-gray-50 flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center flex-shrink-0">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-gray-700 truncate">{headline}</p>
            <p className="text-[9px] text-gray-400 truncate">点击了解更多详情 →</p>
          </div>
        </div>
      </div>

      {/* 互动栏 */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100">
        <div className="flex items-center gap-1 text-gray-400 text-xs">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
          {likes}
        </div>
        <div className="flex items-center gap-4 text-[11px] text-gray-400">
          <span>💬 {comments}</span>
          <span>↗ {shares}</span>
        </div>
        <span className="text-[9px] text-gray-300">广告</span>
      </div>
    </div>
  );
}
