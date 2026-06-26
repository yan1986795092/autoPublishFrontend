import { Download, ClipboardCopy, History, Send, Trash2, MoreVertical } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '../../../components/ui/dropdown-menu';
import type { MoreMenuProps } from '../../../types/content-editor';

export function MoreMenu({ onExportMd, onCopyContent, onHistory, onPublishHistory, onDelete }: MoreMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 text-xs">
          <MoreVertical className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={4}>
        <DropdownMenuItem onClick={onExportMd}>
          <Download className="w-3.5 h-3.5" /> 导出 Markdown
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onCopyContent}>
          <ClipboardCopy className="w-3.5 h-3.5" /> 复制内容
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onHistory}>
          <History className="w-3.5 h-3.5" /> 版本历史
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onPublishHistory}>
          <Send className="w-3.5 h-3.5" /> 发布记录
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem destructive onClick={onDelete}>
          <Trash2 className="w-3.5 h-3.5" /> 删除内容
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
