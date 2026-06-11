/** 教程指南预览 — 带步骤编号和警告框 */

import type { PlatformPreviewProps } from './index';

function parseSteps(content: string) {
  const lines = content.split('\n').filter(Boolean);
  const steps: { title: string; body: string; type: 'step' | 'note' | 'warning' | 'tip' }[] = [];

  let currentStep: string[] = [];
  let currentTitle = '';
  let currentType: 'step' | 'note' | 'warning' | 'tip' = 'step';

  for (const line of lines) {
    if (/步骤\s*\d|Step\s*\d/i.test(line)) {
      if (currentStep.length) {
        steps.push({ title: currentTitle, body: currentStep.join('\n'), type: currentType });
      }
      currentTitle = line;
      currentStep = [];
      currentType = 'step';
    } else if (/⚠️|警告|注意|注意：|注意:/i.test(line)) {
      if (currentStep.length) {
        steps.push({ title: currentTitle, body: currentStep.join('\n'), type: currentType });
      }
      currentTitle = line;
      currentStep = [];
      currentType = 'warning';
    } else if (/💡|提示|建议|Tip/i.test(line)) {
      if (currentStep.length) {
        steps.push({ title: currentTitle, body: currentStep.join('\n'), type: currentType });
      }
      currentTitle = line;
      currentStep = [];
      currentType = 'tip';
    } else {
      currentStep.push(line);
    }
  }
  if (currentStep.length || currentTitle) {
    steps.push({ title: currentTitle, body: currentStep.join('\n'), type: currentType });
  }

  return steps.length > 0 ? steps : [{ title: '', body: content, type: 'step' as const }];
}

export function TutorialPreview({ content }: PlatformPreviewProps) {
  const steps = parseSteps(content);

  return (
    <div className="max-w-xl mx-auto rounded-xl border border-app-border bg-app-surface overflow-hidden">
      {/* 教程头部 */}
      <div className="px-5 py-3 bg-gradient-to-r from-emerald-600/20 to-teal-600/10 border-b border-app-border/20">
        <div className="flex items-center gap-2">
          <span className="text-lg">📗</span>
          <span className="text-sm font-semibold text-app-text">教程指南</span>
        </div>
      </div>

      <div className="px-5 py-4 space-y-4">
        {steps.map((step, idx) => {
          if (step.type === 'warning') {
            return (
              <div key={idx} className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3">
                <p className="text-xs font-semibold text-yellow-400 mb-1">{step.title}</p>
                <p className="text-xs text-yellow-300/80 leading-relaxed">{step.body}</p>
              </div>
            );
          }
          if (step.type === 'tip') {
            return (
              <div key={idx} className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3">
                <p className="text-xs font-semibold text-blue-400 mb-1">{step.title}</p>
                <p className="text-xs text-blue-300/80 leading-relaxed">{step.body}</p>
              </div>
            );
          }
          return (
            <div key={idx}>
              {step.title && (
                <h3 className="text-sm font-semibold text-app-text mb-2">{step.title}</h3>
              )}
              <div className="prose prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap">
                {step.body}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
