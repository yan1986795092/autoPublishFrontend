/** B站预览 — 双栏脚本（画面 | 声音） */

import type { PlatformPreviewProps } from './index';

function parseBilibiliScript(content: string) {
  const lines = content.split('\n').filter(Boolean);
  const scenes: { visual: string; audio: string }[] = [];
  let currentScene: { visual: string; audio: string } | null = null;

  for (const line of lines) {
    if (line.includes('【画面】') || line.includes('[画面]') || line.startsWith('画面：')) {
      if (currentScene) scenes.push(currentScene);
      currentScene = { visual: line.replace(/【画面】|\[画面\]|画面：/, '').trim(), audio: '' };
    } else if (line.includes('【声音】') || line.includes('[声音]') || line.startsWith('声音：')) {
      if (currentScene) currentScene.audio = line.replace(/【声音】|\[声音\]|声音：/, '').trim();
      else scenes.push({ visual: '', audio: line.replace(/【声音】|\[声音\]|声音：/, '').trim() });
    } else if (currentScene) {
      currentScene.audio += (currentScene.audio ? '\n' : '') + line;
    } else {
      currentScene = { visual: line, audio: '' };
    }
  }
  if (currentScene) scenes.push(currentScene);

  // 回退：没有解析出场景时用全文
  if (scenes.length === 0) {
    scenes.push({ visual: '', audio: content });
  }

  return scenes;
}

export function BilibiliPreview({ content }: PlatformPreviewProps) {
  const scenes = parseBilibiliScript(content);

  return (
    <div className="rounded-xl border border-app-border bg-app-surface overflow-hidden max-w-2xl mx-auto">
      {/* B站风格顶栏 */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-pink-600/20 to-blue-600/20 border-b border-app-border/30">
        <div className="w-6 h-6 rounded-full bg-pink-500 flex items-center justify-center">
          <span className="text-white font-bold text-[8px]">B</span>
        </div>
        <span className="text-xs font-semibold text-app-text">Bilibili 脚本</span>
        <span className="text-[10px] text-app-text-tertiary ml-auto">弹幕：互动连连</span>
      </div>

      {/* 双栏头部 */}
      <div className="grid grid-cols-2 border-b border-app-border/20">
        <div className="px-4 py-2 text-[10px] font-semibold text-app-text-tertiary uppercase tracking-wider border-r border-app-border/20 bg-app-elevated/30">
          🎬 画面
        </div>
        <div className="px-4 py-2 text-[10px] font-semibold text-app-text-tertiary uppercase tracking-wider bg-app-elevated/30">
          🎤 声音 / 字幕
        </div>
      </div>

      {/* 双栏内容 */}
      <div className="divide-y divide-app-border/10">
        {scenes.map((scene, idx) => (
          <div key={idx} className="grid grid-cols-2 min-h-[60px]">
            <div className="px-4 py-3 border-r border-app-border/10 text-xs text-app-text/80 leading-relaxed whitespace-pre-wrap font-mono">
              {scene.visual || <span className="text-app-text-tertiary/50 italic">（画面描述）</span>}
            </div>
            <div className="px-4 py-3 text-xs text-app-text leading-relaxed whitespace-pre-wrap">
              {scene.audio}
            </div>
          </div>
        ))}
      </div>

      {/* 底部弹幕模拟 */}
      <div className="px-4 py-2 border-t border-app-border/20 bg-app-elevated/30 overflow-hidden">
        <div className="flex gap-3 text-[10px] text-app-text-tertiary animate-pulse">
          <span className="text-blue-400">太强了</span>
          <span className="text-pink-400">哈哈哈哈</span>
          <span className="text-green-400">学到了</span>
          <span className="text-yellow-400">前方高能</span>
          <span className="text-app-text-tertiary">绝了</span>
        </div>
      </div>
    </div>
  );
}
