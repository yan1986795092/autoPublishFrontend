/** 小红书预览 — 真实手机端笔记卡片，完整模拟 App 内笔记样式 */

import type { PlatformPreviewProps } from './index';

function seedRand(seed: number) {
  return (n: number) => Math.floor(((seed * 9301 + 49297) % 233280) / 233280 * n);
}

function extractTags(content: string) {
  return content.match(/#[^#\n]+?(?=#|$)/g)?.map(t => t.replace('#', '').trim()).filter(Boolean) ?? [];
}

function parseXHSContent(content: string) {
  const tagLines: string[] = [];
  const bodyLines: string[] = [];
  const lines = content.split('\n');

  let inTag = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^#{1,3}\s/.test(trimmed) || /^(热门|爆款|必看|种草|好物|分享|打卡|测评)/.test(trimmed)) {
      tagLines.push(trimmed.replace(/^#+\s*/, ''));
      inTag = true;
    } else if (/^标签|标签：|话题：/.test(trimmed)) {
      inTag = true;
    } else {
      bodyLines.push(trimmed);
      inTag = false;
    }
  }

  return {
    title: tagLines[0] || bodyLines[1] || '种草笔记',
    tags: tagLines.slice(1),
    body: bodyLines.slice(1).join('\n\n'),
  };
}

export function XiaohongshuPreview({ content }: PlatformPreviewProps) {
  const rand = seedRand(content.length);
  const likes = rand(30000) + 1000;
  const comments = rand(2000) + 100;
  const collects = rand(5000) + 200;
  const shares = rand(500) + 30;

  const tags = extractTags(content);
  const { title, body } = parseXHSContent(content);
  const displayBody = body || content;

  return (
    <div className="max-w-sm mx-auto rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-xl shadow-red-500/5">
      {/* 手机状态栏 */}
      <div className="flex items-center justify-between px-5 py-1.5 bg-white text-[10px] text-gray-400">
        <span>9:41</span>
        <div className="flex items-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3a4.237 4.237 0 0 0-6 0zm-4-4l2 2a7.074 7.074 0 0 1 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"/></svg>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M15.67 4H14V2h-4v2H8.33C7.6 4 7 4.6 7 5.33v15.33C7 21.4 7.6 22 8.33 22h7.33c.74 0 1.34-.6 1.34-1.33V5.33C17 4.6 16.4 4 15.67 4z"/></svg>
        </div>
      </div>

      {/* 顶部导航 */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-white border-b border-gray-100">
        <button className="text-gray-400">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <div className="flex-1 text-center">
          <span className="text-sm font-bold text-gray-800">笔记详情</span>
        </div>
        <button className="text-gray-400">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
        </button>
      </div>

      {/* 封面图区 */}
      <div className="relative h-52 bg-gradient-to-br from-pink-50 via-red-50 to-orange-50 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-pink-100 to-red-100 border border-red-200/50 flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="#FF2442"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
          </div>
        </div>
        {/* 图片计数角标 */}
        <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/40 text-white text-[10px]">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="inline mr-0.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
          9
        </div>
        {/* 分享按钮 */}
        <div className="absolute bottom-2 left-2 px-2 py-1 rounded-full bg-black/40 text-white text-[10px] flex items-center gap-1">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/></svg>
          分享
        </div>
      </div>

      {/* 用户信息 */}
      <div className="flex items-center gap-2.5 px-4 pt-3 pb-1">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-400 to-red-500 flex items-center justify-center flex-shrink-0">
          <span className="text-white text-xs font-bold">U</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold text-gray-800">生活美学家</p>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-50 text-red-500 font-medium">关注</span>
          </div>
          <p className="text-[10px] text-gray-400">IP属地广东 · 3分钟前</p>
        </div>
        <button className="px-3 py-1 rounded-full bg-red-500 text-white text-[11px] font-semibold hover:bg-red-600 transition-colors">
          + 关注
        </button>
      </div>

      {/* 笔记正文 */}
      <div className="px-4 py-3">
        {/* 标题 */}
        <h2 className="text-[15px] font-bold text-gray-800 leading-snug mb-2">{title}</h2>
        {/* 标签 */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2.5">
            {tags.slice(0, 5).map((tag, i) => (
              <span key={i} className="text-[11px] text-pink-500 font-medium">#{tag}</span>
            ))}
          </div>
        )}
        <p className="text-[13px] text-gray-700 leading-6 whitespace-pre-wrap">
          {displayBody}
        </p>
      </div>

      {/* 商品/打卡地点标签 */}
      <div className="mx-4 mb-3 p-3 rounded-xl bg-pink-50 border border-pink-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-pink-100 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#FF2442"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-gray-700">查看地点</p>
            <p className="text-[10px] text-gray-400">添加地点获取更多曝光</p>
          </div>
        </div>
      </div>

      {/* 互动栏 */}
      <div className="flex items-center justify-around border-t border-gray-100 px-4 py-3 bg-white">
        <div className="flex items-center gap-1.5 text-gray-400 hover:text-pink-500 cursor-pointer transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
          <span className="text-xs">{likes >= 1000 ? `${(likes / 1000).toFixed(1)}w` : likes}</span>
        </div>
        <div className="flex items-center gap-1.5 text-gray-400 hover:text-pink-500 cursor-pointer transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="text-xs">{comments >= 1000 ? `${(comments / 1000).toFixed(1)}w` : comments}</span>
        </div>
        <div className="flex items-center gap-1.5 text-gray-400 hover:text-pink-500 cursor-pointer transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/>
          </svg>
          <span className="text-xs">{collects >= 1000 ? `${(collects / 1000).toFixed(1)}w` : collects}</span>
        </div>
        <div className="flex items-center gap-1.5 text-gray-400 hover:text-pink-500 cursor-pointer transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/>
          </svg>
          <span className="text-xs">{shares >= 1000 ? `${(shares / 1000).toFixed(1)}w` : shares}</span>
        </div>
      </div>

      {/* 底部安全条 */}
      <div className="flex items-center justify-center gap-4 py-2 bg-gray-50 border-t border-gray-100">
        <span className="text-[9px] text-gray-300">图片内容仅供参考</span>
        <span className="text-[9px] text-gray-300">·</span>
        <span className="text-[9px] text-gray-300">举报</span>
      </div>
    </div>
  );
}
