import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '../stores/useUIStore';

export function useKeyboardShortcuts() {
  const navigate = useNavigate();
  const { showToast } = useUIStore();

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const mod = e.metaKey || e.ctrlKey;

    // Ctrl+S — Save (only on edit page)
    if (mod && e.key === 's') {
      e.preventDefault();
      // Dispatch a custom event that ContentEditPage listens to
      window.dispatchEvent(new CustomEvent('shortcut:save'));
      return;
    }

    // Ctrl+N — New content (navigate to home)
    if (mod && e.key === 'n') {
      e.preventDefault();
      navigate('/');
      return;
    }

    // Ctrl+/ — Toggle shortcut help overlay
    if (mod && e.key === '/') {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('shortcut:toggle-help'));
      return;
    }

    // Escape — Close shortcut help
    if (e.key === 'Escape') {
      window.dispatchEvent(new CustomEvent('shortcut:close-help'));
    }
  }, [navigate, showToast]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
