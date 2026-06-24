import { motion } from 'framer-motion';
import { cn } from '../../utils/helpers';
import type { SettingsNavItem, SettingsNavSection } from '../../types/settings';

const NAV_SECTIONS: Array<{
  id: SettingsNavSection;
  label: string;
  items: Array<{ id: SettingsNavItem; label: string; icon: React.ReactNode; badge?: string }>;
}> = [
  {
    id: 'general',
    label: '通用',
    items: [
      {
        id: 'profile',
        label: '个人资料',
        badge: '常用',
        icon: (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        ),
      },
      {
        id: 'security',
        label: '账户安全',
        icon: (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        ),
      },
    ],
  },
  {
    id: 'experience',
    label: '体验',
    items: [
      {
        id: 'appearance',
        label: '外观',
        icon: (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
            <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
            <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
            <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
            <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
          </svg>
        ),
      },
      {
        id: 'notifications',
        label: '通知',
        icon: (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        ),
      },
    ],
  },
  {
    id: 'connection',
    label: '连接',
    items: [
      {
        id: 'integrations',
        label: '集成',
        icon: (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
            <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" />
            <path d="m22 13 8.6-3.9L22 5" />
            <path d="m2 5 8.6 3.9" />
          </svg>
        ),
      },
    ],
  },
  {
    id: 'system',
    label: '系统',
    items: [
      {
        id: 'preferences',
        label: '偏好设置',
        icon: (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" x2="4" y1="21" y2="14" />
            <line x1="4" x2="4" y1="10" y2="3" />
            <line x1="12" x2="12" y1="21" y2="12" />
            <line x1="12" x2="12" y1="8" y2="3" />
            <line x1="20" x2="20" y1="21" y2="16" />
            <line x1="20" x2="20" y1="12" y2="3" />
            <line x1="2" x2="6" y1="14" y2="14" />
            <line x1="10" x2="14" y1="8" y2="8" />
            <line x1="18" x2="22" y1="16" y2="16" />
          </svg>
        ),
      },
      {
        id: 'danger',
        label: '危险区域',
        icon: (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
          </svg>
        ),
      },
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
                      : 'text-app-text-secondary/80 hover:text-app-text hover:bg-white/[0.03]'
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="settings-nav-bar"
                      className={cn(
                        'absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full',
                        isDanger ? 'bg-red-400' : 'bg-primary-400'
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
                        : 'text-app-text-tertiary group-hover:text-app-text-secondary'
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
                        isDanger ? 'bg-red-400' : 'bg-primary-400'
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
