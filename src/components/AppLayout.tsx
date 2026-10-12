import { useEffect } from 'react';
import {
  Activity,
  BookOpen,
  BookText,
  Brain,
  ChartNoAxesCombined,
  CircleHelp,
  House,
  Layers3,
  RotateCcw,
  Settings2,
  Sparkles,
} from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { useProgress } from '../state/useProgress';
import { localizeInterface } from '../data/interface';

const navigation = [
  { to: '/', label: 'Главная', icon: House, end: true },
  { to: '/book', label: 'Книга', icon: BookOpen },
  { to: '/lessons', label: 'Уроки', icon: BookText },
  { to: '/flashcards', label: 'Карточки', icon: Layers3 },
  { to: '/practice', label: 'Тренировка', icon: Brain },
  { to: '/quiz', label: 'Тесты', icon: CircleHelp },
  { to: '/review', label: 'Повторение', icon: RotateCcw },
  { to: '/harakat', label: 'Справочник', icon: CircleHelp },
  { to: '/progress', label: 'Прогресс', icon: ChartNoAxesCombined },
  { to: '/settings', label: 'Настройки', icon: Settings2 },
];

export function AppLayout() {
  const { progress, storageError } = useProgress();
  const t = (text: string) => localizeInterface(text, progress.translationLanguage);

  useEffect(() => {
    document.documentElement.dataset.theme = progress.theme;
    document.documentElement.lang = progress.translationLanguage;
  }, [progress.theme, progress.translationLanguage]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <NavLink className="brand-lockup" to="/" aria-label={t('На главную')}>
          <span className="brand-mark"><Sparkles size={19} aria-hidden="true" /></span>
          <span>
            <strong>Мия</strong>
            <small>{t('арабский по книге')}</small>
          </span>
        </NavLink>
        <div className="sidebar-caption">{t('ОБУЧЕНИЕ')}</div>
        <nav className="side-nav" aria-label={t('Основная навигация')}>
          {navigation.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              {...(end ? { end: true } : {})}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
              <span>{t(label)}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footnote">
          <span className="sidebar-dot" />
          <span>{t('Ваш прогресс хранится на устройстве')}</span>
        </div>
      </aside>

      <div className="main-column">
        <header className="topbar">
          <div className="topbar-mobile-brand">
            <span className="brand-mark"><Sparkles size={18} aria-hidden="true" /></span>
            <strong>Мия</strong>
          </div>
          <span className="topbar-note"><Activity size={16} aria-hidden="true" /> {t('Учитесь в своём ритме')}</span>
          <NavLink className="topbar-book-link" to="/book">
            <BookOpen size={17} aria-hidden="true" />
            <span>{t('Продолжить чтение')}</span>
            {progress.lastReadPage > 1 && <small>{progress.translationLanguage === 'ky' ? 'бет' : 'стр.'} {progress.lastReadPage}</small>}
          </NavLink>
        </header>
        <main className="content">
          {storageError && (
            <div className="notice notice-error storage-notice" role="alert">
              {t('Не удалось сохранить прогресс. Проверьте настройки хранилища браузера:')} {storageError}
            </div>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
