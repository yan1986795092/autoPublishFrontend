import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { COMMANDS } from '../config/commands';

export function useKeyboardShortcuts() {
  const navigate = useNavigate();

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const mod = e.metaKey || e.ctrlKey;

    // Ctrl+S — Save (only on edit page)
    if (mod && e.key === 's') {
      e.preventDefault();
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

    // Escape — Stop running agent task
    if (e.key === 'Escape') {
      window.dispatchEvent(new CustomEvent('shortcut:stop-agent'));
      return;
    }

    // Ctrl+B — Toggle sidebar
    if (mod && e.key === 'b') {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('shortcut:toggle-sidebar'));
      return;
    }
  }, [navigate]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

/** Get all commands that apply in a given context */
function getContextCommands(context: Command['context']) {
  return COMMANDS.filter((c) => c.context === context);
}

import type { Command } from '../config/commands';
