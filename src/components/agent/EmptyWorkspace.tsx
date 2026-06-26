import { Sparkles, Newspaper, ShoppingCart, GraduationCap, Video, BookOpen, Hash, Bird } from 'lucide-react';
import { useAgentStore } from '../../stores/useAgentStore';
import { PlatformIcon } from './PlatformIcons';
import { PUBLISHABLE_PLATFORMS, CONTENT_STYLES, PROFESSIONAL_STYLES } from './PlatformSelector';

const SUGGESTIONS = [
  { icon: Newspaper, label: '小红书种草笔记', prompt: '写一篇小红书种草笔记，推荐一款智能手环' },
  { icon: Bird, label: '公众号深度文章', prompt: '写一篇公众号深度文章，分析 AI 对职场的影响' },
  { icon: ShoppingCart, label: '产品推广文案', prompt: '为一款在线协作工具写产品推广文案' },
  { icon: GraduationCap, label: '技术教程', prompt: '编写一篇 Python 入门教程，面向零基础读者' },
  { icon: BookOpen, label: '品牌故事', prompt: '为一个新消费咖啡品牌写品牌故事' },
  { icon: Video, label: '短视频脚本', prompt: '写一个 60 秒短视频脚本，推广一款效率 App' },
  { icon: Hash, label: '微博热点短文', prompt: '写一篇微博短文，讨论远程办公的趋势' },
  { icon: Sparkles, label: '小说创作', prompt: '写一个科幻短篇小说的开头，设定在 2077 年' },
];

interface EmptyWorkspaceProps {
  onSelect: (s: string) => void;
}

const _btn = (isSel: boolean) =>
  `flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all duration-150 ${
    isSel
      ? 'bg-primary-500/20 text-primary-400 ring-1 ring-primary-500/30 font-medium'
      : 'border border-app-border bg-app-elevated text-app-text-secondary hover:border-primary-500/30 hover:text-primary-400 hover:bg-primary-500/5'
  }`;

export function EmptyWorkspace({ onSelect }: EmptyWorkspaceProps) {
  const previewPlatform = useAgentStore((s) => s.previewPlatform);
  const setPreviewPlatform = useAgentStore((s) => s.setPreviewPlatform);
  const previewContentType = useAgentStore((s) => s.previewContentType);
  const setPreviewContentType = useAgentStore((s) => s.setPreviewContentType);

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {/* 品牌图标区 */}
      <div className="relative mb-4">
        <div className="absolute inset-0 -inset-3 rounded-full bg-primary-500/5 blur-xl animate-pulse" />
        <div className="relative w-14 h-14 rounded-2xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center animate-float">
          <Sparkles className="w-7 h-7 text-primary-400" />
        </div>
      </div>

      <h2 className="text-base font-semibold text-app-text mb-1">开始创作</h2>
      <p className="text-xs text-app-text-secondary leading-relaxed max-w-sm mb-5">
        告诉 Agent 你想创作什么，LLM 将自动拆解任务并完成
      </p>

      {/* ── 发布平台 ── */}
      <div className="mb-3 w-full max-w-md">
        <div className="flex items-center gap-1.5 mb-2 px-1">
          <span className="text-[10px] font-medium text-app-text-tertiary uppercase tracking-wider">发布平台</span>
          <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 font-medium">可选</span>
        </div>
        <div className="flex flex-wrap gap-1.5 justify-center">
          {PUBLISHABLE_PLATFORMS.map((p) => {
            const isSel = previewPlatform === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setPreviewPlatform(isSel ? null : p.id)}
                className={_btn(isSel)}
              >
                <PlatformIcon id={p.id} size={14} />
                <span>{p.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 写作体裁 ── */}
      <div className="mb-5 w-full max-w-md">
        <div className="flex items-center gap-1.5 mb-2 px-1">
          <span className="text-[10px] font-medium text-app-text-tertiary uppercase tracking-wider">写作体裁</span>
          <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">可选</span>
        </div>
        <div className="flex flex-wrap gap-1.5 justify-center">
          {[...CONTENT_STYLES, ...PROFESSIONAL_STYLES].map((p) => {
            const isSel = previewContentType === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setPreviewContentType(isSel ? null : p.id)}
                className={_btn(isSel)}
              >
                <PlatformIcon id={p.id} size={14} />
                <span>{p.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 快速示例 ── */}
      <div className="flex flex-wrap gap-2 justify-center">
        {SUGGESTIONS.map(({ icon: Icon, label, prompt }, i) => (
          <button
            key={prompt}
            onClick={() => onSelect(prompt)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-app-border bg-app-elevated text-xs text-app-text-secondary hover:border-primary-500/30 hover:text-primary-400 hover:bg-primary-500/5 transition-all duration-200"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
