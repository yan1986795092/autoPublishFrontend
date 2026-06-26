/** 技术文档预览 — 开发者文档风格，左侧导航 + 右侧内容 + 代码高亮 */

import type { PlatformPreviewProps } from './index';
import { ContentRenderer } from './ContentRenderer';

export function TechDocPreview({ content, contentType }: PlatformPreviewProps) {
  const hasCode = content.includes('```') || content.includes('`');
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="max-w-2xl mx-auto rounded-2xl border border-gray-800 bg-[#0D1117] overflow-hidden shadow-xl">
      {/* 文档顶部导航 */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-[#161B22] border-b border-gray-800">
        {/* macOS 按钮 */}
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
        </div>
        <div className="flex-1 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#21262D] border border-gray-700 text-[11px] text-gray-400">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
            docs / getting-started.md
          </div>
        </div>
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8B949E" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35" strokeLinecap="round"/></svg>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8B949E" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
        </div>
      </div>

      {/* 文档主体：侧边栏 + 内容 */}
      <div className="flex">
        {/* 左侧导航 */}
        <div className="w-44 bg-[#161B22] border-r border-gray-800 py-4 flex-shrink-0">
          <div className="px-3 mb-2">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">目录</p>
          </div>
          {[
            { name: 'Getting Started', active: true },
            { name: 'Installation', active: false },
            { name: 'Configuration', active: false },
            { name: 'API Reference', active: false },
            { name: 'Examples', active: false },
          ].map((item, i) => (
            <div
              key={i}
              className={`px-3 py-1.5 text-[12px] cursor-pointer rounded-sm mx-1 ${item.active ? 'text-white bg-[#30363D]' : 'text-gray-400 hover:text-gray-200 hover:bg-[#21262D]'}`}
            >
              {item.name}
            </div>
          ))}
        </div>

        {/* 右侧内容 */}
        <div className="flex-1 py-5 px-6 overflow-auto max-h-[500px]">
          <ContentRenderer content={content} contentType={contentType} />
        </div>
      </div>

      {/* 底部导航 */}
      <div className="flex items-center justify-between px-6 py-3 border-t border-gray-800 bg-[#161B22]">
        <button className="flex items-center gap-1.5 text-[11px] text-gray-400 hover:text-gray-200 transition-colors">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
          上一页
        </button>
        <span className="text-[10px] text-gray-600">Powered by 技术文档生成器</span>
        <button className="flex items-center gap-1.5 text-[11px] text-gray-400 hover:text-gray-200 transition-colors">
          下一页
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>
    </div>
  );
}
