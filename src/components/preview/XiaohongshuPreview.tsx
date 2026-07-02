/**
 * 小红书图文详情预览
 *
 * 布局（对齐真实小红书 App 笔记详情页）：
 *   ① 顶栏       — 返回 + 头像/昵称/关注按钮 + 分享
 *   ② 图片区     — 顶部大图（4/3），多图支持
 *   ③ 标签行     — 红色 #tag 多行
 *   ④ 输入框栏   — 「说点什么...」+ 心/星/评论（带数字）
 */

import React, { useMemo, useState } from 'react';
import type { PlatformPreviewProps } from './index';
import { mockAvatarGradient } from './mockDataFactory';
import { formatMetric } from './index';
import { ContentRenderer } from './ContentRenderer';

// ── 小红书品牌色 ──
const XHS_RED = '#FF2442';
const XHS_BG = '#FFF9F9';

function extractTags(content: string): string[] {
  const inline = content.match(/#[^#\s\n]+/g)?.map(t => t.replace(/^#/, '').trim()).filter(Boolean) ?? [];
  const explicitLine = content.split('\n')
    .find(l => /^标签[:：]/.test(l.trim()))
    ?.replace(/^标签[:：]\s*/, '')
    .split(/[\s,，]+/)
    .filter(Boolean) ?? [];
  return [...new Set([...explicitLine, ...inline])].slice(0, 8);
}

function parseBody(content: string): string[] {
  const lines: string[] = [];
  for (const line of content.split('\n')) {
    const t = line.trim();
    if (!t) continue;
    if (/^[-•*]\s*$/.test(t)) continue;
    const clean = t.replace(/#[^#\s]+/g, '').trim();
    if (!clean) continue;
    lines.push(clean);
  }
  return lines;
}

export function XiaohongshuPreview({ content: rawContent, contentType, data }: PlatformPreviewProps) {
  const content = rawContent || data?.mockContent || '';
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const images = data?.images ?? [];
  const cover = data?.cover ?? null;

  const tags = data?.tags?.length ? data.tags : extractTags(content);
  const bodyLines = useMemo(() => parseBody(content), [content]);

  const bodyParagraphs = bodyLines;

  const authorName = data?.author?.name ?? '小红书用户';
  const authorAvatarColor = useMemo(() => {
    if (authorName && authorName !== '小红书用户') return mockAvatarGradient(authorName);
    return ['#F472B6', '#FBCFE8'] as [string, string];
  }, [authorName]);

  const likes = data?.metrics?.likes;
  const comments = data?.metrics?.comments;
  const collects = data?.metrics?.collects;

  // 计算图片总数（cover 算一张 + images）
  const imageList = useMemo(() => {
    const list: string[] = [];
    if (cover) list.push(cover);
    if (images?.length) list.push(...images);
    return list;
  }, [cover, images]);

  return (
    <div className="w-full h-full flex flex-col overflow-hidden" style={{ background: XHS_BG }}>

      {/* ① 顶栏 — 奶白底，红色品牌强调 */}
      <div className="h-[44px] flex items-center gap-2.5 px-3 shrink-0" style={{ background: '#FFFCFA', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <button className="p-0.5 shrink-0">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FF2442" strokeWidth="2.2">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {/* 头像 */}
        <div
          className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-white text-[12px] font-bold"
          style={{ background: `linear-gradient(135deg, ${authorAvatarColor[0]}, ${authorAvatarColor[1]})` }}
        >
          {authorName?.[0] ?? 'U'}
        </div>

        {/* 昵称 */}
        <p className="flex-1 text-[14px] font-medium text-gray-900 truncate leading-tight">
          {authorName}
        </p>

        {/* 关注按钮 */}
        <button
          className="h-[26px] px-3 rounded-full text-white text-[12px] font-semibold shrink-0"
          style={{ background: XHS_RED }}
        >
          关注
        </button>

        {/* 分享 */}
        <button className="p-0.5 shrink-0">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
            <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98"/>
          </svg>
        </button>
      </div>

      {/* 内容区 */}
      <div className="flex-1 min-h-0 flex flex-col overflow-y-auto" style={{ background: XHS_BG }}>

        {/* ② 图片区 */}
        <div className="relative w-full overflow-hidden shrink-0" style={{ aspectRatio: '4/3', background: '#F5F5F5' }}>
          {imageList.length > 0 ? (
            <div
              className="flex h-full transition-transform duration-300 ease-out"
              style={{ transform: `translateX(-${currentImageIndex * 100}%)` }}
            >
              {imageList.map((img, i) => (
                <img
                  key={i}
                  src={img}
                  alt=""
                  className="w-full h-full object-cover flex-shrink-0"
                  onClick={() => setCurrentImageIndex(i)}
                />
              ))}
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#FF2442" strokeWidth="1.2" opacity="0.3">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
              </svg>
            </div>
          )}

          {/* 多图指示器：右上角 + 底部圆点 */}
          {imageList.length > 1 && (
            <>
              <div className="absolute top-2 right-2 bg-black/50 rounded px-1.5 py-px z-10">
                <span className="text-white text-[10px]">{currentImageIndex + 1}/{imageList.length}</span>
              </div>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 z-10">
                {imageList.slice(0, 6).map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all ${i === currentImageIndex ? 'w-3 bg-white' : 'w-1.5 bg-white/40'}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* 正文 */}
        {bodyParagraphs.length > 0 && (
          <div className="px-3 py-1">
            <div className="text-[13px] leading-[1.7] text-gray-800">
              <ContentRenderer content={bodyParagraphs.join('\n')} contentType={contentType} />
            </div>
          </div>
        )}

        {/* 标签行（正文之后，红字） */}
        {tags.length > 0 && (
          <div className="px-3 py-1.5 shrink-0">
            <div className="flex flex-wrap gap-x-2 gap-y-1">
              {tags.map((tag, i) => (
                <span key={i} className="text-[13px] font-medium" style={{ color: XHS_RED }}>
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ⑤ 底部输入栏：输入框 + 心 + 星 + 评论 */}
      <div className="h-[52px] flex items-center gap-3 px-3 shrink-0" style={{ background: '#FFFCFA', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
        <div className="flex-1 rounded-full px-3.5 py-1.5 text-[12px] text-gray-400 flex items-center gap-1.5" style={{ background: '#F5F5F5' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          说点什么...
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <XhsIcon icon="heart" count={likes != null ? formatMetric(likes) : ''} />
          <XhsIcon icon="star" count={collects != null ? formatMetric(collects) : ''} />
          <XhsIcon icon="comment" count={comments != null ? formatMetric(comments) : ''} />
        </div>
      </div>
    </div>
  );
}

function XhsIcon({ icon, count }: { icon: 'heart' | 'star' | 'comment'; count: string }) {
  const color = icon === 'heart' ? '#FF2442' : icon === 'star' ? '#FFD700' : '#FF2442';
  const icons = {
    heart: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={count ? '#FF2442' : 'none'} stroke="#FF2442" strokeWidth="1.8">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    star: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={count ? '#FFD700' : 'none'} stroke="#FFD700" strokeWidth="1.8">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    comment: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FF2442" strokeWidth="1.8">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  };
  return (
    <div className="flex flex-col items-center gap-px">
      {icons[icon]}
      <span className="text-[10px] font-medium" style={{ color }}>{count}</span>
    </div>
  );
}