import { Outlet } from 'react-router-dom';
import { TopNav } from './TopNav';
import { TOPNAV } from '../../config/layout';

export function AppShell() {
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-app-bg">
      {/* Top navigation */}
      <TopNav />

      {/* Main content area */}
      <main
        className="flex-1 overflow-hidden"
        style={{ height: `calc(100vh - ${TOPNAV.HEIGHT}px)` }}
      >
        <Outlet />
      </main>
    </div>
  );
}
