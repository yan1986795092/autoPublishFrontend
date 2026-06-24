/** 剧本预览 — 标准电影剧本格式，左场景右对白 */

import type { PlatformPreviewProps } from './index';

function parseScript(content: string) {
  const lines = content.split('\n');
  const elements: { type: 'scene' | 'action' | 'character' | 'dialogue' | 'transition' | 'paren'; text: string }[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith('内') || trimmed.startsWith('外') || trimmed.startsWith('INT') || trimmed.startsWith('EXT') || trimmed.startsWith('场景')) {
      elements.push({ type: 'scene', text: trimmed });
    } else if (trimmed.startsWith('切至') || trimmed.startsWith('淡出') || trimmed.startsWith('淡入') || trimmed.startsWith('CUT TO') || trimmed.startsWith('FADE')) {
      elements.push({ type: 'transition', text: trimmed });
    } else if (/^\(.*\)$/.test(trimmed) || /^[（(].*[)）]$/.test(trimmed)) {
      elements.push({ type: 'paren', text: trimmed });
    } else if (trimmed === trimmed.toUpperCase() && trimmed.length < 25 && /^[A-Z\u4E00-\u9FA5]/.test(trimmed) && !trimmed.includes('，') && !trimmed.includes('。')) {
      elements.push({ type: 'character', text: trimmed });
    } else if (elements.length > 0 && (elements[elements.length - 1].type === 'character' || elements[elements.length - 1].type === 'paren')) {
      elements.push({ type: 'dialogue', text: trimmed });
    } else {
      elements.push({ type: 'action', text: trimmed });
    }
  }

  return elements;
}

export function ScriptPreview({ content }: PlatformPreviewProps) {
  const elements = parseScript(content);

  return (
    <div className="max-w-3xl mx-auto rounded-2xl border border-gray-800 bg-gray-950 overflow-hidden font-mono">
      {/* 剧本头部 */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z"/></svg>
          </div>
          <span className="text-gray-400 text-xs">专业剧本格式</span>
        </div>
        <div className="flex items-center gap-4 text-[10px] text-gray-500">
          <span>Scene: {elements.filter(e => e.type === 'scene').length}</span>
          <span>Dialogue: {elements.filter(e => e.type === 'dialogue').length}</span>
        </div>
      </div>

      {/* 剧本正文 */}
      <div className="px-6 py-5 space-y-1">
        {elements.map((el, idx) => {
          switch (el.type) {
            case 'scene':
              return (
                <div key={idx} className="mt-4 mb-2 text-center">
                  <div className="inline-block px-6 py-1.5 rounded bg-gray-800 border border-gray-700">
                    <span className="text-[11px] font-bold text-orange-400 uppercase tracking-widest">
                      {el.text}
                    </span>
                  </div>
                </div>
              );
            case 'transition':
              return (
                <div key={idx} className="text-right py-2">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    {el.text}
                  </span>
                </div>
              );
            case 'character':
              return (
                <div key={idx} className="flex justify-center pt-3">
                  <span className="text-[12px] font-bold text-yellow-300 uppercase tracking-wider">
                    {el.text}
                  </span>
                </div>
              );
            case 'paren':
              return (
                <div key={idx} className="flex justify-center">
                  <span className="text-[11px] text-gray-400 italic max-w-xs text-center">
                    {el.text}
                  </span>
                </div>
              );
            case 'dialogue':
              return (
                <div key={idx} className="max-w-lg mx-auto">
                  <p className="text-[12px] text-gray-200 leading-relaxed px-8">
                    {el.text}
                  </p>
                </div>
              );
            case 'action':
              return (
                <div key={idx}>
                  <p className="text-[11px] text-gray-400 italic leading-relaxed">
                    {el.text}
                  </p>
                </div>
              );
            default:
              return null;
          }
        })}

        {elements.length === 0 && (
          <p className="text-[12px] text-gray-500 leading-relaxed">{content}</p>
        )}
      </div>

      {/* 底部信息 */}
      <div className="border-t border-gray-800 px-6 py-2 bg-gray-900/50 flex items-center justify-between text-[9px] text-gray-600">
        <span>FADE IN:</span>
        <span>剧本 · 共 {elements.length} 段落</span>
        <span>FADE OUT.</span>
      </div>
    </div>
  );
}
