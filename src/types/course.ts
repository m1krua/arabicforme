export interface Lesson {
  id: string;
  title: string;
  order: number;
  sourcePage: number;
  summary: string;
  verified: true;
}

export interface VerifiedWord {
  id: string;
  lessonId: string;
  arabic: string;
  translation: string;
  transliteration?: string;
  sourcePage: number;
  verified: true;
}

export interface QuizQuestion {
  id: string;
  lessonId: string;
  wordId?: string;
  type: 'choice' | 'text';
  prompt: string;
  choices?: string[];
  answer: string;
  acceptedAnswers?: string[];
  explanation?: string;
  sourcePage: number;
  verified: true;
}

export interface CourseCatalog {
  lessons: Lesson[];
  words: VerifiedWord[];
  questions: QuizQuestion[];
}
