/** 剧本脚本预览 — 标准剧本格式 */

import type { PlatformPreviewProps } from './index';

function parseScript(content: string) {
  const lines = content.split('\n');
  const elements: { type: 'scene' | 'action' | 'character' | 'dialogue' | 'transition'; text: string }[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // 场景标题: 内/外景
    if (trimmed.startsWith('内') || trimmed.startsWith('外') || trimmed.startsWith('INT') || trimmed.startsWith('EXT')) {
      elements.push({ type: 'scene', text: trimmed });
    }
    // 转场
    else if (trimmed.startsWith('切至') || trimmed.startsWith('淡出') || trimmed.startsWith('CUT TO') || trimmed.startsWith('FADE')) {
      elements.push({ type: 'transition', text: trimmed });
    }
    // 人物名（全大写或带冒号）
    else if (trimmed === trimmed.toUpperCase() && trimmed.length < 30 && !trimmed.includes(' ')) {
      elements.push({ type: 'character', text: trimmed });
    }
    // 对白（人物名后的行）
    else if (elements.length > 0 && elements[elements.length - 1].type === 'character') {
      elements.push({ type: 'dialogue', text: trimmed });
    }
    // 动作描述
    else {
      elements.push({ type: 'action', text: trimmed });
    }
  }

  return elements;
}

export function ScriptPreview({ content }: PlatformPreviewProps) {
  const elements = parseScript(content);

  return (
    <div className="max-w-xl mx-auto rounded-xl border border-app-border bg-app-surface overflow-hidden font-mono">
      <div className="px-4 py-2 bg-app-elevated/50 border-b border-app-border/20 text-[10px] text-app-text-tertiary uppercase tracking-wider">
        剧本格式
      </div>
      <div className="px-4 py-4 space-y-3">
        {elements.map((el, idx) => {
          switch (el.type) {
            case 'scene':
              return (
                <div key={idx} className="text-xs font-bold text-app-text uppercase">
                  {el.text}
                </div>
              );
            case 'action':
              return (
                <div key={idx} className="text-xs text-app-text/70 italic leading-relaxed">
                  {el.text}
                </div>
              );
            case 'character':
              return (
                <div key={idx} className="text-xs font-bold text-app-text text-center uppercase pt-2">
                  {el.text}
                </div>
              );
            case 'dialogue':
              return (
                <div key={idx} className="text-xs text-app-text/80 leading-relaxed max-w-[80%] mx-auto">
                  {el.text}
                </div>
              );
            case 'transition':
              return (
                <div key={idx} className="text-[10px] text-app-text-tertiary text-right uppercase pt-2">
                  {el.text}
                </div>
              );
            default:
              return (
                <div key={idx} className="text-xs text-app-text leading-relaxed">
                  {el.text}
                </div>
              );
          }
        })}
      </div>
    </div>
  );
}
