import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './styles/index.css';
import App from './App';
import { ToastProvider } from './components/ui/toast';

// Polyfill: crypto.randomUUID is not available on non-HTTPS pages
if (typeof crypto.randomUUID !== 'function') {
  crypto.randomUUID = () => {
    const hex = () => Math.random().toString(16).slice(2, 10);
    return `${hex().slice(0,8)}-${hex().slice(0,4)}-4${hex().slice(0,3)}-${((Math.random()*4|0)+8).toString(16)}${hex().slice(0,3)}-${hex().slice(0,12)}`;
  };
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

// 暴露给外部清理（多租户隔离：用户切换/登出时清空所有缓存）
if (typeof window !== 'undefined') {
  (window as unknown as { __queryClient?: QueryClient }).__queryClient = queryClient;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ToastProvider>
          <App />
        </ToastProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
