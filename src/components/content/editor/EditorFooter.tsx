import { Loader2, Save, RotateCcw, CheckCircle2, BookOpen, Clock, Type } from 'lucide-react';
import { Button } from '../../ui/button';
import { ShortcutHint } from '../../ui/shortcut-hint';
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
    <div className="flex items-center justify-between px-4 py-2.5 bg-app-elevated rounded-lg border border-app-border">
      {/* Stats */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-[10px] text-app-text-tertiary">
          <Type className="w-3 h-3 text-primary-400 shrink-0" />
          <span className="whitespace-nowrap tabular-nums">{stats.charCount.toLocaleString()} 字</span>
        </div>
        <span className="w-px h-3 bg-app-border shrink-0" />
        <div className="flex items-center gap-1.5 text-[10px] text-app-text-tertiary">
          <Clock className="w-3 h-3 shrink-0" />
          <span className="whitespace-nowrap">~{stats.readingTime} 分钟</span>
        </div>
        <span className="w-px h-3 bg-app-border shrink-0" />
        <div className="flex items-center gap-1.5 text-[10px] text-app-text-tertiary">
          <BookOpen className="w-3 h-3 shrink-0" />
          <span className="whitespace-nowrap">{stats.paragraphs} 段落</span>
        </div>
        {stats.headings > 0 && (
          <>
            <span className="w-px h-3 bg-app-border shrink-0" />
            <span className="text-[10px] text-app-text-tertiary whitespace-nowrap">{stats.headings} 标题</span>
          </>
        )}
        {stats.links > 0 && (
          <>
            <span className="w-px h-3 bg-app-border shrink-0" />
            <span className="text-[10px] text-app-text-tertiary whitespace-nowrap">{stats.links} 链接</span>
          </>
        )}
      </div>

      {/* Auto-save status */}
      <div className="flex items-center gap-1.5 mr-2">
        {autoSaveStatus === 'saving' && (
          <>
            <Loader2 className="w-3 h-3 animate-spin text-app-text-tertiary" />
            <span className="text-[10px] text-app-text-tertiary">保存中…</span>
          </>
        )}
        {autoSaveStatus === 'saved' && (
          <>
            <CheckCircle2 className="w-3 h-3 text-green-400" />
            <span className="text-[10px] text-green-400">已保存</span>
          </>
        )}
      </div>

      {/* Actions */}
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
