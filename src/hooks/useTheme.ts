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
