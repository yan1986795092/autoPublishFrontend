/** 微博预览 — 真实微博 App 信息流卡片样式 */

import type { PlatformPreviewProps } from './index';

function seedRand(seed: number) {
  return (n: number) => Math.floor(((seed * 9301 + 49297) % 233280) / 233280 * n);
}

function parseWeiboContent(content: string) {
  const topics = content.match(/#[^#\n]+?#/g)?.map(t => t.replace(/^#|#$/g, '').trim()).filter(Boolean) ?? [];
  const mentions = content.match(/@[^\s@：:]+/g) ?? [];
  const body = content.replace(/#[^#\n]+?#/g, '').replace(/@[^\s@：:]+/g, '').trim();
  const lines = body.split('\n').filter(Boolean);
  const mainText = lines[0] || body;
  const replies = lines.slice(1);

  return { topics, mentions, mainText, replies };
}

export function WeiboPreview({ content }: PlatformPreviewProps) {
  const rand = seedRand(content.length);
  const forwards = rand(5000) + 100;
  const comments = rand(3000) + 50;
  const likes = rand(20000) + 500;

  const { topics, mentions, mainText, replies } = parseWeiboContent(content);

  return (
    <div className="max-w-lg mx-auto bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
      {/* 微博卡片主体 */}
      <div className="p-4">
        {/* 用户信息栏 */}
        <div className="flex items-start gap-3 mb-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 via-red-400 to-pink-400 flex items-center justify-center flex-shrink-0 shadow-sm ring-2 ring-orange-100">
            <span className="text-white text-sm font-bold">W</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-gray-800">微博用户</span>
              {/* 蓝V */}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#508AC9">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.1 0 2 .9 2 2v1H10V7c0-1.1.9-2 2-2zm-2.9 2.1l1.4.8V10h1.4v1.6l1.6-1.1.9.5-2 1.4-.9.7-2-1.4.9-.6zm5.4.5L16 9v2h-2V9l1.5-1.1.9.6-2.1 1.4-.9.7 1.1.8zm-3.2 5c2.5 0 4.5-1.3 4.5-3s-2-3-4.5-3c-1.4 0-2.5.5-3.3 1.2L12 12l1.3-1.4z"/>
              </svg>
              <span className="px-1.5 py-0.5 rounded bg-orange-100 text-orange-500 text-[10px] font-semibold">微博达人</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-gray-400 mt-0.5">
              <span>刚刚</span>
              <span>·</span>
              <span>微博 for iPhone 16 Pro</span>
            </div>
          </div>
          <button className="text-[11px] px-3 py-1 rounded-full border border-gray-200 text-gray-500 hover:border-red-300 hover:text-red-400 transition-colors flex-shrink-0">
            + 关注
          </button>
        </div>

        {/* 正文 */}
        <div className="text-sm text-gray-800 leading-6 whitespace-pre-wrap mb-2">
          {mainText}
          {mentions.length > 0 && (
            <span className="text-blue-500 ml-1">
              {mentions.join(' ')}
            </span>
          )}
        </div>

        {/* 话题标签 */}
        {topics.length > 0 && (
          <div className="mb-3">
            {topics.slice(0, 3).map((topic, i) => (
              <span key={i} className="text-sm text-blue-500 hover:text-blue-600 cursor-pointer mr-3">
                #{topic}#
              </span>
            ))}
          </div>
        )}

        {/* 回复/引用内容 */}
        {replies.length > 0 && (
          <div className="bg-gray-50 rounded-xl p-3 mb-3 border border-gray-100">
            <div className="text-[13px] text-gray-600 leading-5 whitespace-pre-wrap">
              {replies.join('\n')}
            </div>
          </div>
        )}

        {/* 图片网格 */}
        <div className="grid grid-cols-3 gap-1 rounded-xl overflow-hidden mb-3 border border-gray-100">
          {[1, 2, 3].map(i => (
            <div key={i} className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center rounded-lg relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-100 to-pink-100" />
              <svg width="24" height="24" viewBox="0 0 24 24" fill="#D1D5DB"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
              {i === 3 && <div className="absolute inset-0 bg-black/30 flex items-center justify-center"><span className="text-white text-xs font-bold">+3</span></div>}
            </div>
          ))}
        </div>
      </div>

      {/* 底部互动栏 */}
      <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 bg-gray-50/30">
        <div className="flex items-center gap-1 text-gray-400 hover:text-blue-500 cursor-pointer transition-colors py-1 px-3">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="text-xs">{forwards >= 1000 ? `${(forwards / 1000).toFixed(1)}万` : forwards}</span>
        </div>
        <div className="flex items-center gap-1 text-gray-400 hover:text-green-500 cursor-pointer transition-colors py-1 px-3">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="text-xs">{comments >= 1000 ? `${(comments / 1000).toFixed(1)}万` : comments}</span>
        </div>
        <div className="flex items-center gap-1 text-gray-400 hover:text-red-500 cursor-pointer transition-colors py-1 px-3">
          <svg width="18" height="18" viewBox="0 0 24 24" fill={likes > 0 ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8">
            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
          </svg>
          <span className="text-xs">{likes >= 1000 ? `${(likes / 1000).toFixed(1)}万` : likes}</span>
        </div>
        <div className="flex items-center gap-1 text-gray-400 hover:text-orange-500 cursor-pointer transition-colors py-1 px-3">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="text-xs">收藏</span>
        </div>
      </div>
    </div>
  );
}
