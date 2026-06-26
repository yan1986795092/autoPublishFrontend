/** 产品文案预览 — 真实电商商品卡片样式，模拟淘宝/京东商品页 */

import type { PlatformPreviewProps } from './index';

function parseCopywriting(content: string) {
  const lines = content.split('\n').filter(Boolean);
  const sections: { type: 'headline' | 'sub' | 'body' | 'bullet' | 'cta' | 'price'; text: string }[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^[\$¥￥]/.test(trimmed) || /^\d+[\.\d]*元|\d+[\.\d]*价格/.test(trimmed)) {
      sections.push({ type: 'price', text: trimmed });
    } else if (/立即|马上|限时|点击|注册|购买|下载|免费|试用|抢购|获取|咨询|了解|下单|下单|下单/i.test(trimmed) && trimmed.length < 50) {
      sections.push({ type: 'cta', text: trimmed });
    } else if (/^[·\-\*]\s/.test(trimmed) || /^\d[\.、]\s/.test(trimmed)) {
      sections.push({ type: 'bullet', text: trimmed.replace(/^[·\-\*\d、]\s*/, '') });
    } else if (trimmed.length < 40 && !trimmed.startsWith('-') && sections.length === 0) {
      sections.push({ type: 'headline', text: trimmed });
    } else if (trimmed.length < 60 && sections.filter(s => s.type === 'sub').length === 0) {
      sections.push({ type: 'sub', text: trimmed });
    } else {
      sections.push({ type: 'body', text: trimmed });
    }
  }
  return sections;
}

export function CopywritingPreview({ content, contentType }: PlatformPreviewProps) {
  const sections = parseCopywriting(content);
  const headline = sections.find(s => s.type === 'headline')?.text || sections[0]?.text || '商品名称';
  const subheadline = sections.find(s => s.type === 'sub')?.text;
  const cta = sections.find(s => s.type === 'cta')?.text;
  const bullets = sections.filter(s => s.type === 'bullet');
  const body = sections.filter(s => s.type === 'body');

  return (
    <div className="max-w-sm mx-auto rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-xl shadow-blue-500/5">
      {/* 图片轮播区 */}
      <div className="relative bg-gray-100 aspect-square overflow-hidden">
        {/* 图片指示器 */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-100 via-blue-50 to-purple-50 flex items-center justify-center">
          <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-blue-100 to-purple-100 border border-blue-200/50 flex items-center justify-center shadow-inner">
            <div className="text-center">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#93C5FD" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="3"/>
                <circle cx="8.5" cy="8.5" r="1.5" fill="#93C5FD"/>
                <path d="M21 15l-5-5L5 21"/>
              </svg>
            </div>
          </div>
        </div>

        {/* 图片计数器 */}
        <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-black/50 text-white text-[10px]">1/4</div>

        {/* 限时标签 */}
        <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-red-500 text-white text-[10px] font-bold shadow">
          限时特惠
        </div>

        {/* 分享按钮 */}
        <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow-sm">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.59 13.51l6.83 3.98M15.41 6.51L8.59 10.49"/></svg>
        </div>
      </div>

      {/* 价格区 */}
      <div className="px-4 pt-3 pb-1">
        <div className="flex items-end gap-2">
          <span className="text-2xl font-black text-red-500">¥99</span>
          <span className="text-sm text-gray-400 line-through font-medium">¥199</span>
          <span className="ml-auto text-[10px] px-2 py-0.5 rounded bg-red-50 text-red-500 font-bold">省50%</span>
        </div>
      </div>

      {/* 标题区 */}
      <div className="px-4 py-2">
        <h2 className="text-[14px] font-bold text-gray-800 leading-snug line-clamp-2">
          {headline}
        </h2>
        {subheadline && (
          <p className="text-[12px] text-gray-500 mt-1 leading-relaxed line-clamp-1">{subheadline}</p>
        )}
        {/* 保障标签 */}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {['7天无理由', '正品保证', '极速发货'].map((tag, i) => (
            <span key={i} className="text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded border border-green-100 flex items-center gap-0.5">
              <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* 配送信息 */}
      <div className="mx-4 py-2 border-t border-gray-100 flex items-center gap-2 text-[11px] text-gray-400">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>
        <span>广东深圳 · 快递:免运费</span>
        <span className="ml-auto">月销 2.3万</span>
      </div>

      {/* 卖点列表 */}
      {bullets.length > 0 && (
        <div className="mx-4 py-3 border-t border-gray-100">
          {bullets.map((b, idx) => (
            <div key={idx} className="flex items-start gap-2 mb-2 last:mb-0">
              <div className="w-4 h-4 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg width="8" height="8" viewBox="0 0 24 24" fill="#3B82F6"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
              </div>
              <p className="text-[12px] text-gray-700 leading-relaxed">{b.text}</p>
            </div>
          ))}
        </div>
      )}

      {body.length > 0 && (
        <div className="mx-4 pb-3 border-t border-gray-100 pt-3">
          <p className="text-[12px] text-gray-600 leading-relaxed">{body.map(b => b.text).join(' · ')}</p>
        </div>
      )}

      {/* SKU 选择区 */}
      <div className="mx-4 py-3 border-t border-gray-100">
        <div className="flex items-center gap-2 text-[11px] text-gray-500 mb-2">
          <span>选择</span>
          <span className="text-gray-800 font-medium">颜色分类</span>
        </div>
        <div className="flex gap-2">
          {['经典黑', '象牙白', '星空蓝'].map((color, i) => (
            <button key={i} className={`px-3 py-1.5 rounded-lg text-[11px] font-medium border ${i === 0 ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-200 text-gray-600 bg-white'}`}>
              {color}
            </button>
          ))}
        </div>
      </div>

      {/* 底部购买栏 */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 px-4 py-3 flex items-center gap-3 shadow-lg">
        <div className="flex flex-col items-center gap-0.5">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.8"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          <span className="text-[9px] text-gray-400">收藏</span>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.8"><path d="M17 18c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2zM7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zm0-3l1.1-2h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.47A1 1 0 0 0 20.18 4H5.08a1 1 0 0 0-.93.63L2.52 10.96A.998.998 0 0 0 3 12h1l-1 4z"/></svg>
          <span className="text-[9px] text-gray-400">购物车</span>
        </div>
        <div className="flex-1 flex gap-2">
          <button className="flex-1 py-2.5 rounded-lg bg-orange-50 border border-orange-200 text-orange-500 text-[13px] font-bold hover:bg-orange-100 transition-colors">
            加入购物车
          </button>
          <button className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 text-white text-[13px] font-bold shadow-lg shadow-orange-500/20 hover:shadow-xl hover:shadow-orange-500/30 transition-all">
            {cta || '立即购买'}
          </button>
        </div>
      </div>
    </div>
  );
}
