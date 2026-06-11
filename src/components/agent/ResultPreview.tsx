import { Eye } from 'lucide-react';
import type { AgentResult } from '../../types';
import { PLATFORM_MAP } from './PlatformSelector';
import { getPreviewComponent } from '../preview/index';

interface ResultPreviewProps {
  result: AgentResult | null;
  selectedPlatform: string | null;
}

export function ResultPreview({ result, selectedPlatform }: ResultPreviewProps) {
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

  const platform = selectedPlatform ? PLATFORM_MAP.get(selectedPlatform) : null;

  // 使用平台专属预览组件
  const PreviewComponent = getPreviewComponent(selectedPlatform);

  return (
    <div className="space-y-3">
      {/* Platform context — show which platform this was generated for */}
      {platform && (
        <div className="flex items-center gap-2 px-1">
          <span className="text-sm">{platform.icon}</span>
          <span className="text-xs font-medium text-app-text">{platform.label}</span>
          <span className="text-[9px] text-app-text-tertiary bg-app-surface px-1.5 py-0.5 rounded">
            {platform.category === 'publishable' ? '可发布' : '文案'}
          </span>
        </div>
      )}

      <div className="rounded-lg border border-app-border overflow-hidden">
        <div className="p-4 text-xs text-app-text-secondary leading-relaxed max-h-[600px] overflow-auto">
          <PreviewComponent content={content} />
        </div>
      </div>
    </div>
  );
}
