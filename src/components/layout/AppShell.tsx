import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useUIStore } from '../../stores/useUIStore';
import { SIDEBAR } from '../../config/layout';

export function AppShell() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore();

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
        className="flex flex-1 min-h-0 max-md:pt-14 max-md:px-3"
        style={{
          marginLeft: sidebarCollapsed ? SIDEBAR.WIDTH_COLLAPSED : SIDEBAR.WIDTH,
          paddingTop: 'max(0px, env(safe-area-inset-top))',
          transition: 'margin-left 0.2s ease',
        }}
      >
        <main
          className="flex-1 min-w-0 overflow-hidden"
          role="main"
          aria-label="主内容区域"
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
