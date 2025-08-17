/**
 * Критичные улучшения UX и фиксы для WASSER PRO
 * Исправляет iOS Safari viewport, accessibility и производительность
 */

interface ViewportEnhancementsConfig {
  enableVhFix: boolean;
  enableIOSInputFix: boolean;
  enableFocusTrap: boolean;
  enablePerformanceMonitoring: boolean;
  enableAccessibilityEnhancements: boolean;
}

const DEFAULT_CONFIG: ViewportEnhancementsConfig = {
  enableVhFix: true,
  enableIOSInputFix: true,
  enableFocusTrap: true,
  enablePerformanceMonitoring: false,
  enableAccessibilityEnhancements: true,
};

/**
 * 📱 iOS Safari Viewport Height Fix
 * Решает проблему с 100vh на мобильных устройствах
 */
export function initViewportHeightFix(): void {
  if (!DEFAULT_CONFIG.enableVhFix) return;

  const updateVh = () => {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  };

  // Начальная установка
  updateVh();

  // Обновление при изменении размера с debounce
  let timeoutId: number;
  const debouncedUpdate = () => {
    clearTimeout(timeoutId);
    timeoutId = window.setTimeout(updateVh, 150);
  };

  window.addEventListener('resize', debouncedUpdate, { passive: true });
  window.addEventListener('orientationchange', debouncedUpdate, { passive: true });

  console.log('✅ Viewport height fix initialized');
}

/**
 * 📱 iOS Input Zoom Prevention
 * Предотвращает зум при фокусе на inputs в iOS Safari
 */
export function initIOSInputFix(): void {
  if (!DEFAULT_CONFIG.enableIOSInputFix) return;

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (!isIOS) return;

  const inputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="password"], input[type="number"], input[type="tel"], input[type="url"], textarea, select');
  
  inputs.forEach((input) => {
    const element = input as HTMLInputElement;
    
    // Устанавливаем минимальный размер шрифта для предотвращения зума
    if (parseFloat(window.getComputedStyle(element).fontSize) < 16) {
      element.style.fontSize = '16px';
    }
    
    // Добавляем класс для дополнительных стилей
    element.classList.add('ios-input-fix');
  });

  console.log('✅ iOS input zoom fix applied to', inputs.length, 'elements');
}

/**
 * ♿ Enhanced Keyboard Navigation
 * Улучшает навигацию с клавиатуры и accessibility
 */
export function initAccessibilityEnhancements(): void {
  if (!DEFAULT_CONFIG.enableAccessibilityEnhancements) return;

  // Добавляем класс focus-enhanced ко всем интерактивным элементам
  const interactiveElements = document.querySelectorAll(
    'button, a, input, textarea, select, [tabindex]:not([tabindex="-1"]), [role="button"], [role="link"]'
  );

  interactiveElements.forEach((element) => {
    element.classList.add('focus-enhanced');
  });

  // Улучшаем навигацию по модальным окнам
  document.addEventListener('keydown', handleModalKeydown);

  // Skip link для быстрой навигации
  addSkipLink();

  console.log('✅ Accessibility enhancements applied to', interactiveElements.length, 'elements');
}

/**
 * 🎯 Focus Trap для модальных окон
 */
export function initFocusTrap(): void {
  if (!DEFAULT_CONFIG.enableFocusTrap) return;

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;

    const modal = document.querySelector('[role="dialog"]:not([hidden]), .modal-dialog:not(.hidden)') as HTMLElement;
    if (!modal) return;

    const focusableElements = modal.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    if (e.shiftKey && document.activeElement === firstElement) {
      e.preventDefault();
      lastElement?.focus();
    } else if (!e.shiftKey && document.activeElement === lastElement) {
      e.preventDefault();
      firstElement?.focus();
    }
  });

  console.log('✅ Focus trap initialized');
}

/**
 * ⚡ Performance Monitoring (optional)
 */
export function initPerformanceMonitoring(): void {
  if (!DEFAULT_CONFIG.enablePerformanceMonitoring) return;

  // Мониторинг памяти (только в Chrome)
  if ('memory' in performance) {
    const checkMemory = () => {
      const memory = (performance as any).memory;
      const used = Math.round((memory.usedJSHeapSize / memory.totalJSHeapSize) * 100);
      
      if (used > 90) {
        console.warn('⚠️ High memory usage detected:', used + '%');
      }
    };

    setInterval(checkMemory, 30000); // Проверка каждые 30 секунд
  }

  // Мониторинг FPS
  let frames = 0;
  let lastTime = performance.now();

  const countFPS = () => {
    frames++;
    const currentTime = performance.now();
    
    if (currentTime >= lastTime + 1000) {
      const fps = Math.round((frames * 1000) / (currentTime - lastTime));
      
      if (fps < 30) {
        console.warn('⚠️ Low FPS detected:', fps);
      }
      
      frames = 0;
      lastTime = currentTime;
    }
    
    requestAnimationFrame(countFPS);
  };

  requestAnimationFrame(countFPS);
  console.log('✅ Performance monitoring enabled');
}

