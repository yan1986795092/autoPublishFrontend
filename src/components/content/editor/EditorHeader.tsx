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
    <div className="sticky top-0 z-30 bg-app-bg/90 backdrop-blur-sm -mx-6 px-6 py-1.5 -mt-6 mb-0 border-b border-app-border/20">
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="text-app-text-tertiary hover:text-app-text-secondary shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button variant="outline" size="sm" onClick={() => onPublish(contentId)} className="h-7 text-xs px-2.5">
            <Send className="h-3.5 w-3.5 mr-1" />
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
    </div>
  );
}
