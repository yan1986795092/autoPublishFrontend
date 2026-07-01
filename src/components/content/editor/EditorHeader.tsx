import { ArrowLeft, Send } from 'lucide-react';
import { Button } from '../../ui/button';
import { MoreMenu } from './MoreMenu';
import { PlatformSwitcher } from './PlatformSwitcher';

export interface EditorHeaderProps {
  /** 当前 platform code */
  activePlatform: string;
  /** 平台已切换但未保存 */
  platformPending?: boolean;
  /** 切换平台回调 — 不持久化，需用户点保存 */
  onPlatformChange: (platform: string) => void;
  onBack: () => void;
  /** 发布按钮回调（内部已包含违禁词检测流程） */
  onPublish: () => void;
  onExportMd: () => void;
  onCopyContent: () => void;
  onHistory: () => void;
  onPublishHistory: () => void;
  onDelete: () => void;
}

export function EditorHeader({
  activePlatform,
  platformPending,
  onPlatformChange,
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
        {/* ── P0-3: 平台切换器 ── */}
        <PlatformSwitcher
          current={activePlatform}
          onChange={onPlatformChange}
          pending={platformPending}
        />
        <Button variant="primary" size="sm" onClick={() => onPublish()} className="h-7 text-xs gap-1.5">
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
