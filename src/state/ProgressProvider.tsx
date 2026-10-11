import { useRef, useState, type ReactNode } from 'react';
import {
  addActiveDate,
  createDefaultProgress,
  loadProgress,
  saveProgress,
  type ProgressState,
} from '../lib/progress';
import { ProgressContext } from './progress-context';

function readInitialProgress(): { progress: ProgressState; error: string | null } {
  try {
    const result = loadProgress(window.localStorage);
    return { progress: result.state, error: result.error };
  } catch (error) {
    return {
      progress: createDefaultProgress(),
      error: error instanceof Error ? error.message : 'Локальное хранилище недоступно.',
    };
  }
}

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(readInitialProgress);
  const progressRef = useRef(initial.progress);
  const [progress, setProgress] = useState(initial.progress);
  const [storageError, setStorageError] = useState<string | null>(initial.error);

  function updateProgress(update: (current: ProgressState) => ProgressState) {
    const next = update(progressRef.current);
    progressRef.current = next;
    setProgress(next);
    try {
      const error = saveProgress(window.localStorage, next);
      setStorageError(error);
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : 'Локальное хранилище недоступно.');
    }
  }

  function recordActivity() {
    updateProgress((current) => addActiveDate(current));
  }

  return (
    <ProgressContext.Provider value={{ progress, storageError, updateProgress, recordActivity }}>
      {children}
    </ProgressContext.Provider>
  );
}
