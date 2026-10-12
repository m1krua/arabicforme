import { ArrowRight, BookOpen, Flame, Layers3, RotateCcw, Sparkles, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import { courseCatalog } from '../data/course';
import { getStudyStreak } from '../lib/progress';
import { useProgress } from '../state/useProgress';
import { formatWeekday, localizeInterface } from '../data/interface';

function localDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function Dashboard() {
  const { progress } = useProgress();
  const t = (text: string) => localizeInterface(text, progress.translationLanguage);
  const completedLessons = progress.completedLessonIds.filter((id) =>
    courseCatalog.lessons.some((lesson) => lesson.id === id),
  ).length;
  const courseCompletion = courseCatalog.lessons.length === 0
    ? 0
    : Math.round((completedLessons / courseCatalog.lessons.length) * 100);
  const today = localDate(new Date());
  const studiedToday = progress.activeDates.includes(today);
  const streak = getStudyStreak(progress.activeDates);
  const week = Array.from({ length: 7 }, (_, offset) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - offset));
    return { date, active: progress.activeDates.includes(localDate(date)) };
  });
  const latestAttempt = progress.quizAttempts.at(-1);

  return (
    <div className="page-stack">
      <section className="welcome-banner">
        <div className="welcome-copy">
          <span className="eyebrow">{t('Добро пожаловать')}</span>
          <h1>{t('Арабский — шаг за шагом')}</h1>
          <p>{t('Читайте оригинал, а подтверждённые слова и уроки добавляйте в свою практику.')}</p>
          <div className="welcome-actions">
            <Link className="button button-primary" to="/book">
              <BookOpen size={18} aria-hidden="true" />
              {progress.lastReadPage > 1 ? `${t('Продолжить чтение')}: ${t('Страница')} ${progress.lastReadPage}` : t('Читать книгу')}
            </Link>
            <Link className="button button-soft" to="/lessons">
              {t('Все уроки')} <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
        </div>
        <div className="welcome-ornament" aria-hidden="true">
          <span className="ornament-ring ring-one" />
          <span className="ornament-ring ring-two" />
          <span className="ornament-star"><Sparkles size={80} strokeWidth={0.8} /></span>
          <span className="ornament-dot" />
        </div>
      </section>

      <section aria-label={t('Ваши показатели')} className="stat-grid">
        <article className="stat-card">
          <span className="stat-icon icon-green"><BookOpen size={19} /></span>
          <span className="stat-label">{t('Уроки пройдены')}</span>
          <strong>{completedLessons}<small> / {courseCatalog.lessons.length}</small></strong>
          <span className="stat-footnote">{t('по проверенному каталогу')}</span>
        </article>
        <article className="stat-card">
          <span className="stat-icon icon-sand"><Layers3 size={19} /></span>
          <span className="stat-label">{t('Слова изучены')}</span>
          <strong>{progress.learnedWordIds.filter((id) =>
            courseCatalog.words.some((word) => word.id === id),
          ).length}</strong>
          <span className="stat-footnote">{t('только после вашей отметки')}</span>
        </article>
        <article className="stat-card">
          <span className="stat-icon icon-pink"><Flame size={19} /></span>
          <span className="stat-label">{t('Серия занятий')}</span>
          <strong>{streak}<small> {t(streak === 1 ? 'день' : 'дней')}</small></strong>
          <span className="stat-footnote">{t('по дням реальной активности')}</span>
        </article>
        <article className="stat-card">
          <span className="stat-icon icon-blue"><Target size={19} /></span>
          <span className="stat-label">{t('Цель на день')}</span>
          <strong>{progress.dailyGoal}<small> {t('слов')}</small></strong>
          <span className="stat-footnote">{t(studiedToday ? 'занятие сегодня записано' : 'отметка появится после занятия')}</span>
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="panel activity-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">{t('Ритм обучения')}</span>
              <h2>{t('Активность за неделю')}</h2>
            </div>
            <span className="small-muted">{streak > 0 ? `${streak} ${t('дн. подряд')}` : t('Начните с чтения')}</span>
          </div>
          <div className="week-row" aria-label={t('Активность за последние семь дней')}>
            {week.map(({ date, active }) => (
              <div className="week-day" key={localDate(date)}>
                <span>{formatWeekday(date, progress.translationLanguage)}</span>
                <span className={`day-dot${active ? ' day-dot-active' : ''}`} aria-label={t(active ? 'Было занятие' : 'Занятия не было')} />
                <small>{date.getDate()}</small>
              </div>
            ))}
          </div>
          <div className="progress-track" role="progressbar" aria-label={t('Прохождение курса')} aria-valuenow={courseCompletion} aria-valuemin={0} aria-valuemax={100}>
            <span style={{ width: `${courseCompletion}%` }} />
          </div>
          <div className="progress-caption">
            <span>{t('Пройдено курса')}</span><strong>{courseCompletion}%</strong>
          </div>
        </article>

        <article className="panel quick-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">{t('Быстрый доступ')}</span>
              <h2>{t('Продолжить')}</h2>
            </div>
          </div>
          <Link className="quick-link" to="/flashcards">
            <span className="quick-icon"><Layers3 size={19} /></span>
            <span><strong>{t('Карточки слов')}</strong><small>{t('Проверенные слова из уроков')}</small></span>
            <ArrowRight size={17} />
          </Link>
          <Link className="quick-link" to="/quiz">
            <span className="quick-icon"><Target size={19} /></span>
            <span><strong>{t('Пройти тест')}</strong><small>{t('Вопросы с источником в книге')}</small></span>
            <ArrowRight size={17} />
          </Link>
          <Link className="quick-link" to="/review">
            <span className="quick-icon"><RotateCcw size={19} /></span>
            <span><strong>{t('Повторить ошибки')}</strong><small>{progress.difficultWordIds.length} {t('слов отмечено для повтора')}</small></span>
            <ArrowRight size={17} />
          </Link>
        </article>
      </section>

      <section className="source-banner">
        <div>
          <span className="eyebrow">{t('Материалы курса')}</span>
          <h2>{t(courseCatalog.lessons.length === 0 ? 'Проверенные уроки пока не добавлены' : 'Продолжайте свой курс')}</h2>
          <p>
            {t('Исходная книга — скан без текстового слоя. Чтобы не искажать арабский текст, уроки и переводы появятся здесь только после сверки с печатными страницами.')}
          </p>
        </div>
        {latestAttempt && (
          <div className="last-attempt">
            <strong>{t('Последний тест')}</strong>
            <span>{latestAttempt.score} / {latestAttempt.total}</span>
          </div>
        )}
        <Link className="button button-quiet" to="/lessons">{t('Каталог уроков')} <ArrowRight size={17} /></Link>
      </section>
    </div>
  );
}
