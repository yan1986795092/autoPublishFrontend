import { useEffect, useRef, useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { RichTextEditor } from './RichTextEditor';
import { MarkdownEditor } from './MarkdownEditor';
import { useEditorStore } from '../../stores/useEditorStore';
import { useGeneratorStore } from '../../stores/useGeneratorStore';
import { contentsApi } from '../../services/api';
import { PenLine, Code2, Check, Loader2, AlertCircle, ListTree } from 'lucide-react';
import { cn } from '../../utils/helpers';

/** 解析 Markdown 标题生成大纲 */
function parseOutline(md: string): Array<{ level: number; text: string; lineIndex: number }> {
  const lines = md.split('\n');
  const headings: Array<{ level: number; text: string; lineIndex: number }> = [];
  lines.forEach((line, i) => {
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      headings.push({ level: match[1].length, text: match[2].trim(), lineIndex: i });
    }
  });
  return headings;
}

export function ContentEditor() {
  const { mode, setMode, content_md, isDirty, setSaving, setLastSavedAt } = useEditorStore();
  const { draft } = useGeneratorStore();

  const wordCount = draft.content_md ? draft.content_md.replace(/\s/g, '').length : 0;

  // Auto-save state
  const [autoSaveText, setAutoSaveText] = useState<string | null>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Outline
  const [showOutline, setShowOutline] = useState(false);
  const headings = useMemo(() => parseOutline(draft.content_md || ''), [draft.content_md]);

  // Auto-save with 3s debounce
  useEffect(() => {
    if (!draft.id || !isDirty) return;

    if (autoSaveTimer.current != null) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      setSaving(true);
      setAutoSaveText('自动保存中...');
      try {
        await contentsApi.autosave(draft.id!, content_md);
        setLastSavedAt(new Date().toISOString());
        setAutoSaveText('已自动保存');
        setTimeout(() => setAutoSaveText(null), 2000);
      } catch {
        setAutoSaveText('保存失败');
        setTimeout(() => setAutoSaveText(null), 3000);
      } finally {
        setSaving(false);
      }
    }, 3000);

    return () => {
      if (autoSaveTimer.current != null) clearTimeout(autoSaveTimer.current);
    };
  }, [isDirty, content_md, draft.id]);

  return (
    <div className="h-full flex flex-col rounded-lg border border-app-border bg-app-elevated overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/[0.04] flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-primary-600/20 flex items-center justify-center">
            <PenLine className="w-3 h-3 text-primary-400" />
          </div>
          <h2 className="text-xs font-semibold text-app-text">内容编辑</h2>
        </div>
        <div className="flex items-center gap-2">
          {/* Outline toggle */}
          {headings.length > 0 && (
            <button
              onClick={() => setShowOutline(!showOutline)}
              className={cn(
                'p-1 rounded-md transition-all',
                showOutline
                  ? 'text-primary-400 bg-primary-600/15'
                  : 'text-app-text-tertiary hover:text-app-text-secondary'
              )}
              title="内容大纲"
            >
              <ListTree className="w-3 h-3" />
            </button>
          )}
          {/* Auto-save indicator */}
          {autoSaveText && (
            <span className={cn(
              'text-[9px] flex items-center gap-1 px-1.5 py-0.5 rounded',
              autoSaveText === '已自动保存' && 'text-green-400 bg-green-500/10',
              autoSaveText === '自动保存中...' && 'text-amber-400 bg-amber-500/10',
              autoSaveText === '保存失败' && 'text-red-400 bg-red-500/10',
            )}>
              {autoSaveText === '自动保存中...' ? (
                <Loader2 className="w-2.5 h-2.5 animate-spin" />
              ) : autoSaveText === '已自动保存' ? (
                <Check className="w-2.5 h-2.5" />
              ) : (
                <AlertCircle className="w-2.5 h-2.5" />
              )}
              {autoSaveText}
            </span>
          )}
          {wordCount > 0 && (
            <span className="text-[9px] text-app-text-tertiary">{wordCount} 字</span>
          )}
        </div>
      </div>

      {/* Outline panel */}
      <AnimatePresence>
        {showOutline && headings.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-b border-white/[0.04]"
          >
            <div className="px-4 py-2 space-y-0.5 bg-app-surface/50">
              {headings.map((h, i) => (
                <button
                  key={i}
                  onClick={() => {
                    // Scroll to heading by dispatching custom event
                    window.dispatchEvent(new CustomEvent('editor:scroll-to-heading', {
                      detail: { lineIndex: h.lineIndex },
                    }));
                    setShowOutline(false);
                  }}
                  className={cn(
                    'block w-full text-left px-2 py-1 rounded-md text-[10px] transition-colors hover:bg-white/[0.06]',
                    h.level === 1 && 'text-app-text font-semibold',
                    h.level === 2 && 'text-app-text-secondary pl-4',
                    h.level >= 3 && 'text-app-text-tertiary pl-6',
                  )}
                >
                  {h.text}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs + Editor */}
      <div className="flex-1 flex flex-col min-h-0">
        <Tabs
          value={mode}
          onValueChange={(v) => setMode(v as 'richtext' | 'markdown')}
          className="flex flex-col flex-1 min-h-0"
        >
          <div className="px-4 pt-3 pb-0 flex-shrink-0">
            <TabsList className="bg-app-surface border border-white/[0.04] rounded-lg p-0.5">
              <TabsTrigger
                value="richtext"
                className={cn(
                  'px-3 py-1.5 rounded-md text-[11px] transition-all',
                  'data-[state=active]:bg-app-elevated data-[state=active]:text-app-text data-[state=active]:shadow-sm',
                  'data-[state=inactive]:text-app-text-tertiary'
                )}
              >
                <PenLine className="w-3 h-3 mr-1" />
                富文本
              </TabsTrigger>
              <TabsTrigger
                value="markdown"
                className={cn(
                  'px-3 py-1.5 rounded-md text-[11px] transition-all',
                  'data-[state=active]:bg-app-elevated data-[state=active]:text-app-text data-[state=active]:shadow-sm',
                  'data-[state=inactive]:text-app-text-tertiary'
                )}
              >
                <Code2 className="w-3 h-3 mr-1" />
                Markdown
              </TabsTrigger>
            </TabsList>
          </div>

          <AnimatePresence mode="wait">
            <TabsContent value="richtext" className="flex-1 mt-0 min-h-0">
              <motion.div
                key="richtext"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full px-4 pb-4 pt-2"
              >
                <RichTextEditor />
              </motion.div>
            </TabsContent>
            <TabsContent value="markdown" className="flex-1 mt-0 min-h-0">
              <motion.div
                key="markdown"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full px-4 pb-4 pt-2"
              >
                <MarkdownEditor />
              </motion.div>
            </TabsContent>
          </AnimatePresence>
        </Tabs>
      </div>
    </div>
  );
}
