/** 公众号文章预览（对齐真实微信 App 文章阅读页）
 *
 * 布局：
 *   ① 顶栏        — 返回 + 标题 + ···
 *   ② 标题区      — 大标题 + [原创] + 作者 + 时间/地点/耳机/人数
 *   ③ 分隔线      — 绿色渐变线
 *   ④ 正文区      — 白底灰字正文
 *   ⑤ 底部互动栏  — 作者头像 + 昵称 + 点赞/在看/评论 + 写留言
 */

import React, { useMemo } from 'react';
import type { PlatformPreviewProps } from './index';
import { Avatar, formatMetric } from './index';
import { ContentRenderer } from './ContentRenderer';

function parseBody(content: string) {
  // 过滤掉纯 #tag 格式的行（标签已在下方独立区块展示）
  return content.split('\n')
    .filter(l => l.trim().length > 0)
    .filter(l => !/^#[^\s#]+(\s+#[^\s#]+)*$/.test(l.trim()));
}

export function WechatPreview({ content, contentType, data }: PlatformPreviewProps) {
  const bodyLines = useMemo(() => parseBody(content), [content]);
  const displayTitle = data?.title;
  const dateStr = data?.publishTime ?? new Date().toLocaleDateString('zh-CN', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  const location = (data?.extras?.location as string | undefined) ?? '上海';
  const authorName = data?.author?.name ?? '程序员鱼皮';
  const authorAvatar = data?.author?.avatar;
  const likes = data?.metrics?.likes;
  const comments = data?.metrics?.comments;
  const views = data?.metrics?.views;

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-white">

      {/* ① 顶栏 */}
      <div className="h-[44px] flex items-center px-3 shrink-0 bg-white border-b border-gray-100">
        <button className="p-0.5 shrink-0">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2.2">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <p className="flex-1 text-center text-[13px] text-gray-500 truncate px-2">
          {displayTitle ? displayTitle.slice(0, 18) + (displayTitle.length > 18 ? '…' : '') : '文章'}
        </p>
        <button className="p-0.5 shrink-0">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#999">
            <circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>
          </svg>
        </button>
      </div>

      {/* 可滚动内容区 */}
      <div className="flex-1 min-h-0 overflow-y-auto">

        {/* ② 标题区 */}
        <div className="px-5 pt-5 pb-0 bg-white">

          {/* 大标题 */}
          {displayTitle && (
            <h1 className="text-[21px] font-bold text-gray-900 leading-[1.4] tracking-wide mb-3">
              {displayTitle}
            </h1>
          )}

          {/* 元信息行 */}
          <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-[12px] text-gray-500 mb-4">
            {/* [原创] 标签 */}
            <span className="inline-flex items-center gap-0.5 px-1.5 py-px rounded-sm text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
              <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              原创
            </span>
            {/* 作者名（蓝色链接色） */}
            <span className="text-[#576B95] font-semibold">{authorName}</span>
            <span>{dateStr}</span>
            <span>{location}</span>
            {/* 耳机 + 人数 */}
            <span className="inline-flex items-center gap-0.5">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 18v-6a9 9 0 0 1 18 0v6"/>
                <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
              </svg>
              {views != null ? formatMetric(views) : 2}人
            </span>
          </div>

          {/* ③ 分隔线 */}
          <div className="h-px bg-gradient-to-r from-green-300 via-emerald-200 to-transparent mb-0" />
        </div>

        {/* ④ 正文区 */}
        <div className="px-5 py-5 text-[16px] leading-[1.9] text-gray-600 bg-white">
          {bodyLines.map((line, i) => {
            const isBold = /^[*_]{2}.+[*_]{2}$/.test(line.trim());
            const clean = line.replace(/^[*_]{2}|[*_]{2}$/g, '').trim();
            return (
              <div key={i} className="mb-4 last:mb-0">
                {isBold ? (
                  <p className="font-bold text-gray-800">{clean}</p>
                ) : (
                  <ContentRenderer content={line} contentType={contentType} />
                )}
              </div>
            );
          })}
        </div>

        {/* ⑤ 话题标签（独立区块，放在正文下方） */}
        {data?.tags && (data.tags as string[]).length > 0 && (
          <div className="flex flex-wrap gap-1 px-5 pb-4 bg-white">
            {(data.tags as string[]).map(tag => (
              <span key={tag} className="text-[12px] text-[#576B95]">#{tag}</span>
            ))}
          </div>
        )}
      </div>

      {/* ⑤ 底部互动栏 */}
      <div className="shrink-0 bg-white border-t border-gray-100 px-3 py-1.5">
        <div className="flex items-center">

          {/* 左侧：头像 + 昵称 */}
          <div className="flex items-center gap-1 shrink-0 overflow-hidden">
            <Avatar src={authorAvatar} name={authorName} platform="wechat" size="w-5 h-5" textClass="text-[8px]" />
            <span className="text-[10px] font-semibold text-gray-800 whitespace-nowrap">{authorName}</span>
          </div>

          {/* 右侧：点赞 / 评论 / 在看 / 写留言 */}
          <div className="flex items-center gap-1 ml-auto shrink-0">
            <BottomStat icon="like" count={likes != null ? formatMetric(likes) : '358'} />
            <BottomStat icon="comment" count={comments != null ? formatMetric(comments) : '27'} />
            <BottomStat icon="star" count={likes != null ? formatMetric(likes) : '358'} />
            <button className="flex items-center px-1 py-px rounded-full text-[10px] text-[#4A9E6B] border border-[#4A9E6B]/40 whitespace-nowrap shrink-0">
              写留言
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BottomStat({ icon, count }: { icon: 'like' | 'star' | 'comment'; count: string }) {
  const icons = {
    like: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#576B95" strokeWidth="1.8">
        <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/>
        <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
      </svg>
    ),
    star: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#576B95" strokeWidth="1.8">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
      </svg>
    ),
    comment: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#576B95" strokeWidth="1.8">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  };
  return (
    <div className="flex items-center gap-1 text-gray-500">
      {icons[icon]}
      <span className="text-[12px] font-medium">{count}</span>
    </div>
  );
}
