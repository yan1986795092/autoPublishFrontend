import type { ReactNode } from 'react';

export interface EditorShellProps {
  children: ReactNode;
}

export function EditorShell({ children }: EditorShellProps) {
  return (
    <div className="bg-app-surface rounded-xl border border-app-border overflow-hidden">
      {children}
    </div>
  );
}
