import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/useAuthStore';
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
          <Route path="/" element={<ErrorBoundary><HomePage /></ErrorBoundary>} />
          <Route path="/operations" element={<ErrorBoundary><OperationsPage /></ErrorBoundary>} />
          <Route path="/agent-history" element={<Navigate to="/operations" replace />} />
          <Route path="/agent-metrics" element={<Navigate to="/operations" replace />} />
          <Route path="/traces" element={<Navigate to="/operations" replace />} />
          <Route path="/templates" element={<Navigate to="/" replace />} />
          <Route path="/content" element={<ErrorBoundary><ContentManagementPage /></ErrorBoundary>} />
          <Route path="/content/:id" element={<ErrorBoundary><ContentEditPage /></ErrorBoundary>} />
          <Route path="/settings" element={<ErrorBoundary><SettingsPage /></ErrorBoundary>} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
  );
}
