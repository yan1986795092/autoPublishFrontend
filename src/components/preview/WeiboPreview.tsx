/** 微博预览 — 真实微博 App 信息流卡片样式（精细化版）
 *
 * 对齐真实微博信息流卡片 UI：
 * - 作者行：大头像 + 昵称 + V 认证（蓝V/黄V/红V）+ 来源 + 时间 + 更多
 * - 正文 + #话题# + @提及
 * - 配图区域（单图/多图）
 * - 底部互动：转发 / 评论 / 赞（精确微博品牌色）
 * - 去掉所有"预览示意"自曝标签
 */

import type { PlatformPreviewProps } from './index';
import { Avatar, formatMetric } from './index';
import { ContentRenderer } from './ContentRenderer';

// ── 真实微博品牌色 ──
const WEIBO_ORANGE = '#FF8200';
const WEIBO_BLUE_V = '#1B79FB';
const WEIBO_YELLOW_V = '#FFB400';
const WEIBO_RED_V = '#E6162D';

const SOURCES = [
  '微博 for iPhone 16 Pro',
  '微博 for iPhone 15',
  '微博 for Android',
  '微博 weibo.com',
  '微博国际版',
  '来自小红书',
  '来自抖音',
  '微博视频',
];

function parseWeiboContent(content: string) {
  const topics = content.match(/#[^#\n]+?#/g)?.map(t => t.replace(/^#|#$/g, '').trim()).filter(Boolean) ?? [];
  const mentions = content.match(/@[^\s@：:\n]+/g) ?? [];
  const body = content.replace(/#[^#\n]+?#/g, '').replace(/@[^\s@：:\n]+/g, '').trim();
  const lines = body.split('\n').filter(Boolean);
  const mainText = lines.join('\n') || body;
  return { topics, mentions, mainText };
}

export function WeiboPreview({ content: rawContent, contentType, data }: PlatformPreviewProps) {
  const content = rawContent || data?.mockContent || '';
  const { topics, mentions, mainText } = parseWeiboContent(content);
  const displayTopics = data?.tags?.length ? data.tags : topics;
  const cover = data?.cover ?? null;
  const forwards = data?.metrics?.shares;
  const comments = data?.metrics?.comments;
  const likes = data?.metrics?.likes;
  const authorName = data?.author?.name ?? '微博用户';
  const authorAvatar = data?.author?.avatar;
  const verified = data?.author?.verified;

  // 动态来源（用内容 hash 稳定选一个）
  const sourceIdx = Math.abs(
    content.split('').reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0)
  ) % SOURCES.length;
  const source = SOURCES[sourceIdx];

  // 长文截断
  const isLong = mainText.length > 140;
  const displayText = isLong ? mainText.slice(0, 130) + '...' : mainText;

  return (
    <div className="w-full h-full bg-white flex flex-col overflow-hidden">
      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        {/* ── 用户信息栏 ── */}
        <div className="flex items-start gap-3 mb-3">
          <Avatar src={authorAvatar} name={authorName} platform="weibo" size="w-12 h-12" textClass="text-base" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <span className="text-[15px] font-bold text-gray-900 truncate">{authorName}</span>
              {verified !== false && (
                <WeiboVerifiedBadge type={verified === true ? 'blue' : pickVerifiedType(authorName)} />
              )}
            </div>
            <div className="flex items-center gap-1 text-[12px] text-gray-400 mt-0.5">
              <span>{data?.publishTime ?? '刚刚'}</span>
              <span>·</span>
              <span className="text-gray-500">{source}</span>
            </div>
          </div>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-gray-300 mt-0.5">
            <circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>
          </svg>
        </div>

        {/* ── 正文 ── */}
        <div className="mb-3 leading-relaxed text-[15px] text-gray-900 whitespace-pre-wrap">
          <ContentRenderer content={displayText} contentType={contentType} />
          {mentions.length > 0 && (
            <span className="text-[#FF8200] ml-1 font-medium">{mentions.join(' ')}</span>
          )}
          {isLong && (
            <span className="block mt-1 text-[#FF8200] text-[13px] font-medium">
              展开全文 ▾
            </span>
          )}
        </div>

        {/* ── 话题标签 ── */}
        {displayTopics.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-x-2 gap-y-1">
            {displayTopics.slice(0, 4).map((topic, i) => (
              <span key={i} className="text-[14px] text-[#FF8200] font-medium">
                #{topic}#
              </span>
            ))}
          </div>
        )}

        {/* ── 配图区 ── */}
        {cover ? (
          <div className="rounded-xl overflow-hidden mb-3 border border-gray-100">
            <img src={cover} alt="配图" className="w-full aspect-[16/9] object-cover" />
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden mb-3 border border-gray-100 aspect-[16/9] bg-gray-50 flex items-center justify-center">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="1.2">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
            </svg>
          </div>
        )}
      </div>

      {/* ── 底部互动栏（微博典型顺序：转发 / 评论 / 赞） ── */}
      <div className="shrink-0 flex items-center justify-around border-t border-gray-100 px-2 py-3 bg-white">
        <WeiboAction icon="forward" label={formatMetric(forwards)} />
        <WeiboAction icon="comment" label={formatMetric(comments)} />
        <WeiboAction icon="like" label={formatMetric(likes)} active color={WEIBO_ORANGE} />
      </div>
    </div>
  );
}

// ── 微博 V 认证徽章 ──
function WeiboVerifiedBadge({ type }: { type: 'blue' | 'yellow' | 'orange' | 'red' }) {
  const colors: Record<string, string> = {
    blue: WEIBO_BLUE_V,    // 媒体/企业
    yellow: WEIBO_YELLOW_V, // 个人认证
    orange: WEIBO_ORANGE,   // 兴趣认证
    red: WEIBO_RED_V,       // 官方
  };
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill={colors[type]} className="flex-shrink-0">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15l-5-5 1.41-1.41L11 14.17l6.59-6.59L19 9l-8 8z"/>
    </svg>
  );
}

function pickVerifiedType(name: string): 'blue' | 'yellow' | 'orange' {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0;
  const types: Array<'blue' | 'yellow' | 'orange'> = ['blue', 'yellow', 'orange'];
  return types[Math.abs(h) % 3];
}

// ── 互动按钮 ──
function WeiboAction({ icon, label, active, color }: {
  icon: string; label: string; active?: boolean; color?: string;
}) {
  const icons: Record<string, React.ReactNode> = {
    forward: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M17 1l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    comment: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    like: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8">
        <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
      </svg>
    ),
  };

  return (
    <div className={`flex items-center gap-1.5 text-gray-500 min-w-[60px] justify-center ${active ? 'font-medium' : ''}`}
      style={active && color ? { color } : undefined}>
      {icons[icon]}
      <span className="text-[13px]">{label}</span>
    </div>
  );
}
