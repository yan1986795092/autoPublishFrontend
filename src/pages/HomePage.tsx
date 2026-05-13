import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AIStatusPanel } from '../components/generator/AIStatusPanel';
import { TopicInputPanel } from '../components/generator/TopicInputPanel';
import { PreviewPanel } from '../components/preview/PreviewPanel';
import { PublishDialog } from '../components/publish/PublishDialog';
import { ContentEditor } from '../components/editor/ContentEditor';
import { Button } from '../components/ui/button';
import { useGeneratorStore } from '../stores/useGeneratorStore';
import { useUIStore } from '../stores/useUIStore';
import { useEditorStore } from '../stores/useEditorStore';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { Save, Send, PanelLeft, PanelRight } from 'lucide-react';
import { contentsApi } from '../services/api';
import { cn } from '../utils/helpers';

const panelVariants = {
  left: {
    closed: { x: '-100%', opacity: 0 },
    open: { x: 0, opacity: 1 },
  },
  right: {
    closed: { x: '100%', opacity: 0 },
    open: { x: 0, opacity: 1 },
  },
};

export function HomePage() {
  const { draft, status } = useGeneratorStore();
  const { openPublishDialog } = useUIStore();
  const { content_md, isDirty, setContent, setSaving, setLastSavedAt, isSaving } = useEditorStore();
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);

  const isIdle = !draft.id;
  useKeyboardShortcuts({
    enableGenerate: isIdle,
    onGenerate: () => window.dispatchEvent(new CustomEvent('app:generate')),
  });

  useEffect(() => {
    if (draft.content_md) {
      setContent(draft.content_md, draft.content_html || draft.content_md);
    }
  }, [draft.content_md, draft.content_html]);

  const handleSave = useCallback(async () => {
    if (!draft.id) return;
    setSaving(true);
    try {
      await contentsApi.update(draft.id, {
        content_md: content_md,
        content_html: content_md,
        title: draft.title,
      });
      setLastSavedAt(new Date().toISOString());
    } catch {
      // handle error
    } finally {
      setSaving(false);
    }
  }, [draft.id, content_md, draft.title, setSaving, setLastSavedAt]);

  const handleSaveRef = useRef(handleSave);
  handleSaveRef.current = handleSave;
  useEffect(() => {
    const listener = () => handleSaveRef.current();
    window.addEventListener('app:save', listener);
    return () => window.removeEventListener('app:save', listener);
  }, []);

  const handlePublish = () => {
    if (draft.id) {
      openPublishDialog(draft.id);
    }
  };

  const leftContent = draft.id ? <AIStatusPanel /> : <TopicInputPanel />;

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-shrink-0 mb-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLeftPanelOpen(!leftPanelOpen)}
            className={cn('h-8 px-3 text-xs', leftPanelOpen && 'bg-app-hover')}
          >
            <PanelLeft className="h-3.5 w-3.5 mr-1.5" />
            创作面板
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRightPanelOpen(!rightPanelOpen)}
            className={cn('h-8 px-3 text-xs', rightPanelOpen && 'bg-app-hover')}
          >
            <PanelRight className="h-3.5 w-3.5 mr-1.5" />
            预览
          </Button>
        </div>

        <div className="flex gap-2">
          <AnimatePresence>
            {draft.id && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex gap-2"
              >
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSave}
                  disabled={!isDirty || isSaving}
                  className="h-8 px-3 text-xs"
                >
                  <Save className="h-3.5 w-3.5 mr-1" />
                  {isSaving ? '保存中...' : '保存'}
                </Button>
                <Button
                  size="sm"
                  onClick={handlePublish}
                  className="h-8 px-3 text-xs bg-primary-600 hover:bg-primary-500"
                >
                  <Send className="h-3.5 w-3.5 mr-1" />
                  发布
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Workspace */}
      <div className="flex-1 relative min-h-0 flex gap-0">
        {/* Left slide-in panel */}
        <AnimatePresence mode="wait">
          {leftPanelOpen && (
            <motion.div
              key="left-panel"
              custom="left"
              variants={panelVariants.left}
              initial="closed"
              animate="open"
              exit="closed"
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="absolute left-0 top-0 bottom-0 w-[360px] z-10 overflow-hidden border-r border-app-border bg-app-bg rounded-l-lg"
            >
              <div className="h-full overflow-auto p-4">
                {leftContent}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Editor */}
        <div className={cn(
          'flex-1 min-w-0 h-full transition-all duration-300',
          leftPanelOpen && 'pl-[360px]',
          rightPanelOpen && 'pr-[420px]'
        )}>
          <ContentEditor />
        </div>

        {/* Right slide-in panel */}
        <AnimatePresence>
          {rightPanelOpen && (
            <motion.div
              key="right-panel"
              custom="right"
              variants={panelVariants.right}
              initial="closed"
              animate="open"
              exit="closed"
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="absolute right-0 top-0 bottom-0 w-[420px] z-10 overflow-hidden border-l border-app-border bg-app-bg rounded-r-lg"
            >
              <div className="h-full overflow-auto p-4">
                <PreviewPanel />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Floating dialogs */}
      <PublishDialog />
    </div>
  );
}
