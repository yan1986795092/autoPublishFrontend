import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Theme, FontSize, ViewDensity } from '../types/settings';

interface NotificationSetting {
  enabled: boolean;
}

interface SettingsState {
  // Appearance
  theme: Theme;
  fontSize: FontSize;
  viewDensity: ViewDensity;
  reduceMotion: boolean;
  transparency: boolean;

  // Notifications
  notifications: Record<string, boolean>;
  notificationEmail: boolean;

  // Language
  language: string;

  // 创作偏好（修复 #12：参数持久化）
  creationPreferences: {
    creativity: number;
    length: 'short' | 'medium' | 'long';
    tone: string;
    audience: string;
  };

  // Actions - Appearance
  setTheme: (theme: Theme) => void;
  setFontSize: (size: FontSize) => void;
  setViewDensity: (density: ViewDensity) => void;
  setReduceMotion: (value: boolean) => void;
  setTransparency: (value: boolean) => void;

  // Actions - Notifications
  setNotification: (key: string, enabled: boolean) => void;
  setNotificationEmail: (enabled: boolean) => void;

  // Actions - Language
  setLanguage: (lang: string) => void;

  // Actions - 创作偏好
  setCreationPreferences: (prefs: Partial<SettingsState['creationPreferences']>) => void;
  resetCreationPreferences: () => void;

  // Helpers
  resetSettings: () => void;
}

const defaultCreationPreferences = {
  creativity: 0.7,
  length: 'medium' as const,
  tone: 'friendly',
  audience: 'intermediate',
};

const defaultSettings = {
  theme: 'dark' as Theme,
  fontSize: 'medium' as FontSize,
  viewDensity: 'standard' as ViewDensity,
  reduceMotion: false,
  transparency: true,
  notifications: {
    publish: true,
    system: true,
    security: true,
    quota: true,
    aiComplete: false,
  },
  notificationEmail: true,
  language: 'zh-CN',
  creationPreferences: defaultCreationPreferences,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaultSettings,

      setTheme: (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
        set({ theme });
      },

      setFontSize: (fontSize) => {
        document.documentElement.setAttribute('data-font-size', fontSize);
        set({ fontSize });
      },

      setViewDensity: (viewDensity) => set({ viewDensity }),
      setReduceMotion: (reduceMotion) => set({ reduceMotion }),
      setTransparency: (transparency) => set({ transparency }),

      setNotification: (key, enabled) =>
        set((state) => ({
          notifications: { ...state.notifications, [key]: enabled },
        })),

      setNotificationEmail: (notificationEmail) => set({ notificationEmail }),

      setLanguage: (language) => set({ language }),

      // 修复 #12：参数持久化
      setCreationPreferences: (prefs) =>
        set((state) => ({
          creationPreferences: { ...state.creationPreferences, ...prefs },
        })),
      resetCreationPreferences: () => set({ creationPreferences: defaultCreationPreferences }),

      resetSettings: () => {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.documentElement.setAttribute('data-font-size', 'medium');
        set(defaultSettings);
      },
    }),
    {
      name: 'autopublish-settings',
      partialize: (state) => ({
        theme: state.theme,
        fontSize: state.fontSize,
        viewDensity: state.viewDensity,
        reduceMotion: state.reduceMotion,
        transparency: state.transparency,
        notifications: state.notifications,
        notificationEmail: state.notificationEmail,
        language: state.language,
        creationPreferences: state.creationPreferences,
      }),
    }
  )
);
