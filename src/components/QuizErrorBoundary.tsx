import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { localizeInterface } from '../data/interface';
import { useProgress } from '../state/useProgress';

interface QuizErrorBoundaryProps {
  children: ReactNode;
  language: 'ru' | 'ky';
}

interface QuizErrorBoundaryState {
  hasError: boolean;
}

class QuizErrorBoundaryInner extends Component<QuizErrorBoundaryProps, QuizErrorBoundaryState> {
  state: QuizErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): QuizErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('Ошибка отображения теста:', error, info.componentStack);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <section className="panel quiz-error" role="alert">
          <span className="eyebrow">{localizeInterface('Тест приостановлен', this.props.language)}</span>
          <h1>{localizeInterface('Не удалось показать этот вопрос', this.props.language)}</h1>
          <p>{localizeInterface('Учебный прогресс сохраняется по мере прохождения теста. Повторите отображение или вернитесь к выбору тестов.', this.props.language)}</p>
          <div className="result-actions">
            <button className="button button-primary" type="button" onClick={() => this.setState({ hasError: false })}>
              {localizeInterface('Повторить', this.props.language)}
            </button>
            <Link className="button button-soft" to="/quiz">{localizeInterface('К выбору теста', this.props.language)}</Link>
          </div>
        </section>
      );
    }

    return this.props.children;
  }
}

export function QuizErrorBoundary({ children }: { children: ReactNode }) {
  const { progress } = useProgress();
  return <QuizErrorBoundaryInner language={progress.translationLanguage}>{children}</QuizErrorBoundaryInner>;
}
