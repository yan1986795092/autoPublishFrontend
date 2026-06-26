import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/useAuthStore';
import { clearAllUserStores } from './stores/clearAllUserStores';
import { AppShell } from './components/layout/AppShell';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { ShortcutHelpOverlay } from './components/ui/shortcut-help-overlay';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { HomePage } from './pages/HomePage';
import { ContentManagementPage } from './pages/ContentManagementPage';
import { ContentEditPage } from './pages/ContentEditPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';
import { OperationsPage } from './pages/OperationsPage';

/**
 * 监听 user.id 变化，自动清理上一个用户的业务状态
 *
 * 场景：用户 A 退出 → 用户 B 登录
 * 如果不清理：
 *   - useAgentStore 中的对话列表还显示 A 的对话
 *   - 打开的对话框（publishDialogContentId）指向 A 的内容
 *   - 当前的 conversation_id 仍属于 A
 */
function useUserSwitchCleanup() {
  useEffect(() => {
    let prevUserId: string | null = useAuthStore.getState().user?.id ?? null;

    const unsub = useAuthStore.subscribe((state) => {
      const currentUserId = state.user?.id ?? null;

      // user 从有 → 无（logout）由 logout() 自己处理，这里跳过
      if (currentUserId === null) {
        prevUserId = null;
        return;
      }

      // user 从一个 id 切到另一个 id（切换账号）
      if (prevUserId !== null && prevUserId !== currentUserId) {
        // 清理上一个用户的所有业务 store
        clearAllUserStores();
      }

      prevUserId = currentUserId;
    });

    return unsub;
  }, []);
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  return !isAuthenticated ? <>{children}</> : <Navigate to="/" replace />;
}

function KeyboardShortcuts() {
  useKeyboardShortcuts();
  return <ShortcutHelpOverlay />;
}

export default function App() {
  useUserSwitchCleanup();

  return (
    <ErrorBoundary>
      <KeyboardShortcuts />
      <Routes>
        <Route
          path="/login"
          element={
            <PublicRoute>
              <ErrorBoundary><LoginPage /></ErrorBoundary>
            </PublicRoute>
          }
        />

        <Route
          element={
            <ProtectedRoute>
              <ErrorBoundary><AppShell /></ErrorBoundary>
            </ProtectedRoute>
          }
        >
          {/* Redirect old routes to unified workspace */}
          <Route path="/agent" element={<Navigate to="/?mode=chat" replace />} />
          <Route path="/agent-studio" element={<Navigate to="/?mode=studio" replace />} />
          <Route path="/" element={<HomePage />} />
          <Route path="/operations" element={<OperationsPage />} />
          <Route path="/agent-history" element={<Navigate to="/operations" replace />} />
          <Route path="/agent-metrics" element={<Navigate to="/operations" replace />} />
          <Route path="/traces" element={<Navigate to="/operations" replace />} />
          <Route path="/templates" element={<Navigate to="/" replace />} />
          <Route path="/content" element={<ContentManagementPage />} />
          <Route path="/content/:id" element={<ContentEditPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
  );
}
