import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { ProgressProvider } from './state/ProgressProvider';
import './styles.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Корневой элемент приложения не найден.');

createRoot(rootElement).render(
  <StrictMode>
    <ProgressProvider>
      <App />
    </ProgressProvider>
  </StrictMode>,
);
