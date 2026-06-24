/** 抖音预览 — 真实竖屏手机短视频界面，模拟完整 App 体验 */

import type { PlatformPreviewProps } from './index';

function parseDouyinScript(content: string) {
  const lines = content.split('\n').filter(Boolean);
  const sections: { label: string; badge: string; text: string; color: string }[] = [];

  let currentText: string[] = [];
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.includes('hook') || lower.includes('开场') || lower.includes('开篇') || lower.includes('3秒') || lower.includes('开头')) {
      if (currentText.length) {
        sections.push({ label: '开场 Hook', badge: '🎯', text: currentText.join('\n'), color: 'from-rose-500/20 to-orange-500/10' });
        currentText = [];
      }
      currentText.push(line);
    } else if (lower.includes('结尾') || lower.includes('总结') || lower.includes('ending') || lower.includes('cta') || lower.includes('引导')) {
      if (currentText.length) {
        sections.push({ label: '结尾引导', badge: '👋', text: currentText.join('\n'), color: 'from-blue-500/20 to-cyan-500/10' });
        currentText = [];
      }
      currentText.push(line);
    } else if (lower.includes('脚本') || lower.includes('正文') || lower.includes('口播')) {
      if (currentText.length) {
        sections.push({ label: '口播正文', badge: '🎙', text: currentText.join('\n'), color: 'from-purple-500/20 to-pink-500/10' });
        currentText = [];
      }
      currentText.push(line);
    } else {
      currentText.push(line);
    }
  }
  if (currentText.length) {
    sections.push({ label: '口播稿', badge: '🎙', text: currentText.join('\n'), color: 'from-purple-500/20 to-pink-500/10' });
  }
  if (sections.length === 0) {
    sections.push({ label: '口播稿', badge: '🎙', text: content, color: 'from-purple-500/20 to-pink-500/10' });
  }
  return sections;
}

