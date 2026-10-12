import { useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Shuffle,
  Sun,
  Moon,
} from 'lucide-react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { courseCatalog } from '../data/course';
import { localizeTranslation } from '../data/kyrgyz';
import { formatInterfaceDate } from '../data/interface';
import { createQuizRound, isArabicAnswerCorrect, normalizeArabicAnswer, transliterateArabic } from '../lib/course';
import { addActiveDate, type QuizAttempt } from '../lib/progress';
import { useProgress } from '../state/useProgress';
import { useInterfaceText } from '../state/useInterfaceText';
import type { Lesson, VerifiedWord } from '../types/course';

function createQuizAttemptId(): string {
  try {
    if (typeof globalThis.crypto?.randomUUID === 'function') {
      return globalThis.crypto.randomUUID();
    }
  } catch (error) {
    if (import.meta.env.DEV) console.warn('UUID API недоступен; используется совместимый идентификатор теста.', error);
  }
  return `quiz-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function SourceNote() {
  const t = useInterfaceText();
  return (
    <div className="notice notice-info">
      {t('Материал включается в обучение только после сверки написания, огласовок, перевода и страницы-источника. Книга пока доступна в оригинале.')}
      <Link to="/book">{t('Открыть книгу')} <ArrowRight size={15} /></Link>
    </div>
  );
}

function EmptyCourse({ title, description }: { title: string; description: string }) {
  const t = useInterfaceText();
  return (
    <div className="empty-course">
      <span className="empty-course-icon"><BookOpen size={23} aria-hidden="true" /></span>
      <h2>{t(title)}</h2>
      <p>{t(description)}</p>
      <SourceNote />
    </div>
  );
}

function LessonCard({ lesson }: { lesson: Lesson }) {
  const { progress } = useProgress();
  const t = useInterfaceText();
  const completed = progress.completedLessonIds.includes(lesson.id);
  return (
    <article className="lesson-card">
      <div className="lesson-card-number">{String(lesson.order).padStart(2, '0')}</div>
      <div className="lesson-card-copy">
        <span className="small-muted">{t('Страница')} {lesson.sourcePage} · {t(completed ? 'изучен' : 'не начат')}</span>
        <h2>{t(lesson.title)}</h2>
        <p>{t(lesson.summary)}</p>
      </div>
      <Link className="button button-quiet" to={`/lessons/${lesson.id}`}>
        {t('Открыть')} <ArrowRight size={17} />
      </Link>
    </article>
  );
}

export function LessonsPage() {
  const t = useInterfaceText();
  const lessons = [...courseCatalog.lessons].sort((left, right) => left.order - right.order);
  return (
    <section className="page-stack" aria-labelledby="lessons-title">
      <div className="page-heading">
        <div><span className="eyebrow">{t('Курс')}</span><h1 id="lessons-title">{t('Уроки')}</h1></div>
      </div>
      {lessons.length === 0 ? (
        <EmptyCourse
          title="Уроки ещё не сверены с книгой"
          description="В PDF 333 сканированные страницы. Автоматическое распознавание арабского текста здесь недоступно, поэтому названия и содержание уроков не подменяются догадками."
        />
      ) : (
        <div className="lesson-list">
          {lessons.map((lesson) => <LessonCard key={lesson.id} lesson={lesson} />)}
        </div>
      )}
    </section>
  );
}

function LessonMaterial({ lesson }: { lesson: Lesson }) {
  const { progress, updateProgress, recordActivity } = useProgress();
  const t = useInterfaceText();
  const completed = progress.completedLessonIds.includes(lesson.id);
  return (
    <section className="page-stack" aria-labelledby="lesson-heading">
      <Link className="back-link" to="/lessons"><ArrowLeft size={17} /> {t('Все уроки')}</Link>
      <article className="panel lesson-material">
        <span className="eyebrow">{t('Урок')} · {t('Источник: страница')} {lesson.sourcePage}</span>
        <h1 id="lesson-heading">{t(lesson.title)}</h1>
        <p>{t(lesson.summary)}</p>
        <div className="lesson-material-actions">
          <Link className="button button-soft" to={`/book/${lesson.sourcePage}`}>
            <BookOpen size={18} /> {t('Открыть страницу книги')}
          </Link>
          <button
            className="button button-primary"
            type="button"
            onClick={() => {
              updateProgress((current) => ({
                ...current,
                completedLessonIds: completed
                  ? current.completedLessonIds.filter((id) => id !== lesson.id)
                  : [...new Set([...current.completedLessonIds, lesson.id])],
              }));
              recordActivity();
            }}
          >
            <Check size={18} /> {t(completed ? 'Отметить как не пройденный' : 'Отметить урок пройденным')}
          </button>
          <Link className="button button-quiet" to={`/quiz?lesson=${encodeURIComponent(lesson.id)}`}>
            {t('Практика')} <ArrowRight size={17} />
          </Link>
        </div>
      </article>
    </section>
  );
}

export function LessonDetailPage() {
  const t = useInterfaceText();
  const { lessonId } = useParams();
  const lesson = courseCatalog.lessons.find((item) => item.id === lessonId);
  if (!lesson) {
    return (
      <section className="page-stack">
        <div className="page-heading">
          <div><span className="eyebrow">{t('Курс')}</span><h1>{t('Урок')}</h1></div>
        </div>
        <EmptyCourse
          title="Такого урока пока нет"
          description="Ссылка может вести на ещё не проверенный материал или устаревший адрес."
        />
      </section>
    );
  }
  return <LessonMaterial lesson={lesson} />;
}

function shuffle<T>(values: readonly T[]): T[] {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(Math.random() * (index + 1));
    [result[index], result[other]] = [result[other]!, result[index]!];
  }
  return result;
}

const arabicKeyboard = [
  'ا', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'د', 'ذ', 'ر', 'ز', 'س', 'ش', 'ص', 'ض',
  'ط', 'ظ', 'ع', 'غ', 'ف', 'ق', 'ك', 'ل', 'م', 'ن', 'ه', 'و', 'ي', 'ء', 'ؤ', 'ئ', 'آ',
  'َ', 'ُ', 'ِ', 'ْ', 'ّ', 'ً', 'ٍ', 'ٌ', 'ٰ', 'ٱ', 'ة', 'ى', 'لا', 'ال', 'ٔ', 'ٕ', 'ٓ', 'ٖ',
];

const arabicAlphabetGuide = [
  { letter: 'ا', nameRu: 'Алиф', pronunciation: 'а', transliteration: 'ā' },
  { letter: 'ب', nameRu: 'Ба', pronunciation: 'б', transliteration: 'b' },
  { letter: 'ت', nameRu: 'Та', pronunciation: 'т', transliteration: 't' },
  { letter: 'ث', nameRu: 'Са', pronunciation: 'с', transliteration: 'th' },
  { letter: 'ج', nameRu: 'Джим', pronunciation: 'дж', transliteration: 'j' },
  { letter: 'ح', nameRu: 'Ха', pronunciation: 'х', transliteration: 'ḥ' },
  { letter: 'خ', nameRu: 'Ха', pronunciation: 'х', transliteration: 'kh' },
  { letter: 'د', nameRu: 'Даль', pronunciation: 'д', transliteration: 'd' },
  { letter: 'ذ', nameRu: 'Заль', pronunciation: 'з', transliteration: 'dh' },
  { letter: 'ر', nameRu: 'Ра', pronunciation: 'р', transliteration: 'r' },
  { letter: 'ز', nameRu: 'Зайн', pronunciation: 'з', transliteration: 'z' },
  { letter: 'س', nameRu: 'Син', pronunciation: 'с', transliteration: 's' },
  { letter: 'ش', nameRu: 'Шин', pronunciation: 'ш', transliteration: 'sh' },
  { letter: 'ص', nameRu: 'Сад', pronunciation: 'с', transliteration: 'ṣ' },
  { letter: 'ض', nameRu: 'Дад', pronunciation: 'д', transliteration: 'ḍ' },
  { letter: 'ط', nameRu: 'Та', pronunciation: 'т', transliteration: 'ṭ' },
  { letter: 'ظ', nameRu: 'За', pronunciation: 'з', transliteration: 'ẓ' },
  { letter: 'ع', nameRu: 'Айн', pronunciation: 'гортанный звук', transliteration: 'ʿ' },
  { letter: 'غ', nameRu: 'Гайн', pronunciation: 'г', transliteration: 'gh' },
  { letter: 'ف', nameRu: 'Фа', pronunciation: 'ф', transliteration: 'f' },
  { letter: 'ق', nameRu: 'Каф', pronunciation: 'к', transliteration: 'q' },
  { letter: 'ك', nameRu: 'Кяф', pronunciation: 'к', transliteration: 'k' },
  { letter: 'ل', nameRu: 'Лям', pronunciation: 'л', transliteration: 'l' },
  { letter: 'م', nameRu: 'Мим', pronunciation: 'м', transliteration: 'm' },
  { letter: 'ن', nameRu: 'Нун', pronunciation: 'н', transliteration: 'n' },
  { letter: 'ه', nameRu: 'Ха', pronunciation: 'х', transliteration: 'h' },
  { letter: 'و', nameRu: 'Вау', pronunciation: 'в/у/о', transliteration: 'w' },
  { letter: 'ي', nameRu: 'Я', pronunciation: 'й/и', transliteration: 'y' },
  { letter: 'ة', nameRu: 'Та марбута', pronunciation: 'т/а', transliteration: 't' },
  { letter: 'ى', nameRu: 'Алиф максура', pronunciation: 'а/й', transliteration: 'ā/ī' },
];

const arabicDiacriticsGuide = [
  {
    symbol: 'َ',
    nameRu: 'Фатха',
    nameKy: 'фатха',
    pronunciation: 'а',
    effect: 'Короткий гласный a после согласной буквы.',
    example: 'بَابٌ',
    transliteration: 'bābun',
    meaning: 'дверь',
  },
  {
    symbol: 'ِ',
    nameRu: 'Касра',
    nameKy: 'касра',
    pronunciation: 'и',
    effect: 'Короткий гласный i при чтении слова.',
    example: 'بِتٍّ',
    transliteration: 'bittin',
    meaning: 'дом',
  },
  {
    symbol: 'ُ',
    nameRu: 'Дамма',
    nameKy: 'дамма',
    pronunciation: 'у',
    effect: 'Короткий гласный u после согласной буквы.',
    example: 'مُسْلِمٌ',
    transliteration: 'muslimun',
    meaning: 'мусульманин',
  },
  {
    symbol: 'ْ',
    nameRu: 'Сукун',
    nameKy: 'сукун',
    pronunciation: 'без гласного',
    effect: 'Согласная читается без краткого звука перед следующей буквой.',
    example: 'قَلْبٌ',
    transliteration: 'qalbun',
    meaning: 'сердце',
  },
  {
    symbol: 'ّ',
    nameRu: 'Шадда',
    nameKy: 'шадда',
    pronunciation: 'удвоение согласного',
    effect: 'Удваивает звук буквы и требует его более сильного произнесения.',
    example: 'رَتَّبَ',
    transliteration: 'rattaba',
    meaning: 'расположил по порядку',
  },
  {
    symbol: 'ً',
    nameRu: 'Фатхатайн',
    nameKy: 'фатхатайн',
    pronunciation: 'ан',
    effect: 'Окончание в форме tanwin с a-образным звуком.',
    example: 'كِتَابً',
    transliteration: 'kitāban',
    meaning: 'книгу',
  },
  {
    symbol: 'ٍ',
    nameRu: 'Касратайн',
    nameKy: 'касратайн',
    pronunciation: 'ин',
    effect: 'Окончание с i-образным звуком в конце слова.',
    example: 'حَقٍّ',
    transliteration: 'haqqin',
    meaning: 'истинного',
  },
  {
    symbol: 'ٌ',
    nameRu: 'Дамматайн',
    nameKy: 'дамматайн',
    pronunciation: 'ун',
    effect: 'Окончание с u-образным звуком в форме tanwin.',
    example: 'عَلَمٌ',
    transliteration: 'alamun',
    meaning: 'знак',
  },
  {
    symbol: 'ء',
    nameRu: 'Хамза',
    nameKy: 'хамза',
    pronunciation: 'гортанный взрывной звук',
    effect: 'Определяет особое написание и произношение в словах с начальной или внутренней хамзой.',
    example: 'أَمْرٌ',
    transliteration: 'amrun',
    meaning: 'дело',
  },
  {
    symbol: 'ة',
    nameRu: 'Та марбута',
    nameKy: 'та марбута',
    pronunciation: 'т',
    effect: 'В конце слова обычно читается как t, особенно в именах и формировании женского рода.',
    example: 'مَدْرَسَةٌ',
    transliteration: 'madrasatun',
    meaning: 'школа',
  },
  {
    symbol: 'ى',
    nameRu: 'Алиф максура',
    nameKy: 'алиф максура',
    pronunciation: 'а или й',
    effect: 'В конце слова буква читается как долгий a/й в зависимости от формы.',
    example: 'مَسْلَى',
    transliteration: 'maslā',
    meaning: 'цель',
  },
  {
    symbol: 'لا',
    nameRu: 'Лям-алиф',
    nameKy: 'лям-алиф',
    pronunciation: 'ла',
    effect: 'Лигатурное сочетание лям + алиф, часто встречается в словах и именах.',
    example: 'لا',
    transliteration: 'lā',
    meaning: 'нет',
  },
];

function WordCard({ word, onRate }: { word: VerifiedWord; onRate: () => void }) {
  const { progress, updateProgress, recordActivity } = useProgress();
  const t = useInterfaceText();
  const [flipped, setFlipped] = useState(false);
  const [direction, setDirection] = useState<'ar-ru' | 'ru-ar'>('ar-ru');
  const arabicFirst = direction === 'ar-ru';
  const translation = localizeTranslation(word.translation, progress.translationLanguage);
  const front = arabicFirst ? word.arabic : translation;
  const back = arabicFirst ? translation : word.arabic;
  const frontIsArabic = arabicFirst;
  const backIsArabic = !arabicFirst;
  const known = progress.learnedWordIds.includes(word.id);
  const difficult = progress.difficultWordIds.includes(word.id);

  return (
    <div className="flashcard-wrap">
      <div className="flashcard-scene">
        <div className={`flashcard${flipped ? ' is-flipped' : ''}`}>
          <div className="flashcard-face flashcard-face-front" aria-hidden={flipped}>
            <span className="flashcard-kicker">{t('КАРТОЧКА')}</span>
            <p className={frontIsArabic ? 'arabic-word' : 'flashcard-main'} lang={frontIsArabic ? 'ar' : undefined} dir={frontIsArabic ? 'rtl' : undefined}>
              {front}
            </p>
            {word.transliteration && frontIsArabic && (
              <span className="transliteration" lang="ru" dir="ltr">{word.transliteration}</span>
            )}
            <span className="small-muted">{t('Источник: страница')} {word.sourcePage}</span>
            <button className="flashcard-flip" type="button" onClick={() => setFlipped(true)} tabIndex={flipped ? -1 : 0}>
              {t('Показать ответ')}
            </button>
          </div>
          <div className="flashcard-face flashcard-face-back" aria-hidden={!flipped}>
            <span className="flashcard-kicker">{t('ОТВЕТ')}</span>
            <p className={backIsArabic ? 'arabic-word' : 'flashcard-main'} lang={backIsArabic ? 'ar' : undefined} dir={backIsArabic ? 'rtl' : undefined}>
              {back}
            </p>
            {word.transliteration && backIsArabic && (
              <span className="transliteration" lang="ru" dir="ltr">{word.transliteration}</span>
            )}
            <span className="small-muted">{t('Источник: страница')} {word.sourcePage}</span>
            <button className="flashcard-flip" type="button" onClick={() => setFlipped(false)} tabIndex={flipped ? 0 : -1}>
              {t('Показать сторону карточки')}
            </button>
          </div>
        </div>
      </div>
      <div className="flashcard-tools">
        <button
          className="button button-quiet"
          type="button"
          onClick={() => setDirection((value) => value === 'ar-ru' ? 'ru-ar' : 'ar-ru')}
        >
          {t('Сменить направление')}
        </button>
        <button
          className={`button ${difficult ? 'button-warn' : 'button-soft'}`}
          type="button"
          onClick={() => {
            updateProgress((current) => ({
              ...current,
              difficultWordIds: difficult
                ? current.difficultWordIds.filter((id) => id !== word.id)
                : [...new Set([...current.difficultWordIds, word.id])],
            }));
            recordActivity();
          }}
        >
          <RotateCcw size={17} /> {t(difficult ? 'Убрать из сложных' : 'Повторить позже')}
        </button>
        <button className={`button ${known ? 'button-soft' : 'button-primary'}`} type="button" onClick={onRate}>
          <Check size={17} /> {t(known ? 'Уже знаю · далее' : 'Знаю')}
        </button>
      </div>
    </div>
  );
}

export function FlashcardsPage() {
  const { progress, updateProgress, recordActivity } = useProgress();
  const t = useInterfaceText();
  const [query, setQuery] = useState('');
  const [order, setOrder] = useState<string[] | null>(null);
  const allWords = courseCatalog.words;
  const filtered = allWords.filter((word) =>
    `${word.arabic} ${word.translation} ${localizeTranslation(word.translation, 'ky')} ${word.transliteration ?? ''}`
      .toLocaleLowerCase()
      .includes(query.toLocaleLowerCase()),
  );
  const ordered = order
    ? [...filtered].sort((left, right) => order.indexOf(left.id) - order.indexOf(right.id))
    : filtered;
  const [currentIndex, setCurrentIndex] = useState(0);
  const current = ordered[currentIndex];

  function rateWord() {
    if (!current) return;
    updateProgress((state) => ({
      ...state,
      learnedWordIds: [...new Set([...state.learnedWordIds, current.id])],
    }));
    recordActivity();
    setCurrentIndex((index) => ordered.length === 0 ? 0 : (index + 1) % ordered.length);
  }

  if (filtered.length === 0) {
    return (
      <section className="page-stack">
        <div className="page-heading">
          <div><span className="eyebrow">{t('Тренажёр')}</span><h1>{t('Карточки слов')}</h1></div>
        </div>
        <EmptyCourse
          title="Карточки появятся после сверки слов"
          description="Карточки строятся только по словам, сверенным с оригиналом книги, включая огласовки и перевод."
        />
      </section>
    );
  }

  return (
    <section className="page-stack" aria-labelledby="cards-title">
      <div className="page-heading">
        <div>
          <span className="eyebrow">{t('Тренажёр слов')}</span>
          <h1 id="cards-title">{t('Карточки слов')}</h1>
          <p>{t('Карточка засчитывается как изученная только по вашему явному ответу «Знаю».')}</p>
        </div>
        <div className="card-count">{currentIndex + 1} / {ordered.length}</div>
      </div>
      <div className="card-search-row">
        <label className="search-field">
          <span className="sr-only">{t('Поиск слов')}</span>
          <input value={query} onChange={(event) => { setQuery(event.currentTarget.value); setCurrentIndex(0); }} placeholder={t('Найти слово или перевод')} />
        </label>
        <button className="button button-soft" type="button" onClick={() => { setOrder(shuffle(ordered).map((word) => word.id)); setCurrentIndex(0); }}>
          <Shuffle size={17} /> {t('Перемешать')}
        </button>
      </div>
      {current ? (
        <WordCard key={current.id} word={current} onRate={rateWord} />
      ) : (
        <EmptyCourse title="По запросу ничего не найдено" description="Попробуйте изменить поисковый запрос." />
      )}
      <div className="card-stepper">
        <button className="icon-button" type="button" aria-label={t('Предыдущее слово')} onClick={() => setCurrentIndex((index) => (index - 1 + ordered.length) % ordered.length)}><ChevronLeft size={20} /></button>
        <span>{progress.learnedWordIds.filter((id) => courseCatalog.words.some((word) => word.id === id)).length} {t('слов уже отмечено как изученное')}</span>
        <button className="icon-button" type="button" aria-label={t('Следующее слово')} onClick={() => setCurrentIndex((index) => (index + 1) % ordered.length)}><ChevronRight size={20} /></button>
      </div>
    </section>
  );
}

export function ReviewPage() {
  const { progress } = useProgress();
  const t = useInterfaceText();
  const missedQuestions = courseCatalog.questions.filter(
    (question) => (progress.wrongAnswers[question.id] ?? 0) > 0,
  );
  const difficultWords = courseCatalog.words.filter((word) =>
    progress.difficultWordIds.includes(word.id),
  );

  return (
    <section className="page-stack">
      <div className="page-heading">
        <div><span className="eyebrow">{t('Персональный повтор')}</span><h1>{t('Повторить ошибки')}</h1><p>{t('Список основан на ваших реальных ответах и отметках.')}</p></div>
      </div>
      {missedQuestions.length === 0 && difficultWords.length === 0 ? (
        <EmptyCourse
          title="Повторение пока не требуется"
          description="Здесь появятся вопросы, на которые вы ответили неправильно, и слова, отмеченные для повтора."
        />
      ) : (
        <div className="review-content">
          {missedQuestions.length > 0 && (
            <article className="panel review-panel">
              <div className="panel-heading">
                <div><span className="eyebrow">{t('История ответов')}</span><h2>{missedQuestions.length} {t('вопросов на повтор')}</h2></div>
                <Link className="button button-primary" to={`/quiz/session?mode=review&count=${missedQuestions.length}`}>{t('Повторить вопросы')} <ArrowRight size={17} /></Link>
              </div>
              <ul className="review-list">
                {missedQuestions.map((question) => (
                  <li key={question.id}>
                    <span>{question.prompt}</span>
                    <small>{t('Ошибка:')} {progress.wrongAnswers[question.id]} · {t('Страница')} {question.sourcePage}</small>
                  </li>
                ))}
              </ul>
            </article>
          )}
          {difficultWords.length > 0 && (
            <article className="panel review-panel">
              <div className="panel-heading"><div><span className="eyebrow">{t('Слова')}</span><h2>{difficultWords.length} {t('слов для повтора')}</h2></div></div>
              <ul className="review-list">
                {difficultWords.map((word) => (
                  <li key={word.id}>
                    <span className="arabic-inline" lang="ar" dir="rtl">{word.arabic}</span>
                    <small>{localizeTranslation(word.translation, progress.translationLanguage)} · стр. {word.sourcePage}</small>
                  </li>
                ))}
              </ul>
              <Link className="button button-soft" to="/flashcards">{t('Открыть карточки')} <ArrowRight size={17} /></Link>
            </article>
          )}
        </div>
      )}
    </section>
  );
}

function ArabicAlphabetQuiz() {
  const t = useInterfaceText();
  const quizQuestions = useMemo(() => {
    const questions = arabicAlphabetGuide.map((entry) => ({
      answer: entry.nameRu,
      prompt: entry.letter,
      options: shuffle([
        entry.nameRu,
        ...shuffle(
          arabicAlphabetGuide
            .filter((item) => item.nameRu !== entry.nameRu)
            .map((item) => item.nameRu),
        ).slice(0, 3),
      ]),
    }));
    return shuffle(questions).slice(0, 8);
  }, []);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);

  const isFinished = questionIndex >= quizQuestions.length;
  const currentQuestion = quizQuestions[questionIndex]!;
  if (isFinished) {
    return (
      <article className="panel" style={{ padding: '24px' }}>
        <div className="panel-heading">
          <div>
            <span className="eyebrow">{t('Тест')}</span>
            <h2>{t('Готово: арабский алфавит')}</h2>
          </div>
        </div>
        <p style={{ margin: '12px 0 0', color: 'var(--muted)', lineHeight: 1.6 }}>
          {t('Вы ответили правильно на')} {score} / {quizQuestions.length} {t('букв.')}
        </p>
      </article>
    );
  }

  if (!currentQuestion) {
    return null;
  }

  const currentOptions = currentQuestion.options;

  function handleAnswer(option: string) {
    if (selected !== null) return;
    setSelected(option);
    if (option === currentQuestion.answer) {
      setScore((value) => value + 1);
    }
  }

  function handleNext() {
    if (questionIndex >= quizQuestions.length - 1) {
      setQuestionIndex(quizQuestions.length);
      return;
    }
    setQuestionIndex((index) => index + 1);
    setSelected(null);
  }

  return (
    <article className="panel" style={{ padding: '24px' }}>
      <div className="panel-heading">
        <div>
          <span className="eyebrow">{t('Проверка')}</span>
          <h2>{t('Тест по арабскому алфавиту')}</h2>
        </div>
        <strong style={{ color: 'var(--green-dark)' }}>{score} / {quizQuestions.length}</strong>
      </div>
      <div style={{ marginTop: '18px', display: 'grid', gap: '16px' }}>
        <div className="guide-sign" lang="ar" dir="rtl" style={{ minHeight: '110px', fontSize: '3rem' }}>
          {currentQuestion.prompt}
        </div>
        <div style={{ display: 'grid', gap: '10px' }}>
          {currentOptions.map((option) => {
            const isCorrect = option === currentQuestion.answer;
            const isSelected = option === selected;
            const revealState = selected !== null && (isCorrect || isSelected);
            return (
              <button
                key={option}
                type="button"
                className={`quiz-option${selected !== null && isCorrect ? ' is-correct' : ''}${selected !== null && isSelected && !isCorrect ? ' is-wrong' : ''}`}
                disabled={selected !== null}
                onClick={() => handleAnswer(option)}
                style={{
                  borderColor: revealState ? (isCorrect ? '#78aa82' : '#d69584') : undefined,
                  background: revealState ? (isCorrect ? 'var(--green-soft)' : '#fff1ed') : undefined,
                }}
              >
                {t(option)}
              </button>
            );
          })}
        </div>
        {selected !== null && (
          <div className={`answer-feedback ${selected === currentQuestion.answer ? 'feedback-correct' : 'feedback-wrong'}`} role="status">
            <strong>{t(selected === currentQuestion.answer ? 'Правильно!' : 'Неправильно')}</strong>
            <span>
              {selected === currentQuestion.answer
                ? `${t('Верно. Это буква')} ${t(currentQuestion.answer)}.`
                : `${t('Правильный ответ:')} ${t(currentQuestion.answer)}.`}
            </span>
            <button className="button button-primary" type="button" onClick={handleNext}>
              {t(questionIndex === quizQuestions.length - 1 ? 'Завершить' : 'Следующий вопрос')}
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

export function HarakatReferencePage() {
  const { progress } = useProgress();
  const t = useInterfaceText();
  return (
    <section className="page-stack" aria-labelledby="harakat-title">
      <div className="page-heading">
        <div>
          <span className="eyebrow">{t('Справочник')}</span>
          <h1 id="harakat-title">{t('Арабские знаки, огласовки и алфавит')}</h1>
          <p>{t('Набор правил и примеров помогает отличать знаки, влияющие на чтение слова, и быстро вспоминать базовые буквы.')}</p>
        </div>
      </div>

      <article className="panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">{t('Основы')}</span>
            <h2>{t('Арабский алфавит')}</h2>
          </div>
        </div>
        <div className="guide-grid">
          {arabicAlphabetGuide.map((entry) => (
            <article key={`${entry.letter}-${entry.nameRu}`} className="guide-card panel">
              <div className="guide-sign" lang="ar" dir="rtl">{entry.letter}</div>
              <div className="guide-copy">
                <span className="eyebrow">{t(entry.nameRu)}</span>
                <h2>{entry.letter}</h2>
                <p><strong>{t('Звук:')}</strong> {t(entry.pronunciation)}</p>
                <p><strong>{t('Транскрипция:')}</strong> {entry.transliteration}</p>
              </div>
            </article>
          ))}
        </div>
      </article>

      <ArabicAlphabetQuiz />

      <article className="panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">{t('Чтение')}</span>
            <h2>{t('Знаки и огласовки')}</h2>
          </div>
        </div>
        <div className="guide-grid">
          {arabicDiacriticsGuide.map((entry) => (
            <article key={`${entry.symbol}-${entry.nameRu}`} className="guide-card panel">
              <div className="guide-sign" lang="ar" dir="rtl">{entry.symbol}</div>
              <div className="guide-copy">
                <span className="eyebrow">{progress.translationLanguage === 'ky' ? entry.nameKy : entry.nameRu}</span>
                <h2>{progress.translationLanguage === 'ky' ? entry.nameKy : entry.nameRu}</h2>
                <p><strong>{t('Произношение:')}</strong> {t(entry.pronunciation)}</p>
                <p><strong>{t('Как влияет на чтение:')}</strong> {t(entry.effect)}</p>
                <p><strong>{t('Пример:')}</strong> <span className="arabic-inline" lang="ar" dir="rtl">{entry.example}</span></p>
                <p><strong>{t('Транскрипция:')}</strong> {entry.transliteration}</p>
                <p><strong>{t('Перевод:')}</strong> {t(entry.meaning)}</p>
              </div>
            </article>
          ))}
        </div>
      </article>
    </section>
  );
}

export function PracticePage() {
  const t = useInterfaceText();
  return (
    <section className="page-stack">
      <div className="page-heading">
        <div><span className="eyebrow">{t('Практика')}</span><h1>{t('Тренировка')}</h1><p>{t('Выберите способ повторения подтверждённого материала.')}</p></div>
      </div>
      <div className="practice-choice-grid">
        <Link className="practice-choice" to="/flashcards">
          <span className="quick-icon"><BookOpen size={20} /></span>
          <h2>{t('Карточки слов')}</h2><p>{t('Повторяйте написание и перевод по карточкам.')}</p>
          <span>{t('К карточкам')} <ArrowRight size={16} /></span>
        </Link>
        <Link className="practice-choice" to="/quiz">
          <span className="quick-icon"><Check size={20} /></span>
          <h2>{t('Тесты')}</h2><p>{t('Проверяйте ответы на основе проверенных материалов.')}</p>
          <span>{t('Выбрать тест')} <ArrowRight size={16} /></span>
        </Link>
      </div>
      <SourceNote />
    </section>
  );
}

export function QuizSetupPage() {
  const navigate = useNavigate();
  const t = useInterfaceText();
  const [searchParams] = useSearchParams();
  const initialLessonId = searchParams.get('lesson') ?? '';
  const [lessonId, setLessonId] = useState(initialLessonId);
  const [count, setCount] = useState(() => Math.min(
    10,
    courseCatalog.questions.filter((question) => !initialLessonId || question.lessonId === initialLessonId).length,
  ));
  const availableQuestions = courseCatalog.questions.filter((question) => !lessonId || question.lessonId === lessonId);
  const canStart = availableQuestions.length > 0 && Number.isInteger(count) && count > 0;

  if (courseCatalog.questions.length === 0) {
    return (
      <section className="page-stack">
        <div className="page-heading"><div><span className="eyebrow">{t('Практика')}</span><h1>{t('Выбрать тест')}</h1></div></div>
        <EmptyCourse
          title="Тесты пока не готовы"
          description="Тесты появятся после сверки слов с книгой. Каждый вопрос строится по подтверждённому написанию, переводу и странице источника."
        />
      </section>
    );
  }

  return (
    <section className="page-stack">
      <div className="page-heading"><div><span className="eyebrow">{t('Практика')}</span><h1>{t('Выбрать тест')}</h1><p>{t('Вопросы случайно перемешиваются и не повторяются в одной попытке.')}</p></div></div>
      <form className="panel quiz-setup" onSubmit={(event) => {
        event.preventDefault();
        if (canStart) navigate(`/quiz/session?count=${count}${lessonId ? `&lesson=${encodeURIComponent(lessonId)}` : ''}`);
      }}>
        <label className="form-field">
          <span>{t('Урок')}</span>
          <select value={lessonId} onChange={(event) => {
            const nextLessonId = event.currentTarget.value;
            const nextAvailableCount = courseCatalog.questions.filter(
              (question) => !nextLessonId || question.lessonId === nextLessonId,
            ).length;
            setLessonId(nextLessonId);
            setCount((currentCount) => Math.min(Math.max(currentCount, 1), nextAvailableCount));
          }}>
            <option value="">{t('Все доступные уроки')}</option>
            {courseCatalog.lessons.map((lesson) => <option value={lesson.id} key={lesson.id}>{t(lesson.title)}</option>)}
          </select>
        </label>
        <label className="form-field">
          <span>{t('Количество вопросов')}</span>
          <input type="number" min={1} max={availableQuestions.length} value={count} onChange={(event) => setCount(Number(event.currentTarget.value))} />
          <small>{t('Доступно в выбранном наборе:')} {availableQuestions.length}</small>
        </label>
        <button className="button button-primary" disabled={!canStart} type="submit">{t('Начать тест')} <ArrowRight size={17} /></button>
      </form>
    </section>
  );
}

export function QuizSessionPage() {
  const [searchParams] = useSearchParams();
  const { progress, updateProgress } = useProgress();
  const t = useInterfaceText();
  const lessonId = searchParams.get('lesson');
  const reviewMode = searchParams.get('mode') === 'review';
  const countParameter = Number(searchParams.get('count') ?? '10');
  const requested = Number.isInteger(countParameter) && countParameter > 0 ? countParameter : 10;
  const [questions, setQuestions] = useState(() =>
    createQuizRound(
      courseCatalog.questions.filter((question) =>
        (!lessonId || question.lessonId === lessonId) &&
        (!reviewMode || (progress.wrongAnswers[question.id] ?? 0) > 0),
      ),
      requested,
    ),
  );
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState<string | null>(null);
  const [answerIsCorrect, setAnswerIsCorrect] = useState<boolean | null>(null);
  const [answerError, setAnswerError] = useState<string | null>(null);
  const [typedAnswer, setTypedAnswer] = useState('');
  const answerInputRef = useRef<HTMLInputElement>(null);
  const submittedQuestionId = useRef<string | null>(null);
  const [score, setScore] = useState(0);
  const [complete, setComplete] = useState(false);
  const question = questions[questionIndex];
  const questionIsArabic = Boolean(question && /[\u0600-\u06ff]/u.test(question.prompt));
  const questionWord = question?.wordId
    ? courseCatalog.words.find((word) => word.id === question.wordId)
    : undefined;
  const questionPrompt = question?.type === 'text' && questionWord
    ? localizeTranslation(questionWord.translation, progress.translationLanguage)
    : question?.prompt ?? '';
  const questionTransliteration = question && questionIsArabic
    ? questionWord?.transliteration ??
      transliterateArabic(question.prompt)
    : '';
  const translatedAnswer = question?.type === 'choice'
    ? localizeTranslation(question.answer, progress.translationLanguage)
    : question?.answer ?? '';
  const answerTranslation = question?.type === 'text'
    ? questionPrompt
    : translatedAnswer;
  const choices = useMemo(
    () => question?.type === 'choice'
      ? shuffle(question.choices?.map((choice) => localizeTranslation(choice, progress.translationLanguage)) ?? [])
      : [],
    [progress.translationLanguage, question],
  );

  if (questions.length === 0) {
    return (
      <section className="page-stack">
        <div className="page-heading"><div><span className="eyebrow">Практика</span><h1>Тест</h1></div></div>
        <EmptyCourse title="Нет вопросов для этого набора" description="Выберите другой урок или дождитесь проверки источниковых материалов." />
      </section>
    );
  }

  function finishQuiz(finalScore: number) {
    const attempt: QuizAttempt = {
      id: createQuizAttemptId(),
      date: new Date().toISOString(),
      score: finalScore,
      total: questions.length,
      ...(lessonId ? { lessonId } : {}),
    };
    updateProgress((current) => addActiveDate({
      ...current,
      quizAttempts: [...current.quizAttempts, attempt].slice(-100),
    }));
    setComplete(true);
  }

  function chooseAnswer(option: string) {
    if (!question || answer !== null || submittedQuestionId.current === question?.id) return;
    if (question.type === 'text' && normalizeArabicAnswer(option).length === 0) {
      setAnswerError('Введите ответ, прежде чем отправлять его на проверку.');
      return;
    }

    submittedQuestionId.current = question.id;
    setAnswerError(null);
    try {
      const correct = question.type === 'text'
        ? isArabicAnswerCorrect(option, question.acceptedAnswers ?? [question.answer])
        : option === localizeTranslation(question.answer, progress.translationLanguage);
      if (!correct) {
        updateProgress((current) => ({
          ...current,
          wrongAnswers: {
            ...current.wrongAnswers,
            [question.id]: (current.wrongAnswers[question.id] ?? 0) + 1,
          },
          ...(question.wordId ? {
            difficultWordIds: [...new Set([...current.difficultWordIds, question.wordId])],
          } : {}),
        }));
      }
      setAnswer(option);
      setAnswerIsCorrect(correct);
      if (correct) setScore((currentScore) => currentScore + 1);
    } catch (error) {
      submittedQuestionId.current = null;
      if (import.meta.env.DEV) console.error('Не удалось проверить ответ теста:', error);
      setAnswerError('Не удалось проверить ответ. Ваш ввод сохранён — попробуйте ещё раз.');
    }
  }

  function advanceQuestion() {
    if (!question || answer === null || submittedQuestionId.current !== question.id) return;
    setAnswerError(null);
    if (questionIndex + 1 >= questions.length) {
      try {
        finishQuiz(score);
        submittedQuestionId.current = null;
      } catch (error) {
        if (import.meta.env.DEV) console.error('Не удалось завершить тест:', error);
        setAnswerError('Не удалось сохранить результат теста. Нажмите «Завершить» ещё раз.');
      }
      return;
    }

    submittedQuestionId.current = null;
    setQuestionIndex((index) => index + 1);
    setAnswer(null);
    setAnswerIsCorrect(null);
    setTypedAnswer('');
  }

  function restartQuiz() {
    const freshQuestions = courseCatalog.questions.filter((candidate) =>
      (!lessonId || candidate.lessonId === lessonId) &&
      (!reviewMode || (progress.wrongAnswers[candidate.id] ?? 0) > 0),
    );
    setQuestions(createQuizRound(freshQuestions, requested));
    submittedQuestionId.current = null;
    setQuestionIndex(0);
    setAnswer(null);
    setAnswerIsCorrect(null);
    setAnswerError(null);
    setTypedAnswer('');
    setScore(0);
    setComplete(false);
  }

  function insertArabicKey(symbol: string) {
    const input = answerInputRef.current;
    const start = input?.selectionStart ?? typedAnswer.length;
    const end = input?.selectionEnd ?? start;
    const next = `${typedAnswer.slice(0, start)}${symbol}${typedAnswer.slice(end)}`;
    setTypedAnswer(next);
    requestAnimationFrame(() => {
      input?.focus();
      input?.setSelectionRange(start + symbol.length, start + symbol.length);
    });
  }

  if (complete) {
    const percent = Math.round((score / questions.length) * 100);
    return (
      <section className="panel quiz-result">
        <span className="eyebrow">{t('Результат теста')}</span>
        <h1>{score} / {questions.length}</h1>
        <p>{percent}% {t('правильных ответов. Результат сохранён на этом устройстве.')}</p>
        <div className="result-actions">
          <button className="button button-primary" type="button" onClick={restartQuiz}><RotateCcw size={17} /> {t('Пройти ещё раз')}</button>
          <Link className="button button-soft" to="/progress">{t('Мой прогресс')} <ArrowRight size={17} /></Link>
        </div>
      </section>
    );
  }

  if (!question) {
    return (
      <section className="page-stack">
        <EmptyCourse title="Вопрос не найден" description="Попробуйте запустить тест заново — текущий прогресс не будет потерян." />
        <Link className="button button-primary" to="/quiz">{t('К выбору теста')}</Link>
      </section>
    );
  }
  return (
    <section className="page-stack" aria-labelledby="quiz-prompt">
      <Link className="back-link" to="/quiz"><ArrowLeft size={17} /> {t('К выбору теста')}</Link>
      <div className="quiz-progress-line">
        <span>{t('Вопрос')} {questionIndex + 1} / {questions.length}</span>
        <strong>{score} {t('верно')}</strong>
      </div>
      <div className="progress-track"><span style={{ width: `${(questionIndex / questions.length) * 100}%` }} /></div>
      <article className="panel quiz-card">
        <span className="eyebrow">{t('Источник: страница')} {question.sourcePage}</span>
        <h1 id="quiz-prompt" dir="auto">{questionPrompt}</h1>
        {questionTransliteration && (
          <p className="quiz-transliteration" lang="ru" dir="ltr">
            <strong>{t('Транскрипция:')}</strong> {questionTransliteration}
          </p>
        )}
        {question.type === 'choice' ? (
          <div className="quiz-options">
            {choices.map((choice) => (
              <button
                className={`quiz-option${answer === choice ? (answerIsCorrect ? ' is-correct' : ' is-wrong') : ''}${answer !== null && choice === translatedAnswer ? ' reveal-correct' : ''}`}
                key={choice}
                type="button"
                disabled={answer !== null}
                onClick={() => chooseAnswer(choice)}
                dir={/[\u0600-\u06ff]/u.test(choice) ? 'rtl' : 'auto'}
              >
                {choice}
              </button>
            ))}
          </div>
        ) : (
          <form className="typed-answer-form" onSubmit={(event) => {
            event.preventDefault();
            chooseAnswer(typedAnswer);
          }}>
            <label className="sr-only" htmlFor="arabic-answer">{t('Введите ответ по-арабски')}</label>
            <input
              id="arabic-answer"
              ref={answerInputRef}
              className="arabic-answer-input"
              value={typedAnswer}
              disabled={answer !== null}
              onChange={(event) => {
                setTypedAnswer(event.currentTarget.value);
                setAnswerError(null);
              }}
              lang="ar"
              dir="rtl"
              autoComplete="off"
              spellCheck={false}
              placeholder="اكتب الإجابة"
            />
            <div className="arabic-keyboard" aria-label={t('Экранная арабская клавиатура')}>
              {arabicKeyboard.map((symbol) => (
                <button key={symbol} type="button" disabled={answer !== null} onClick={() => insertArabicKey(symbol)} lang="ar" dir="rtl">
                  {symbol}
                </button>
              ))}
              <button type="button" disabled={answer !== null} onClick={() => setTypedAnswer((value) => value.slice(0, -1))} aria-label={t('Удалить последний символ')}>⌫</button>
            </div>
            <button className="button button-primary" type="submit" disabled={answer !== null}>
              {t('Готово')}
            </button>
          </form>
        )}
        {answerError && (
          <div className="answer-feedback feedback-wrong" role="alert">
            <strong>{t('Не удалось продолжить')}</strong>
            <span>{t(answerError)}</span>
            {answer === null && normalizeArabicAnswer(typedAnswer).length > 0 && (
              <button className="button button-soft" type="button" onClick={() => chooseAnswer(typedAnswer)}>
                {t('Повторить проверку')}
              </button>
            )}
          </div>
        )}
        {answer !== null && (
          <div className={`answer-feedback ${answerIsCorrect ? 'feedback-correct' : 'feedback-wrong'}`} role="status">
            <strong>{t(answerIsCorrect ? 'Правильно!' : 'Неправильно')}</strong>
            {answerIsCorrect ? (
              <>
                <span>{t(question.explanation ?? 'Вы ответили верно.')}</span>
                {question.type === 'text' && (
                  <div className="answer-details">
                    <p><strong>{t('Ответ:')}</strong> <span className="answer-value answer-value-arabic" lang="ar" dir="rtl">{question.answer}</span></p>
                    <p><strong>{t('Транскрипция:')}</strong> <span className="answer-value" lang="ru" dir="ltr">{courseCatalog.words.find((word) => word.id === question.wordId)?.transliteration ?? transliterateArabic(question.answer)}</span></p>
                  </div>
                )}
              </>
            ) : (
              <div className="answer-details">
                <p><strong>{t('Ваш ответ:')}</strong> <span className="answer-value">{answer}</span></p>
                <p><strong>{t('Правильный ответ:')}</strong> <span className={`answer-value${question.type === 'text' ? ' answer-value-arabic' : ''}`} lang={question.type === 'text' ? 'ar' : undefined} dir={question.type === 'text' ? 'rtl' : 'auto'}>{translatedAnswer}</span></p>
                {question.type === 'text' && (
                  <p><strong>{t('Транскрипция:')}</strong> <span className="answer-value" lang="ru" dir="ltr">{courseCatalog.words.find((word) => word.id === question.wordId)?.transliteration ?? transliterateArabic(question.answer)}</span></p>
                )}
                <p><strong>{t('Перевод:')}</strong> <span className="answer-value">{answerTranslation}</span></p>
                {question.explanation && <p><strong>{t('Объяснение:')}</strong> <span className="answer-value">{t(question.explanation)}</span></p>}
              </div>
            )}
            <button className="button button-primary" type="button" onClick={advanceQuestion}>
              {t(questionIndex + 1 === questions.length ? 'Завершить' : 'Следующий вопрос')} <ArrowRight size={17} />
            </button>
          </div>
        )}
      </article>
    </section>
  );
}

export function ProgressPage() {
  const { progress } = useProgress();
  const t = useInterfaceText();
  const verifiedLearned = progress.learnedWordIds.filter((id) => courseCatalog.words.some((word) => word.id === id)).length;
  const average = progress.quizAttempts.length === 0
    ? 0
    : Math.round(progress.quizAttempts.reduce((sum, attempt) => sum + attempt.score / attempt.total, 0) / progress.quizAttempts.length * 100);
  return (
    <section className="page-stack">
      <div className="page-heading"><div><span className="eyebrow">{t('Ваша статистика')}</span><h1>{t('Прогресс')}</h1><p>{t('Здесь только действия, записанные приложением.')}</p></div></div>
      <div className="stat-grid progress-stat-grid">
        <article className="stat-card"><span className="stat-label">{t('Учебных дней')}</span><strong>{progress.activeDates.length}</strong></article>
        <article className="stat-card"><span className="stat-label">{t('Тестов пройдено')}</span><strong>{progress.quizAttempts.length}</strong></article>
        <article className="stat-card"><span className="stat-label">{t('Средний результат')}</span><strong>{average}<small>%</small></strong></article>
        <article className="stat-card"><span className="stat-label">{t('Слов изучено')}</span><strong>{verifiedLearned}</strong></article>
      </div>
      <article className="panel history-panel">
        <h2>{t('История тестов')}</h2>
        {progress.quizAttempts.length === 0 ? (
          <p className="empty-inline">{t('Пройденных тестов пока нет.')}</p>
        ) : (
          <ol className="attempt-list">
            {[...progress.quizAttempts].reverse().map((attempt) => (
              <li key={attempt.id}>
                <span>{formatInterfaceDate(new Date(attempt.date), progress.translationLanguage)}</span>
                <strong>{attempt.score} / {attempt.total}</strong>
                <span>{Math.round(attempt.score / attempt.total * 100)}%</span>
              </li>
            ))}
          </ol>
        )}
      </article>
      <article className="panel history-panel">
        <h2>{t('Последнее чтение')}</h2>
        <p className="empty-inline">{t('Страница')} {progress.lastReadPage} · <Link to={`/book/${progress.lastReadPage}`}>{t('вернуться к книге')} <ArrowRight size={15} /></Link></p>
      </article>
    </section>
  );
}

export function SettingsPage() {
  const { progress, updateProgress } = useProgress();
  const t = useInterfaceText();
  return (
    <section className="page-stack">
      <div className="page-heading"><div><span className="eyebrow">{t('Приложение')}</span><h1>{t('Настройки')}</h1><p>{t('Настройки и прогресс сохраняются в локальном хранилище браузера.')}</p></div></div>
      <div className="panel settings-panel">
        <div className="settings-row">
          <span><strong>{t('Тема оформления')}</strong><small>{t('Переключить светлую или тёмную тему')}</small></span>
          <button className="button button-soft" type="button" onClick={() => updateProgress((current) => ({ ...current, theme: current.theme === 'light' ? 'dark' : 'light' }))}>
            {progress.theme === 'light' ? <Sun size={17} /> : <Moon size={17} />}
            {t(progress.theme === 'light' ? 'Светлая' : 'Тёмная')}
          </button>
        </div>
        <label className="settings-row">
          <span><strong>{t('Язык интерфейса и перевода')}</strong><small>{t('Кыргызский — дополнительный перевод, не текст из книги')}</small></span>
          <select
            value={progress.translationLanguage}
            onChange={(event) => {
              const language = event.currentTarget.value;
              if (language === 'ru' || language === 'ky') {
                updateProgress((current) => ({ ...current, translationLanguage: language }));
              }
            }}
          >
            <option value="ru">{t('Русский')}</option>
            <option value="ky">{t('Кыргызча')}</option>
          </select>
        </label>
        <label className="settings-row">
          <span><strong>{t('Дневная цель')}</strong><small>{t('Планируемое количество слов')}</small></span>
          <input className="goal-input" type="number" min={1} max={500} value={progress.dailyGoal} onChange={(event) => {
            const goal = Number(event.currentTarget.value);
            if (Number.isInteger(goal) && goal >= 1 && goal <= 500) {
              updateProgress((current) => ({ ...current, dailyGoal: goal }));
            }
          }} />
        </label>
        <div className="settings-row">
          <span><strong>{t('Данные курса')}</strong><small>{t('Материалы не отправляются на сервер')}</small></span>
          <span className="settings-local">{t('Только на этом устройстве')}</span>
        </div>
      </div>
    </section>
  );
}
