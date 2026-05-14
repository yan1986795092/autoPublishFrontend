import { useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';

export interface HistoryItem {
  id: string;
  prompt: string;
  timestamp: string;
}

const STORAGE_KEY = 'homepage_prompt_history';
const MAX_HISTORY = 20;

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function usePromptHistory() {
  const [history, setHistory] = useLocalStorage<HistoryItem[]>(STORAGE_KEY, []);

  const addToHistory = useCallback((prompt: string) => {
    if (!prompt.trim()) return;

    setHistory((prev) => {
      // Dedup by exact match - remove if exists
      const filtered = prev.filter((item) => item.prompt !== prompt);
      
      // Add new item to front
      const newItem: HistoryItem = {
        id: generateId(),
        prompt: prompt.trim(),
        timestamp: new Date().toISOString(),
      };

      // Cap at MAX_HISTORY items
      return [newItem, ...filtered].slice(0, MAX_HISTORY);
    });
  }, [setHistory]);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, [setHistory]);

  const removeFromHistory = useCallback((id: string) => {
    setHistory((prev) => prev.filter((item) => item.id !== id));
  }, [setHistory]);

  return {
    history,
    addToHistory,
    clearHistory,
    removeFromHistory,
  };
}
