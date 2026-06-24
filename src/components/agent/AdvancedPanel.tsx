import { ScrollArea } from '../ui/scroll-area';
import { PANELS } from '../../config/layout';
import { Eye, Bot } from 'lucide-react';
import { useAgentStore } from '../../stores/useAgentStore';
import { ResultPreview } from './ResultPreview';
import { PLATFORM_MAP, ALL_PLATFORMS } from './PlatformSelector';
import { PlatformIcon } from './PlatformIcons';
import { cn } from '../../utils/helpers';

/** 空闲状态：无任务、无结果时显示的引导界面 */
function IdleState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center mb-4">
        <Bot className="w-7 h-7 text-blue-400" />
      </div>
      <h3 className="text-sm font-semibold text-app-text mb-1">创作中心</h3>
      <p className="text-xs text-app-text-secondary leading-relaxed max-w-[240px]">
        输入需求，Agent 团队将自动拆解任务并协作完成
      </p>
      <div className="mt-5 space-y-2 text-left w-full max-w-[240px]">
        <p className="text-[10px] text-app-text-tertiary uppercase tracking-wider">使用提示</p>
        <div className="space-y-2">
          {[
            { icon: '✏️', text: '直接描述你的创作需求' },
            { icon: '💬', text: '多轮对话迭代优化结果' },
            { icon: '⏱️', text: '运行时查看实时思考链路' },
          ].map((tip) => (
            <div
              key={tip.text}
              className="rounded-lg border border-app-border bg-app-elevated/60 p-2.5"
            >
              <p className="text-xs font-medium text-app-text">
                {tip.icon} {tip.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface PlatformTabBarProps {
  selected: string | null;
  onSelect: (id: string | null) => void;
  hasResult: boolean;
}

function PlatformTabBar({ selected, onSelect, hasResult }: PlatformTabBarProps) {

  const displayPlatform = selected ? PLATFORM_MAP.get(selected) : null;

  return (
    <div className="border-b border-app-border/50 bg-app-surface/40">
      {/* 平台选择网格 — 显示全部平台 */}
      <div className="flex flex-wrap gap-1 px-3 py-2">
        {ALL_PLATFORMS.map(p => {
          const isSelected = selected === p.id;
          return (
            <button
              key={p.id}
              onClick={() => onSelect(isSelected ? null : p.id)}
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded-full text-[11px] transition-all duration-150',
                isSelected
                  ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/30 font-medium'
                  : 'text-app-text-tertiary hover:text-app-text-secondary hover:bg-app-elevated/60'
              )}
            >
            <PlatformIcon id={p.id} size={16} />
            <span>{p.label}</span>
            </button>
          );
        })}
      </div>

      {/* 已选平台信息条 */}
      {displayPlatform && (
        <div className="flex items-center gap-1.5 px-3 pb-2">
          <PlatformIcon id={displayPlatform.id} size={16} />
          <span className="text-xs font-medium text-app-text">{displayPlatform.label}</span>
          <span className="text-[9px] text-app-text-tertiary bg-app-surface px-1.5 py-0.5 rounded">
            {displayPlatform.category === 'publishable' ? '可发布' : '文案'}
          </span>
          <button
            onClick={() => onSelect(null)}
            className="ml-auto text-[10px] text-app-text-tertiary hover:text-app-text-secondary transition-colors"
          >
            清除
          </button>
        </div>
      )}
    </div>
  );
}

export function AdvancedPanel() {
  const isRunning = useAgentStore((s) => s.isRunning);
  const currentResult = useAgentStore((s) => s.currentResult);
  const thinkingSteps = useAgentStore((s) => s.thinkingSteps);
  const messages = useAgentStore((s) => s.messages);
  const previewContent = useAgentStore((s) => s.previewContent);
  const previewPlatform = useAgentStore((s) => s.previewPlatform);
  const setPreviewPlatform = useAgentStore((s) => s.setPreviewPlatform);

  const isIdle = !isRunning && !currentResult && !thinkingSteps.length && !previewContent && messages.length === 0;

  // 实时内容：取当前运行中的 assistant 消息（流式写入）
  const liveContent = messages.find(m => m.role === 'assistant' && m.status === 'running')?.content || '';
  const showLive = isRunning && liveContent;

  return (
    <div
      className="flex-shrink-0 border-l border-app-border overflow-hidden"
      style={{ width: PANELS.RIGHT_WIDTH }}
    >
      <div className="h-full flex flex-col">
        {/* 标题 */}
        <div className="flex-shrink-0 border-b border-app-border/30 bg-app-surface/60 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-semibold text-app-text">预览</span>
          </div>
        </div>

        {/* 平台 Tab Bar — 有内容即显示 */}
        {!isIdle && (
          <PlatformTabBar
            selected={previewPlatform}
            onSelect={setPreviewPlatform}
            hasResult={!!currentResult}
          />
        )}

        {/* 内容: 预览 / 实时流式 / 最终结果 */}
        <ScrollArea className="flex-1 p-4">
          {previewContent ? (
            <div className="prose prose-invert prose-xs max-w-none text-sm leading-relaxed text-app-text-secondary">
              <div className="whitespace-pre-wrap">{previewContent}</div>
            </div>
          ) : isIdle ? (
            <IdleState />
          ) : showLive ? (
            <div className="prose prose-invert prose-xs max-w-none text-sm leading-relaxed text-app-text-secondary">
              <div className="whitespace-pre-wrap">{liveContent}</div>
              <span className="inline-block w-1.5 h-4 bg-blue-400 animate-pulse ml-0.5 align-text-bottom" />
            </div>
          ) : currentResult ? (
            <ResultPreview result={currentResult} selectedPlatform={previewPlatform} />
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
