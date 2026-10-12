import type { CourseCatalog, Lesson, QuizQuestion, VerifiedWord } from '../types/course';

export const SOURCE_BOOK_PAGE_COUNT = 332;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasSourcePage(value: unknown): value is number {
  return Number.isInteger(value) &&
    typeof value === 'number' &&
    value > 0 &&
    value <= SOURCE_BOOK_PAGE_COUNT;
}

function isLesson(value: unknown): value is Lesson {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    value.id.trim().length > 0 &&
    typeof value.title === 'string' &&
    value.title.trim().length > 0 &&
    Number.isInteger(value.order) &&
    typeof value.order === 'number' &&
    hasSourcePage(value.sourcePage) &&
    typeof value.summary === 'string' &&
    value.verified === true
  );
}

function isWord(value: unknown): value is VerifiedWord {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    value.id.trim().length > 0 &&
    typeof value.lessonId === 'string' &&
    value.lessonId.trim().length > 0 &&
    typeof value.arabic === 'string' &&
    value.arabic.trim().length > 0 &&
    typeof value.translation === 'string' &&
    value.translation.trim().length > 0 &&
    (value.transliteration === undefined || typeof value.transliteration === 'string') &&
    hasSourcePage(value.sourcePage) &&
    value.verified === true
  );
}

function isQuestion(value: unknown): value is QuizQuestion {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    value.id.trim().length > 0 &&
    typeof value.lessonId === 'string' &&
    value.lessonId.trim().length > 0 &&
    (value.wordId === undefined || (typeof value.wordId === 'string' && value.wordId.trim().length > 0)) &&
    (value.type === 'choice' || value.type === 'text') &&
    typeof value.prompt === 'string' &&
    value.prompt.trim().length > 0 &&
    typeof value.answer === 'string' &&
    value.answer.trim().length > 0 &&
    (value.type === 'choice'
      ? Array.isArray(value.choices) &&
        value.choices.length >= 2 &&
        value.choices.every((choice) => typeof choice === 'string' && choice.trim().length > 0) &&
        value.choices.includes(value.answer) &&
        value.acceptedAnswers === undefined
      : value.choices === undefined &&
        (value.acceptedAnswers === undefined ||
          (Array.isArray(value.acceptedAnswers) &&
            value.acceptedAnswers.length > 0 &&
            value.acceptedAnswers.every((answer) => typeof answer === 'string' && answer.trim().length > 0) &&
            value.acceptedAnswers.includes(value.answer)))) &&
    (value.explanation === undefined || typeof value.explanation === 'string') &&
    hasSourcePage(value.sourcePage) &&
    value.verified === true
  );
}

function parseArray<T>(
  value: unknown,
  guard: (item: unknown) => item is T,
  message: string,
): T[] {
  if (!Array.isArray(value)) throw new TypeError(message);
  const items: T[] = [];
  for (const item of value) {
    if (!guard(item)) throw new TypeError(message);
    items.push(item);
  }
  return items;
}

export function parseCourseCatalog(input: unknown): CourseCatalog {
  if (!isRecord(input)) {
    throw new TypeError('Каталог курса должен быть объектом.');
  }
  const lessons = parseArray(input.lessons, isLesson, 'В каталоге найдены уроки без подтверждённого источника.');
  const words = parseArray(input.words, isWord, 'В каталоге найдены слова без подтверждённого перевода или страницы.');
  const questions = parseArray(input.questions, isQuestion, 'В каталоге найдены неподтверждённые или некорректные вопросы.');
  const lessonIds = new Set(lessons.map((lesson) => lesson.id));
  const wordIds = new Set(words.map((word) => word.id));
  const questionIds = new Set(questions.map((question) => question.id));
  if (
    lessonIds.size !== lessons.length ||
    wordIds.size !== words.length ||
    questionIds.size !== questions.length ||
    words.some((word) => !lessonIds.has(word.lessonId)) ||
    questions.some((question) =>
      !lessonIds.has(question.lessonId) || (question.wordId !== undefined && !wordIds.has(question.wordId)),
    )
  ) {
    throw new TypeError('Слово или вопрос ссылается на отсутствующий урок.');
  }

  return { lessons, words, questions };
}

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target]!, result[index]!];
  }
  return result;
}

