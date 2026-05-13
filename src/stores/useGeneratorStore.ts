import { create } from 'zustand';
import type { GenerateParams, ContentVersion } from '../types';

type GeneratorStatus = 'idle' | 'generating' | 'streaming' | 'generated' | 'editing' | 'error';

interface ContentDraft {
  id: string | null;
  title: string;
  content_md: string;
  content_html: string;
  content_json: object | null;
  topic: string;
  platform_code: string;
  parameters: GenerateParams;
  template_id: string | null;
  model: string | null;
  persona_id: string | null;
  versions: ContentVersion[];
  currentVersionNumber: number;
}

interface GeneratorState {
  status: GeneratorStatus;
  draft: ContentDraft;
  error: string | null;
  metadata: {
    model: string;
    tokens_used: number;
    tokens_cost_usd: number;
    generation_time_ms: number;
  } | null;

  setStatus: (status: GeneratorStatus) => void;
  setTopic: (topic: string) => void;
  setPlatformCode: (code: string) => void;
  setParameters: (params: Partial<GenerateParams>) => void;
  setTemplateId: (templateId: string | null) => void;
  setModel: (model: string | null) => void;
  setPersonaId: (personaId: string | null) => void;
  setDraft: (draft: Partial<ContentDraft>) => void;
  setGeneratedContent: (content: { id: string; title: string; content_md: string; content_html: string; metadata: GeneratorState['metadata'] }) => void;
  setStreamingContent: (content_md: string, content_html: string) => void;
  setError: (error: string | null) => void;
  setVersions: (versions: ContentVersion[]) => void;
  reset: () => void;
}

const initialDraft: ContentDraft = {
  id: null,
  title: '',
  content_md: '',
  content_html: '',
  content_json: null,
  topic: '',
  platform_code: 'xiaohongshu',
  parameters: {
    length: 'medium',
    creativity: 0.7,
    tone: 'friendly',
  },
  template_id: null,
  model: null,
  persona_id: null,
  versions: [],
  currentVersionNumber: 0,
};

export const useGeneratorStore = create<GeneratorState>()((set) => ({
  status: 'idle',
  draft: { ...initialDraft },
  error: null,
  metadata: null,

  setStatus: (status) => set({ status }),

  setTopic: (topic) =>
    set((state) => ({ draft: { ...state.draft, topic } })),

  setPlatformCode: (platform_code) =>
    set((state) => ({ draft: { ...state.draft, platform_code } })),

  setParameters: (params) =>
    set((state) => ({
      draft: { ...state.draft, parameters: { ...state.draft.parameters, ...params } },
    })),

  setTemplateId: (template_id) =>
    set((state) => ({ draft: { ...state.draft, template_id } })),

  setModel: (model) =>
    set((state) => ({ draft: { ...state.draft, model } })),

  setPersonaId: (persona_id) =>
    set((state) => ({ draft: { ...state.draft, persona_id } })),

  setDraft: (draftUpdate) =>
    set((state) => ({ draft: { ...state.draft, ...draftUpdate } })),

  setGeneratedContent: ({ id, title, content_md, content_html, metadata }) =>
    set((state) => ({
      status: 'generated',
      draft: {
        ...state.draft,
        id,
        title,
        content_md,
        content_html,
      },
      metadata,
      error: null,
    })),

  setStreamingContent: (content_md, content_html) =>
    set((state) => ({
      status: 'streaming',
      draft: { ...state.draft, content_md, content_html },
    })),

  setError: (error) => set({ status: 'error', error }),

  setVersions: (versions) =>
    set((state) => ({
      draft: { ...state.draft, versions, currentVersionNumber: versions.length },
    })),

  reset: () =>
    set({ status: 'idle', draft: { ...initialDraft }, error: null, metadata: null }),
}));
