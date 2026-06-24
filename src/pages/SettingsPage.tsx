import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';
import { LoadingSpinner } from '../components/ui/loading-spinner';
import { AccountCard } from '../components/settings/AccountCard';
import { SettingsNav } from '../components/settings/SettingsNav';
import { SettingsSection } from '../components/settings/SettingsSection';
import { AccountTab } from '../components/settings/AccountTab';
import { AppearanceTab } from '../components/settings/AppearanceTab';
import { NotificationsTab } from '../components/settings/NotificationsTab';
import { IntegrationsTab } from '../components/settings/IntegrationsTab';
import { PreferencesTab } from '../components/settings/PreferencesTab';
import { DangerZoneTab } from '../components/settings/DangerZoneTab';
import type { SettingsNavItem } from '../types/settings';
import { Shield } from 'lucide-react';

const TAB_META: Record<SettingsNavItem, { title: string; description: string; badge?: string }> = {
  profile: { title: '个人资料', description: '管理你的头像、昵称和基本信息' },
  security: { title: '账户安全', description: '保护你的账户安全，管理密码和双因素认证' },
  appearance: { title: '外观', description: '自定义界面的视觉风格、主题和显示效果' },
  notifications: { title: '通知', description: '选择你希望接收的通知类型和渠道' },
  integrations: { title: '集成', description: '管理已连接的平台账号和 API 访问密钥' },
  preferences: { title: '偏好设置', description: '自定义语言、快捷键等偏好选项' },
  danger: { title: '危险区域', description: '数据导出和账户注销等不可逆操作', badge: '不可逆' },
};

export function SettingsPage() {
  const { user, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const [activeItem, setActiveItem] = useState<SettingsNavItem>('profile');
  const meta = TAB_META[activeItem];

  if (isLoading && !user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-app-bg">
      {/* ── Top Header ── */}
      <div className="shrink-0 border-b border-app-border/60 px-6 py-3.5 bg-app-surface/60 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div className="w-8 h-8 rounded-lg bg-primary-600/15 border border-primary-500/20 flex items-center justify-center shrink-0">
            <Shield className="w-4 h-4 text-primary-400" />
          </div>

          {/* Title */}
          <div className="shrink-0">
            <h1 className="text-sm font-bold text-app-text leading-none tracking-tight">设置中心</h1>
            <p className="text-[10px] text-app-text-tertiary mt-0.5 leading-none">全面管理你的账户与偏好</p>
          </div>

          {/* Divider */}
          <div className="w-px h-6 bg-app-border/60 mx-1 shrink-0" />

          {/* Current section */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeItem}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 6 }}
              transition={{ duration: 0.14 }}
              className="flex items-center gap-2 min-w-0"
            >
              <span className="text-xs font-semibold text-primary-400 shrink-0">{meta.title}</span>
              {meta.badge && (
                <span className="text-[9px] px-1.5 py-px rounded bg-red-500/10 text-red-400 border border-red-500/20 font-medium shrink-0">
                  {meta.badge}
                </span>
              )}
              <span className="text-app-text-tertiary text-xs shrink-0">/</span>
              <span className="text-xs text-app-text-tertiary truncate hidden md:block">
                {meta.description}
              </span>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ── Main Body ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Left Sidebar ── */}
        <div className="w-60 shrink-0 border-r border-app-border/50 flex flex-col overflow-y-auto bg-app-surface/30">
          <div className="p-4 flex flex-col gap-5">
            <AccountCard />
            <SettingsNav activeItem={activeItem} onItemChange={setActiveItem} />
          </div>
        </div>

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-[680px] mx-auto px-10 py-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeItem}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
              >
                {activeItem === 'profile' || activeItem === 'security' ? (
                  <AccountTab />
                ) : activeItem === 'appearance' ? (
                  <AppearanceTab />
                ) : activeItem === 'notifications' ? (
                  <NotificationsTab />
                ) : activeItem === 'integrations' ? (
                  <IntegrationsTab />
                ) : activeItem === 'preferences' ? (
                  <PreferencesTab />
                ) : activeItem === 'danger' ? (
                  <DangerZoneTab />
                ) : null}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