export function createQuizRound(
  questions: readonly QuizQuestion[],
  requestedCount: number,
  random: () => number = Math.random,
): QuizQuestion[] {
  if (!Number.isInteger(requestedCount) || requestedCount < 1) {
    throw new RangeError('Количество вопросов должно быть положительным целым числом.');
  }
  const verifiedUnique = new Map<string, QuizQuestion>();
  for (const question of questions) {
    if (question.verified && question.sourcePage > 0 && !verifiedUnique.has(question.id)) {
      verifiedUnique.set(question.id, question);
    }
  }
  return shuffle([...verifiedUnique.values()], random).slice(0, requestedCount);
}

export function normalizeArabicAnswer(value: string): string {
  if (typeof value !== 'string') return '';

  return value
    .normalize('NFC')
    .trim()
    .replace(/[\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '');
}

export function isArabicAnswerCorrect(answer: string, acceptedAnswers: readonly string[]): boolean {
  if (typeof answer !== 'string' || !Array.isArray(acceptedAnswers) || acceptedAnswers.length === 0) {
    return false;
  }

  const normalized = normalizeArabicAnswer(answer);
  return acceptedAnswers.some((accepted) => typeof accepted === 'string' && normalizeArabicAnswer(accepted) === normalized);
}

const arabicTransliteration: Readonly<Record<string, string>> = {
  ا: 'ā', أ: 'ʾ', إ: 'ʾ', آ: 'ʾā', ؤ: 'ʾ', ئ: 'ʾ', ء: 'ʾ',
  ب: 'b', ت: 't', ث: 'th', ج: 'j', ح: 'ḥ', خ: 'kh', د: 'd', ذ: 'dh',
  ر: 'r', ز: 'z', س: 's', ش: 'sh', ص: 'ṣ', ض: 'ḍ', ط: 'ṭ', ظ: 'ẓ',
  ع: 'ʿ', غ: 'gh', ف: 'f', ق: 'q', ك: 'k', ل: 'l', م: 'm', ن: 'n',
  ه: 'h', و: 'w', ي: 'y', ى: 'ā', ة: 'h',
};

export function transliterateArabic(value: string): string {
  const characters = [...value.normalize('NFC')];
  let result = '';

  for (let index = 0; index < characters.length; index += 1) {
    const character = characters[index]!;
    if (character === '\u0640') continue;

    const marks: string[] = [];
    while (index + 1 < characters.length && /[\u064B-\u0652]/u.test(characters[index + 1]!)) {
      marks.push(characters[index + 1]!);
      index += 1;
    }

    if (character === 'ا' && marks.length === 0) {
      if (result.endsWith('an')) continue;
      if (result.endsWith('a')) {
        result = `${result.slice(0, -1)}ā`;
        continue;
      }
    }
    if (character === 'ي' && marks.length === 0 && result.endsWith('i')) {
      result = `${result.slice(0, -1)}ī`;
      continue;
    }
    if (character === 'و' && marks.length === 0 && result.endsWith('u')) {
      result = `${result.slice(0, -1)}ū`;
      continue;
    }

    const doubled = marks.includes('\u0651');
    const vowel = marks.includes('\u064B')
      ? 'an'
      : marks.includes('\u064D')
        ? 'in'
        : marks.includes('\u064C')
          ? 'un'
          : marks.includes('\u064E')
            ? 'a'
            : marks.includes('\u0650')
              ? 'i'
                : marks.includes('\u064F')
                ? 'u'
                : '';
    const consonant = character === 'ا' && (vowel === 'a' || (marks.length === 0 && characters[index + 1] === 'ل'))
      ? 'a'
      : character === 'ة' && marks.length > 0
        ? 't'
        : arabicTransliteration[character] ?? character;

    result += doubled ? consonant + consonant : consonant;
    result += vowel;
  }

  return result;
}
