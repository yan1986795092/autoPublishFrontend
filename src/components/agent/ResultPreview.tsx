import { useState } from 'react';
import { cn } from '../../utils/helpers';
import { Eye } from 'lucide-react';
import Markdown from 'react-markdown';
import type { AgentResult } from '../../types';

export function ResultPreview({ result }: { result: AgentResult | null }) {
  const [platform, setPlatform] = useState<'raw' | 'xiaohongshu' | 'wechat' | 'zhihu'>('raw');

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
      <div className="flex gap-1 rounded-lg bg-app-surface p-1">
        {[
          { key: 'raw' as const, label: '原文' },
          { key: 'xiaohongshu' as const, label: '小红书' },
          { key: 'wechat' as const, label: '公众号' },
          { key: 'zhihu' as const, label: '知乎' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setPlatform(key)}
            className={cn(
              'flex-1 rounded py-1 text-[10px] font-medium transition-colors',
              platform === key
                ? 'bg-app-elevated text-app-text shadow-sm'
                : 'text-app-text-secondary hover:text-app-text'
            )}
          >
            {label}
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
