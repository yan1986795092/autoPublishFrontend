import { Loader2, Save, RotateCcw, CheckCircle2 } from 'lucide-react';
import { Button } from '../../ui/button';
import { ShortcutHint } from '../../ui/shortcut-hint';
import { ContentStatsBar } from './ContentStatsBar';
import type { ContentStats } from '../../../types/content-editor';

export interface EditorFooterProps {
  stats: ContentStats;
  autoSaveStatus: 'idle' | 'saving' | 'saved';
  isDirty: boolean;
  saving: boolean;
  onSave: () => void;
  onUndo: () => void;
}

export function EditorFooter({ stats, autoSaveStatus, isDirty, saving, onSave, onUndo }: EditorFooterProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 rounded-lg border border-app-border bg-app-elevated">
      <div className="flex items-center gap-3">
        <ContentStatsBar stats={stats} />
        <span className="text-[10px] text-app-text-tertiary flex items-center gap-1">
          {autoSaveStatus === 'saving' && <Loader2 className="w-3 h-3 animate-spin" />}
          {autoSaveStatus === 'saved' && <CheckCircle2 className="w-3 h-3 text-green-400" />}
          {autoSaveStatus === 'saving' ? '自动保存中…' : autoSaveStatus === 'saved' ? '已保存' : ''}
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {isDirty && <span className="text-[10px] text-amber-400">未保存</span>}
        <ShortcutHint keys={['Ctrl', 'S']} />
        <Button variant="ghost" size="sm" onClick={onUndo} disabled={!isDirty} className="h-7 text-xs">
          <RotateCcw className="h-3 w-3 mr-1" />撤销
        </Button>
        <Button variant="primary" size="sm" onClick={onSave} loading={saving} disabled={!isDirty || saving} className="h-7 text-xs">
          <Save className="h-3 w-3 mr-1" />保存
        </Button>
      </div>
    </div>
  );
}
