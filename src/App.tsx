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
import { AgentPage } from './pages/AgentPage';
import { AgentStudioPage } from './pages/AgentStudioPage';
import { AgentHistoryPage } from './pages/AgentHistoryPage';
import { TemplatePage } from './pages/TemplatePage';

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
          <Route path="/" element={<ErrorBoundary><HomePage /></ErrorBoundary>} />
          <Route path="/agent" element={<ErrorBoundary><AgentPage /></ErrorBoundary>} />
          <Route path="/agent-studio" element={<ErrorBoundary><AgentStudioPage /></ErrorBoundary>} />
          <Route path="/agent-history" element={<ErrorBoundary><AgentHistoryPage /></ErrorBoundary>} />
          <Route path="/templates" element={<ErrorBoundary><TemplatePage /></ErrorBoundary>} />
          <Route path="/content" element={<ErrorBoundary><ContentManagementPage /></ErrorBoundary>} />
          <Route path="/content/:id" element={<ErrorBoundary><ContentEditPage /></ErrorBoundary>} />
          <Route path="/settings" element={<ErrorBoundary><SettingsPage /></ErrorBoundary>} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
  );
}
