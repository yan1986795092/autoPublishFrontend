import { useSearchParams } from 'react-router-dom';
import type { WorkspaceMode } from './useExecutionEngine';

const VALID_MODES: WorkspaceMode[] = ['chat', 'create', 'studio'];
const DEFAULT_MODE: WorkspaceMode = 'create';

export function useWorkspaceMode(): {
  mode: WorkspaceMode;
  setMode: (m: WorkspaceMode) => void;
} {
  const [searchParams, setSearchParams] = useSearchParams();

  const rawMode = searchParams.get('mode');
  const mode: WorkspaceMode = VALID_MODES.includes(rawMode as WorkspaceMode)
    ? (rawMode as WorkspaceMode)
    : DEFAULT_MODE;

  const setMode = (m: WorkspaceMode) => {
    setSearchParams({ mode: m }, { replace: true });
  };

  return { mode, setMode };
}
