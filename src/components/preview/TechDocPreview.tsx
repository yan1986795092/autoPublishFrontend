/** 技术文档预览 — 开发者文档风格 */

import type { PlatformPreviewProps } from './index';

export function TechDocPreview({ content }: PlatformPreviewProps) {
  const lines = content.split('\n');
  const hasCode = content.includes('```');

  return (
    <div className="max-w-2xl mx-auto rounded-xl border border-app-border bg-app-surface overflow-hidden">
      {/* 文档导航 */}
      <div className="flex items-center gap-3 px-4 py-2 bg-app-elevated/50 border-b border-app-border/20 text-[10px] text-app-text-tertiary">
        <span>📖 文档</span>
        <span>/</span>
        <span className="text-app-text">当前页面</span>
        <span className="ml-auto">搜索文档...</span>
      </div>

      <div className="px-5 py-4">
        {hasCode ? (
          /* 有代码块：分段渲染 */
          content.split('```').map((part, idx) =>
            idx % 2 === 0 ? (
              <div key={idx} className="prose prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap mb-4">
                {part}
              </div>
            ) : (
              <pre key={idx} className="rounded-lg bg-gray-950 border border-gray-800 p-4 text-xs font-mono leading-relaxed overflow-x-auto mb-4">
                <code>{part}</code>
              </pre>
            )
          )
        ) : (
          <div className="prose prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap">
            {content}
          </div>
        )}
      </div>
    </div>
  );
}
