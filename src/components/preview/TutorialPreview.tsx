/** 教程指南预览 — 完整课程卡片，含进度条、章节导航、练习框 */

import type { PlatformPreviewProps } from './index';
import { ContentRenderer } from './ContentRenderer';

function parseSteps(content: string) {
  const lines = content.split('\n').filter(Boolean);
  const steps: { title: string; body: string; type: 'step' | 'note' | 'warning' | 'tip' | 'exercise'; num: number }[] = [];

  let currentStep: string[] = [];
  let currentTitle = '';
  let currentType: 'step' | 'note' | 'warning' | 'tip' | 'exercise' = 'step';
  let stepNum = 0;

  for (const line of lines) {
    if (/步骤\s*\d|Step\s*\d|第\s*\d.*步|^[\d]+[\.、]\s/.test(line)) {
      if (currentStep.length || currentTitle) {
        steps.push({ title: currentTitle, body: currentStep.join('\n'), type: currentType, num: stepNum });
      }
      stepNum++;
      currentTitle = line;
      currentStep = [];
      currentType = 'step';
    } else if (/⚠️|警告|注意：|注意:|Warning/i.test(line)) {
      if (currentStep.length || currentTitle) {
        steps.push({ title: currentTitle, body: currentStep.join('\n'), type: currentType, num: stepNum });
        stepNum++;
      }
      currentTitle = line;
      currentStep = [];
      currentType = 'warning';
    } else if (/💡|提示|建议|Tip|Note/i.test(line)) {
      if (currentStep.length || currentTitle) {
        steps.push({ title: currentTitle, body: currentStep.join('\n'), type: currentType, num: stepNum });
        stepNum++;
      }
      currentTitle = line;
      currentStep = [];
      currentType = 'tip';
    } else if (/练习|动手做|try|exercise/i.test(line)) {
      currentStep.push(line);
      currentType = 'exercise';
    } else {
      currentStep.push(line);
    }
  }
  if (currentStep.length || currentTitle) {
    steps.push({ title: currentTitle, body: currentStep.join('\n'), type: currentType, num: stepNum });
  }

  return steps.length > 0 ? steps : [{ title: '', body: content, type: 'step', num: 1 }];
}

export function TutorialPreview({ content, contentType }: PlatformPreviewProps) {
  const steps = parseSteps(content);
  const progress = Math.round((steps.filter(s => s.type === 'step').length / Math.max(steps.length, 1)) * 60);

  return (
    <div className="max-w-xl mx-auto rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
      {/* 教程顶栏 */}
      <div className="px-5 pt-4 pb-3 bg-gradient-to-r from-emerald-600 to-teal-600">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z"/></svg>
          </div>
          <div className="flex-1">
            <p className="text-white text-sm font-bold">教程指南</p>
            <p className="text-white/60 text-[11px]">共 {steps.length} 个章节</p>
          </div>
          <div className="text-white/60 text-[11px]">{progress}%</div>
        </div>

        {/* 进度条 */}
        <div className="mt-3 h-1.5 rounded-full bg-white/20 overflow-hidden">
          <div className="h-full rounded-full bg-white transition-all" style={{ width: `${progress}%` }} />
        </div>

        {/* 章节预览 */}
        <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1">
          {steps.filter(s => s.type === 'step').map((_, i) => (
            <div key={i} className={`flex-shrink-0 w-2 h-2 rounded-full ${i === 0 ? 'bg-white' : 'bg-white/30'}`} />
          ))}
        </div>
      </div>

      {/* 章节列表 */}
      <div className="px-3 py-2 border-b border-gray-100 bg-gray-50/50">
        <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-2 px-2">章节导航</p>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {steps.map((step, idx) => (
            <button
              key={idx}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                idx === 0
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {step.type === 'step' ? `第${step.num || idx + 1}步` : step.type === 'warning' ? '⚠️' : '💡'}
            </button>
          ))}
        </div>
      </div>

      {/* 步骤内容 */}
      <div className="px-5 py-4 space-y-4">
        <ContentRenderer content={content} contentType={contentType} />
      </div>

      {/* 底部：完成 + 下一步 */}
      <div className="px-5 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center gap-3">
        <button className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-bold hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
          完成本节
        </button>
        <button className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-100 transition-colors">
          下一步 →
        </button>
      </div>
    </div>
  );
}
