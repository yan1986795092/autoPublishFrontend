import { ScrollArea } from '../ui/scroll-area';
import { PANELS } from '../../config/layout';
import { Eye, PanelRightClose } from 'lucide-react';
import { useAgentStore } from '../../stores/useAgentStore';
import { useConversationStore } from '../../stores/useConversationStore';
import { useShallow } from 'zustand/react/shallow';
import { useMemo } from 'react';
import { cn } from '../../utils/helpers';
import { ResultPreview } from './ResultPreview';
import { ContentRenderer } from '../preview/ContentRenderer';
import { getPreviewComponent } from '../preview/index';
import { PlatformIcon } from './PlatformIcons';
import { ALL_PLATFORMS } from './PlatformSelector';

// ── Main Panel ──

interface AdvancedPanelProps {
  selectedPlatform: string | null;
  onCollapse?: () => void;
}

export function AdvancedPanel({ selectedPlatform, onCollapse }: AdvancedPanelProps) {
  // Agent Store：运行状态、结果、thinking、预览设置
  const { isRunning, currentResult, thinkingSteps, previewContent, previewPlatform, previewContentType }
    = useAgentStore(useShallow((s) => ({
      isRunning: s.isRunning,
      currentResult: s.currentResult,
      thinkingSteps: s.thinkingSteps,
      previewContent: s.previewContent,
      previewPlatform: s.previewPlatform,
      previewContentType: s.previewContentType,
    })));

  // Conversation Store：消息列表（已迁移到这里）
  const messages = useConversationStore((s) => s.messages);

  const isIdle = !isRunning && !currentResult && thinkingSteps.length === 0 && !previewContent && messages.length === 0;

  const liveContent = messages.find(m => m.role === 'assistant' && m.status === 'running')?.content || '';
  const hasLiveContent = isRunning && !!liveContent;

  // 预览平台：优先用左侧选的，没有则用后端返回 result 中的 platform
  const resolvedPlatform = previewPlatform
    || (currentResult?.output?.platform as string)
    || (currentResult?.output?.content_type as string)
    || null;
  // 预览内容类型：左侧选的 > 后端返回的
  const resolvedContentType = previewContentType
    || (currentResult?.output?.content_type as string)
    || null;
  // 当前生效的预览 key（平台优先，体裁兜底）
  const activePreviewKey = resolvedPlatform || resolvedContentType;

  // 空闲时优先用左侧选中的平台
  const previewKey = isIdle ? selectedPlatform : (activePreviewKey || selectedPlatform);
  const PreviewComponent = useMemo(() => previewKey ? getPreviewComponent(previewKey) : null, [previewKey]);

  return (
    <div
      className="flex-shrink-0 border-l border-app-border overflow-hidden hidden lg:flex"
      style={{ width: PANELS.RIGHT_WIDTH }}
    >
      <div className="h-full flex flex-col w-full">
        {/* 标题栏 */}
        <div className="flex-shrink-0 border-b border-app-border bg-app-elevated px-4 py-2.5 flex items-center gap-2">
          <Eye className="w-4 h-4 text-primary-400" />
          <span className="text-sm font-semibold text-app-text">预览</span>
          {onCollapse && (
            <button
              onClick={onCollapse}
              className="ml-auto w-6 h-6 rounded-md flex items-center justify-center text-app-text-tertiary hover:text-app-text hover:bg-app-hover transition-colors"
              title="收起预览面板"
            >
              <PanelRightClose className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* 内容区 */}
        {isIdle && !previewKey ? (
          <div className="relative flex-1 min-h-0">
            <div className="absolute inset-0 flex flex-col items-center justify-center px-8">
              <div className="relative w-20 h-20 mb-6">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary-500/30 via-primary-500/10 to-transparent blur-xl" />
                <div className="absolute inset-3 rounded-full border border-primary-500/20" />
                <div className="absolute inset-0 rounded-full border border-primary-500/10" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary-400/60" />
              </div>
              <h3 className="text-sm font-medium text-app-text mb-1.5">
                预览引擎已就绪
              </h3>
              <p className="text-[11px] text-app-text-tertiary text-center leading-relaxed">
                选择左侧平台，开始创作
              </p>
            </div>
          </div>
        ) : (
          <ScrollArea className="flex-1 min-h-0">
            {previewContent ? (
              <div className="p-4 prose prose-invert prose-xs max-w-none text-sm leading-relaxed text-app-text-secondary">
                <div className="whitespace-pre-wrap">{previewContent}</div>
              </div>
            ) : hasLiveContent ? (
              <div className="p-4">
                <ContentRenderer content={liveContent} contentType={resolvedContentType || undefined} />
                <span className="inline-block w-1.5 h-4 bg-primary-400 animate-pulse ml-0.5 align-text-bottom" />
              </div>
            ) : PreviewComponent ? (
              <div className="p-4">
                {selectedPlatform && (
                  <div className="mb-3 flex items-center gap-2">
                    <PlatformIcon id={selectedPlatform} size={16} />
                    <span className="text-[12px] font-medium text-app-text">
                      {ALL_PLATFORMS.find(p => p.id === selectedPlatform)?.label}
                    </span>
                  </div>
                )}
                <div className={cn(
                  'transition-opacity duration-300',
                  isIdle ? 'opacity-100' : 'opacity-50'
                )}>
                  <PreviewComponent
                    content={isIdle ? '✨ 内容准备中...\n\n输入你的需求，AI 将自动为你生成内容。' : '✨ 内容准备中...\n\nAgent 正在理解需求并生成内容，请稍候。'}
                    contentType={previewKey ?? undefined}
                  />
                </div>
              </div>
            ) : currentResult ? (
              <div className="p-4">
                <ResultPreview result={currentResult} selectedPlatform={resolvedPlatform} selectedContentType={resolvedContentType} />
              </div>
            ) : (
              <p className="text-xs text-app-text-tertiary text-center py-8">
                内容生成中，完成后显示预览...
              </p>
            )}
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
