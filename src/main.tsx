import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

// Ensure localStorage is safe even in restricted iframes, private browsing, or blocked cookies
try {
  const testKey = '__test_storage__';
  window.localStorage.setItem(testKey, '1');
  window.localStorage.removeItem(testKey);
} catch {
  const memoryStore: Record<string, string> = {};
  const mockStorage = {
    getItem: (key: string) => (key in memoryStore ? memoryStore[key] : null),
    setItem: (key: string, value: string) => { memoryStore[key] = String(value); },
    removeItem: (key: string) => { delete memoryStore[key]; },
    clear: () => { for (const k in memoryStore) delete memoryStore[k]; },
    key: (index: number) => Object.keys(memoryStore)[index] || null,
    get length() { return Object.keys(memoryStore).length; }
  };
  try {
    Object.defineProperty(window, 'localStorage', {
      value: mockStorage,
      writable: true,
      configurable: true
    });
  } catch {}
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );
}
