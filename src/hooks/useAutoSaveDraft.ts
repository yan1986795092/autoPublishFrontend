import { useEffect, useRef, useCallback } from 'react';

const STORAGE_KEY = 'homepage_prompt_draft';
const DEBOUNCE_MS = 5000;

export function useAutoSaveDraft(prompt: string) {
  const lastSavedRef = useRef<string>('');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load draft from localStorage on mount
  const getDraft = useCallback((): string | null => {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  }, []);

  // Clear draft from localStorage
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      lastSavedRef.current = '';
    } catch {
      // Ignore errors
    }
  }, []);

  // Check if there's an unsaved draft different from current prompt
  const hasUnsavedDraft = prompt !== lastSavedRef.current && getDraft() !== null;

  // Auto-save with debounce
  useEffect(() => {
    // Skip if no change from last saved value
    if (prompt === lastSavedRef.current) return;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new debounced save
    timeoutRef.current = setTimeout(() => {
      if (prompt.trim()) {
        try {
          localStorage.setItem(STORAGE_KEY, prompt);
          lastSavedRef.current = prompt;
        } catch {
          // Ignore storage errors
        }
      }
    }, DEBOUNCE_MS);

    // Cleanup on unmount or prompt change
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [prompt]);

  return {
    clearDraft,
    getDraft,
    hasUnsavedDraft,
  };
}
