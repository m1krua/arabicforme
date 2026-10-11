import { createContext } from 'react';
import type { ProgressState } from '../lib/progress';

export interface ProgressContextValue {
  progress: ProgressState;
  storageError: string | null;
  updateProgress: (update: (current: ProgressState) => ProgressState) => void;
  recordActivity: () => void;
}

export const ProgressContext = createContext<ProgressContextValue | null>(null);
