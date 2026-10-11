export type Theme = 'light' | 'dark';
export type TranslationLanguage = 'ru' | 'ky';

export interface QuizAttempt {
  id: string;
  date: string;
  score: number;
  total: number;
  lessonId?: string;
}

export interface ProgressState {
  version: 1;
  lastReadPage: number;
  bookmarks: number[];
  completedLessonIds: string[];
  learnedWordIds: string[];
  difficultWordIds: string[];
  wrongAnswers: Record<string, number>;
  quizAttempts: QuizAttempt[];
  activeDates: string[];
  dailyGoal: number;
  theme: Theme;
  translationLanguage: TranslationLanguage;
}

export interface ProgressLoadResult {
  state: ProgressState;
  error: string | null;
}

export const PROGRESS_STORAGE_KEY = 'arabic-learning-progress-v1';

export function createDefaultProgress(): ProgressState {
  return {
    version: 1,
    lastReadPage: 1,
    bookmarks: [],
    completedLessonIds: [],
    learnedWordIds: [],
    difficultWordIds: [],
    wrongAnswers: {},
    quizAttempts: [],
    activeDates: [],
    dailyGoal: 10,
    theme: 'light',
    translationLanguage: 'ru',
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isValidCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function isPageArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every(
    (item) => Number.isInteger(item) && typeof item === 'number' && item > 0,
  );
}

function parseAttempt(value: unknown): value is QuizAttempt {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    value.id.trim().length > 0 &&
    typeof value.date === 'string' &&
    Number.isFinite(Date.parse(value.date)) &&
    Number.isInteger(value.score) &&
    typeof value.score === 'number' &&
    Number.isInteger(value.total) &&
    typeof value.total === 'number' &&
    value.total > 0 &&
    value.score >= 0 &&
    value.score <= value.total &&
    (value.lessonId === undefined || typeof value.lessonId === 'string')
  );
}

export function parseProgressState(input: unknown): ProgressState {
  if (
    !isRecord(input) ||
    input.version !== 1 ||
    !Number.isInteger(input.lastReadPage) ||
    typeof input.lastReadPage !== 'number' ||
    input.lastReadPage < 1 ||
    !isPageArray(input.bookmarks) ||
    !isStringArray(input.completedLessonIds) ||
    !isStringArray(input.learnedWordIds) ||
    !isStringArray(input.difficultWordIds) ||
    !isRecord(input.wrongAnswers) ||
    !Object.values(input.wrongAnswers).every(
      (count) => Number.isInteger(count) && typeof count === 'number' && count >= 0,
    ) ||
    !Array.isArray(input.quizAttempts) ||
    !isStringArray(input.activeDates) ||
    !input.activeDates.every(isValidCalendarDate) ||
    !Number.isInteger(input.dailyGoal) ||
    typeof input.dailyGoal !== 'number' ||
    input.dailyGoal < 1 ||
    input.dailyGoal > 500 ||
    (input.theme !== 'light' && input.theme !== 'dark') ||
    (input.translationLanguage !== undefined &&
      input.translationLanguage !== 'ru' &&
      input.translationLanguage !== 'ky')
  ) {
    throw new TypeError('Локальный прогресс повреждён или имеет неподдерживаемый формат.');
  }

  const bookmarks = input.bookmarks;
  const completedLessonIds = input.completedLessonIds;
  const learnedWordIds = input.learnedWordIds;
  const difficultWordIds = input.difficultWordIds;
  const activeDates = input.activeDates;
  const quizAttempts: QuizAttempt[] = [];
  const rawAttempts: unknown[] = input.quizAttempts;
  for (const attempt of rawAttempts) {
    if (!parseAttempt(attempt)) {
      throw new TypeError('История тестов в локальном прогрессе повреждена.');
    }
    quizAttempts.push(attempt);
  }
  const wrongAnswers: Record<string, number> = {};
  for (const [id, count] of Object.entries(input.wrongAnswers)) {
    if (!Number.isInteger(count) || typeof count !== 'number' || count < 0) {
      throw new TypeError('Счётчик ошибок в локальном прогрессе повреждён.');
    }
    wrongAnswers[id] = count;
  }

  return {
    version: 1,
    lastReadPage: input.lastReadPage,
    bookmarks: [...new Set(bookmarks)],
    completedLessonIds: [...new Set(completedLessonIds)],
    learnedWordIds: [...new Set(learnedWordIds)],
    difficultWordIds: [...new Set(difficultWordIds)],
    wrongAnswers,
    quizAttempts,
    activeDates: [...new Set(activeDates)],
    dailyGoal: input.dailyGoal,
    theme: input.theme,
    translationLanguage: input.translationLanguage === 'ky' ? 'ky' : 'ru',
  };
}

export function loadProgress(storage: Pick<Storage, 'getItem'>): ProgressLoadResult {
  try {
    const raw = storage.getItem(PROGRESS_STORAGE_KEY);
    return raw === null
      ? { state: createDefaultProgress(), error: null }
      : { state: parseProgressState(JSON.parse(raw) as unknown), error: null };
  } catch (error) {
    return {
      state: createDefaultProgress(),
      error: error instanceof Error ? error.message : 'Не удалось прочитать локальный прогресс.',
    };
  }
}

export function saveProgress(
  storage: Pick<Storage, 'setItem'>,
  state: ProgressState,
): string | null {
  try {
    storage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(state));
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : 'Не удалось сохранить локальный прогресс.';
  }
}

export function addActiveDate(state: ProgressState, date = new Date()): ProgressState {
  const day = formatLocalDate(date);
  return state.activeDates.includes(day)
    ? state
    : { ...state, activeDates: [...state.activeDates, day].sort().slice(-365) };
}

export function getStudyStreak(activeDates: readonly string[], today = new Date()): number {
  const dates = new Set(activeDates);
  const day = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const todayString = formatLocalDate(day);
  if (!dates.has(todayString)) {
    day.setDate(day.getDate() - 1);
    if (!dates.has(formatLocalDate(day))) return 0;
  }
  let streak = 0;
  while (dates.has(formatLocalDate(day))) {
    streak += 1;
    day.setDate(day.getDate() - 1);
  }
  return streak;
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
