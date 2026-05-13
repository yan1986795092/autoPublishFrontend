import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/useAuthStore';
import { AppShell } from './components/layout/AppShell';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { HomePage } from './pages/HomePage';
import { ContentManagementPage } from './pages/ContentManagementPage';
import { ContentEditPage } from './pages/ContentEditPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';
import { AgentStudioPage } from './pages/AgentStudioPage';
import { AgentHistoryPage } from './pages/AgentHistoryPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  return !isAuthenticated ? <>{children}</> : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <ErrorBoundary>
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
          <Route path="/content" element={<ErrorBoundary><ContentManagementPage /></ErrorBoundary>} />
          <Route path="/content/:id" element={<ErrorBoundary><ContentEditPage /></ErrorBoundary>} />
          <Route path="/settings" element={<ErrorBoundary><SettingsPage /></ErrorBoundary>} />
          <Route path="/agent" element={<ErrorBoundary><AgentStudioPage /></ErrorBoundary>} />
          <Route path="/agent/history" element={<ErrorBoundary><AgentHistoryPage /></ErrorBoundary>} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
  );
}
