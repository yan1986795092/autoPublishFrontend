/** 公众号预览 — 真实微信文章样式，模拟手机端阅读体验 */

import type { PlatformPreviewProps } from './index';

function seedRand(seed: number) {
  return (n: number) => Math.floor(((seed * 9301 + 49297) % 233280) / 233280 * n);
}

function parseWechatContent(content: string) {
  const lines = content.split('\n').filter(Boolean);
  const sections: { heading?: string; body: string[] }[] = [];
  let current: { heading?: string; body: string[] } = { body: [] };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^#{1,3}\s/.test(trimmed) || /^\d+[\.、]\s/.test(trimmed) || /^[一二三四五六七八九十]+[\.、]/.test(trimmed)) {
      if (current.body.length) {
        sections.push(current);
        current = { heading: trimmed.replace(/^#+\s*/, ''), body: [] };
      } else {
        current.heading = trimmed.replace(/^#+\s*/, '');
      }
    } else {
      current.body.push(trimmed);
    }
  }
  if (current.body.length) sections.push(current);

  return {
    title: lines[0] || '公众号文章',
    sections: sections.length > 0 ? sections : [{ body: lines.slice(1) }],
    allBody: lines.slice(1).join('\n\n'),
  };
}

export function WechatPreview({ content }: PlatformPreviewProps) {
  const rand = seedRand(content.length);
  const views = rand(80000) + 5000;
  const likes = rand(800) + 100;

  const { title, sections, allBody } = parseWechatContent(content);
  const dateStr = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="max-w-xl mx-auto rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-lg shadow-emerald-500/5">
      {/* 顶部导航 */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-white border-b border-gray-100">
        <button className="text-gray-400">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <div className="flex-1 text-center">
          <span className="text-sm font-bold text-gray-800">公众号</span>
        </div>
        <button className="text-gray-400">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
        </button>
      </div>

      {/* 文章头图 */}
      <div className="relative h-40 bg-gradient-to-br from-green-800 via-emerald-700 to-teal-600 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent" />
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <span className="text-white text-xs font-bold">号</span>
          </div>
          <div>
            <p className="text-white text-xs font-semibold">科技前沿</p>
            <p className="text-white/60 text-[9px]">100万+阅读</p>
          </div>
        </div>
        <div className="absolute top-3 right-3 text-[10px] text-white/60 bg-black/30 px-2 py-1 rounded-full backdrop-blur-sm">
          深度好文
        </div>
      </div>

      {/* 公众号信息栏 */}
      <div className="px-5 pt-4 pb-1">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-green-600 to-emerald-500 flex items-center justify-center flex-shrink-0 shadow-md border-2 border-white">
            <span className="text-white text-sm font-bold">科</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-gray-800">科技前沿观察</p>
              <span className="px-1.5 py-0.5 rounded bg-green-100 text-green-600 text-[9px] font-bold">公众号</span>
            </div>
            <p className="text-[11px] text-gray-400">
              {dateStr}
              <span className="mx-1">·</span>
              阅读 {views >= 10000 ? `${(views / 10000).toFixed(1)}万` : views}
            </p>
          </div>
          <button className="px-3 py-1 rounded-full bg-green-50 border border-green-200 text-[11px] font-semibold text-green-600 hover:bg-green-100 transition-colors">
            关注
          </button>
        </div>
      </div>

      {/* 文章标题 */}
      <div className="px-5 py-3">
        <h1 className="text-xl font-bold text-gray-900 leading-snug tracking-wide">{title}</h1>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-[10px] px-2 py-0.5 rounded bg-green-50 text-green-600 border border-green-200 font-medium">原创</span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-gray-50 text-gray-400 border border-gray-200">侵权请联系删除</span>
        </div>
      </div>

      {/* 分隔线 */}
      <div className="px-5">
        <div className="h-px bg-gradient-to-r from-green-200 via-emerald-200 to-transparent" />
      </div>

      {/* 正文内容 */}
      <div className="px-5 pb-6">
        {sections.map((section, idx) => (
          <div key={idx} className="mb-5">
            {section.heading && (
              <div className="flex items-center gap-2 mb-3 mt-4">
                <div className="w-1 h-5 bg-green-500 rounded-full flex-shrink-0" />
                <h2 className="text-base font-bold text-gray-800">{section.heading}</h2>
              </div>
            )}
            <div className="text-[15px] text-gray-700 leading-8 tracking-wide whitespace-pre-wrap font-serif">
              {section.body.join('\n\n')}
            </div>
          </div>
        ))}
        {sections.length === 0 && (
          <div className="text-[15px] text-gray-700 leading-8 tracking-wide whitespace-pre-wrap font-serif">
            {allBody}
          </div>
        )}
      </div>

      {/* 底部：原文链接 */}
      <div className="mx-5 mb-4 p-3 rounded-xl bg-gray-50 border border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-green-100 flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="#07C160"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg>
          </div>
          <div className="flex-1">
            <p className="text-[11px] font-semibold text-gray-700">阅读全文</p>
            <p className="text-[10px] text-gray-400">点击查看原文</p>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"><path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
      </div>

      {/* 底部互动栏 */}
      <div className="border-t border-gray-100 bg-gray-50/50">
        <div className="flex items-center justify-around py-3">
          <div className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-red-500 cursor-pointer transition-colors">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
            <span className="text-[11px]">{likes}</span>
          </div>
          <div className="w-px h-5 bg-gray-200" />
          <div className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-green-500 cursor-pointer transition-colors">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/>
            </svg>
            <span className="text-[11px]">分享</span>
          </div>
          <div className="w-px h-5 bg-gray-200" />
          <div className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-yellow-500 cursor-pointer transition-colors">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/>
            </svg>
            <span className="text-[11px]">收藏</span>
          </div>
          <div className="w-px h-5 bg-gray-200" />
          <div className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-gray-600 cursor-pointer transition-colors">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
            </svg>
            <span className="text-[11px]">投诉</span>
          </div>
        </div>

        {/* 赞赏 */}
        <div className="mx-5 mb-3 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-yellow-100 border border-yellow-300 flex items-center justify-center">
                <span className="text-yellow-500 text-[8px]">赞</span>
              </div>
              <span className="text-[11px] text-gray-400">喜欢就赞赏一下吧</span>
            </div>
            <button className="px-4 py-1 rounded-full bg-yellow-50 border border-yellow-200 text-[11px] font-semibold text-yellow-600 hover:bg-yellow-100 transition-colors">
              赞赏 ¥1
            </button>
          </div>
        </div>
      </div>

      {/* 阅读安全提示 */}
      <div className="px-5 py-2 text-center text-[10px] text-gray-300 bg-gray-50">
        微信安全认证 · 绿色阅读
      </div>
    </div>
  );
}
