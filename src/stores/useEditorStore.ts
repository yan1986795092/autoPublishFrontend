import { create } from 'zustand';
import type { Editor } from '@tiptap/react';

export interface BannedWordItem {
  word: string;
  position: number;
  platform: string;
  suggestion: string;
}

interface EditorState {
  mode: 'richtext' | 'markdown';
  content_md: string;
  content_html: string;
  content_json: object | null;
  isDirty: boolean;
  isSaving: boolean;
  lastSavedAt: string | null;
  activePlatform: string;
  bannedWords: BannedWordItem[];
  editorInstance: Editor | null;

  setMode: (mode: 'richtext' | 'markdown') => void;
  setContent: (content_md: string, content_html: string, content_json?: object | null) => void;
  setDirty: (isDirty: boolean) => void;
  setSaving: (isSaving: boolean) => void;
  setLastSavedAt: (at: string) => void;
  setActivePlatform: (platform: string) => void;
  setBannedWords: (words: BannedWordItem[]) => void;
  setEditorInstance: (editor: Editor | null) => void;
  reset: () => void;
}

export const useEditorStore = create<EditorState>()((set) => ({
  mode: 'richtext',
  content_md: '',
  content_html: '',
  content_json: null,
  isDirty: false,
  isSaving: false,
  lastSavedAt: null,
  activePlatform: 'xiaohongshu',
  bannedWords: [],
  editorInstance: null,

  setMode: (mode) => set({ mode }),
  setContent: (content_md, content_html, content_json = null) =>
    set({ content_md, content_html, content_json, isDirty: true }),
  setDirty: (isDirty) => set({ isDirty }),
  setSaving: (isSaving) => set({ isSaving }),
  setLastSavedAt: (lastSavedAt) => set({ lastSavedAt, isDirty: false }),
  setActivePlatform: (activePlatform) => set({ activePlatform }),
  setBannedWords: (bannedWords) => set({ bannedWords }),
  setEditorInstance: (editorInstance) => set({ editorInstance }),
  reset: () =>
    set({
      mode: 'richtext',
      content_md: '',
      content_html: '',
      content_json: null,
      isDirty: false,
      isSaving: false,
      lastSavedAt: null,
      bannedWords: [],
      editorInstance: null,
    }),
}));
