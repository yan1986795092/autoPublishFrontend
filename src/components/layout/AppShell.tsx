import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Sidebar } from './Sidebar';
import { useUIStore } from '../../stores/useUIStore';
import { cn } from '../../utils/helpers';

const pageVariants: Record<string, { initial: { opacity: number; y: number }; animate: { opacity: number; y: number }; exit: { opacity: number; y: number } }> = {
  '/': { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 } },
  '/content': { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 } },
  '/settings': { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 } },
  '/agent': { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 } },
};

export function AppShell() {
  const { sidebarCollapsed } = useUIStore();
  const location = useLocation();
  const variants = pageVariants[location.pathname] || pageVariants['/'];

  return (
    <div className="flex h-screen bg-app-bg overflow-hidden">
      <Sidebar />
      <div
        className={cn(
          'flex flex-1 min-h-0 transition-all duration-200',
          sidebarCollapsed ? 'ml-16' : 'ml-[220px]'
        )}
      >
        <main className="flex-1 overflow-auto p-6">
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
