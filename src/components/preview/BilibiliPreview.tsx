/** B站预览 — 真实 B站 App 视频卡片，完整模拟播放界面 */

import type { PlatformPreviewProps } from './index';

function parseBiliScript(content: string) {
  const lines = content.split('\n').filter(Boolean);
  const scenes: { visual: string; audio: string }[] = [];
  let current: { visual: string; audio: string } | null = null;

  for (const line of lines) {
    if (line.includes('【画面】') || line.includes('[画面]') || line.startsWith('画面：') || line.includes('画面')) {
      if (current) scenes.push(current);
      current = { visual: line.replace(/【画面】|\[画面\]|画面：|画面/, '').trim(), audio: '' };
    } else if (line.includes('【声音】') || line.includes('[声音]') || line.startsWith('声音：') || line.includes('旁白') || line.includes('字幕')) {
      if (current) current.audio = line.replace(/【声音】|\[声音\]|声音：|旁白|字幕/, '').trim();
      else scenes.push({ visual: '', audio: line.replace(/【声音】|\[声音\]|声音：|旁白|字幕/, '').trim() });
    } else if (current) {
      current.audio += (current.audio ? '\n' : '') + line;
    } else {
      current = { visual: line, audio: '' };
    }
  }
  if (current) scenes.push(current);
  if (scenes.length === 0) scenes.push({ visual: '', audio: content });
  return scenes;
}

const DANMAKU_POOL = [
  { text: '太强了太强了', color: '#64B5F6' },
  { text: '哈哈哈哈哈哈', color: '#FFD54F' },
  { text: '学到了学到了', color: '#81C784' },
  { text: '前方高能预警', color: '#EF5350' },
  { text: '绝了绝了绝了', color: '#F48FB1' },
  { text: '一键三连！', color: '#BA68C8' },
  { text: '这期干货满满', color: '#4DD0E1' },
  { text: 'B站大学名不虚传', color: '#FF8A65' },
  { text: '下次一定', color: '#90A4AE' },
  { text: '弹幕护体', color: '#AED581' },
];

