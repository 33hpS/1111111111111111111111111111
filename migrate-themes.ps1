# PowerShell скрипт миграции системы тем WASSER PRO
# Запуск: .\migrate-themes.ps1

param(
    [switch]$Force = $false
)

# Функции для вывода с цветами
function Write-Info { 
    param($Message)
    Write-Host "ℹ️  $Message" -ForegroundColor Blue 
}

function Write-Success { 
    param($Message)
    Write-Host "✅ $Message" -ForegroundColor Green 
}

function Write-Warning { 
    param($Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow 
}

function Write-Error { 
    param($Message)
    Write-Host "❌ $Message" -ForegroundColor Red 
}

# Заголовок
Write-Host ""
Write-Host "🎨 WASSER PRO - Миграция системы тем" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Проверяем что мы в корне проекта
if (-Not (Test-Path "package.json")) {
    Write-Error "Запустите скрипт из корня проекта (где есть package.json)"
    Write-Host "   Текущая папка: $PWD" -ForegroundColor Gray
    Write-Host "   Перейдите в корень проекта и запустите: .\migrate-themes.ps1" -ForegroundColor Gray
    exit 1
}

if (-Not (Test-Path "src")) {
    Write-Error "Папка src не найдена"
    exit 1
}

Write-Info "📍 Текущая директория: $PWD"
Write-Success "✅ Найден package.json"
Write-Host ""

# Показываем что будет сделано
Write-Info "🔄 Миграция выполнит следующие действия:"
Write-Host "   • Создаст backup существующих файлов тем" -ForegroundColor Gray
Write-Host "   • Создаст новую объединенную систему тем" -ForegroundColor Gray
Write-Host "   • Обновит CSS с поддержкой акцентных цветов" -ForegroundColor Gray
Write-Host "   • Добавит React хук useTheme()" -ForegroundColor Gray
Write-Host "   • Создаст компонент ThemeSwitcher" -ForegroundColor Gray
Write-Host "   • Удалит старые файлы тем" -ForegroundColor Gray
Write-Host ""

# Запрашиваем подтверждение
if (-Not $Force) {
    $response = Read-Host "🤔 Продолжить миграцию? (y/N)"
    if ($response -ne "y" -and $response -ne "Y") {
        Write-Error "Миграция отменена"
        exit 0
    }
}

Write-Host ""
Write-Info "🚀 Запускаем миграцию..."
Write-Host ""

try {
    # Создаем backup папку
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $backupDir = "theme-migration-backup-$timestamp"
    
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
    Write-Info "📁 Создана папка backup: $backupDir"

    # Функция для backup файла
    function Backup-File {
        param($FilePath)
        if (Test-Path $FilePath) {
            $fileName = Split-Path $FilePath -Leaf
            Copy-Item $FilePath "$backupDir\$fileName" -Force
            Write-Success "Backup: $FilePath"
        }
    }

    # Создаем backup существующих файлов
    Write-Info "💾 Создаем backup..."
    Backup-File "src\theme.ts"
    Backup-File "src\themeAccent.ts"
    Backup-File "src\shadcn.css"
    Backup-File "src\App.tsx"

    # Создаем необходимые папки
    Write-Info "📁 Создаем структуру папок..."
    @("src\theme", "src\hooks", "src\components\theme") | ForEach-Object {
        New-Item -ItemType Directory -Path $_ -Force | Out-Null
    }

    # 1. Создаем новый theme manager
    Write-Info "🎨 Создаем theme manager..."
    
    $themeManagerContent = @'
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
'@

    $themeManagerContent | Out-File -FilePath "src\theme\index.ts" -Encoding UTF8

    # 2. Создаем React хук
    Write-Info "🪝 Создаем React хук useTheme..."
    
    $useThemeContent = @'
import { useEffect, useState } from 'react'
import { themeManager, type ThemeMode, type AccentColor } from '../theme'

interface ThemeHookReturn {
  mode: ThemeMode
  accent: AccentColor
  isDark: boolean
  setMode: (mode: ThemeMode) => void
  setAccent: (accent: AccentColor) => void
  availableAccents: Array<{ key: AccentColor; label: string }>
  toggleMode: () => void
}

export function useTheme(): ThemeHookReturn {
  const [config, setConfig] = useState(() => themeManager.getConfig())

  useEffect(() => {
    const unsubscribe = themeManager.subscribe(setConfig)
    return unsubscribe
  }, [])

  // Определяем, темная ли тема сейчас активна
  const isDark = config.mode === 'dark' || 
    (config.mode === 'system' && 
     typeof window !== 'undefined' && 
     window.matchMedia?.('(prefers-color-scheme: dark)').matches)

  const toggleMode = () => {
    const nextMode: ThemeMode = config.mode === 'light' ? 'dark' : 'light'
    themeManager.setMode(nextMode)
  }

  return {
    mode: config.mode,
    accent: config.accent,
    isDark,
    setMode: themeManager.setMode.bind(themeManager),
    setAccent: themeManager.setAccent.bind(themeManager),
    availableAccents: themeManager.getAvailableAccents(),
    toggleMode
  }
}
'@

    $useThemeContent | Out-File -FilePath "src\hooks\useTheme.ts" -Encoding UTF8

    # 3. Создаем компонент ThemeSwitcher
    Write-Info "🎛️  Создаем компонент ThemeSwitcher..."
    
    $themeSwitcherContent = @'
import React from 'react'
import { Moon, Sun, Monitor, Palette } from 'lucide-react'
import { useTheme } from '../../hooks/useTheme'
import type { ThemeMode, AccentColor } from '../../theme'

interface ThemeSwitcherProps {
  showAccents?: boolean
  orientation?: 'horizontal' | 'vertical'
  size?: 'sm' | 'md' | 'lg'
}

export function ThemeSwitcher({ 
  showAccents = true, 
  orientation = 'vertical',
  size = 'md' 
}: ThemeSwitcherProps) {
  const { mode, accent, setMode, setAccent, availableAccents } = useTheme()

  const modeOptions: Array<{ value: ThemeMode; icon: React.ReactNode; label: string }> = [
    { value: 'light', icon: <Sun size={16} />, label: 'Светлая' },
    { value: 'dark', icon: <Moon size={16} />, label: 'Темная' },
    { value: 'system', icon: <Monitor size={16} />, label: 'Системная' }
  ]

  const containerClass = orientation === 'horizontal' 
    ? 'flex items-center gap-2' 
    : 'space-y-3'

  const buttonSizes = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-3 text-base'
  }

  return (
    <div className={containerClass}>
      {/* Переключение режима */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          <Monitor size={14} />
          Тема
        </div>
        <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 p-1 bg-gray-50 dark:bg-gray-800">
          {modeOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setMode(option.value)}
              className={`
                ${buttonSizes[size]} flex-1 flex items-center justify-center gap-2 rounded-md transition-all
                ${mode === option.value 
                  ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-gray-100' 
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                }
              `}
              title={option.label}
            >
              {option.icon}
              {size === 'lg' && <span>{option.label}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Переключение акцентного цвета */}
      {showAccents && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            <Palette size={14} />
            Акцент
          </div>
          <div className="grid grid-cols-5 gap-1 p-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            {availableAccents.map((option) => (
              <button
                key={option.key}
                onClick={() => setAccent(option.key)}
                className={`
                  relative w-8 h-8 rounded-md transition-all hover:scale-110
                  ${accent === option.key 
                    ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-gray-300' 
                    : ''
                  }
                `}
                style={{
                  backgroundColor: getAccentColor(option.key)
                }}
                title={option.label}
              >
                {accent === option.key && (
                  <div className="absolute inset-0 rounded-md bg-white/20 dark:bg-black/20" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function getAccentColor(accent: AccentColor): string {
  const colors = {
    blue: '#2563eb',
    emerald: '#10b981', 
    violet: '#9333ea',
    amber: '#f59e0b',
    rose: '#e11d48'
  }
  return colors[accent]
}

export function ThemeToggle() {
  const { mode, setMode } = useTheme()
  
  const nextMode: ThemeMode = mode === 'light' ? 'dark' : mode === 'dark' ? 'system' : 'light'
  const icons = {
    light: <Sun size={16} />,
    dark: <Moon size={16} />,
    system: <Monitor size={16} />
  }

  return (
    <button
      onClick={() => setMode(nextMode)}
      className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      title={`Текущая тема: ${mode}, переключить на: ${nextMode}`}
    >
      {icons[mode]}
    </button>
  )
}
'@

    $themeSwitcherContent | Out-File -FilePath "src\components\theme\ThemeSwitcher.tsx" -Encoding UTF8

    # 4. Обновляем shadcn.css - добавляем акцентные переменные
    Write-Info "🎨 Обновляем shadcn.css..."
    
    if (Test-Path "src\shadcn.css") {
        $existingCss = Get-Content "src\shadcn.css" -Raw
        
        $accentVars = @"
/* Акцентные переменные - добавлено при миграции */
:root {
  --accent-50: #eff6ff;
  --accent-100: #dbeafe;
  --accent-200: #bfdbfe;
  --accent-300: #93c5fd;
  --accent-400: #60a5fa;
  --accent-500: #3b82f6;
  --accent-600: #2563eb;
  --accent-700: #1d4ed8;
  --accent-800: #1e40af;
  --accent-900: #1e3a8a;
}

"@
        
        # Добавляем акцентные переменные в начало
        $newCss = $accentVars + $existingCss
        
        # Заменяем --primary на использование акцентных переменных
        $newCss = $newCss -replace '--primary: 0 0% 9%;', '--primary: var(--accent-600);'
        $newCss = $newCss -replace '--primary: 0 0% 98%;', '--primary: var(--accent-500);'
        
        $newCss | Out-File -FilePath "src\shadcn.css" -Encoding UTF8
    }

    # 5. Удаляем старые файлы
    Write-Info "🗑️  Удаляем старые файлы тем..."
    
    if (Test-Path "src\themeAccent.ts") {
        Remove-Item "src\themeAccent.ts" -Force
        Write-Success "Удален themeAccent.ts"
    }
    
    if (Test-Path "src\theme.ts") {
        Remove-Item "src\theme.ts" -Force
        Write-Success "Удален старый theme.ts"
    }

    # 6. Создаем README с инструкциями
    Write-Info "📚 Создаем документацию..."
    
    $readmeContent = @'
# 🎨 Миграция системы тем завершена!

## ✅ Что было сделано:

1. **Создана объединенная система тем** (`src/theme/index.ts`)
2. **Добавлен React хук** (`src/hooks/useTheme.ts`)
3. **Создан компонент переключения** (`src/components/theme/ThemeSwitcher.tsx`)
4. **Обновлен CSS** с поддержкой акцентных переменных
5. **Удалены старые файлы** (`themeAccent.ts`, старый `theme.ts`)

## 🚀 Как использовать новую систему:

### В React компонентах:
```typescript
import { useTheme } from '../hooks/useTheme'

function MyComponent() {
  const { mode, accent, setMode, setAccent, isDark } = useTheme()
  
  return (
    <button 
      onClick={() => setMode('dark')}
      style={{ backgroundColor: 'var(--accent-600)' }}
    >
      Switch to dark theme
    </button>
  )
}
```

### CSS переменные акцентов:
```css
.my-button {
  background-color: var(--accent-500);
  border-color: var(--accent-300);
  color: var(--accent-900);
}
```

### Компонент переключения тем:
```typescript
import { ThemeSwitcher } from '../components/theme/ThemeSwitcher'

<ThemeSwitcher showAccents={true} size="md" />
```

## 🎯 Новые возможности:

- ✅ 5 акцентных цветов (blue, emerald, violet, amber, rose)
- ✅ Плавные анимации смены тем
- ✅ Автоматическая синхронизация с системной темой
- ✅ Сохранение настроек в localStorage
- ✅ TypeScript типизация
- ✅ React хуки для удобства

## 📁 Backup файлы:

Старые файлы сохранены в папке backup для восстановления при необходимости.

## 🔄 Следующие шаги:

1. Перезапустите dev сервер: `npm run dev`
2. Обновите компоненты для использования `useTheme()` хука
3. Замените hardcoded цвета на `var(--accent-*)` переменные
4. Протестируйте переключение тем в приложении
'@

    $readmeContent | Out-File -FilePath "THEME_MIGRATION_README.md" -Encoding UTF8

    # Финальный отчет
    Write-Host ""
    Write-Success "🎉 Миграция системы тем завершена успешно!"
    Write-Host ""
    Write-Host "📊 Отчет о миграции:" -ForegroundColor Blue
    Write-Host "  ✅ Создан объединенный theme manager" -ForegroundColor Green
    Write-Host "  ✅ Добавлен React хук useTheme" -ForegroundColor Green
    Write-Host "  ✅ Создан компонент ThemeSwitcher" -ForegroundColor Green
    Write-Host "  ✅ Обновлен shadcn.css с акцентными переменными" -ForegroundColor Green
    Write-Host "  ✅ Удалены старые файлы тем" -ForegroundColor Green
    Write-Host "  ✅ Создан backup в: $backupDir" -ForegroundColor Green
    Write-Host "  ✅ Создан README с инструкциями" -ForegroundColor Green
    Write-Host ""
    Write-Host "📝 Рекомендации:" -ForegroundColor Yellow
    Write-Host "  1. Просмотрите THEME_MIGRATION_README.md" -ForegroundColor Gray
    Write-Host "  2. Обновите компоненты для использования useTheme() хука" -ForegroundColor Gray
    Write-Host "  3. Замените hardcoded цвета на CSS переменные" -ForegroundColor Gray
    Write-Host "  4. Протестируйте переключение тем в приложении" -ForegroundColor Gray
    Write-Host ""
    Write-Host "🚀 Готово! Перезапустите dev сервер для применения изменений:" -ForegroundColor Green
    Write-Host "   npm run dev" -ForegroundColor Cyan
    Write-Host ""

} catch {
    Write-Error "Произошла ошибка во время миграции: $($_.Exception.Message)"
    Write-Host "Используйте backup файлы для восстановления если необходимо." -ForegroundColor Yellow
    exit 1
}