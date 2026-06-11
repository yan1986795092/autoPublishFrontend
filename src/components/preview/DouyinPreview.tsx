/** 抖音预览 — 口播稿分段展示，标注时长和动作 */

import type { PlatformPreviewProps } from './index';

function parseScriptSections(content: string) {
  // 尝试按 hook/正文/结尾 分段
  const lines = content.split('\n').filter(Boolean);
  const sections: { label: string; text: string; duration?: string; color: string }[] = [];

  let currentLabel = '正文';
  let currentText: string[] = [];

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.includes('hook') || lower.includes('开场') || lower.includes('开篇')) {
      if (currentText.length) {
        sections.push({ label: currentLabel, text: currentText.join('\n'), color: 'from-rose-500/20 to-rose-600/10' });
        currentText = [];
      }
      currentLabel = '🎯 开场 Hook';
      continue;
    }
    if (lower.includes('结尾') || lower.includes('总结') || lower.includes('ending') || lower.includes('cta')) {
      if (currentText.length) {
        sections.push({ label: currentLabel, text: currentText.join('\n'), color: 'from-blue-500/20 to-blue-600/10' });
        currentText = [];
      }
      currentLabel = '👋 结尾引导';
      continue;
    }
    // 检查时长标注
    if (/^\d+s/.test(line.trim()) || /^\d+秒/.test(line.trim())) {
      currentText.push(`⏱ ${line.trim()}`);
      continue;
    }
    currentText.push(line);
  }
  if (currentText.length) {
    sections.push({ label: currentLabel, text: currentText.join('\n'), color: 'from-purple-500/20 to-purple-600/10' });
  }

  // 如果没有解析出分段，整段作为正文
  if (sections.length === 0) {
    sections.push({ label: '📱 口播稿', text: content, color: 'from-purple-500/20 to-purple-600/10' });
  }

  return sections;
}

export function DouyinPreview({ content }: PlatformPreviewProps) {
  const sections = parseScriptSections(content);

  return (
    <div className="rounded-xl border border-app-border bg-gradient-to-br from-gray-950 to-gray-900 overflow-hidden max-w-lg mx-auto shadow-2xl">
      {/* 抖音风格顶栏 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-400 to-blue-500 flex items-center justify-center">
            <span className="text-white font-bold text-xs">抖音</span>
          </div>
          <span className="text-sm font-medium text-white/80">口播脚本</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-white/40">
          <span className="px-2 py-0.5 rounded-full bg-white/5">15-60s</span>
        </div>
      </div>

      {/* 分段内容 */}
      <div className="p-4 space-y-3">
        {sections.map((section, idx) => (
          <div
            key={idx}
            className={`rounded-lg bg-gradient-to-br ${section.color} border border-white/5 p-4`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-white/60 uppercase tracking-wider">
                {section.label}
              </span>
              {section.duration && (
                <span className="text-[10px] text-white/40">{section.duration}</span>
              )}
            </div>
            <p className="text-sm text-white/90 leading-relaxed whitespace-pre-wrap">
              {section.text}
            </p>
          </div>
        ))}
      </div>

      {/* 底部操作栏 */}
      <div className="flex items-center justify-around border-t border-white/5 px-4 py-3 text-white/40 text-[11px]">
        <span>点赞</span>
        <span>评论</span>
        <span>收藏</span>
        <span>转发</span>
      </div>
    </div>
  );
}
