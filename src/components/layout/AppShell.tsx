import { Outlet } from 'react-router-dom';
import { TopNav } from './TopNav';
import { TOPNAV } from '../../config/layout';

export function AppShell() {
  return (
    <div className="flex flex-col h-screen bg-app-bg overflow-hidden">
      <TopNav />
      <main
        className="flex-1 min-h-0 overflow-hidden"
        style={{ height: `calc(100vh - ${TOPNAV.HEIGHT}px)` }}
        role="main"
        aria-label="主内容区域"
      >
        <Outlet />
      </main>
    </div>
  );
}
