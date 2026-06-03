export function useWorkspaceMode() {
  return {
    mode: 'create' as const,
    setMode: () => {},
  };
}
