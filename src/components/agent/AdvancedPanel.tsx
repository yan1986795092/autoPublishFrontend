import { ScrollArea } from '../ui/scroll-area';
import { Eye, PanelRightClose, X, FlaskConical } from 'lucide-react';
import { useAgentStore } from '../../stores/useAgentStore';
import { useConversationStore } from '../../stores/useConversationStore';
import { useShallow } from 'zustand/react/shallow';
import { useMemo, useState } from 'react';
import { cn } from '../../utils/helpers';
import { ResultPreview } from './ResultPreview';
import { getPreviewComponent } from '../preview/index';
import { PlatformIcon } from './PlatformIcons';
import { ALL_PLATFORMS } from './PlatformSelector';

// ── P1-1: 单一解析函数 — 决定 preview key / content type 来源 ──
// 优先级（从高到低）：
//   1. 用户手动注入的 previewContent（独立分支，不参与 platform 解析）
//   2. 左侧 Workspace 选中的 platform（selectedPlatform）
//   3. AgentStore.previewPlatform（User 在 Workspace 切换后）
//   4. currentResult.output.platform（后端结果）
//   5. currentResult.output.content_type（兜底）
function resolvePreviewKey(args: {
  selectedPlatform: string | null;
  previewPlatform: string | null;
  previewContentType: string | null;
  currentResult: { output?: { platform?: unknown; content_type?: unknown } } | null;
}): { platform: string | null; contentType: string | null; previewKey: string | null } {
  const backendPlatform = (args.currentResult?.output?.platform as string) || null;
  const backendContentType = (args.currentResult?.output?.content_type as string) || null;
  const platform = args.selectedPlatform || args.previewPlatform || backendPlatform;
  const contentType = args.previewContentType || backendContentType;
  // preview key：platform 优先，content_type 兜底
  const previewKey = platform || contentType || args.selectedPlatform;
  return { platform, contentType, previewKey };
}

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

  // P2: 预览模式开关 — 默认 'real'（缺数据走降级，不编假数据）
  // 'mock' 仅用于演示场景，开启后会显示半透明水印提示"预览示意 · 数据为模拟"
  const [previewMode, setPreviewMode] = useState<'real' | 'mock'>('real');

  const isIdle = !isRunning && !currentResult && thinkingSteps.length === 0 && !previewContent && messages.length === 0;

  // 修复 #7：去掉 liveContent 双渲染 — 不再用 messages 里的流式内容做右侧实时渲染
  // 让用户专注左侧 Workspace 里的 MessageBubble；右侧运行时只显示"生成中"占位

  // ── P1-1: 用单一解析函数取代分散的三元链 ──
  const { platform: resolvedPlatform, contentType: resolvedContentType, previewKey: activePreviewKey }
    = useMemo(
      () => resolvePreviewKey({
        selectedPlatform,
        previewPlatform,
        previewContentType,
        currentResult: currentResult as { output?: { platform?: unknown; content_type?: unknown } } | null,
      }),
      [selectedPlatform, previewPlatform, previewContentType, currentResult],
    );

  // 空闲时优先用左侧选中的平台
  const previewKey = isIdle ? selectedPlatform : (activePreviewKey || selectedPlatform);
  // 注意：这里不在 render 中调用 getPreviewComponent，避免 react-hooks/static-components 规则报错
  // 改为在 JSX 中 inline 调用，每个分支用 IIFE 包起来

  return (
    <div
      className="flex-shrink-0 border-l border-app-border overflow-hidden hidden md:flex md:w-[360px] lg:w-[420px]"
    >
      <div className="h-full flex flex-col w-full">
        {/* 标题栏 */}
        <div className="flex-shrink-0 border-b border-app-border bg-app-elevated px-4 py-2.5 flex items-center gap-2">
          <Eye className="w-4 h-4 text-primary-400" />
          <span className="text-sm font-semibold text-app-text">预览</span>
          {/* P2: 预览模式切换 — real 模式缺数据走降级，mock 模式显示模拟数据并加 '预览示意' 水印 */}
          <button
            onClick={() => setPreviewMode(m => m === 'real' ? 'mock' : 'real')}
            className={cn(
              'ml-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border transition-colors',
              previewMode === 'mock'
                ? 'bg-yellow-500/15 text-yellow-600 border-yellow-500/30 hover:bg-yellow-500/25'
                : 'bg-app-hover/40 text-app-text-tertiary border-app-border hover:text-app-text-secondary'
            )}
            title={previewMode === 'real' ? '当前：真实模式（缺数据走降级）· 点击切换到模拟模式' : '当前：模拟模式（含演示数据并加水印）· 点击切回真实模式'}
          >
            <FlaskConical className="w-3 h-3" />
            {previewMode === 'real' ? '真实' : '模拟'}
          </button>
          {/* 修复 BUG-9：previewContent 注入后用户无法切回 currentResult，加一个清除按钮 */}
          {previewContent && (
            <button
              onClick={() => useAgentStore.getState().setPreviewContent(null)}
              className="ml-auto w-6 h-6 rounded-md flex items-center justify-center text-app-text-tertiary hover:text-app-text hover:bg-app-hover transition-colors"
              title="清除手动注入的预览内容"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          {!previewContent && onCollapse && (
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
          <div className="flex-1 min-h-0 overflow-hidden">
            {previewContent ? (
              <div className="p-4 prose prose-invert prose-xs max-w-none text-sm leading-relaxed text-app-text-secondary">
                <div className="whitespace-pre-wrap">{previewContent}</div>
              </div>
            ) : isRunning && !currentResult ? (
              // 修复 #7：运行时只显示"生成中"占位，专注留给左侧 Workspace
              <div className="p-6 flex flex-col items-center justify-center text-center">
                <div className="relative w-12 h-12 mb-3">
                  <div className="absolute inset-0 rounded-full bg-primary-500/20 animate-ping" />
                  <div className="absolute inset-2 rounded-full bg-primary-500/40" />
                </div>
                <p className="text-xs text-app-text-secondary mb-1">
                  AI 正在为你创作…
                </p>
                <p className="text-[10px] text-app-text-tertiary">
                  生成过程在左侧实时显示
                </p>
              </div>
            ) : previewKey ? (
              <div className="p-4">
                {selectedPlatform && (
                  <div className="mb-3 flex items-center gap-2">
                    <PlatformIcon id={selectedPlatform} size={16} />
                    <span className="text-[12px] font-medium text-app-text">
                      {ALL_PLATFORMS.find(p => p.id === selectedPlatform)?.label}
                    </span>
                  </div>
                )}
                {/* P1: previewKey 但还没 currentResult 时，调用 ResultPreview 让组件按 isPlaceholder=true 走骨架占位
                    而非硬编码 '✨ 内容准备中...' 死字符串 */}
                <ResultPreview
                  result={currentResult}
                  selectedPlatform={resolvedPlatform}
                  selectedContentType={resolvedContentType}
                  isPlaceholder={!currentResult}
                  previewMode={previewMode}
                />
              </div>
            ) : currentResult ? (
              <div className="p-4 relative">
                <ResultPreview result={currentResult} selectedPlatform={resolvedPlatform} selectedContentType={resolvedContentType} previewMode={previewMode} />
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
