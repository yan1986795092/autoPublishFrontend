import { Hash, Tags } from 'lucide-react';
import { TagInput } from '../../ui/TagInput';
import { Badge } from '../../ui/badge';
import type { ContentStats } from '../../../types/content-editor';

export interface EditorMetaRowProps {
  title: string;
  onTitleChange: (value: string) => void;
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  onAiHeadlines: () => void;
  onAiTags: () => void;
  aiLoading: boolean;
  status?: string;
  stats?: ContentStats;
}

const STATUS_LABEL: Record<string, string> = {
  published: '已发布',
  draft: '草稿',
  archived: '已归档',
};

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'error'> = {
  published: 'success',
  draft: 'warning',
  archived: 'error',
};

export function EditorMetaRow({
  title,
  onTitleChange,
  tags,
  onTagsChange,
  onAiHeadlines,
  onAiTags,
  aiLoading,
  status,
  stats,
}: EditorMetaRowProps) {
  return (
    <div className="flex flex-col gap-0 border-y border-app-border bg-app-elevated">
      {/* ── Title row ── */}
      <div className="flex items-center gap-0">
        <div className="flex-1 min-w-0">
          <input
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="输入内容标题"
            aria-label="内容标题"
            className="w-full h-12 px-4 text-xl font-bold bg-transparent border-0 outline-none placeholder:text-app-text-tertiary/30 text-app-text"
          />
        </div>
        <div className="shrink-0 flex items-center border-l border-app-border/50">
          <button
            onClick={onAiHeadlines}
            disabled={aiLoading}
            title="AI 生成标题"
            type="button"
            className="flex items-center gap-1.5 px-3 h-full text-primary-400 text-[11px] hover:bg-primary-500/10 transition-colors disabled:opacity-40"
          >
            <Hash className="w-3.5 h-3.5" />
            <span className="font-medium">生成标题</span>
          </button>
          {status && (
            <Badge
              variant={STATUS_VARIANT[status] ?? 'warning'}
              size="sm"
              className="mx-2 shrink-0"
            >
              {STATUS_LABEL[status] ?? status}
            </Badge>
          )}
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="h-px bg-app-border/50 mx-4" />

      {/* ── Tags + stats row ── */}
      <div className="flex items-center gap-0">
        <div className="flex-1 min-w-0 px-4 py-2">
          <TagInput
            tags={tags}
            onChange={onTagsChange}
            placeholder="输入标签后回车添加"
          />
        </div>
        <div className="shrink-0 flex items-center gap-3 border-l border-app-border/50 px-3 py-2">
          {stats && (
            <div className="flex items-center gap-2 text-[10px] text-app-text-tertiary">
              <span className="whitespace-nowrap tabular-nums">{stats.charCount.toLocaleString()} 字</span>
              <span className="w-px h-2.5 bg-app-border" />
              <span className="whitespace-nowrap">~{stats.readingTime} 分钟</span>
              <span className="w-px h-2.5 bg-app-border" />
              <span className="whitespace-nowrap">{stats.paragraphs} 段落</span>
            </div>
          )}
          <button
            onClick={onAiTags}
            disabled={aiLoading}
            title="AI 推荐标签"
            type="button"
            className="flex items-center gap-1 text-primary-400 text-[11px] hover:bg-primary-500/10 px-2 py-1 rounded-md transition-colors disabled:opacity-40"
          >
            <Tags className="w-3.5 h-3.5" />
            <span className="font-medium">推荐标签</span>
          </button>
        </div>
      </div>
    </div>
  );
}
