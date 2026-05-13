import { motion } from 'framer-motion';
import { useAuthStore } from '../../stores/useAuthStore';
import { useUIStore } from '../../stores/useUIStore';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '../../utils/helpers';
import { PenLine, FileText, Bot, Settings, ChevronLeft } from 'lucide-react';

const navItems = [
  { id: 'create' as const, label: '内容创作', path: '/', icon: PenLine },
  { id: 'content' as const, label: '内容管理', path: '/content', icon: FileText },
  { id: 'agent' as const, label: 'Agent 工场', path: '/agent', icon: Bot },
  { id: 'settings' as const, label: '设置', path: '/settings', icon: Settings },
];

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();

  const currentTab = navItems.find((item) => item.path === location.pathname)?.id ?? 'create';

  const handleNav = (item: (typeof navItems)[0]) => {
    navigate(item.path);
  };

  return (
    <motion.aside
      animate={{ width: sidebarCollapsed ? 64 : 220 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className="fixed left-0 top-0 z-50 h-screen flex flex-col bg-app-bg border-r border-app-border overflow-hidden"
    >
      {/* Logo */}
      <div className="flex items-center h-14 px-4 border-b border-app-border">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
            <PenLine className="w-4 h-4 text-white" />
          </div>
          {!sidebarCollapsed && (
            <span className="text-sm font-semibold text-app-text whitespace-nowrap">
              AutoPublish
            </span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNav(item)}
              className={cn(
                'flex items-center gap-3 w-full rounded-md px-2.5 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-app-hover text-primary-400'
                  : 'text-app-text-secondary hover:text-app-text hover:bg-app-hover/50'
              )}
            >
              <Icon className="w-[18px] h-[18px] flex-shrink-0" />
              {!sidebarCollapsed && (
                <span className="whitespace-nowrap text-xs">{item.label}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User & Toggle */}
      <div className="border-t border-app-border py-2 px-2 space-y-1">
        {user && (
          <div className={cn(
            'flex items-center gap-2 rounded-md px-2.5 py-2',
            sidebarCollapsed ? 'justify-center' : ''
          )}>
            <div className="flex-shrink-0 w-7 h-7 rounded-md bg-primary-600/20 border border-primary-500/30 flex items-center justify-center text-xs font-semibold text-primary-400">
              {(user.nickname || user.email || 'U').charAt(0).toUpperCase()}
            </div>
            {!sidebarCollapsed && (
              <span className="text-xs text-app-text-secondary truncate">
                {user.nickname || user.email}
              </span>
            )}
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className="flex items-center justify-center w-full h-8 rounded-md text-app-text-tertiary hover:text-app-text-secondary hover:bg-app-hover/50 transition-colors"
        >
          <motion.div
            animate={{ rotate: sidebarCollapsed ? 0 : 180 }}
            transition={{ duration: 0.25 }}
          >
            <ChevronLeft className="w-4 h-4" />
          </motion.div>
        </button>
      </div>
    </motion.aside>
  );
}
