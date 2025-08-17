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
