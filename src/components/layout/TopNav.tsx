import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import { TOPNAV } from '../../config/layout';
import { cn } from '../../utils/helpers';
import type { LucideIcon } from 'lucide-react';
import { PenLine, FileText, Settings, Library, BarChart3, Activity } from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: LucideIcon;
}

const navItems: NavItem[] = [
  { id: 'create', label: '创作', path: '/', icon: PenLine },
  { id: 'templates', label: '模板', path: '/templates', icon: Library },
  { id: 'content', label: '内容', path: '/content', icon: FileText },
  { id: 'operations', label: '监控', path: '/operations', icon: BarChart3 },
  { id: 'traces', label: '追踪', path: '/traces', icon: Activity },
  { id: 'settings', label: '设置', path: '/settings', icon: Settings },
];

export function TopNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();

  const currentPath = location.pathname;

  return (
    <header
      className="flex items-center justify-between px-4 border-b border-app-border bg-app-bg flex-shrink-0"
      style={{ height: TOPNAV.HEIGHT }}
    >
      {/* Logo + Nav */}
      <div className="flex items-center gap-6">
        {/* Logo */}
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => navigate('/')}
        >
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <PenLine className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-bold text-app-text hidden sm:inline">AutoPublish</span>
        </div>

        {/* Nav links */}
        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPath === item.path;
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                  isActive
                    ? 'bg-primary-600/15 text-primary-400'
                    : 'text-app-text-secondary hover:text-app-text hover:bg-app-hover'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* User */}
      <div className="flex items-center gap-2">
        {user && (
          <div className="w-7 h-7 rounded-md bg-primary-600/20 border border-primary-500/30 flex items-center justify-center text-xs font-semibold text-primary-400">
            {(user.nickname || user.email || 'U').charAt(0).toUpperCase()}
          </div>
        )}
      </div>
    </header>
  );
}