/**
 * 🔧 Utility Functions
 */

function handleModalKeydown(e: KeyboardEvent): void {
  // Escape для закрытия модальных окон
  if (e.key === 'Escape') {
    const modal = document.querySelector('[role="dialog"]:not([hidden]), .modal-dialog:not(.hidden)');
    if (modal) {
      const closeButton = modal.querySelector('[data-dismiss], .modal-close, button[aria-label*="закр"], button[aria-label*="close"]') as HTMLElement;
      closeButton?.click();
    }
  }
}

function addSkipLink(): void {
  const skipLink = document.createElement('a');
  skipLink.href = '#main-content';
  skipLink.textContent = 'Перейти к основному содержимому';
  skipLink.className = 'sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 z-50 bg-blue-600 text-white p-2 rounded';
  
  document.body.insertBefore(skipLink, document.body.firstChild);
  
  // Добавляем id к main контенту если его нет
  const main = document.querySelector('main') || document.querySelector('[role="main"]');
  if (main && !main.id) {
    main.id = 'main-content';
  }
}

/**
 * 📱 Touch Enhancements
 */
export function initTouchEnhancements(): void {
  // Предотвращение случайных касаний
  document.addEventListener('touchstart', (e) => {
    if (e.touches.length > 1) {
      e.preventDefault(); // Предотвращаем multi-touch жесты
    }
  }, { passive: false });

  // Улучшаем touch targets
  const touchElements = document.querySelectorAll('button, a, input[type="checkbox"], input[type="radio"]');
  touchElements.forEach((element) => {
    element.classList.add('mobile-touch');
  });

  console.log('✅ Touch enhancements applied');
}

/**
 * 🎨 Theme Transition Enhancements
 */
export function initThemeTransitions(): void {
  // Плавные переходы при смене темы
  const html = document.documentElement;
  
  // Добавляем transition только после загрузки страницы
  window.addEventListener('load', () => {
    html.style.transition = 'color-scheme 0.3s ease, background-color 0.3s ease';
  });

  // Отслеживаем изменения темы
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        // Тема изменилась, можно добавить дополнительную логику
      }
    });
  });

  observer.observe(html, { attributes: true, attributeFilter: ['class'] });
  console.log('✅ Theme transitions initialized');
}

/**
 * 🚀 Preload Optimizations
 */
export function initPreloadOptimizations(): void {
  // Preload критичных ресурсов
  const criticalFonts = [
    '/fonts/inter-var.woff2',
    '/fonts/space-grotesk.woff2'
  ];

  criticalFonts.forEach((font) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = font;
    link.as = 'font';
    link.type = 'font/woff2';
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  });

  console.log('✅ Font preloading initialized');
}

/**
 * 🔄 Main initialization function
 */
export function initializeEnhancements(config: Partial<ViewportEnhancementsConfig> = {}): void {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  console.log('🚀 Initializing WASSER PRO enhancements...');

  // Критичные фиксы
  if (finalConfig.enableVhFix) {
    initViewportHeightFix();
  }

  if (finalConfig.enableIOSInputFix) {
    initIOSInputFix();
  }

  if (finalConfig.enableAccessibilityEnhancements) {
    initAccessibilityEnhancements();
  }

  if (finalConfig.enableFocusTrap) {
    initFocusTrap();
  }

  // Дополнительные улучшения
  initTouchEnhancements();
  initThemeTransitions();
  initPreloadOptimizations();

  // Опциональный мониторинг производительности
  if (finalConfig.enablePerformanceMonitoring) {
    initPerformanceMonitoring();
  }

  console.log('✅ All enhancements initialized successfully');
}

/**
 * 🔧 Runtime utilities for debugging
 */
export const debugUtils = {
  checkZIndex: () => {
    const elements = Array.from(document.querySelectorAll('*')).filter(el => {
      const zIndex = window.getComputedStyle(el).zIndex;
      return zIndex !== 'auto' && parseInt(zIndex) > 0;
    });
    
    console.table(elements.map(el => ({
      element: el.tagName + (el.className ? '.' + el.className.split(' ').join('.') : ''),
      zIndex: window.getComputedStyle(el).zIndex,
      position: window.getComputedStyle(el).position
    })));
  },

  checkViewport: () => {
    console.log({
      'Window dimensions': `${window.innerWidth}x${window.innerHeight}`,
      'CSS vh value': getComputedStyle(document.documentElement).getPropertyValue('--vh'),
      'Safe area insets': {
        top: getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-top'),
        bottom: getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-bottom'),
        left: getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-left'),
        right: getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-right'),
      }
    });
  },

  testFocusNavigation: () => {
    const focusableElements = document.querySelectorAll(
      'button, a, input, textarea, select, [tabindex]:not([tabindex="-1"])'
    );
    console.log(`Found ${focusableElements.length} focusable elements`);
    
    focusableElements.forEach((el, index) => {
      setTimeout(() => {
        (el as HTMLElement).focus();
        console.log(`Focusing element ${index + 1}:`, el);
      }, index * 500);
    });
  }
};