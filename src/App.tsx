import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { Dashboard } from './pages/Dashboard';
import {
  FlashcardsPage,
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
  return (
    <Suspense fallback={<div className="notice notice-info" role="status">Подготавливаем просмотрщик PDF…</div>}>
      <PdfReader />
    </Suspense>
  );
}

function NotFoundPage() {
  return (
    <section className="panel not-found">
      <span className="eyebrow">404</span>
      <h1>Страница не найдена</h1>
      <p>Возможно, адрес устарел или был введён с ошибкой.</p>
      <a className="button button-primary" href="/">На главную</a>
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
          <Route path="quiz/session" element={<QuizSessionPage />} />
          <Route path="review" element={<ReviewPage />} />
          <Route path="progress" element={<ProgressPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