export function BilibiliPreview({ content }: PlatformPreviewProps) {
  const scenes = parseBiliScript(content);
  const videoTitle = scenes[0]?.audio?.slice(0, 80) || 'B站视频标题';

  return (
    <div className="max-w-2xl mx-auto rounded-2xl border border-pink-200/30 bg-[#f4f5f7] overflow-hidden shadow-xl shadow-purple-500/5">
      {/* B站风格顶栏 */}
      <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500">
        <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center border border-white/20">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
            <path d="M17.813 4.653h.854c.725 0 1.31.585 1.31 1.31v9.273c0 .725-.585 1.31-1.31 1.31H5.333c-.725 0-1.31-.585-1.31-1.31V5.963c0-.725.585-1.31 1.31-1.31h.854V3.11h1.31v1.543h7.007V3.11h1.31v1.543zM6.64 8.587v2.62h2.62v-2.62H6.64zm8.513 0v2.62h-2.62v-2.62h2.62z"/>
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-white text-sm font-bold">UP主名称</p>
          <p className="text-white/60 text-[10px]">投稿 · 3.2万 粉丝</p>
        </div>
        <button className="px-3 py-1 rounded-full bg-white/20 text-white text-[11px] font-semibold hover:bg-white/30 transition-colors border border-white/20">
          + 关注
        </button>
      </div>

      {/* 视频封面区 */}
      <div className="relative bg-black aspect-video flex items-center justify-center overflow-hidden">
        {/* 背景光效 */}
        <div className="absolute inset-0 bg-gradient-to-br from-pink-900/40 via-transparent to-blue-900/30" />

        <div className="text-center relative z-10">
          <div className="w-20 h-20 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-pink-500 via-purple-500 to-blue-500 flex items-center justify-center shadow-2xl">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
          <p className="text-white/40 text-xs">点击播放视频</p>
        </div>

        {/* 播放按钮悬浮 */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
          <div className="w-16 h-16 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
        </div>

        {/* 视频时长 */}
        <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/60 text-white text-[10px] font-medium">
          12:34
        </div>

        {/* 画质标志 */}
        <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/60 text-white/60 text-[10px]">
          1080P
        </div>

        {/* 弹幕遮罩 */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 left-0 right-0 h-6 overflow-hidden">
            <div className="flex gap-12 animate-[scroll_12s_linear_infinite] whitespace-nowrap" style={{ animation: 'biliScroll 12s linear infinite' }}>
              <span style={{ color: '#EF5350' }} className="text-[13px] font-bold">前方高能</span>
              <span style={{ color: '#64B5F6' }} className="text-[13px]">太强了吧</span>
              <span style={{ color: '#FFD54F' }} className="text-[13px]">哈哈哈</span>
              <span style={{ color: '#81C784' }} className="text-[13px]">学到了</span>
            </div>
          </div>
          <div className="absolute top-1/2 left-0 right-0 h-6 overflow-hidden">
            <div className="flex gap-12 animate-[scroll_16s_linear_infinite] whitespace-nowrap" style={{ animation: 'biliScroll2 16s linear infinite' }}>
              <span style={{ color: '#BA68C8' }} className="text-[13px]">一键三连！</span>
              <span style={{ color: '#4DD0E1' }} className="text-[13px]">干货满满</span>
              <span style={{ color: '#FF8A65' }} className="text-[13px]">B站大学</span>
            </div>
          </div>
        </div>
      </div>

      {/* 视频标题 */}
      <div className="px-4 py-3 bg-white border-b border-gray-200">
        <h3 className="text-base font-bold text-gray-800 leading-snug line-clamp-2">
          {videoTitle}
        </h3>
        <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-400">
          <span className="flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
            12.3万
          </span>
          <span>·</span>
          <span className="flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z"/></svg>
            2天前
          </span>
          <span>·</span>
          <span className="flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            2.1k 评论
          </span>
        </div>
      </div>

      {/* 双栏脚本区 */}
      <div className="bg-white">
        <div className="grid grid-cols-2 border-b border-gray-200">
          <div className="px-4 py-2.5 flex items-center gap-2 border-r border-gray-100 bg-gradient-to-r from-pink-50 to-white">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#EC4899"><path d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14z"/></svg>
            <span className="text-[11px] font-bold text-pink-600 uppercase tracking-wider">🎬 画面</span>
          </div>
          <div className="px-4 py-2.5 flex items-center gap-2 bg-gradient-to-l from-blue-50 to-white">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#3B82F6"><path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/></svg>
            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">🎤 旁白</span>
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {scenes.map((scene, idx) => (
            <div key={idx} className="grid grid-cols-2 min-h-[60px]">
              <div className="px-4 py-3 border-r border-gray-100 bg-gradient-to-r from-pink-50/50 to-white">
                {scene.visual ? (
                  <p className="text-[12px] text-gray-600 leading-relaxed whitespace-pre-wrap font-mono">
                    {scene.visual}
                  </p>
                ) : (
                  <p className="text-[11px] text-pink-300 italic">（画面描述）</p>
                )}
              </div>
              <div className="px-4 py-3 bg-gradient-to-l from-blue-50/50 to-white">
                {scene.audio ? (
                  <p className="text-[12px] text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {scene.audio}
                  </p>
                ) : (
                  <p className="text-[11px] text-blue-300 italic">（旁白内容）</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 弹幕模拟区 */}
      <div className="px-4 py-3 bg-[#f4f5f7] border-t border-gray-200">
        <div className="flex items-center gap-2 mb-2">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="#F48FB1"><circle cx="12" cy="12" r="10"/><path d="M8 12l2 2 4-4" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">弹幕</span>
          <span className="px-1.5 py-0.5 rounded bg-pink-100 text-pink-500 text-[10px]">已开启</span>
        </div>
        <div className="h-6 overflow-hidden relative">
          <div className="absolute inset-0 flex flex-col gap-0.5">
            <div className="flex gap-6" style={{ animation: 'biliScroll 8s linear infinite' }}>
              {DANMAKU_POOL.map((d, i) => (
                <span key={i} style={{ color: d.color }} className="text-[11px] whitespace-nowrap font-bold">
                  {d.text}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 三连按钮组 */}
      <div className="flex items-center justify-around px-4 py-3 bg-white border-t border-gray-200">
        {/* 点赞 */}
        <div className="flex flex-col items-center gap-1 group cursor-pointer">
          <div className="w-12 h-12 rounded-full border-2 border-gray-200 flex items-center justify-center group-hover:border-pink-400 group-hover:bg-pink-50 transition-all">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#A1A1AA" strokeWidth="1.8" className="group-hover:stroke-pink-500 group-hover:fill-pink-500 group-hover:fill-opacity-20 transition-all">
              <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="text-[10px] text-gray-500 group-hover:text-pink-500">12.3k</span>
        </div>

        {/* 投币 */}
        <div className="flex flex-col items-center gap-1 group cursor-pointer">
          <div className="w-12 h-12 rounded-full border-2 border-gray-200 flex items-center justify-center group-hover:border-yellow-400 group-hover:bg-yellow-50 transition-all">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#A1A1AA" strokeWidth="1.8" className="group-hover:stroke-yellow-500 transition-all">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6v6l4 2" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="text-[10px] text-gray-500 group-hover:text-yellow-500">投币</span>
        </div>

        {/* 收藏 */}
        <div className="flex flex-col items-center gap-1 group cursor-pointer">
          <div className="w-12 h-12 rounded-full border-2 border-gray-200 flex items-center justify-center group-hover:border-purple-400 group-hover:bg-purple-50 transition-all">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#A1A1AA" strokeWidth="1.8" className="group-hover:stroke-purple-500 transition-all">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="text-[10px] text-gray-500 group-hover:text-purple-500">收藏</span>
        </div>

        {/* 分享 */}
        <div className="flex flex-col items-center gap-1 group cursor-pointer">
          <div className="w-12 h-12 rounded-full border-2 border-gray-200 flex items-center justify-center group-hover:border-blue-400 group-hover:bg-blue-50 transition-all">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#A1A1AA" strokeWidth="1.8" className="group-hover:stroke-blue-500 transition-all">
              <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="text-[10px] text-gray-500 group-hover:text-blue-500">分享</span>
        </div>
      </div>
    </div>
  );
}
