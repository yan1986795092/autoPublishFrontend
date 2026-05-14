import * as RadixToast from '@radix-ui/react-toast';
import { useEffect } from 'react';
import { useUIStore } from '../../stores/useUIStore';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

const icons = {
  success: <CheckCircle className="h-5 w-5 text-green-500" />,
  error: <AlertCircle className="h-5 w-5 text-red-500" />,
  info: <Info className="h-5 w-5 text-blue-500" />,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { toastMessage, toastType, toastAction, toastDuration, clearToast } = useUIStore();

  useEffect(() => {
    if (toastMessage && toastType) {
      const timer = setTimeout(() => clearToast(), toastDuration);
      return () => clearTimeout(timer);
    }
  }, [toastMessage, toastType, toastDuration, clearToast]);

  return (
    <RadixToast.Provider swipeDirection="right">
      {children}
      <RadixToast.Root
        open={!!toastMessage}
        onOpenChange={(open) => { if (!open) clearToast(); }}
        className={`
          fixed bottom-6 right-6 z-[100] flex items-center gap-3
          rounded-xl border border-app-border bg-app-surface p-4
          shadow-lg
          data-[state=open]:animate-in data-[state=closed]:animate-out
          data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0
          data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-right-full
          data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95
          data-[state=closed]:duration-200 data-[state=open]:duration-300
          min-w-[280px] max-w-[400px]
        `}
      >
        {toastType && icons[toastType]}
        <RadixToast.Description className="flex-1 text-sm font-medium text-app-text">
          {toastMessage}
        </RadixToast.Description>
        {toastAction && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toastAction.onClick();
              clearToast();
            }}
            className="rounded-md px-3 py-1 text-xs font-medium bg-app-elevated text-app-text hover:bg-app-surface transition-colors"
          >
            {toastAction.label}
          </button>
        )}
        <RadixToast.Close
          className="flex-shrink-0 rounded-md p-1 text-app-text-tertiary hover:text-app-text-secondary hover:bg-app-elevated transition-colors"
          onClick={clearToast}
        >
          <X className="h-4 w-4" />
        </RadixToast.Close>
      </RadixToast.Root>
      <RadixToast.Viewport />
    </RadixToast.Provider>
  );
}
