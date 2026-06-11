/** 产品文案预览 — Landing Page 风格 */

import type { PlatformPreviewProps } from './index';

function parseSections(content: string) {
  const lines = content.split('\n').filter(Boolean);
  const sections: { type: 'headline' | 'subheadline' | 'body' | 'cta'; text: string }[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // 检测CTA行
    if (/立即|马上|限时|点击|注册|购买|下载|免费|试用/i.test(trimmed) && trimmed.length < 30) {
      sections.push({ type: 'cta', text: trimmed });
    }
    // 检测标题（较短的行，可能是标题）
    else if (trimmed.length < 60 && !trimmed.startsWith('-') && !trimmed.startsWith('•')) {
      if (sections.length === 0) {
        sections.push({ type: 'headline', text: trimmed });
      } else {
        const last = sections[sections.length - 1];
        if (last.type === 'headline') {
          sections.push({ type: 'subheadline', text: trimmed });
        } else {
          sections.push({ type: 'body', text: trimmed });
        }
      }
    } else {
      sections.push({ type: 'body', text: trimmed });
    }
  }

  return sections;
}

export function CopywritingPreview({ content }: PlatformPreviewProps) {
  const sections = parseSections(content);
  const headline = sections.find(s => s.type === 'headline');
  const subheadline = sections.find(s => s.type === 'subheadline');
  const cta = sections.find(s => s.type === 'cta');
  const bodySections = sections.filter(s => s.type === 'body');

  return (
    <div className="rounded-xl border border-app-border bg-app-surface overflow-hidden max-w-lg mx-auto">
      {/* Hero 区域 */}
      <div className="bg-gradient-to-br from-blue-600/20 via-purple-600/10 to-app-surface px-6 pt-8 pb-6 text-center border-b border-app-border/20">
        {headline && (
          <h1 className="text-xl font-bold text-app-text mb-2 leading-snug">{headline.text}</h1>
        )}
        {subheadline && (
          <p className="text-sm text-app-text-secondary leading-relaxed">{subheadline.text}</p>
        )}
        {cta && (
          <button className="mt-4 px-6 py-2.5 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm font-semibold hover:shadow-lg hover:shadow-blue-500/25 transition-all">
            {cta.text}
          </button>
        )}
      </div>

      {/* 卖点列表 */}
      <div className="px-6 py-5 space-y-4">
        {bodySections.map((section, idx) => (
          <div key={idx} className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-blue-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-blue-400 text-[10px]">✓</span>
            </div>
            <p className="text-sm text-app-text-secondary leading-relaxed">{section.text}</p>
          </div>
        ))}
      </div>

      {/* 底部 CTA */}
      {!cta && (
        <div className="px-6 py-4 border-t border-app-border/20 text-center">
          <button className="px-6 py-2.5 rounded-lg bg-blue-500/15 text-blue-400 text-sm font-semibold hover:bg-blue-500/25 transition-colors">
            立即体验
          </button>
        </div>
      )}
    </div>
  );
}
