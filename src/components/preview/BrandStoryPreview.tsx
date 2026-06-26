/** 品牌故事预览 — 杂志社论大图排版，模拟高端品牌官网叙事页 */

import type { PlatformPreviewProps } from './index';

function parseBrandStory(content: string) {
  const paragraphs = content.split('\n\n').filter(l => l.trim());
  return paragraphs;
}

export function BrandStoryPreview({ content, contentType }: PlatformPreviewProps) {
  const paragraphs = parseBrandStory(content);
  const tagline = paragraphs[0] || '';
  const rest = paragraphs.slice(1);

  return (
    <div className="max-w-2xl mx-auto bg-white overflow-hidden">
      {/* 全屏 Hero 图 */}
      <div className="relative h-72 bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 overflow-hidden">
        {/* 装饰纹理 */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-10 left-10 w-64 h-64 border border-white/20 rounded-full" />
          <div className="absolute top-20 left-20 w-96 h-96 border border-white/10 rounded-full" />
        </div>

        {/* 顶部导航 */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-8 py-5">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20">
              <span className="text-white font-bold text-sm">品</span>
            </div>
            <span className="text-white/80 text-sm font-medium tracking-widest uppercase">Brand</span>
          </div>
          <div className="flex items-center gap-6">
            {['品牌故事', '产品', '关于'].map((item, i) => (
              <span key={i} className={`text-sm cursor-pointer ${i === 0 ? 'text-white' : 'text-white/50 hover:text-white/80'}`}>{item}</span>
            ))}
          </div>
        </div>

        {/* 品牌名大字 */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-white/10 text-9xl font-black tracking-[0.3em] absolute select-none">B</div>
          <div className="relative z-10 text-center">
            <p className="text-white/40 text-xs tracking-[0.5em] uppercase mb-3">Est. 2024</p>
            <h1 className="text-white text-5xl font-black tracking-tight leading-none">
              {tagline || '品牌名称'}
            </h1>
            <div className="mt-6 flex items-center justify-center gap-3">
              <div className="w-8 h-px bg-white/30" />
              <span className="text-white/50 text-xs tracking-[0.3em] uppercase">Brand Story</span>
              <div className="w-8 h-px bg-white/30" />
            </div>
          </div>
        </div>
      </div>

      {/* 引用金句 */}
      <div className="px-8 py-12 bg-white">
        <div className="max-w-xl mx-auto">
          <div className="relative pl-8">
            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-purple-400 via-pink-400 to-transparent" />
            <svg className="absolute -left-4 -top-2" width="24" height="24" viewBox="0 0 24 24" fill="#E9D5FF">
              <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/>
            </svg>
            <blockquote className="text-2xl font-light text-gray-800 leading-relaxed italic font-serif">
              {tagline || '每一件产品，都承载着我们对美好的追求与想象。'}
            </blockquote>
            <div className="mt-4 flex items-center gap-3">
              <div className="w-8 h-px bg-purple-300" />
              <span className="text-sm text-gray-400">品牌创始人</span>
            </div>
          </div>
        </div>
      </div>

      {/* 叙事正文 */}
      <div className="px-8 pb-12 bg-white">
        <div className="max-w-xl mx-auto">
          {/* 章节线 */}
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-px bg-gray-200" />
            <span className="text-xs text-gray-400 tracking-[0.3em] uppercase">品牌故事</span>
          </div>

          {rest.map((p, idx) => (
            <div key={idx} className="mb-8">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-50 border border-purple-100 flex items-center justify-center mt-1">
                  <span className="text-purple-500 text-xs font-bold">{idx + 1}</span>
                </div>
                <div className="flex-1">
                  <p className="text-[15px] text-gray-600 leading-8 tracking-wide font-serif whitespace-pre-wrap">
                    {p.trim()}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {rest.length === 0 && (
            <p className="text-[15px] text-gray-600 leading-8 tracking-wide font-serif">{content}</p>
          )}
        </div>
      </div>

      {/* 品牌数据 */}
      <div className="px-8 py-10 bg-gradient-to-b from-gray-50 to-gray-100 border-t border-gray-200">
        <div className="max-w-xl mx-auto grid grid-cols-3 gap-4">
          {[
            { num: '5', label: '年品牌历史' },
            { num: '100+', label: '款产品系列' },
            { num: '50万+', label: '忠实用户' },
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <p className="text-3xl font-black text-gray-800">{stat.num}</p>
              <p className="text-xs text-gray-400 mt-1 tracking-wider uppercase">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA 栏 */}
      <div className="px-8 py-8 bg-gray-900 text-center">
        <p className="text-white text-lg font-bold mb-4">探索更多品牌故事</p>
        <div className="flex items-center justify-center gap-4">
          <button className="px-6 py-2.5 rounded-full bg-white text-gray-900 text-sm font-bold hover:bg-gray-100 transition-colors">
            了解更多
          </button>
          <button className="px-6 py-2.5 rounded-full border border-white/30 text-white text-sm font-medium hover:bg-white/10 transition-colors">
            联系我们
          </button>
        </div>
      </div>
    </div>
  );
}
