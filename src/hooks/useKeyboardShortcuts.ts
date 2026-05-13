import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGeneratorStore } from '../stores/useGeneratorStore';
import { useEditorStore } from '../stores/useEditorStore';

interface ShortcutOptions {
  /** Whether Ctrl+Enter should trigger generation */
  enableGenerate?: boolean;
  /** Callback when Ctrl+Enter is pressed */
  onGenerate?: () => void;
}

export function useKeyboardShortcuts(options: ShortcutOptions = {}) {
  const navigate = useNavigate();
  const { draft } = useGeneratorStore();
  const { isDirty } = useEditorStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;

      // Ctrl+N: New content
      if (isCtrl && e.key === 'n') {
        e.preventDefault();
        navigate('/');
        return;
      }

      // Ctrl+S: Save (only if there's a draft and dirty content)
      if (isCtrl && e.key === 's') {
        e.preventDefault();
        if (draft.id && isDirty) {
          // Dispatch custom event that the save handler listens to
          window.dispatchEvent(new CustomEvent('app:save'));
        }
        return;
      }

      // Ctrl+Enter: Generate
      if (isCtrl && e.key === 'Enter') {
        e.preventDefault();
        if (options.enableGenerate && options.onGenerate) {
          options.onGenerate();
        }
        return;
      }

      // Escape: Close modals (handled by dialog components)
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, draft.id, isDirty, options.enableGenerate, options.onGenerate]);
}
