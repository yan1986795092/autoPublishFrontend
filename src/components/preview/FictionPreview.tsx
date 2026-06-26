/** 小说预览 — 沉浸式阅读器，护眼模式 + 翻页 + 章节导航 */

import type { PlatformPreviewProps } from './index';

export function FictionPreview({ content, contentType }: PlatformPreviewProps) {
  const paragraphs = content.split('\n').filter(Boolean);
  const estimatedPages = Math.max(1, Math.ceil(content.length / 600));

  return (
    <div className="max-w-lg mx-auto rounded-2xl overflow-hidden shadow-2xl" style={{ background: '#F7F3EB' }}>
      {/* 阅读器顶栏 */}
      <div className="px-4 py-2.5 flex items-center justify-between" style={{ background: '#3D3D3D' }}>
        <button className="text-white/60 hover:text-white">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <div className="text-center">
          <p className="text-white text-xs font-medium">第 1 章</p>
          <p className="text-white/40 text-[9px]">《故事名称》</p>
        </div>
        <button className="text-white/60 hover:text-white">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
        </button>
      </div>

      {/* 章节导航条 */}
      <div className="px-4 py-1.5 border-b border-amber-200/30" style={{ background: '#F7F3EB' }}>
        <div className="flex items-center gap-2 text-[10px" style={{ color: '#8B7355' }}>
          <span>目录</span>
          <div className="flex-1 h-1 rounded-full" style={{ background: '#E8DFC8' }}>
            <div className="w-1/4 h-full rounded-full" style={{ background: '#C4A882' }} />
          </div>
          <span>第1页/共{estimatedPages}页</span>
        </div>
      </div>

      {/* 正文区域 */}
      <div className="px-6 py-8 min-h-[400px]">
        {paragraphs.length === 0 ? (
          <p className="text-center text-amber-700/40 italic">暂无正文内容</p>
        ) : (
          paragraphs.map((p, i) => (
            <p
              key={i}
              className="text-justify leading-9 mb-6"
              style={{
                color: '#4A3728',
                fontFamily: 'Georgia, "Songti SC", serif',
                fontSize: '15px',
                textIndent: '2em',
              }}
            >
              {p}
            </p>
          ))
        )}
      </div>

      {/* 翻页区域 */}
      <div className="px-6 py-4 border-t border-amber-200/30 flex items-center justify-between" style={{ background: '#F7F3EB' }}>
        <button className="px-4 py-1.5 rounded-full text-xs flex items-center gap-1.5 transition-colors" style={{ background: '#E8DFC8', color: '#8B7355' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
          上一页
        </button>

        {/* 页码 */}
        <div className="flex items-center gap-1">
          {[1, 2, 3, '...', estimatedPages].map((page, i) => (
            <div key={i} className={`w-6 h-6 rounded flex items-center justify-center text-[10px] ${page === 1 ? 'text-white rounded-full' : 'text-amber-700/50'}`}
              style={page === 1 ? { background: '#C4A882' } : {}}>
              {page}
            </div>
          ))}
        </div>

        <button className="px-4 py-1.5 rounded-full text-xs flex items-center gap-1.5 transition-colors" style={{ background: '#C4A882', color: 'white' }}>
          下一页
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>

      {/* 底部设置栏 */}
      <div className="px-4 py-2.5 flex items-center justify-around border-t border-amber-200/20" style={{ background: '#EEE5D4' }}>
        {/* 字号 */}
        <button className="flex flex-col items-center gap-0.5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8B7355" strokeWidth="2"><path d="M4 7V4h16v3M9 20h6M12 4v16"/></svg>
          <span className="text-[9px]" style={{ color: '#8B7355' }}>字号</span>
        </button>
        {/* 背景 */}
        <button className="flex flex-col items-center gap-0.5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8B7355" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 0 20"/></svg>
          <span className="text-[9px]" style={{ color: '#8B7355' }}>背景</span>
        </button>
        {/* 目录 */}
        <button className="flex flex-col items-center gap-0.5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8B7355" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
          <span className="text-[9px]" style={{ color: '#8B7355' }}>目录</span>
        </button>
        {/* 夜间 */}
        <button className="flex flex-col items-center gap-0.5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8B7355" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          <span className="text-[9px]" style={{ color: '#8B7355' }}>夜间</span>
        </button>
      </div>
    </div>
  );
}
