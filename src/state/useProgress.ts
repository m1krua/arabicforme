import { useContext } from 'react';
import { ProgressContext } from './progress-context';

export function useProgress() {
  const context = useContext(ProgressContext);
  if (context === null) {
    throw new Error('useProgress должен использоваться внутри ProgressProvider.');
  }
  return context;
}
