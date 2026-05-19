import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../stores/useAuthStore';
import { useUIStore } from '../../stores/useUIStore';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '../../utils/helpers';
import { PenLine, FileText, Settings, ChevronLeft, Menu, X, LogOut, Bot, Cpu, Library, History as HistoryIcon } from 'lucide-react';
import { SIDEBAR } from '../../config/layout';

const navItems = [
  { id: 'create' as const, label: '创作工场', path: '/', icon: PenLine },
  { id: 'agent' as const, label: 'Agent 工场', path: '/agent', icon: Bot },
  { id: 'agent-studio' as const, label: 'Agent Studio', path: '/agent-studio', icon: Cpu },
  { id: 'templates' as const, label: '模板管理', path: '/templates', icon: Library },
  { id: 'content' as const, label: '内容管理', path: '/content', icon: FileText },
  { id: 'agent-history' as const, label: '执行历史', path: '/agent-history', icon: HistoryIcon },
  { id: 'settings' as const, label: '设置', path: '/settings', icon: Settings },
];

function useWindowSize() {
  const [windowSize, setWindowSize] = useState(() => window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowSize(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowSize;
}

export function Sidebar() {
  const { sidebarCollapsed, sidebarMobileOpen, toggleSidebar, toggleSidebarMobile } = useUIStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const windowSize = useWindowSize();

  const isMobile = windowSize < SIDEBAR.BREAKPOINT_MOBILE;
  const mobileMenuOpen = sidebarMobileOpen;

  useEffect(() => {
    if (!isMobile) {
      if (sidebarMobileOpen) toggleSidebarMobile();
    }
  }, [isMobile]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentTab = navItems.find((item) => item.path === location.pathname)?.id ?? 'create';

  const handleNav = (item: (typeof navItems)[0]) => {
    navigate(item.path);
    if (isMobile) {
      toggleSidebarMobile();
    }
  };

  const handleToggleMobile = () => {
    toggleSidebarMobile();
  };

  const sidebarWidth = sidebarCollapsed ? SIDEBAR.WIDTH_COLLAPSED : SIDEBAR.WIDTH;

  return (
    <>
      {/* Mobile menu toggle button */}
      {isMobile && (
        <button
          onClick={handleToggleMobile}
          className="fixed top-4 left-4 z-[60] w-10 h-10 flex items-center justify-center rounded-xl bg-sidebar-hover border border-sidebar-border text-sidebar-text-secondary hover:text-sidebar-text hover:bg-sidebar-active transition-colors shadow-md"
          style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
          aria-label={mobileMenuOpen ? '关闭菜单' : '打开菜单'}
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      )}

      {/* Mobile overlay */}
      <AnimatePresence>
        {isMobile && mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="sidebar-mobile-overlay"
            onClick={() => toggleSidebarMobile()}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        animate={{
          x: isMobile ? (mobileMenuOpen ? 0 : -sidebarWidth) : 0,
          width: isMobile ? sidebarWidth : sidebarWidth,
        }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        className={cn(
          'fixed left-0 top-0 z-50 h-screen flex flex-col',
          'bg-sidebar border-r border-sidebar-border',
          'shadow-[2px_0_24px_rgba(0,0,0,0.4)]',
          isMobile && 'pt-0'
        )}
        role="navigation"
        aria-label="主导航"
      >
        {/* Logo */}
        <div className="flex items-center h-14 px-4 border-b border-sidebar-border">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center shadow-[0_0_12px_rgba(37,99,235,0.3)]">
              <PenLine className="w-4 h-4 text-white" />
            </div>
            {!sidebarCollapsed && (
              <span className="text-sm font-semibold text-sidebar-text whitespace-nowrap">
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
                    ? 'bg-sidebar-active text-primary-400'
                    : 'text-sidebar-text-secondary hover:text-sidebar-text hover:bg-sidebar-hover'
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
        <div className="border-t border-sidebar-border py-2 px-2 space-y-1">
          {user && (
            <div className={cn(
              'flex items-center gap-2 rounded-md px-2.5 py-2 group relative',
              sidebarCollapsed ? 'justify-center' : ''
            )}>
              <div className="flex-shrink-0 w-7 h-7 rounded-md bg-primary-600/20 border border-primary-500/30 flex items-center justify-center text-xs font-semibold text-primary-400">
                {(user.nickname || user.email || 'U').charAt(0).toUpperCase()}
              </div>
              {!sidebarCollapsed && (
                <span className="text-xs text-sidebar-text-secondary truncate flex-1">
                  {user.nickname || user.email}
                </span>
              )}
              {/* Logout button — appears on hover */}
              <button
                onClick={() => { useAuthStore.getState().logout(); navigate('/login'); }}
                className={cn(
                  'flex-shrink-0 rounded-md p-1 text-sidebar-text-tertiary hover:text-red-400 hover:bg-red-500/10',
                  sidebarCollapsed
                    ? 'opacity-0 group-hover:opacity-100 absolute -right-1 transition-all'
                    : 'opacity-0 group-hover:opacity-100 transition-all ml-auto'
                )}
                title="退出登录"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          {!isMobile && (
            <button
              onClick={toggleSidebar}
              className="flex items-center justify-center w-full h-8 rounded-md text-sidebar-text-secondary hover:text-sidebar-text hover:bg-sidebar-hover transition-colors"
            >
              <motion.div
                animate={{ rotate: sidebarCollapsed ? 0 : 180 }}
                transition={{ duration: 0.25 }}
              >
                <ChevronLeft className="w-4 h-4" />
              </motion.div>
            </button>
          )}
        </div>
      </motion.aside>
    </>
  );
}
