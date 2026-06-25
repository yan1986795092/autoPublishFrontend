import { BookOpen, Clock } from 'lucide-react';
import type { ContentStats } from '../../../types/content-editor';

export function ContentStatsBar({ stats }: { stats: ContentStats }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-app-surface/50 border-t border-app-border overflow-x-auto">
      <BookOpen className="w-3 h-3 text-primary-400 shrink-0" />
      <span className="text-[10px] text-app-text-tertiary whitespace-nowrap tabular-nums">
        {stats.charCount.toLocaleString()} 字
      </span>
      <span className="w-px h-3 bg-app-border shrink-0" />
      <span className="text-[10px] text-app-text-tertiary whitespace-nowrap flex items-center gap-1">
        <Clock className="w-2.5 h-2.5" /> ~{stats.readingTime} 分钟
      </span>
      <span className="w-px h-3 bg-app-border shrink-0" />
      <span className="text-[10px] text-app-text-tertiary whitespace-nowrap">
        {stats.paragraphs} 段落
      </span>
      {stats.headings > 0 && (
        <>
          <span className="w-px h-3 bg-app-border shrink-0" />
          <span className="text-[10px] text-app-text-tertiary whitespace-nowrap">
            {stats.headings} 标题
          </span>
        </>
      )}
      {stats.links > 0 && (
        <>
          <span className="w-px h-3 bg-app-border shrink-0" />
          <span className="text-[10px] text-app-text-tertiary whitespace-nowrap">
            {stats.links} 链接
          </span>
        </>
      )}
    </div>
  );
}
