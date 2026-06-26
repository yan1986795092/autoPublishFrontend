import { ScrollArea } from '../ui/scroll-area';
import { PANELS } from '../../config/layout';
import { Eye, Bot, Pen, MessageCircle, Zap, PanelRightClose } from 'lucide-react';
import { useAgentStore } from '../../stores/useAgentStore';
import { useShallow } from 'zustand/react/shallow';
import { useMemo } from 'react';
import { ResultPreview } from './ResultPreview';
import { ContentRenderer } from '../preview/ContentRenderer';
import { getPreviewComponent } from '../preview/index';

// ── Idle state — 统一风格：无 gradient，无 emoji ──

function IdleState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center mb-4">
        <Bot className="w-7 h-7 text-primary-400" />
      </div>
      <h3 className="text-sm font-semibold text-app-text mb-1">创作中心</h3>
      <p className="text-xs text-app-text-secondary leading-relaxed max-w-[240px]">
        输入需求，Agent 团队将自动拆解任务并协作完成
      </p>
      <div className="mt-5 space-y-2 text-left w-full max-w-[240px]">
        <p className="text-[10px] text-app-text-tertiary uppercase tracking-wider">使用提示</p>
        <div className="space-y-2">
          {[
            { Icon: Pen, text: '直接描述你的创作需求' },
            { Icon: MessageCircle, text: '多轮对话迭代优化结果' },
            { Icon: Zap, text: '运行时查看实时思考链路' },
          ].map(({ Icon, text }) => (
            <div
              key={text}
              className="flex items-center gap-2.5 rounded-lg border border-app-border bg-app-elevated px-3 py-2.5"
            >
              <Icon className="w-4 h-4 text-primary-400 shrink-0" />
              <p className="text-xs text-app-text-secondary">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── 预览占位：生成未开始时显示模板壳 + "准备中" ──

function PreviewPlaceholder({ contentType }: { contentType: string }) {
  const PreviewComponent = useMemo(() => getPreviewComponent(contentType), [contentType]);
  return (
    <div className="opacity-50">
      <PreviewComponent content="✨ 内容准备中...\n\nAgent 正在理解需求并拆解任务，请稍候。" contentType={contentType} />
    </div>
  );
}

// ── Main Panel ──

interface AdvancedPanelProps {
  onCollapse?: () => void;
}

export function AdvancedPanel({ onCollapse }: AdvancedPanelProps) {
  const { isRunning, currentResult, thinkingSteps, messages, previewContent, previewPlatform, previewContentType }
    = useAgentStore(useShallow((s) => ({
      isRunning: s.isRunning,
      currentResult: s.currentResult,
      thinkingSteps: s.thinkingSteps,
      messages: s.messages,
      previewContent: s.previewContent,
      previewPlatform: s.previewPlatform,
      previewContentType: s.previewContentType,
    })));

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

  return (
    <div
      className="flex-shrink-0 border-l border-app-border overflow-hidden hidden lg:flex"
      style={{ width: PANELS.RIGHT_WIDTH }}
    >
      <div className="h-full flex flex-col w-full">
        {/* 标题栏 — 非透明 */}
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
        <ScrollArea className="flex-1 p-4">
          {previewContent ? (
            <div className="prose prose-invert prose-xs max-w-none text-sm leading-relaxed text-app-text-secondary">
              <div className="whitespace-pre-wrap">{previewContent}</div>
            </div>
          ) : isIdle ? (
            <IdleState />
          ) : hasLiveContent ? (
            <div>
              <ContentRenderer content={liveContent} contentType={resolvedContentType || undefined} />
              <span className="inline-block w-1.5 h-4 bg-primary-400 animate-pulse ml-0.5 align-text-bottom" />
            </div>
          ) : isRunning && activePreviewKey ? (
            /* Agent 运行中但内容还没到 → 显示模板壳 + 准备中 */
            <PreviewPlaceholder contentType={activePreviewKey} />
          ) : currentResult ? (
            <ResultPreview result={currentResult} selectedPlatform={resolvedPlatform} selectedContentType={resolvedContentType} />
          ) : activePreviewKey && !isRunning && !isIdle ? (
            /* 对话阶段已选体裁但还没到生成阶段 → 显示模板占位 */
            <PreviewPlaceholder contentType={activePreviewKey} />
          ) : (
            <p className="text-xs text-app-text-tertiary text-center py-8">
              内容生成中，完成后显示预览...
            </p>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
