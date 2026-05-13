import { useEditorStore } from '../../stores/useEditorStore';
import { Textarea } from '../ui/textarea';
import { ScrollArea } from '../ui/scroll-area';

export function MarkdownEditor() {
  const { content_md, setContent } = useEditorStore();

  return (
    <div className="flex flex-col h-full border border-app-border rounded-xl overflow-hidden bg-app-surface">
      <div className="px-4 py-2.5 border-b border-app-border bg-app-elevated flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-app-text-tertiary" />
        <span className="text-xs font-medium text-app-text-secondary">Markdown 源码编辑</span>
        <span className="ml-auto text-xs text-app-text-tertiary">{content_md.length} 字</span>
      </div>
      <ScrollArea className="flex-1">
        <Textarea
          value={content_md}
          onChange={(e) => setContent(e.target.value, e.target.value)}
          className="min-h-[300px] border-0 rounded-none resize-none font-mono text-sm bg-app-surface text-app-text focus:ring-0 focus:border-primary-500"
          placeholder="在这里编辑 Markdown 源码..."
        />
      </ScrollArea>
    </div>
  );
}
