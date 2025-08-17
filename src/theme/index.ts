/**
 * Объединенная система тем WASSER PRO
 */

export type ThemeMode = 'light' | 'dark' | 'system'
export type AccentColor = 'blue' | 'emerald' | 'violet' | 'amber' | 'rose'

interface ThemeConfig {
  mode: ThemeMode
  accent: AccentColor
}

const STORAGE_KEYS = {
  mode: 'app_theme',
  accent: 'app_accent'
} as const

const ACCENT_PALETTES: Record<AccentColor, Record<string, string>> = {
  blue: {
    50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd',
    400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8',
    800: '#1e40af', 900: '#1e3a8a'
  },
  emerald: {
    50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 300: '#6ee7b7',
    400: '#34d399', 500: '#10b981', 600: '#059669', 700: '#047857',
    800: '#065f46', 900: '#064e3b'
  },
  violet: {
    50: '#faf5ff', 100: '#f3e8ff', 200: '#e9d5ff', 300: '#d8b4fe',
    400: '#c084fc', 500: '#a855f7', 600: '#9333ea', 700: '#7e22ce',
    800: '#6b21a8', 900: '#581c87'
  },
  amber: {
    50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d',
    400: '#fbbf24', 500: '#f59e0b', 600: '#d97706', 700: '#b45309',
    800: '#92400e', 900: '#78350f'
  },
  rose: {
    50: '#fff1f2', 100: '#ffe4e6', 200: '#fecdd3', 300: '#fda4af',
    400: '#fb7185', 500: '#f43f5e', 600: '#e11d48', 700: '#be185d',
    800: '#9f1239', 900: '#881337'
  }
}

class ThemeManager {
  private config: ThemeConfig = { mode: 'system', accent: 'blue' }
  private mediaQuery: MediaQueryList | null = null
  private listeners = new Set<(config: ThemeConfig) => void>()

  constructor() {
    this.loadFromStorage()
    this.setupMediaQuery()
    this.applyTheme()
  }

  private loadFromStorage(): void {
    try {
      const savedMode = localStorage.getItem(STORAGE_KEYS.mode) as ThemeMode | null
      const savedAccent = localStorage.getItem(STORAGE_KEYS.accent) as AccentColor | null
      
      this.config = {
        mode: this.isValidMode(savedMode) ? savedMode : 'system',
        accent: this.isValidAccent(savedAccent) ? savedAccent : 'blue'
      }
    } catch {
      // Используем defaults
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEYS.mode, this.config.mode)
      localStorage.setItem(STORAGE_KEYS.accent, this.config.accent)
    } catch {
      // Игнорируем ошибки
    }
  }

  private isValidMode(mode: any): mode is ThemeMode {
    return ['light', 'dark', 'system'].includes(mode)
  }

  private isValidAccent(accent: any): accent is AccentColor {
    return accent && accent in ACCENT_PALETTES
  }

  private setupMediaQuery(): void {
    if (typeof window === 'undefined') return
    
    try {
      this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      this.mediaQuery.addEventListener('change', () => {
        if (this.config.mode === 'system') {
          this.applyTheme()
          this.notifyListeners()
        }
      })
    } catch {
      // Фолбэк для старых браузеров
    }
  }

  private applyTheme(): void {
    const root = document.documentElement
    
    // 1. Применяем light/dark класс
    const isDark = this.config.mode === 'dark' || 
      (this.config.mode === 'system' && this.mediaQuery?.matches)
    root.classList.toggle('dark', isDark)
    
    // 2. Инжектим CSS переменные для акцента
    this.injectAccentStyles()
    
    // 3. Применяем акцентный класс
    this.applyAccentClass()
  }

  private injectAccentStyles(): void {
    const styleId = 'theme-accent-vars'
    let style = document.getElementById(styleId) as HTMLStyleElement
    
    if (!style) {
      style = document.createElement('style')
      style.id = styleId
      document.head.appendChild(style)
    }

    const palette = ACCENT_PALETTES[this.config.accent]
    const cssVars = Object.entries(palette)
      .map(([shade, color]) => `  --accent-${shade}: ${color};`)
      .join('\n')

    style.textContent = `
:root {
${cssVars}
  --primary: var(--accent-600);
  --primary-foreground: white;
}

.dark {
  --primary: var(--accent-500);
  --primary-foreground: black;
}
`
  }

  private applyAccentClass(): void {
    const root = document.documentElement
    // Удаляем все accent-* классы
    Array.from(root.classList)
      .filter(cls => cls.startsWith('accent-'))
      .forEach(cls => root.classList.remove(cls))
    
    // Добавляем текущий
    root.classList.add(`accent-${this.config.accent}`)
  }

  private notifyListeners(): void {
    this.listeners.forEach(fn => fn(this.config))
  }

  // Публичные методы
  setMode(mode: ThemeMode): void {
    this.config.mode = mode
    this.saveToStorage()
    this.applyTheme()
    this.notifyListeners()
  }

  setAccent(accent: AccentColor): void {
    this.config.accent = accent
    this.saveToStorage()
    this.applyTheme()
    this.notifyListeners()
  }

  getConfig(): ThemeConfig {
    return { ...this.config }
  }

  getAvailableAccents(): Array<{ key: AccentColor; label: string }> {
    return [
      { key: 'blue', label: 'Синий' },
      { key: 'emerald', label: 'Изумрудный' },
      { key: 'violet', label: 'Фиолетовый' },
      { key: 'amber', label: 'Янтарный' },
      { key: 'rose', label: 'Розовый' }
    ]
  }

  subscribe(listener: (config: ThemeConfig) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  destroy(): void {
    if (this.mediaQuery) {
      this.mediaQuery.removeEventListener('change', this.applyTheme)
    }
    this.listeners.clear()
  }
}

// Singleton instance
export const themeManager = new ThemeManager()

// Совместимость с существующим API
export const setTheme = (mode: ThemeMode) => themeManager.setMode(mode)
export const getTheme = () => themeManager.getConfig().mode
export const setAccent = (accent: AccentColor) => themeManager.setAccent(accent)
export const getAccent = () => themeManager.getConfig().accent
