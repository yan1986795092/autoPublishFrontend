import { create } from 'zustand';

export type PipelineStage = 'draft' | 'reviewing' | 'polishing' | 'ready' | 'published' | 'archived';

export interface ReviewNote {
  id: string;
  content: string;
  author: string;
  createdAt: number;
  resolved: boolean;
}

export interface PolishEntry {
  id: string;
  summary: string;
  timestamp: number;
}

export interface PipelineState {
  stage: PipelineStage;
  contentId: string | null;
  reviewNotes: ReviewNote[];
  polishHistory: PolishEntry[];
  setStage: (stage: PipelineStage) => void;
  setContentId: (id: string | null) => void;
  addReviewNote: (note: string, author: string) => void;
  resolveNote: (noteId: string) => void;
  addPolishEntry: (summary: string) => void;
  reset: () => void;
}

export const PIPELINE_STAGE_LABELS: Record<PipelineStage, string> = {
  draft: '草稿',
  reviewing: '审核中',
  polishing: '优化中',
  ready: '待发布',
  published: '已发布',
  archived: '已归档',
};

export const PIPELINE_STAGE_COLORS: Record<PipelineStage, string> = {
  draft: 'text-yellow-400',
  reviewing: 'text-blue-400',
  polishing: 'text-purple-400',
  ready: 'text-green-400',
  published: 'text-emerald-400',
  archived: 'text-app-text-tertiary',
};

export const PIPELINE_STAGE_ORDER: PipelineStage[] = ['draft', 'reviewing', 'polishing', 'ready', 'published'];

export const useContentPipelineStore = create<PipelineState>()((set) => ({
  stage: 'draft',
  contentId: null,
  reviewNotes: [],
  polishHistory: [],
  setStage: (stage) => set({ stage }),
  setContentId: (contentId) => set({ contentId }),
  addReviewNote: (content, author) =>
    set((s) => ({
      reviewNotes: [
        ...s.reviewNotes,
        { id: crypto.randomUUID(), content, author, createdAt: Date.now(), resolved: false },
      ],
    })),
  resolveNote: (noteId) =>
    set((s) => ({
      reviewNotes: s.reviewNotes.map((n) => (n.id === noteId ? { ...n, resolved: true } : n)),
    })),
  addPolishEntry: (summary) =>
    set((s) => ({
      polishHistory: [...s.polishHistory, { id: crypto.randomUUID(), summary, timestamp: Date.now() }],
    })),
  reset: () => set({ stage: 'draft', contentId: null, reviewNotes: [], polishHistory: [] }),
}));
