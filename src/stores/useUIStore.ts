import { create } from 'zustand';

type Density = 'compact' | 'standard' | 'comfortable';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface UIState {
  activeTab: 'create' | 'content' | 'agent' | 'settings';
  publishDialogOpen: boolean;
  publishDialogContentId: string | null;
  topicDialogOpen: boolean;
  toastMessage: string | null;
  toastType: 'success' | 'error' | 'info' | null;
  toastAction: ToastAction | null;
  toastDuration: number;
  viewDensity: Density;

  setActiveTab: (tab: UIState['activeTab']) => void;
  openPublishDialog: (contentId: string) => void;
  closePublishDialog: () => void;
  openTopicDialog: () => void;
  closeTopicDialog: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info', action?: ToastAction | null, duration?: number) => void;
  clearToast: () => void;
  setViewDensity: (density: Density) => void;
}

export const useUIStore = create<UIState>()((set) => ({
  activeTab: 'create',
  publishDialogOpen: false,
  publishDialogContentId: null,
  topicDialogOpen: false,
  toastMessage: null,
  toastType: null,
  toastAction: null,
  toastDuration: 3000,
  viewDensity: 'standard',

  setActiveTab: (activeTab) => set({ activeTab }),
  openPublishDialog: (contentId) => set({ publishDialogOpen: true, publishDialogContentId: contentId }),
  closePublishDialog: () => set({ publishDialogOpen: false, publishDialogContentId: null }),
  openTopicDialog: () => set({ topicDialogOpen: true }),
  closeTopicDialog: () => set({ topicDialogOpen: false }),
  showToast: (message, type = 'info', action = null, duration = 3000) => set({
    toastMessage: message,
    toastType: type,
    toastAction: action,
    toastDuration: duration
  }),
  clearToast: () => set({ toastMessage: null, toastType: null, toastAction: null }),
  setViewDensity: (viewDensity) => set({ viewDensity }),
}));
