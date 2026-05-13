import { create } from 'zustand';

interface UIState {
  sidebarCollapsed: boolean;
  activeTab: 'create' | 'content' | 'agent' | 'settings';
  publishDialogOpen: boolean;
  publishDialogContentId: string | null;
  topicDialogOpen: boolean;
  toastMessage: string | null;
  toastType: 'success' | 'error' | 'info' | null;

  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setActiveTab: (tab: UIState['activeTab']) => void;
  openPublishDialog: (contentId: string) => void;
  closePublishDialog: () => void;
  openTopicDialog: () => void;
  closeTopicDialog: () => void;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
  clearToast: () => void;
}

export const useUIStore = create<UIState>()((set) => ({
  sidebarCollapsed: false,
  activeTab: 'create',
  publishDialogOpen: false,
  publishDialogContentId: null,
  topicDialogOpen: false,
  toastMessage: null,
  toastType: null,

  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
  setActiveTab: (activeTab) => set({ activeTab }),
  openPublishDialog: (contentId) => set({ publishDialogOpen: true, publishDialogContentId: contentId }),
  closePublishDialog: () => set({ publishDialogOpen: false, publishDialogContentId: null }),
  openTopicDialog: () => set({ topicDialogOpen: true }),
  closeTopicDialog: () => set({ topicDialogOpen: false }),
  showToast: (message, type) => set({ toastMessage: message, toastType: type }),
  clearToast: () => set({ toastMessage: null, toastType: null }),
}));
