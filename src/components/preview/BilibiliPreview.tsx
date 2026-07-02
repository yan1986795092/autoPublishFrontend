/**
 * B站视频详情页预览
 *
 * 对齐真实 B站 App 视频详情页 UI（截图版）：
 *   ① 顶栏        — 返回 + 搜索 + 分享
 *   ② 视频播放区  — 16:9 封面 + 大播放按钮
 *   ③ 视频数据栏  — 播放/弹幕/点赞/投币/收藏/分享
 *   ④ UP 主信息   — 头像 + 昵称 + 等级 + 关注
 *   ⑤ 标题       — 加粗大字
 *   ⑥ 话题标签    — 粉色 #tag#
 *   ⑦ 视频描述    — 可展开正文
 *   ⑧ 评论区域    — 头像 + 用户名 + 评论内容 + 点赞 + 时间
 */

import React, { useState } from 'react';
import type { PlatformPreviewProps } from './index';
import { Avatar, formatMetric } from './index';
import { ContentRenderer } from './ContentRenderer';

// ── 真实 B站品牌色 ──
const BILI_PINK = '#FB7299';
const BILI_BLUE = '#00A1D6';

// B站等级颜色
const LEVEL_COLORS: Record<number, string> = {
  0: '#C0C0C0', 1: '#C0C0C0', 2: '#9D9D9D',
  3: '#71B1F7', 4: '#71B1F7', 5: '#F7B500', 6: '#FB7299',
};

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return h;
}

/** 从正文抽取评论 */
function extractComments(content: string) {
  const times = ['1小时前', '3小时前', '昨天', '2小时前', '5小时前', '30分钟前'];
  const segs = content.split('\n').filter(l => l.trim().length >= 5 && l.trim().length <= 60);
  if (segs.length < 1) {
    const phrases = content.match(/[^。！？\n]{5,40}[。！？]/g);
    if (phrases && phrases.length >= 1) {
      return phrases.slice(0, 3).map((p, i) => ({
        name: ['B站老用户', '二次元爱好者', '前排围观'][i % 3],
        body: p.trim().slice(0, 40),
        likes: [128, 66, 42][i % 3],
        time: times[i % times.length],
      }));
    }
    return [];
  }
  return segs.slice(0, 3).map((s, i) => ({
    name: ['B站老用户', '二次元爱好者', '前排围观'][i % 3],
    body: s.trim().slice(0, 40),
    likes: [128, 66, 42][i % 3],
    time: times[i % times.length],
  }));
}

