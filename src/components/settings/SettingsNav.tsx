import { motion } from 'framer-motion';
import { cn } from '../../utils/helpers';
import type { SettingsNavItem, SettingsNavSection } from '../../types/settings';
import {
  User,
  Shield,
  Palette,
  Bell,
  Plug,
  Settings2,
  AlertTriangle,
} from 'lucide-react';

const NAV_SECTIONS: Array<{
  id: SettingsNavSection;
  label: string;
  items: Array<{ id: SettingsNavItem; label: string; icon: React.ReactNode; badge?: string }>;
}> = [
  {
    id: 'general',
    label: '通用',
    items: [
      { id: 'profile', label: '个人资料', badge: '常用', icon: <User className="w-3.5 h-3.5" /> },
      { id: 'security', label: '账户安全', icon: <Shield className="w-3.5 h-3.5" /> },
    ],
  },
  {
    id: 'experience',
    label: '体验',
    items: [
      { id: 'appearance', label: '外观', icon: <Palette className="w-3.5 h-3.5" /> },
      { id: 'notifications', label: '通知', icon: <Bell className="w-3.5 h-3.5" /> },
    ],
  },
  {
    id: 'connection',
    label: '连接',
    items: [
      { id: 'integrations', label: '集成', icon: <Plug className="w-3.5 h-3.5" /> },
    ],
  },
  {
    id: 'system',
    label: '系统',
    items: [
      { id: 'preferences', label: '偏好设置', icon: <Settings2 className="w-3.5 h-3.5" /> },
      { id: 'danger', label: '危险区域', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
    ],
  },
];

interface SettingsNavProps {
  activeItem: SettingsNavItem;
  onItemChange: (item: SettingsNavItem) => void;
}

export function SettingsNav({ activeItem, onItemChange }: SettingsNavProps) {
  return (
    <nav className="flex flex-col">
      {NAV_SECTIONS.map((section) => (
        <div key={section.id} className="mb-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-app-text-tertiary/70 mb-1.5 px-1.5">
            {section.label}
          </p>

          <div className="flex flex-col gap-0.5">
            {section.items.map((item) => {
              const isActive = activeItem === item.id;
              const isDanger = item.id === 'danger';

              return (
                <motion.button
                  key={item.id}
                  onClick={() => onItemChange(item.id)}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    'group relative flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all duration-150 text-left',
                    'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary-500/40',
                    isActive
                      ? isDanger
                        ? 'bg-red-500/10 text-red-400'
                        : 'bg-primary-500/10 text-primary-400'
                      : 'text-app-text-secondary/80 hover:text-app-text hover:bg-white/[0.03]',
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="settings-nav-bar"
                      className={cn(
                        'absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full',
                        isDanger ? 'bg-red-400' : 'bg-primary-400',
                      )}
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}

                  <span
                    className={cn(
                      'shrink-0 transition-colors duration-150',
                      isActive
                        ? isDanger
                          ? 'text-red-400'
                          : 'text-primary-400'
                        : 'text-app-text-tertiary group-hover:text-app-text-secondary',
                    )}
                  >
                    {item.icon}
                  </span>

                  <span className="flex-1">{item.label}</span>

                  {item.badge && !isActive && (
                    <span className="text-[9px] px-1 py-px rounded bg-primary-500/10 text-primary-400/70 font-medium">
                      {item.badge}
                    </span>
                  )}

                  {isActive && (
                    <span
                      className={cn(
                        'w-1.5 h-1.5 rounded-full shrink-0',
                        isDanger ? 'bg-red-400' : 'bg-primary-400',
                      )}
                    />
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
