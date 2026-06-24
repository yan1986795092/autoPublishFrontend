// Settings page types

export type SettingsNavSection = 'general' | 'experience' | 'connection' | 'system';

export type SettingsNavItem =
  | 'profile'
  | 'security'
  | 'appearance'
  | 'notifications'
  | 'integrations'
  | 'preferences'
  | 'danger';

export interface SettingsNavSectionDef {
  id: SettingsNavSection;
  label: string;
  items: Array<{
    id: SettingsNavItem;
    label: string;
    icon: string;
    description?: string;
  }>;
}

// Appearance
export type Theme = 'light' | 'dark' | 'system';
export type FontSize = 'small' | 'medium' | 'large';
export type ViewDensity = 'compact' | 'standard' | 'comfortable';

// Notifications
export interface NotificationChannel {
  id: string;
  label: string;
  icon: string;
  enabled: boolean;
}

export interface NotificationType {
  id: string;
  label: string;
  description: string;
  icon: string;
  enabled: boolean;
  channel?: string;
}

// API Keys
export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  permissions: string[];
  createdAt: string;
  lastUsedAt?: string;
  expiresAt?: string;
}

// Connected Platforms
export interface ConnectedPlatform {
  id: string;
  name: string;
  icon: string;
  connected: boolean;
  lastSyncedAt?: string;
  account?: string;
}

// Security
export interface SecurityInfo {
  createdAt: string;
  lastLoginAt: string;
  loginDeviceCount: number;
  recentLogins: Array<{
    device: string;
    ip: string;
    time: string;
    location?: string;
  }>;
}

// Password form
export interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// Profile form
export interface ProfileFormData {
  nickname: string;
}
