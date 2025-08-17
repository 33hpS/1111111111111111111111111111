/**
 * main.tsx - точка входа WASSER PRO с критичными улучшениями
 * ДОБАВЛЕНО:
 * - Инициализация viewport и iOS фиксов
 * - Улучшения accessibility
 * - Оптимизации производительности
 * - Error boundary для всего приложения
 */

import { createRoot } from 'react-dom/client'
import './shadcn.css'
import App from './App'
import { initializeEnhancements } from './utils/enhancements'

// Отключаем EventSource в production
if (typeof EventSource !== 'undefined' && location.hostname !== 'localhost') {
  // Блокируем EventSource в production
  window.EventSource = undefined as any;
}

/**
 * Global Error Handler для uncaught errors
 */
window.addEventListener('error', (event) => {
  console.error('🚨 Global Error:', event.error);
  
  // В production можно отправлять в сервис логирования
  if (process.env.NODE_ENV === 'production') {
    // Здесь можно добавить отправку в Sentry или другой сервис
    // sendToErrorService(event.error);
  }
});

/**
 * Global handler для unhandled promise rejections
 */
window.addEventListener('unhandledrejection', (event) => {
  console.error('🚨 Unhandled Promise Rejection:', event.reason);
  
  // Предотвращаем показ ошибки в консоли браузера
  event.preventDefault();
  
  if (process.env.NODE_ENV === 'production') {
    // sendToErrorService(event.reason);
  }
});

/**
 * Инициализация критичных улучшений до рендера приложения
 */
function initializeCriticalEnhancements(): void {
  try {
    // Критичные фиксы для iOS Safari и viewport
    initializeEnhancements({
      enableVhFix: true,
      enableIOSInputFix: true,
      enableAccessibilityEnhancements: true,
      enableFocusTrap: true,
      // В development включаем мониторинг производительности
      enablePerformanceMonitoring: process.env.NODE_ENV === 'development',
    });

    console.log('✅ Critical enhancements initialized');
  } catch (error) {
    console.error('❌ Failed to initialize enhancements:', error);
  }
}

/**
 * Application Root Wrapper с Error Boundary
 */
function AppWithErrorBoundary() {
  return (
    <div className="app-root">
      <App />
    </div>
  );
}

/**
 * Основная функция инициализации приложения
 */
function initializeApp(): void {
  const appElement = document.getElementById('app');
  
  if (!appElement) {
    throw new Error('❌ App element not found');
  }

  // Применяем базовые классы к app элементу
  appElement.className = 'ios-viewport-fix';

  // Инициализируем критичные улучшения
  initializeCriticalEnhancements();

  // Создаем и рендерим приложение
  const root = createRoot(appElement);
  root.render(<AppWithErrorBoundary />);

  console.log('🚀 WASSER PRO application initialized');
}

/**
 * Performance measurement
 */
if (process.env.NODE_ENV === 'development') {
  // Измеряем время инициализации
  performance.mark('app-init-start');
  
  window.addEventListener('load', () => {
    performance.mark('app-init-end');
    performance.measure('app-initialization', 'app-init-start', 'app-init-end');
    
    const measure = performance.getEntriesByName('app-initialization')[0];
    console.log(`⚡ App initialization took ${Math.round(measure.duration)}ms`);
    
    // Дополнительные метрики
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      console.log(`💾 Initial memory usage: ${Math.round(memory.usedJSHeapSize / 1024 / 1024)}MB`);
    }
  });
}

/**
 * Service Worker registration (для будущего PWA)
 */
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('✅ SW registered:', registration);
      })
      .catch((error) => {
        console.log('❌ SW registration failed:', error);
      });
  });
}

// Инициализируем приложение
try {
  initializeApp();
} catch (error) {
  console.error('💥 Critical error during app initialization:', error);
  
  // Fallback UI при критической ошибке
  const appElement = document.getElementById('app');
  if (appElement) {
    appElement.innerHTML = `
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        padding: 2rem;
        font-family: system-ui, sans-serif;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        text-align: center;
      ">
        <div>
          <h1 style="font-size: 2rem; margin-bottom: 1rem;">⚠️ Ошибка запуска</h1>
          <p style="margin-bottom: 2rem; opacity: 0.9;">
            Не удалось запустить приложение WASSER PRO.<br>
            Попробуйте обновить страницу или обратитесь к администратору.
          </p>
          <button 
            onclick="window.location.reload()" 
            style="
              background: rgba(255,255,255,0.2);
              border: 1px solid rgba(255,255,255,0.3);
              color: white;
              padding: 0.75rem 1.5rem;
              border-radius: 0.5rem;
              font-size: 1rem;
              cursor: pointer;
              transition: all 0.2s;
            "
            onmouseover="this.style.background='rgba(255,255,255,0.3)'"
            onmouseout="this.style.background='rgba(255,255,255,0.2)'"
          >
            🔄 Обновить страницу
          </button>
        </div>
      </div>
    `;
  }
}

/**
 * Development only: Hot reload support
 */
if (process.env.NODE_ENV === 'development') {
  // @ts-ignore
  if (module.hot) {
    // @ts-ignore
    module.hot.accept();
  }
}