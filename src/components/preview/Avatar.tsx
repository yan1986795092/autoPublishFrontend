/** Avatar — 统一的作者头像组件
 *
 * 优先使用远程图片（mockDataFactory 自动用 DiceBear 生成）
 * 加载失败 / 占位时回退到首字母渐变方块
 *
 * 设计要点：
 * - `<img>` 加 `onError` 切换到首字母模式
 * - 渐变色背景按 hash 稳定选择
 * - 不打断布局：用 padding-bottom-100 + absolute 居中
 */

import React, { useState } from 'react';

const AVATAR_GRADIENTS: Array<[string, string]> = [
  ['#FF6B6B', '#FFB4A2'],
  ['#4ECDC4', '#A8E6CF'],
  ['#FFD93D', '#FFEEA8'],
  ['#A78BFA', '#DDD6FE'],
  ['#60A5FA', '#BFDBFE'],
  ['#F472B6', '#FBCFE8'],
  ['#34D399', '#A7F3D0'],
  ['#FB923C', '#FED7AA'],
];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function pickGradient(name: string): [string, string] {
  return AVATAR_GRADIENTS[hashStr(name || 'default') % AVATAR_GRADIENTS.length];
}

/** DiceBear 各平台风格映射（SVG 服务，跨域友好，无需后端） */
const AVATAR_STYLES: Record<string, string> = {
  xiaohongshu: 'shapes',
  weibo: 'avataaars',
  douyin: 'fun-emoji',
  bilibili: 'bottts',
  wechat: 'notionists',
};

/** 根据平台 + 名字生成稳定的远程头像 URL（当 src 缺失时的兜底） */
export function buildAvatarUrl(name: string, platform?: string | null): string {
  const seed = hashStr(name || 'default');
  const style = (platform && AVATAR_STYLES[platform]) || 'avataaars';
  // api.dicebear.com/8.x 免费 SVG 服务，支持自定义背景渐变
  return `https://api.dicebear.com/8.x/${style}/svg?seed=${seed}&backgroundType=gradientLinear&radius=50`;
}

interface AvatarProps {
  /** 远程头像 URL；有就显示，加载失败/无 URL 走 DiceBear 或渐变占位 */
  src?: string | null | undefined;
  /** 用户名（用于首字母 + 配色 + DiceBear seed） */
  name: string;
  /** Tailwind 类，如 "w-9 h-9" */
  size: string;
  /** 是否加圆环边框 */
  ring?: boolean;
  /** 圆环颜色（border- 后的颜色），默认粉 */
  ringColor?: string;
  /** 字号（首字母），通常 size 的 1/2 */
  textClass?: string;
  /** 平台 ID（用于切 DiceBear 风格 + 失败降级时二次尝试） */
  platform?: string | null;
  /** 强制不走真实头像（只显示首字母渐变），主要给 mock 评论用 */
  mockFallback?: boolean;
}

export function Avatar({
  src,
  name,
  size,
  ring = false,
  ringColor = 'ring-pink-100',
  textClass = 'text-[12px]',
  platform,
  mockFallback = false,
}: AvatarProps) {
  const [errored, setErrored] = useState(false);
  const [stage, setStage] = useState<0 | 1>(0);  // 0: 真实 url  1: DiceBear 兜底
  const initial = (name?.trim()?.[0] ?? '?').toUpperCase();
  const [from, to] = pickGradient(name);

  const wrap = (children: React.ReactNode) => (
    <div
      className={`relative ${size} rounded-full overflow-hidden flex-shrink-0 ${
        ring ? `ring-2 ${ringColor}` : ''
      }`}
      style={{ backgroundImage: `linear-gradient(135deg, ${from}, ${to})` }}
    >
      {children}
    </div>
  );

  // 优先真实 URL
  if (src && !errored) {
    return wrap(
      <img
        src={src}
        alt={name}
        className="w-full h-full object-cover"
        onError={() => setErrored(true)}
      />,
    );
  }

  // mockFallback 模式：跳过 DiceBear，直接走首字母（mock 评论用户，常见不去占位）
  if (mockFallback) {
    return wrap(
      <span className={`absolute inset-0 flex items-center justify-center text-white font-bold ${textClass}`}>
        {initial}
      </span>,
    );
  }

  // 兜底：用 DiceBear 远程头像渲染「真实感头像」
  const fallbackUrl = buildAvatarUrl(name, platform);
  return wrap(
    <img
      src={fallbackUrl}
      alt={name}
      className="w-full h-full object-cover"
      onError={() => setStage(1)}
    />,
  );
}