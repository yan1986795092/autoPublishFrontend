/**
 * 抖音图文详情页
 *
 * 布局（一屏完整展示）：
 *   ① 顶栏     44px
 *   ② 图片区   flex-1   — 撑满剩余空间
 *   ③ 话题     36px
 *   ④ 正文标题  auto
 *   ⑤ 标签     24px
 *   ⑥ 日期     20px
 *   ⑦ 输入框   48px
 */

import React, { useMemo, useState } from 'react';
import type { PlatformPreviewProps } from './index';
import { mockAvatarGradient } from './mockDataFactory';
import { formatMetric } from './index';

export function DouyinPreview({ content: rawContent, data }: PlatformPreviewProps) {
  const content = rawContent || data?.mockContent || '';
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const today = new Date().toISOString().slice(0, 10);
  const images = data?.images ?? [];

  // ── 弹幕 ──
  const bullets = useMemo(() => {
    return content.split('\n').filter(l => l.trim()).slice(0, 3).map(l =>
      l.replace(/^[-•*#]\s*/, '').slice(0, 30)
    );
  }, [content]);

  // ── 话题：来自 data.title ──
  const topic = data?.title ? `#${data.title}#` : '';

  // ── 正文：从 content 提取（跳过第一行标题和最后一行标签） ──
  const bodyLines = useMemo(() => {
    const lines = content.split('\n');
    return lines
      .slice(1)                                // 跳过第一行标题
      .filter(l => {
        const t = l.trim();
        // 过滤掉空行、列表符
        if (!t || /^[-•*]\s*$/.test(t)) return false;
        // 过滤掉全是 #tag 的行（最后一行标签）
        const clean = t.replace(/#[^#\s]+/g, '').trim();
        if (!clean) return false;
        return true;
      });
  }, [content]);

  // ── 标签：优先用 data.tags，兜底从正文提取（跳过第一行标题） ──
  const tags = (data?.tags && data.tags.length > 0
    ? data.tags
    : [...new Set(content.split('\n').slice(1).join(' ').match(/#\S+/g) ?? [])].map(t => t.slice(1))
  ).slice(0, 4);

  // ── 作者 ──
  const authorName = data?.author?.name ?? '';
  const authorAvatarColor = useMemo(() => {
    if (authorName) return mockAvatarGradient(authorName);
    return ['#F472B6', '#FBCFE8'] as [string, string];
  }, [authorName]);

  // ── 互动数 ──
  const likes = data?.metrics?.likes;
  const comments = data?.metrics?.comments;
  const collects = data?.metrics?.collects;
  const shares = data?.metrics?.shares;

  return (
    <div className="w-full h-full bg-white flex flex-col overflow-hidden">

      {/* ① 顶栏 — 44px */}
      <div className="h-[44px] flex items-center gap-2 px-3 bg-white shrink-0">
        <button className="p-0.5 text-gray-800 shrink-0">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        <div
          className="w-7 h-7 rounded-full shrink-0"
          style={{ background: `linear-gradient(135deg, ${authorAvatarColor[0]}, ${authorAvatarColor[1]})` }}
        />

        <p className="flex-1 text-[14px] font-semibold text-gray-900 leading-tight truncate">
          {authorName}
        </p>

        <button className="h-[26px] px-3 rounded-full bg-gray-800 text-white text-[12px] font-semibold shrink-0">
          关注
        </button>

        <button className="p-0.5 text-gray-800 shrink-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* ② 可滚动内容区 */}
      <div className="flex-1 min-h-0 flex flex-col overflow-y-auto">

        {/* 图片区 — 按宽度按比例算高，整页可滚 */}
        <div className="relative w-full bg-gray-100 overflow-hidden shrink-0" style={{ aspectRatio: '4/3' }}>
          <div
            className="flex h-full transition-transform duration-300 ease-out"
            style={{ transform: `translateX(-${currentImageIndex * 100}%)` }}
          >
            {images.length > 0 ? (
              images.map((img, i) => (
                <img
                  key={i}
                  src={img}
                  alt=""
                  className="w-full h-full object-cover flex-shrink-0"
                  onClick={() => setCurrentImageIndex(i)}
                />
              ))
            ) : (
              <div className="w-full h-full flex-shrink-0 bg-gradient-to-br from-gray-200 via-gray-300 to-gray-200" />
            )}
          </div>

          {/* 弹幕 */}
          <div className="absolute left-2 bottom-3 right-10 flex flex-col gap-[3px] z-10 pointer-events-none">
            {bullets.map((line, i) => (
              <div key={i} className="bg-black/45 backdrop-blur-[2px] rounded px-1.5 py-px self-start">
                <span className="text-white text-[11px] leading-tight">{line}</span>
              </div>
            ))}
          </div>

          {/* 图片指示器 */}
          {images.length > 1 && (
            <>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 z-10">
                {images.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all ${i === currentImageIndex ? 'w-3 bg-white' : 'w-1.5 bg-white/40'}`}
                  />
                ))}
              </div>
              <div className="absolute top-2 right-2 bg-black/50 rounded px-1.5 py-px z-10">
                <span className="text-white text-[10px]">{currentImageIndex + 1}/{images.length}</span>
              </div>
              {currentImageIndex > 0 && (
                <button
                  onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(prev => prev - 1); }}
                  className="absolute left-1.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/40 flex items-center justify-center z-10"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                    <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              )}
              {currentImageIndex < images.length - 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(prev => prev + 1); }}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/40 flex items-center justify-center z-10"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                    <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              )}
            </>
          )}
        </div>

        {/* ③ 话题 — 36px */}
        <div className="h-[36px] flex items-center justify-between px-3 bg-white shrink-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="w-[16px] h-[16px] rounded-full bg-blue-500 flex items-center justify-center shrink-0">
              <svg width="9" height="9" viewBox="0 0 24 24" fill="white">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
              </svg>
            </div>
            <span className="text-[13px] font-semibold text-blue-500 truncate">
              {topic}
            </span>
          </div>
          <button className="flex items-center gap-px text-[12px] text-blue-500 font-medium shrink-0 ml-1">
            去发布
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* ④ 正文 — 多段落 */}
        <div className="px-3 py-1.5 bg-white">
          {bodyLines.map((line, i) => (
            <p key={i} className="text-[15px] text-gray-900 leading-relaxed">
              {line.replace(/[*_`]/g, '').trim()}
            </p>
          ))}
        </div>

        {/* ⑤ 标签行 — 24px */}
        <div className="px-3 h-[24px] flex items-center flex-wrap gap-x-1.5 bg-white shrink-0">
          {tags.map((tag, i) => (
            <span key={i} className="text-[12px] text-blue-500 font-medium">{tag}</span>
          ))}
        </div>

        {/* ⑥ 日期 — 20px */}
        <div className="px-3 h-[20px] flex items-center bg-white shrink-0">
          <span className="text-[11px] text-gray-400">{today}</span>
        </div>
      </div>

      {/* ⑦ 输入框 + 互动按钮 — 52px，固定底部 */}
      <div className="h-[52px] flex items-center gap-3 px-3 bg-white shrink-0">
        <div className="flex-1 bg-gray-100 rounded-full px-3.5 py-1.5 text-[12px] text-gray-400">
          说点什么...
        </div>

        <div className="flex items-center gap-4 text-gray-500 shrink-0">
          <DouyinAction icon="heart" count={likes != null ? formatMetric(likes) : ''} />
          <DouyinAction icon="comment" count={comments != null ? formatMetric(comments) : ''} />
          <DouyinAction icon="star" count={collects != null ? formatMetric(collects) : ''} />
          <DouyinAction icon="share" count={shares != null ? formatMetric(shares) : ''} />
        </div>
      </div>
    </div>
  );
}

function DouyinAction({ icon, count }: { icon: 'heart' | 'comment' | 'star' | 'share'; count: string }) {
  const iconEls = {
    heart: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="#FF1D45" stroke="#FF1D45" strokeWidth="1.8">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    comment: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18z" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    star: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="#FFD700" stroke="#FFD700" strokeWidth="1.8">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    share: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  };
  return (
    <div className="flex flex-col items-center gap-px text-gray-800">
      {iconEls[icon]}
      <span className="text-[10px] font-medium">{count}</span>
    </div>
  );
}
