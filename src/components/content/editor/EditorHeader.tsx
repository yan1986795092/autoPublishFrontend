import { ArrowLeft, Send } from 'lucide-react';
import { Button } from '../../ui/button';
import { MoreMenu } from './MoreMenu';

export interface EditorHeaderProps {
  contentId: string;
  onBack: () => void;
  onPublish: (contentId: string) => void;
  onExportMd: () => void;
  onCopyContent: () => void;
  onHistory: () => void;
  onPublishHistory: () => void;
  onDelete: () => void;
}

export function EditorHeader({
  contentId,
  onBack,
  onPublish,
  onExportMd,
  onCopyContent,
  onHistory,
  onPublishHistory,
  onDelete,
}: EditorHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-app-border">
      <Button
        variant="ghost"
        size="icon"
        onClick={onBack}
        className="text-app-text-tertiary hover:text-app-text-secondary shrink-0"
      >
        <ArrowLeft className="w-4 h-4" />
      </Button>
      <div className="flex items-center gap-2 shrink-0">
        <Button variant="primary" size="sm" onClick={() => onPublish(contentId)} className="h-7 text-xs gap-1.5">
          <Send className="h-3 w-3" />
          发布
        </Button>
        <MoreMenu
          onExportMd={onExportMd}
          onCopyContent={onCopyContent}
          onHistory={onHistory}
          onPublishHistory={onPublishHistory}
          onDelete={onDelete}
        />
      </div>
    </div>
  );
}
