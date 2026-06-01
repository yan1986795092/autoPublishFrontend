import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Sidebar } from './Sidebar';
import { useUIStore } from '../../stores/useUIStore';
import { cn } from '../../utils/helpers';
import { SIDEBAR } from '../../config/layout';

const pageVariants: Record<string, { initial: { opacity: number; y: number }; animate: { opacity: number; y: number }; exit: { opacity: number; y: number } }> = {
  '/': { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 } },
  '/content': { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 } },
  '/settings': { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 } },
  '/agent': { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 } },
  '/agent-studio': { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 } },
  '/agent-history': { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 } },
  '/templates': { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 } },
};

export function AppShell() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const location = useLocation();

  // Match route by prefix to handle parameterized routes like /content/123
  const routeKey = Object.keys(pageVariants).find((k) =>
    k === location.pathname || location.pathname.startsWith(k + '/') || location.pathname.startsWith(k + '?')
  ) || '/';
  const variants = pageVariants[routeKey] || pageVariants['/'];

  // Listen for Ctrl+B shortcut to toggle sidebar
  useEffect(() => {
    const handler = () => toggleSidebar();
    window.addEventListener('shortcut:toggle-sidebar', handler);
    return () => window.removeEventListener('shortcut:toggle-sidebar', handler);
  }, [toggleSidebar]);

  return (
    <div className="flex h-screen bg-app-bg overflow-hidden">
      <Sidebar />
      <div
        className={cn(
          'flex flex-1 min-h-0 transition-all duration-200',
          sidebarCollapsed ? `ml-[${SIDEBAR.WIDTH_COLLAPSED}px]` : `ml-[${SIDEBAR.WIDTH}px]`,
          'max-md:ml-0 max-md:pt-14 max-md:px-3'
        )}
      >
        <main className="flex-1 overflow-auto p-6 max-md:p-3" role="main" aria-label="主内容区域">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={variants.initial}
              animate={variants.animate}
              exit={variants.exit}
              transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
              className="h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
