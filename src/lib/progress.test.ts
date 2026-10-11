import { describe, expect, it } from 'vitest';
import {
  addActiveDate,
  createDefaultProgress,
  getStudyStreak,
  loadProgress,
  parseProgressState,
  PROGRESS_STORAGE_KEY,
  saveProgress,
} from './progress';

function createMemoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
  };
}

describe('local learning progress', () => {
  it('round-trips progress and preserves the reading page and bookmarks', () => {
    const state = {
      ...createDefaultProgress(),
      lastReadPage: 28,
      bookmarks: [3, 28],
      learnedWordIds: ['word-1'],
      dailyGoal: 15,
      theme: 'dark' as const,
    };
    const storage = createMemoryStorage();
    expect(saveProgress(storage, state)).toBeNull();
    const result = loadProgress(storage);
    expect(result.error).toBeNull();
    expect(result.state).toEqual(state);
  });

  it('persists the selected Kyrgyz translation language', () => {
    const state = { ...createDefaultProgress(), translationLanguage: 'ky' as const };
    const storage = createMemoryStorage();
    expect(saveProgress(storage, state)).toBeNull();
    expect(loadProgress(storage).state.translationLanguage).toBe('ky');
  });

  it('migrates saved progress without a translation language to Russian', () => {
    const legacyState = { ...createDefaultProgress() };
    Reflect.deleteProperty(legacyState, 'translationLanguage');
    expect(parseProgressState(legacyState).translationLanguage).toBe('ru');
  });

  it('reports corrupt persisted data rather than treating it as valid progress', () => {
    const storage = createMemoryStorage({ [PROGRESS_STORAGE_KEY]: '{broken' });
    const result = loadProgress(storage);
    expect(result.error).toContain('JSON');
    expect(result.state).toEqual(createDefaultProgress());
  });

  it('rejects impossible counters and page numbers', () => {
    expect(() => parseProgressState({ ...createDefaultProgress(), lastReadPage: 0 })).toThrow();
    expect(() => parseProgressState({ ...createDefaultProgress(), dailyGoal: 1000 })).toThrow();
  });

  it('counts actual consecutive local study days, allowing yesterday to start the streak', () => {
    const today = new Date(2026, 9, 11, 12);
    expect(getStudyStreak(['2026-10-09', '2026-10-10', '2026-10-11'], today)).toBe(3);
    expect(getStudyStreak(['2026-10-10'], today)).toBe(1);
    expect(getStudyStreak(['2026-10-08'], today)).toBe(0);
  });

  it('records a calendar day once without inflating activity', () => {
    const date = new Date(2026, 9, 11, 12);
    const first = addActiveDate(createDefaultProgress(), date);
    expect(addActiveDate(first, date).activeDates).toEqual(['2026-10-11']);
  });

  it('surfaces storage failures', () => {
    const storage = {
      setItem() {
        throw new Error('quota exceeded');
      },
    };
    expect(saveProgress(storage, createDefaultProgress())).toBe('quota exceeded');
  });
});
