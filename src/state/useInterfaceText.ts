import { useCallback } from 'react';
import { localizeInterface } from '../data/interface';
import { useProgress } from './useProgress';

export function useInterfaceText() {
  const { progress } = useProgress();
  return useCallback(
    (text: string) => localizeInterface(text, progress.translationLanguage),
    [progress.translationLanguage],
  );
}
