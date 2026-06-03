import { useState } from 'react';
import { cn } from '../../utils/helpers';
import { Eye } from 'lucide-react';
import Markdown from 'react-markdown';
import type { AgentResult } from '../../types';
import { ALL_PLATFORMS } from './PlatformSelector';

const PREVIEW_OPTIONS = [
  { key: 'raw', label: '原文' },
  ...ALL_PLATFORMS.map(p => ({ key: p.id, label: p.label, icon: p.icon })),
];

export function ResultPreview({ result }: { result: AgentResult | null }) {
  const [previewPlatform, setPreviewPlatform] = useState('raw');

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Eye className="w-8 h-8 text-app-text-tertiary mb-2" />
        <p className="text-xs text-app-text-tertiary">执行完成后查看预览</p>
      </div>
    );
  }

  const content =
    (result.output?.full_text as string) ||
    (result.output?.content as string) ||
    JSON.stringify(result.output, null, 2);

  return (
    <div className="space-y-3">
      {/* Platform preview tabs — scrollable */}
      <div className="flex gap-1 rounded-lg bg-app-surface p-1 overflow-x-auto">
        {PREVIEW_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setPreviewPlatform(opt.key)}
            className={cn(
              'flex items-center gap-1 rounded py-1 px-2 text-[10px] font-medium transition-colors whitespace-nowrap',
              previewPlatform === opt.key
                ? 'bg-app-elevated text-app-text shadow-sm'
                : 'text-app-text-secondary hover:text-app-text'
            )}
          >
            {'icon' in opt && opt.icon && <span>{opt.icon}</span>}
            {opt.label}
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-app-border overflow-hidden min-h-[300px]">
        <div className="p-4 text-xs text-app-text-secondary leading-relaxed max-h-[600px] overflow-auto">
          <div className="prose prose-invert max-w-none text-sm">
            <Markdown>{content}</Markdown>
          </div>
        </div>
      </div>
    </div>
  );
}