export function BilibiliPreview({ content: rawContent, contentType, data }: PlatformPreviewProps) {
  const content = rawContent || data?.mockContent || '';
  const cover = data?.cover ?? null;
  const likes = data?.metrics?.likes ?? 0;
  const comments = data?.metrics?.comments ?? 0;
  const collects = data?.metrics?.collects ?? 0;
  const shares = data?.metrics?.shares ?? 0;
  const coins = data?.metrics?.coins ?? 0;

  const authorName = data?.author?.name ?? 'UP主';
  const authorAvatar = data?.author?.avatar;
  const upLevel = authorName ? (Math.abs(hashCode(authorName)) % 6) + 1 : 4;
  const levelColor = LEVEL_COLORS[upLevel] ?? BILI_BLUE;

  const firstLine = content.split('\n').find(l => l.trim())?.trim() ?? '';
  const title = data?.title ?? firstLine.slice(0, 80);
  const body = content;

  const tags = data?.tags?.length ? data.tags : [];

  const commentList = extractComments(body);
  const [descExpanded, setDescExpanded] = useState(false);

  const plays = data?.metrics?.plays ?? 0;
  const danmaku = data?.metrics?.danmaku ?? Math.floor(plays * 0.15);

  return (
    <div className="w-full h-full bg-white flex flex-col overflow-hidden">

      {/* ① 顶栏 */}
      <div className="h-[44px] flex items-center justify-between px-3 bg-white shrink-0">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2.2">
          <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <div className="flex items-center gap-3">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35" strokeLinecap="round"/>
          </svg>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2">
            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
            <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98"/>
          </svg>
        </div>
      </div>

      {/* 可滚动内容 */}
      <div className="flex-1 min-h-0 overflow-y-auto">

        {/* ② 视频播放区（16:9） */}
        <div className="relative w-full bg-black" style={{ aspectRatio: '16/9' }}>
          {cover ? (
            <img src={cover} alt="封面" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-800 via-gray-900 to-black" />
          )}
          {/* 播放按钮 */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-white/85 flex items-center justify-center shadow-lg backdrop-blur-sm">
              <svg width="28" height="28" viewBox="0 0 24 24" fill={BILI_PINK}>
                <path d="M8 5v14l11-7z"/>
              </svg>
            </div>
          </div>
          {/* 播放量角标 */}
          <div className="absolute bottom-2 left-2 bg-black/60 rounded px-1.5 py-px">
            <span className="text-white text-[10px] font-medium">{formatMetric(plays)}播放</span>
          </div>
          {/* 全屏按钮 */}
          <div className="absolute bottom-2 right-2 bg-black/60 rounded px-1.5 py-px">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>

        {/* ③ 视频数据栏 */}
        <div className="flex items-center justify-around px-4 py-2.5 border-b border-gray-100">
          <BiliStatItem label="播放" value={plays} />
          <BiliStatItem label="弹幕" value={danmaku} />
          <BiliStatItem label="点赞" value={likes} color={BILI_PINK} />
          <BiliStatItem label="投币" value={coins} color="#F5A623" />
          <BiliStatItem label="收藏" value={collects} color={BILI_BLUE} />
          <BiliStatItem label="分享" value={shares} />
        </div>

        {/* ④ UP主信息 */}
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="relative shrink-0">
            <Avatar src={authorAvatar} name={authorName} platform="bilibili" size="w-10 h-10" textClass="text-[14px]" />
            <div
              className="absolute -bottom-0.5 -right-0.5 w-[14px] h-[14px] rounded-full flex items-center justify-center text-white text-[8px] font-bold ring-2 ring-white"
              style={{ backgroundColor: levelColor }}
            >{upLevel}</div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold text-gray-900 truncate">{authorName}</p>
            <p className="text-[11px] text-gray-400">{formatMetric(Math.abs(hashCode(authorName)) % 500000 + 10000)} 粉丝</p>
          </div>
          <button className="px-4 py-1 rounded-full text-white text-[12px] font-semibold shrink-0" style={{ background: BILI_PINK }}>
            + 关注
          </button>
        </div>

        {/* ⑤ 标题 */}
        {title && (
          <div className="px-4 pt-2 pb-2">
            <h1 className="text-[16px] font-bold text-gray-900 leading-snug">
              {title}
            </h1>
          </div>
        )}

        {/* ⑥ 视频描述（正文） */}
        {body && (
          <div className="px-4 pb-3">
            <div className="text-[13px] text-gray-700 leading-relaxed">
              <ContentRenderer content={body} contentType={contentType} />
            </div>
          </div>
        )}

        {/* ⑦ 话题标签 */}
        {tags.length > 0 && (
          <div className="px-4 pb-3 flex flex-wrap gap-x-2 gap-y-1">
            {tags.map((tag, i) => (
              <span key={i} className="text-[12px] font-medium" style={{ color: BILI_PINK }}>
                #{tag}#
              </span>
            ))}
          </div>
        )}

        {/* 分割线 */}
        <div className="border-t border-gray-100" />

        {/* ⑧ 评论区域 */}
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[13px] font-bold text-gray-800">
              评论 {formatMetric(comments)}
            </span>
            <span className="text-[11px] text-gray-400">按时间排序</span>
          </div>
          {commentList.length > 0 ? (
            <div className="space-y-4">
              {commentList.map((c, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <Avatar src={null} name={c.name} platform="bilibili" size="w-7 h-7" textClass="text-[10px]" mockFallback />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[12px] font-medium text-gray-700">{c.name}</span>
                      <span className="text-[10px] text-gray-400">· {c.time}</span>
                    </div>
                    <p className="text-[13px] text-gray-800 leading-relaxed mt-0.5">{c.body}</p>
                    <div className="flex items-center gap-0.5 mt-1">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="text-gray-400">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                      </svg>
                      <span className="text-[10px] text-gray-400">{c.likes}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-[12px] text-gray-400 py-4">暂无评论</div>
          )}
        </div>
      </div>
    </div>
  );
}

function BiliStatItem({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[14px] font-semibold" style={color ? { color } : { color: '#333' }}>
        {formatMetric(value)}
      </span>
      <span className="text-[10px] text-gray-400">{label}</span>
    </div>
  );
}
