import { Tags } from 'lucide-react';
import { TagInput } from '../../ui/TagInput';

export interface TagEditorProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  onAiTags: () => void;
  aiLoading: boolean;
}

export function TagEditor({ tags, onChange, onAiTags, aiLoading }: TagEditorProps) {
  return (
    <div className="flex items-center justify-center mt-2">
      <div className="flex items-center w-full max-w-2xl rounded-lg border border-app-border bg-app-surface focus-within:border-primary-500/50 transition-all duration-150">
        <div className="flex-1 [&>div]:border-0 [&>div]:bg-transparent [&>div]:p-0 [&>div]:rounded-none [&>div]:focus-within:ring-0">
          <TagInput tags={tags} onChange={onChange} />
        </div>
        <div className="shrink-0 flex items-center self-stretch border-l border-app-border/50">
          <button
            onClick={onAiTags}
            disabled={aiLoading}
            title="AI 推荐标签"
            type="button"
            className="flex items-center gap-1 px-2.5 h-full text-primary-400 text-[10px] hover:bg-primary-500/10 transition-colors disabled:opacity-40"
          >
            <Tags className="w-3.5 h-3.5" />
            <span className="font-medium">推荐标签</span>
          </button>
        </div>
      </div>
    </div>
  );
}
