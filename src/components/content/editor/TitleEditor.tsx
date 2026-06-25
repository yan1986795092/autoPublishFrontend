import { Hash } from 'lucide-react';
import { Badge } from '../../ui/badge';

export interface TitleEditorProps {
  title: string;
  onChange: (title: string) => void;
  onAiHeadlines: () => void;
  aiLoading: boolean;
  status?: string;
}

export function TitleEditor({ title, onChange, onAiHeadlines, aiLoading, status }: TitleEditorProps) {
  return (
    <div className="pt-4 pb-3 px-0 border-b border-app-border/10">
      <div className="flex items-center justify-center gap-3">
        <div className="flex items-center w-full max-w-2xl rounded-lg border border-app-border bg-app-surface focus-within:border-primary-500/50 focus-within:shadow-[0_0_0_2px_rgba(59,130,246,0.15)] transition-all duration-150">
          <input
            value={title}
            onChange={(e) => onChange(e.target.value)}
            placeholder="输入内容标题"
            aria-label="内容标题"
            className="flex-1 h-12 text-2xl font-bold bg-transparent border-0 px-4 focus:outline-none placeholder:text-app-text-tertiary/30"
          />
          <div className="shrink-0 flex items-center self-stretch border-l border-app-border/50 ml-1">
            <button
              onClick={onAiHeadlines}
              disabled={aiLoading}
              title="AI 生成标题"
              type="button"
              className="flex items-center gap-1 px-2.5 h-full text-primary-400 text-[10px] hover:bg-primary-500/10 transition-colors disabled:opacity-40"
            >
              <Hash className="w-3.5 h-3.5" />
              <span className="font-medium">生成标题</span>
            </button>
          </div>
        </div>
        {status && (
          <Badge variant={status === 'published' ? 'success' : status === 'draft' ? 'warning' : 'error'} size="sm" className="shrink-0">
            {status === 'published' ? '已发布' : status === 'draft' ? '草稿' : '已归档'}
          </Badge>
        )}
      </div>
    </div>
  );
}