export function DouyinPreview({ content }: PlatformPreviewProps) {
  const sections = parseDouyinScript(content);
  const firstText = sections[0]?.text?.slice(0, 100) || '视频描述文字...';

  return (
    <div className="max-w-sm mx-auto rounded-3xl border border-white/20 bg-black overflow-hidden shadow-2xl shadow-black/60" style={{ boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8)' }}>
      {/* 手机外框 */}
      <div className="bg-black">
        {/* 顶部 App 栏 */}
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-4">
            <span className="text-white font-bold text-sm">首页</span>
            <span className="text-white/50 text-sm">朋友</span>
            <span className="text-white/50 text-sm">发布</span>
          </div>
          <div className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35" strokeLinecap="round"/></svg>
            <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
              <span className="text-white text-xs font-bold">U</span>
            </div>
          </div>
        </div>

        {/* 竖屏视频区 */}
        <div className="relative aspect-[9/16] bg-gradient-to-br from-gray-900 via-purple-950 to-black overflow-hidden">
          {/* 背景光效 */}
          <div className="absolute inset-0">
            <div className="absolute top-1/4 left-1/4 w-48 h-48 bg-pink-500/20 rounded-full blur-3xl" />
            <div className="absolute bottom-1/3 right-1/4 w-40 h-40 bg-purple-500/15 rounded-full blur-3xl" />
          </div>

          {/* 顶部标签 */}
          <div className="absolute top-3 left-3 right-3 flex justify-between items-start z-20">
            <div className="flex gap-1.5">
              <span className="px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-md text-white/80 text-[10px] font-medium border border-white/10">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="inline mr-1"><path d="M18 3v2h-4V3H8v2H4v16h4v-2h4v2h4V3h-4z"/></svg>
                标签
              </span>
            </div>
            <div className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
            </div>
          </div>

          {/* 封面主体 */}
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-pink-500/40 mb-4 ring-4 ring-white/10">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
            </div>
            <p className="text-white/40 text-xs px-8 text-center">点击播放视频</p>
          </div>

          {/* 右侧悬浮操作栏 */}
          <div className="absolute right-2 bottom-24 flex flex-col items-center gap-5 z-20">
            {/* 头像 */}
            <div className="flex flex-col items-center gap-1">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-400 to-red-500 flex items-center justify-center ring-2 ring-white/20">
                <span className="text-white text-sm font-bold">U</span>
              </div>
              <div className="w-5 h-5 rounded-full bg-pink-500 flex items-center justify-center -mt-3">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
              </div>
            </div>

            {/* 点赞 */}
            <div className="flex flex-col items-center gap-0.5">
              <div className="w-11 h-11 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
              </div>
              <span className="text-white/70 text-[10px] font-medium">32.1w</span>
            </div>

            {/* 评论 */}
            <div className="flex flex-col items-center gap-0.5">
              <div className="w-11 h-11 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                  <path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18z"/>
                </svg>
              </div>
              <span className="text-white/70 text-[10px] font-medium">8.2k</span>
            </div>

            {/* 收藏 */}
            <div className="flex flex-col items-center gap-0.5">
              <div className="w-11 h-11 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                  <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/>
                </svg>
              </div>
              <span className="text-white/70 text-[10px] font-medium">收藏</span>
            </div>

            {/* 分享 */}
            <div className="flex flex-col items-center gap-0.5">
              <div className="w-11 h-11 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                  <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/>
                </svg>
              </div>
              <span className="text-white/70 text-[10px] font-medium">分享</span>
            </div>

            {/* 音乐唱片 */}
            <div className="w-12 h-12 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center mt-1 ring-2 ring-white/10">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center animate-spin" style={{ animationDuration: '4s' }}>
                <div className="w-3 h-3 rounded-full bg-white/80" />
              </div>
            </div>
          </div>

          {/* 底部信息区 */}
          <div className="absolute bottom-3 left-4 right-14 z-20">
            <p className="text-white font-semibold text-sm leading-snug mb-1">@抖音创作者</p>
            <p className="text-white/80 text-xs leading-relaxed line-clamp-2 mb-2">{firstText}</p>
            {/* 音乐信息 */}
            <div className="flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
              <p className="text-white/80 text-[10px] truncate">🎵 原声 · 用户创作</p>
            </div>
          </div>
        </div>

        {/* 口播脚本区 */}
        {sections.length > 0 && (
          <div className="bg-gradient-to-b from-black to-gray-950 border-t border-white/5">
            <div className="px-4 pt-3 pb-2">
              <div className="flex items-center gap-2 mb-2">
                <div className="px-2.5 py-1 rounded-full bg-pink-500/20 border border-pink-500/20 text-pink-400 text-[10px] font-semibold flex items-center gap-1">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/></svg>
                  口播脚本
                </div>
                <span className="text-white/30 text-[10px]">{sections.length} 段</span>
              </div>
              <div className="space-y-2">
                {sections.map((section, idx) => (
                  <div key={idx} className={`rounded-xl bg-gradient-to-br ${section.color} border border-white/5 p-3`}>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="text-xs">{section.badge}</span>
                      <span className="text-[11px] font-semibold text-white/60 uppercase tracking-wider">{section.label}</span>
                    </div>
                    <p className="text-xs text-white/85 leading-relaxed whitespace-pre-wrap">{section.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 底部 Tab 栏 */}
        <div className="flex items-center justify-around py-2.5 bg-black border-t border-white/5">
          {['首页', '朋友', '拍摄', '消息', '我'].map((tab, i) => (
            <div key={i} className={`flex flex-col items-center gap-0.5 ${i === 0 ? 'text-white' : 'text-white/40'}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill={i === 0 ? 'white' : 'currentColor'}>
                {i === 0 && <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>}
                {i === 1 && <><circle cx="12" cy="4" r="2"/><path d="M15.89 8.11C15.5 7.72 14.83 7 13.53 7h-3.06c-1.3 0-1.97.72-2.36 1.11L6.89 9.4c-.15.15-.15.39 0 .54l.54.54c.15.15.39.15.54 0l1.27-1.27c.38-.38.91-.59 1.54-.59h3.44c.63 0 1.16.21 1.54.59l1.27 1.27c.15.15.39.15.54 0l.54-.54c.15-.15.15-.39 0-.54l-2.28-2.28z"/><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2z"/></>}
                {i === 2 && <><path d="M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0"/><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h5V7h2v4h4v2z"/></>}
                {i === 3 && <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>}
                {i === 4 && <><circle cx="12" cy="8" r="4"/><path d="M12 14c-4.42 0-8 1.79-8 4v2h16v-2c0-2.21-3.58-4-8-4z"/></>}
              </svg>
              <span className="text-[8px]">{tab}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
