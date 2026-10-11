import { describe, expect, it } from 'vitest';
import {
  createQuizRound,
  isArabicAnswerCorrect,
  parseCourseCatalog,
} from './course';
import { courseCatalog } from '../data/course';
import { hasKyrgyzTranslation, localizeTranslation } from '../data/kyrgyz';
import type { CourseCatalog } from '../types/course';

const sampleCatalog: CourseCatalog = {
  lessons: [{ id: 'lesson-1', title: 'Lesson 1', order: 1, sourcePage: 4, summary: 'Source text', verified: true }],
  words: [{ id: 'word-1', lessonId: 'lesson-1', arabic: 'كَتَبَ', translation: 'писал', sourcePage: 4, verified: true }],
  questions: [
    { id: 'q-1', lessonId: 'lesson-1', wordId: 'word-1', type: 'choice', prompt: 'كَتَبَ', choices: ['писал', 'читал'], answer: 'писал', sourcePage: 4, verified: true },
    { id: 'q-2', lessonId: 'lesson-1', type: 'choice', prompt: 'Перевод', choices: ['ответ', 'ошибка'], answer: 'ответ', sourcePage: 5, verified: true },
  ],
};

describe('source-aware course data', () => {
  it('includes only lessons with manually checked source pages in the catalog', () => {
    expect(courseCatalog.lessons.map((lesson) => [lesson.id, lesson.sourcePage])).toEqual([
      ['lesson-1', 2],
      ['lesson-2', 3],
      ['lesson-3', 4],
      ['lesson-4', 5],
      ['lesson-5', 6],
      ['lesson-7', 9],
      ['lesson-8', 11],
      ['lesson-9', 13],
      ['lesson-10', 16],
      ['lesson-11', 19],
      ['lesson-12', 20],
      ['lesson-13', 24],
      ['lesson-14', 26],
      ['lesson-15', 28],
      ['lesson-16', 30],
      ['lesson-17', 33],
      ['lesson-18', 35],
      ['lesson-19', 38],
      ['lesson-20', 40],
      ['lesson-21', 43],
      ['lesson-22', 46],
    ]);
    expect(courseCatalog.words).toHaveLength(426);
    expect(courseCatalog.questions).toHaveLength(102);
    expect(courseCatalog.words.every((word) => word.verified && [2, 3, 4, 5, 6, 9, 11, 13, 16, 19, 20, 24, 26, 28, 30, 33, 35, 38, 40, 41, 43, 46].includes(word.sourcePage))).toBe(true);
    expect(courseCatalog.questions.every((question) => question.verified && [2, 3, 4, 5, 6, 9, 11, 13, 16, 19, 20, 24, 26, 28, 30, 33, 35, 38, 40, 41, 43, 46].includes(question.sourcePage))).toBe(true);
  });

  it('covers every course translation in Kyrgyz and keeps localized quiz choices distinct', () => {
    const translations = [
      ...courseCatalog.words.map((word) => word.translation),
      ...courseCatalog.questions.flatMap((question) => [
        question.answer,
        ...(question.choices ?? []),
      ]),
    ];
    const missing = [...new Set(translations.filter((translation) => !hasKyrgyzTranslation(translation)))];
    expect(missing).toEqual([]);

    for (const question of courseCatalog.questions) {
      if (question.type !== 'choice') continue;
      const localizedChoices = question.choices?.map((choice) => localizeTranslation(choice, 'ky')) ?? [];
      expect(new Set(localizedChoices).size, question.id).toBe(localizedChoices.length);
    }
  });

  it('accepts only confirmed items with a source page and valid references', () => {
    expect(parseCourseCatalog(sampleCatalog).lessons).toHaveLength(1);
    expect(() => parseCourseCatalog({
      lessons: [{ ...sampleCatalog.lessons[0], verified: false }],
      words: [],
      questions: [],
    })).toThrow('подтверждённого источника');
    expect(() => parseCourseCatalog({
      ...sampleCatalog,
      questions: [{ ...sampleCatalog.questions[0], wordId: 'missing-word' }],
    })).toThrow('отсутствующий урок');
  });

  it('keeps each question unique in a shuffled round', () => {
    const round = createQuizRound(
      [...sampleCatalog.questions, sampleCatalog.questions[1]!],
      10,
      () => 0,
    );
    expect(round).toHaveLength(2);
    expect(new Set(round.map((question) => question.id)).size).toBe(2);
    expect(round.every((question) => question.verified && question.sourcePage > 0)).toBe(true);
  });

  it('validates self-entry answers without stripping vowel marks', () => {
    const textQuestion = {
      id: 'q-text',
      lessonId: 'lesson-1',
      type: 'text',
      prompt: 'Введите форму из источника',
      answer: 'كَتَبَ',
      acceptedAnswers: ['كَتَبَ', ' كَتَبَ '],
      sourcePage: 4,
      verified: true,
    };
    expect(parseCourseCatalog({
      ...sampleCatalog,
      questions: [textQuestion],
    }).questions[0]?.acceptedAnswers).toEqual(['كَتَبَ', ' كَتَبَ ']);
    expect(() => parseCourseCatalog({
      ...sampleCatalog,
      questions: [{ ...textQuestion, answer: 'نص' }],
    })).toThrow('неподтверждённые');
  });

  it('rejects invalid question counts instead of silently substituting values', () => {
    expect(() => createQuizRound(sampleCatalog.questions, 0)).toThrow(RangeError);
    expect(() => createQuizRound(sampleCatalog.questions, Number.NaN)).toThrow(RangeError);
  });

  it('ignores spacing and bidirectional marks but preserves Arabic diacritics', () => {
    expect(isArabicAnswerCorrect('  كَتَبَ\u200f ', ['كَتَبَ'])).toBe(true);
    expect(isArabicAnswerCorrect('كتب', ['كَتَبَ'])).toBe(false);
  });
});
