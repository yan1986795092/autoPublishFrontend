import { create } from 'zustand';
import type { PresetListItem, PresetDetail } from '../types';
import { presetsApi } from '../services/api';

interface PresetState {
  presets: PresetListItem[];
  loading: boolean;
  currentPreset: PresetDetail | null;

  fetchPresets: (platformCode?: string) => Promise<void>;
  savePreset: (name: string, description: string, parameters: Record<string, unknown>, platformCode?: string, templateId?: string) => Promise<void>;
  loadPreset: (id: string) => Promise<void>;
  deletePreset: (id: string) => Promise<void>;
}

export const usePresetStore = create<PresetState>()((set) => ({
  presets: [],
  loading: false,
  currentPreset: null,

  fetchPresets: async (platformCode?: string) => {
    set({ loading: true });
    try {
      const res = await presetsApi.list(platformCode);
      if (res.data.success && res.data.data) {
        set({ presets: res.data.data });
      }
    } catch { /* ignore */ } finally {
      set({ loading: false });
    }
  },

  savePreset: async (name, description, parameters, platformCode, templateId) => {
    try {
      const res = await presetsApi.create({ name, description, parameters, platform_code: platformCode, template_id: templateId });
      if (res.data.success) {
        const listRes = await presetsApi.list();
        if (listRes.data.success && listRes.data.data) {
          set({ presets: listRes.data.data });
        }
      }
    } catch { /* ignore */ }
  },

  loadPreset: async (id: string) => {
    set({ loading: true });
    try {
      const res = await presetsApi.get(id);
      if (res.data.success && res.data.data) {
        const detail = res.data.data as PresetDetail;
        set({ currentPreset: detail });
      }
    } catch { /* ignore */ } finally {
      set({ loading: false });
    }
  },

  deletePreset: async (id: string) => {
    try {
      await presetsApi.delete(id);
      set((state) => ({ presets: state.presets.filter((p) => p.id !== id) }));
    } catch { /* ignore */ }
  },
}));
