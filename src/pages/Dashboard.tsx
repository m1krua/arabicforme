import { ArrowRight, BookOpen, Flame, Layers3, RotateCcw, Sparkles, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import { courseCatalog } from '../data/course';
import { getStudyStreak } from '../lib/progress';
import { useProgress } from '../state/useProgress';

function localDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function Dashboard() {
  const { progress } = useProgress();
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
          <span className="eyebrow">Добро пожаловать</span>
          <h1>Арабский — шаг за шагом</h1>
          <p>Читайте оригинал, а подтверждённые слова и уроки добавляйте в свою практику.</p>
          <div className="welcome-actions">
            <Link className="button button-primary" to="/book">
              <BookOpen size={18} aria-hidden="true" />
              {progress.lastReadPage > 1 ? `Продолжить: стр. ${progress.lastReadPage}` : 'Читать книгу'}
            </Link>
            <Link className="button button-soft" to="/lessons">
              Все уроки <ArrowRight size={17} aria-hidden="true" />
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

      <section aria-label="Ваши показатели" className="stat-grid">
        <article className="stat-card">
          <span className="stat-icon icon-green"><BookOpen size={19} /></span>
          <span className="stat-label">Уроки пройдены</span>
          <strong>{completedLessons}<small> / {courseCatalog.lessons.length}</small></strong>
          <span className="stat-footnote">по проверенному каталогу</span>
        </article>
        <article className="stat-card">
          <span className="stat-icon icon-sand"><Layers3 size={19} /></span>
          <span className="stat-label">Слова изучены</span>
          <strong>{progress.learnedWordIds.filter((id) =>
            courseCatalog.words.some((word) => word.id === id),
          ).length}</strong>
          <span className="stat-footnote">только после вашей отметки</span>
        </article>
        <article className="stat-card">
          <span className="stat-icon icon-pink"><Flame size={19} /></span>
          <span className="stat-label">Серия занятий</span>
          <strong>{streak}<small> {streak === 1 ? 'день' : 'дней'}</small></strong>
          <span className="stat-footnote">по дням реальной активности</span>
        </article>
        <article className="stat-card">
          <span className="stat-icon icon-blue"><Target size={19} /></span>
          <span className="stat-label">Цель на день</span>
          <strong>{progress.dailyGoal}<small> слов</small></strong>
          <span className="stat-footnote">{studiedToday ? 'занятие сегодня записано' : 'отметка появится после занятия'}</span>
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="panel activity-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Ритм обучения</span>
              <h2>Активность за неделю</h2>
            </div>
            <span className="small-muted">{streak > 0 ? `${streak} дн. подряд` : 'Начните с чтения'}</span>
          </div>
          <div className="week-row" aria-label="Активность за последние семь дней">
            {week.map(({ date, active }) => (
              <div className="week-day" key={localDate(date)}>
                <span>{new Intl.DateTimeFormat('ru', { weekday: 'short' }).format(date)}</span>
                <span className={`day-dot${active ? ' day-dot-active' : ''}`} aria-label={active ? 'Было занятие' : 'Занятия не было'} />
                <small>{date.getDate()}</small>
              </div>
            ))}
          </div>
          <div className="progress-track" role="progressbar" aria-label="Прохождение курса" aria-valuenow={courseCompletion} aria-valuemin={0} aria-valuemax={100}>
            <span style={{ width: `${courseCompletion}%` }} />
          </div>
          <div className="progress-caption">
            <span>Пройдено курса</span><strong>{courseCompletion}%</strong>
          </div>
        </article>

        <article className="panel quick-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Быстрый доступ</span>
              <h2>Продолжить</h2>
            </div>
          </div>
          <Link className="quick-link" to="/flashcards">
            <span className="quick-icon"><Layers3 size={19} /></span>
            <span><strong>Карточки слов</strong><small>Проверенные слова из уроков</small></span>
            <ArrowRight size={17} />
          </Link>
          <Link className="quick-link" to="/quiz">
            <span className="quick-icon"><Target size={19} /></span>
            <span><strong>Пройти тест</strong><small>Вопросы с источником в книге</small></span>
            <ArrowRight size={17} />
          </Link>
          <Link className="quick-link" to="/review">
            <span className="quick-icon"><RotateCcw size={19} /></span>
            <span><strong>Повторить ошибки</strong><small>{progress.difficultWordIds.length} слов отмечено для повтора</small></span>
            <ArrowRight size={17} />
          </Link>
        </article>
      </section>

      <section className="source-banner">
        <div>
          <span className="eyebrow">Материалы курса</span>
          <h2>{courseCatalog.lessons.length === 0 ? 'Проверенные уроки пока не добавлены' : 'Продолжайте свой курс'}</h2>
          <p>
            Исходная книга — скан без текстового слоя. Чтобы не искажать арабский текст,
            уроки и переводы появятся здесь только после сверки с печатными страницами.
          </p>
        </div>
        {latestAttempt && (
          <div className="last-attempt">
            <strong>Последний тест</strong>
            <span>{latestAttempt.score} из {latestAttempt.total}</span>
          </div>
        )}
        <Link className="button button-quiet" to="/lessons">Каталог уроков <ArrowRight size={17} /></Link>
      </section>
    </div>
  );
}
