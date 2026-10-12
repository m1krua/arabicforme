import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { QuizErrorBoundary } from './components/QuizErrorBoundary';
import { Dashboard } from './pages/Dashboard';
import { useProgress } from './state/useProgress';
import { localizeInterface } from './data/interface';
import { useInterfaceText } from './state/useInterfaceText';
import {
  FlashcardsPage,
  HarakatReferencePage,
  LessonDetailPage,
  LessonsPage,
  PracticePage,
  ProgressPage,
  QuizSessionPage,
  QuizSetupPage,
  ReviewPage,
  SettingsPage,
} from './pages/LearningPages';

const PdfReader = lazy(() =>
  import('./components/PdfReader').then((module) => ({ default: module.PdfReader })),
);

function PdfReaderRoute() {
  const t = useInterfaceText();
  return (
    <Suspense fallback={<div className="notice notice-info" role="status">{t('Подготавливаем просмотрщик PDF…')}</div>}>
      <PdfReader />
    </Suspense>
  );
}

function NotFoundPage() {
  const { progress } = useProgress();
  const t = (text: string) => localizeInterface(text, progress.translationLanguage);
  return (
    <section className="panel not-found">
      <span className="eyebrow">404</span>
      <h1>{t('Страница не найдена')}</h1>
      <p>{t('Возможно, адрес устарел или был введён с ошибкой.')}</p>
      <a className="button button-primary" href="/">{t('На главную')}</a>
    </section>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="book" element={<PdfReaderRoute />} />
          <Route path="book/:page" element={<PdfReaderRoute />} />
          <Route path="lessons" element={<LessonsPage />} />
          <Route path="lessons/:lessonId" element={<LessonDetailPage />} />
          <Route path="flashcards" element={<FlashcardsPage />} />
          <Route path="practice" element={<PracticePage />} />
          <Route path="quiz" element={<QuizSetupPage />} />
          <Route path="quiz/session" element={<QuizErrorBoundary><QuizSessionPage /></QuizErrorBoundary>} />
          <Route path="review" element={<ReviewPage />} />
          <Route path="harakat" element={<HarakatReferencePage />} />
          <Route path="progress" element={<ProgressPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
