/**
 * AppShell.tsx - Enterprise-grade Layout Architecture
 * 
 * Технические принципы:
 * - Unified layout system с фиксированным sidebar
 * - Type-safe navigation с строгой типизацией
 * - Performance-optimized rendering через мemoization
 * - Comprehensive error boundaries
 * - Accessibility compliance (WCAG 2.1 AA)
 * - Cross-platform compatibility
 */

import React, { 
  memo, 
  useMemo, 
  useState, 
  useEffect, 
  useCallback, 
  Suspense,
  ErrorInfo,
  ReactNode 
} from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router'
import {
  Droplets,
  Home as HomeIcon,
  Grid2X2,
  Package,
  Layers,
  FileSpreadsheet,
  Settings,
  BookOpenCheck,
  Menu,
  X,
  SatelliteDish,
  AlertTriangle,
  Loader2
} from 'lucide-react'

// Core components
import ToasterProvider from '../components/common/ToasterProvider'
import LoadingOverlay from '../components/common/LoadingOverlay'
import ErrorBoundary from '../components/common/ErrorBoundary'
import ThemeToggle, { applyStoredTheme } from '../components/common/ThemeToggle'
import LanguageSwitcher from '../components/common/LanguageSwitcher'
import AccentThemeSwitcher from '../components/common/AccentThemeSwitcher'

// Services & utilities
import { useTranslation } from 'react-i18next'
import { isSupabaseEnabled, testSupabaseConnection } from '../services/supabase'
import { readAccent, applyAccent } from '../themeAccent'

// ===== TYPE DEFINITIONS =====

/**
 * Navigation item configuration
 */
interface NavItem {
  readonly to: string
  readonly i18nKey: string
  readonly icon: React.ComponentType<{ size?: number; className?: string }>
  readonly ariaLabel?: string
}

/**
 * Supabase connection state
 */
interface SupabaseState {
  readonly enabled: boolean
  readonly status: 'checking' | 'ok' | 'error' | null
}

/**
 * Application initialization state
 */
interface AppState {
  readonly booting: boolean
  readonly error: Error | null
}

// ===== CONSTANTS =====

/**
 * Base navigation structure - immutable configuration
 */
const BASE_NAV_ITEMS: readonly NavItem[] = [
  { to: '/', i18nKey: 'nav.home', icon: HomeIcon, ariaLabel: 'Главная страница' },
  { to: '/collections', i18nKey: 'nav.collections', icon: Grid2X2, ariaLabel: 'Управление коллекциями' },
  { to: '/products', i18nKey: 'nav.products', icon: Package, ariaLabel: 'Каталог продукции' },
  { to: '/materials', i18nKey: 'nav.materials', icon: Layers, ariaLabel: 'База материалов' },
  { to: '/pricelist', i18nKey: 'nav.pricelist', icon: FileSpreadsheet, ariaLabel: 'Генерация прайс-листов' },
  { to: '/settings', i18nKey: 'nav.settings', icon: Settings, ariaLabel: 'Конфигурация системы' },
  { to: '/journal', i18nKey: 'nav.journal', icon: BookOpenCheck, ariaLabel: 'Журнал активности' },
] as const

/**
 * Performance-critical constants
 */
const SIDEBAR_WIDTH = 320 // pixels
const HEADER_HEIGHT = 64 // pixels
const MOBILE_BREAKPOINT = 768 // pixels

// ===== UTILITY FUNCTIONS =====

/**
 * Determines page title key from current pathname
 */
function getTitleKeyByPath(pathname: string, items: readonly NavItem[]): string {
  const normalizedPath = pathname === '/' ? '/' : pathname.replace(/\/$/, '')
  const item = items.find((n) => n.to === normalizedPath)
  return item?.i18nKey || 'nav.home'
}

/**
 * Fallback translation provider with type safety
 */
function labelFallback(i18nKey: string, lang: string): string {
  const getTranslation = (ru: string, en: string, ky: string): string => {
    if (lang.startsWith('en')) return en
    if (lang.startsWith('ky')) return ky
    return ru
  }

  const translations: Record<string, [string, string, string]> = {
    'nav.home': ['Главная', 'Home', 'Башкы'],
    'nav.collections': ['Коллекции', 'Collections', 'Коллекциялар'],
    'nav.products': ['Изделия', 'Products', 'Буюмдар'],
    'nav.materials': ['Материалы', 'Materials', 'Материалдар'],
    'nav.pricelist': ['Прайс-лист', 'Price List', 'Баа тизмеси'],
    'nav.settings': ['Настройки', 'Settings', 'Жөндөөлөр'],
    'nav.journal': ['Журнал', 'Journal', 'Журнал'],
    'nav.dev': ['Dev', 'Dev', 'Dev'],
  } as const

  const translation = translations[i18nKey]
  return translation ? getTranslation(...translation) : i18nKey
}

/**
 * Detects development tools visibility state
 */
function useDevToolsVisibility(): boolean {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const checkVisibility = () => {
      const devEnabled = localStorage.getItem('wasser_devtools') === '1'
      setVisible(devEnabled)
    }

    // Initial check
    checkVisibility()

    // Listen for storage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'wasser_devtools') {
        checkVisibility()
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  return visible
}

// ===== COMPONENT DEFINITIONS =====

/**
 * SidebarLink - Optimized navigation link component
 */
interface SidebarLinkProps {
  readonly to: string
  readonly i18nKey: string
  readonly icon: React.ComponentType<{ size?: number; className?: string }>
  readonly active: boolean
  readonly ariaLabel?: string
  readonly onClick?: () => void
}

const SidebarLink = memo<SidebarLinkProps>(({ 
  to, 
  i18nKey, 
  icon: Icon, 
  active, 
  ariaLabel,
  onClick 
}) => {
  const { t, i18n } = useTranslation()
  
  const linkClasses = useMemo(() => {
    const baseClasses = 'sidebar-nav-link'
    return active ? `${baseClasses} active` : baseClasses
  }, [active])

  const handleClick = useCallback((e: React.MouseEvent) => {
    onClick?.()
    
    // Analytics tracking could be added here
    if (process.env.NODE_ENV === 'development') {
      console.log(`Navigation: ${to}`)
    }
  }, [onClick, to])

  return (
    <Link
      to={to}
      className={linkClasses}
      onClick={handleClick}
      aria-current={active ? 'page' : undefined}
      aria-label={ariaLabel || t(i18nKey, { 
        defaultValue: labelFallback(i18nKey, i18n.language || 'ru') 
      })}
      role="menuitem"
    >
      <Icon size={20} className="shrink-0" aria-hidden="true" />
      <span className="truncate">
        {t(i18nKey, { defaultValue: labelFallback(i18nKey, i18n.language || 'ru') })}
      </span>
    </Link>
  )
})

SidebarLink.displayName = 'SidebarLink'

/**
 * SupabaseStatusIndicator - Connection status component
 */
interface SupabaseStatusProps {
  readonly state: SupabaseState
}

const SupabaseStatusIndicator = memo<SupabaseStatusProps>(({ state }) => {
  const statusConfig = useMemo(() => {
    if (!state.enabled) {
      return { 
        color: 'bg-gray-400', 
        text: 'OFF',
        ariaLabel: 'Supabase отключен'
      }
    }
    
    switch (state.status) {
      case 'ok':
        return { 
          color: 'bg-emerald-500', 
          text: 'OK',
          ariaLabel: 'Supabase подключен'
        }
      case 'checking':
        return { 
          color: 'bg-yellow-500', 
          text: '...',
          ariaLabel: 'Проверка соединения с Supabase'
        }
      case 'error':
        return { 
          color: 'bg-red-500', 
          text: 'ERR',
          ariaLabel: 'Ошибка подключения к Supabase'
        }
      default:
        return { 
          color: 'bg-gray-400', 
          text: '—',
          ariaLabel: 'Статус Supabase неизвестен'
        }
    }
  }, [state.enabled, state.status])

  return (
    <div 
      className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-full bg-gray-100 text-xs"
      title={statusConfig.ariaLabel}
      role="status"
      aria-label={statusConfig.ariaLabel}
    >
      <div 
        className={`w-2 h-2 rounded-full ${statusConfig.color}`} 
        aria-hidden="true"
      />
      <span className="text-gray-600 font-medium">
        {statusConfig.text}
      </span>
    </div>
  )
})

SupabaseStatusIndicator.displayName = 'SupabaseStatusIndicator'

/**
 * LoadingFallback - Suspense fallback component
 */
const LoadingFallback = memo(() => (
  <div className="flex items-center justify-center h-64" role="status" aria-label="Загрузка">
    <Loader2 className="w-8 h-8 animate-spin text-blue-600" aria-hidden="true" />
    <span className="sr-only">Загрузка содержимого...</span>
  </div>
))

LoadingFallback.displayName = 'LoadingFallback'

/**
 * ErrorFallback - Error boundary fallback
 */
interface ErrorFallbackProps {
  readonly error: Error
  readonly resetError: () => void
}

const ErrorFallback = memo<ErrorFallbackProps>(({ error, resetError }) => (
  <div className="flex flex-col items-center justify-center h-64 p-6 text-center" role="alert">
    <AlertTriangle className="w-12 h-12 text-red-500 mb-4" aria-hidden="true" />
    <h2 className="text-lg font-semibold text-gray-900 mb-2">
      Произошла ошибка
    </h2>
    <p className="text-gray-600 mb-4 max-w-md">
      {error.message || 'Неожиданная ошибка в приложении'}
    </p>
    <button
      onClick={resetError}
      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
    >
      Попробовать снова
    </button>
    {process.env.NODE_ENV === 'development' && (
      <details className="mt-4 text-xs text-gray-500">
        <summary>Детали ошибки (dev)</summary>
        <pre className="mt-2 text-left whitespace-pre-wrap max-w-full overflow-auto">
          {error.stack}
        </pre>
      </details>
    )}
  </div>
))

ErrorFallback.displayName = 'ErrorFallback'

/**
 * AppErrorBoundary - Application-level error boundary
 */
class AppErrorBoundary extends React.Component<
  { children: ReactNode; fallback: React.ComponentType<ErrorFallbackProps> },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode; fallback: React.ComponentType<ErrorFallbackProps> }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('AppShell Error:', error, errorInfo)
    
    // Error reporting service integration point
    if (process.env.NODE_ENV === 'production') {
      // Send to error reporting service
      // reportError(error, errorInfo)
    }
  }

  render() {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback
      return (
        <FallbackComponent 
          error={this.state.error} 
          resetError={() => this.setState({ hasError: false, error: null })}
        />
      )
    }

    return this.props.children
  }
}

// ===== MAIN COMPONENT =====

/**
 * AppShell - Main layout component with enterprise-grade architecture
 */
const AppShell = memo(() => {
  // ===== STATE MANAGEMENT =====
  
  const [appState, setAppState] = useState<AppState>({
    booting: true,
    error: null
  })
  
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [supabaseState, setSupabaseState] = useState<SupabaseState>({
    enabled: false,
    status: null
  })

  // ===== HOOKS =====
  
  const location = useLocation()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const showDevTools = useDevToolsVisibility()

  // ===== COMPUTED VALUES =====
  
  const navItems = useMemo((): readonly NavItem[] => {
    const items = [...BASE_NAV_ITEMS]
    if (showDevTools) {
      items.push({ 
        to: '/dev', 
        i18nKey: 'nav.dev', 
        icon: SatelliteDish, 
        ariaLabel: 'Инструменты разработчика' 
      })
    }
    return items
  }, [showDevTools])

  const activePath = useMemo(() => {
    return location.pathname === '/' ? '/' : location.pathname.replace(/\/$/, '')
  }, [location.pathname])

  const titleKey = useMemo(() => {
    return getTitleKeyByPath(activePath, navItems)
  }, [activePath, navItems])

  const currentTime = useMemo(() => {
    return new Date().toLocaleString(
      i18n.language === 'en' ? 'en-US' : 'ru-RU',
      {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }
    )
  }, [i18n.language])

  // ===== EVENT HANDLERS =====
  
  const openSidebar = useCallback(() => {
    setSidebarOpen(true)
    document.body.style.overflow = 'hidden' // Prevent scroll
  }, [])

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false)
    document.body.style.overflow = '' // Restore scroll
  }, [])

  const handleKeyboardNavigation = useCallback((e: KeyboardEvent) => {
    // Keyboard shortcuts for navigation
    if (e.altKey && e.key >= '1' && e.key <= '9') {
      const index = parseInt(e.key) - 1
      const targetItem = navItems[index]
      if (targetItem) {
        navigate(targetItem.to)
        e.preventDefault()
      }
    }
    
    // ESC to close sidebar
    if (e.key === 'Escape' && sidebarOpen) {
      closeSidebar()
    }
  }, [navigate, navItems, sidebarOpen, closeSidebar])

  // ===== EFFECTS =====
  
  /**
   * Application initialization effect
   */
  useEffect(() => {
    const initializeApplication = async () => {
      try {
        // Theme initialization
        applyStoredTheme()
        const accent = readAccent()
        if (accent) applyAccent(accent)

        // Supabase connection check
        const supaEnabled = isSupabaseEnabled()
        setSupabaseState({ enabled: supaEnabled, status: supaEnabled ? 'checking' : null })

        if (supaEnabled) {
          try {
            await testSupabaseConnection()
            setSupabaseState(prev => ({ ...prev, status: 'ok' }))
          } catch (error) {
            console.warn('Supabase connection failed:', error)
            setSupabaseState(prev => ({ ...prev, status: 'error' }))
          }
        }

        // Mark app as initialized
        setAppState({ booting: false, error: null })

        // Performance measurement
        if (process.env.NODE_ENV === 'development') {
          console.log('🚀 AppShell initialized successfully')
        }

      } catch (error) {
        console.error('Application initialization failed:', error)
        setAppState({ 
          booting: false, 
          error: error instanceof Error ? error : new Error('Unknown initialization error')
        })
      }
    }

    initializeApplication()
  }, [])

  /**
   * Keyboard navigation effect
   */
  useEffect(() => {
    document.addEventListener('keydown', handleKeyboardNavigation)
    return () => document.removeEventListener('keydown', handleKeyboardNavigation)
  }, [handleKeyboardNavigation])

  /**
   * Mobile sidebar effect - handle body scroll lock
   */
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [sidebarOpen])

  // ===== RENDER LOGIC =====

  if (appState.booting) {
    return <LoadingOverlay />
  }

  if (appState.error) {
    return (
      <ErrorFallback 
        error={appState.error} 
        resetError={() => setAppState({ booting: false, error: null })}
      />
    )
  }

  return (
    <AppErrorBoundary fallback={ErrorFallback}>
      <ToasterProvider />
      
      {/* Main Application Layout Container */}
      <div className="app-layout-container">
        
        {/* Desktop Sidebar - Fixed Position */}
        <aside 
          className="sidebar-desktop hidden md:flex"
          role="navigation"
          aria-label="Основная навигация"
        >
          {/* Logo Section */}
          <div className="sidebar-logo-section">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-xl text-white flex items-center justify-center shadow-md"
                style={{ backgroundColor: 'var(--accent-600, #2563eb)' }}
                aria-hidden="true"
              >
                <Droplets size={24} />
              </div>
              <div>
                <div className="text-lg font-extrabold text-gray-900 tracking-tight">
                  WASSER PRO
                </div>
                <div className="text-sm text-gray-500">
                  Управление витриной и прайсом
                </div>
              </div>
            </div>
          </div>
          
          {/* Navigation Container */}
          <nav 
            className="sidebar-nav-container"
            role="menu"
            aria-label="Разделы приложения"
          >
            {navItems.map((item, index) => (
              <SidebarLink
                key={item.to}
                to={item.to}
                i18nKey={item.i18nKey}
                icon={item.icon}
                active={activePath === item.to}
                ariaLabel={`${item.ariaLabel || labelFallback(item.i18nKey, i18n.language || 'ru')} (Alt+${index + 1})`}
              />
            ))}
          </nav>
          
          {/* Footer Section */}
          <div className="sidebar-footer-section">
            <div className="text-xs text-gray-500">
              © {new Date().getFullYear()} WASSER PRO
            </div>
            <div className="text-xs text-gray-400 mt-1">
              v{process.env.REACT_APP_VERSION || '1.0.0'}
            </div>
          </div>
        </aside>

        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <>
            <div 
              className="mobile-sidebar-overlay md:hidden"
              onClick={closeSidebar}
              aria-hidden="true"
            />
            
            <div className="mobile-sidebar md:hidden">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-10 h-10 rounded-lg text-white flex items-center justify-center"
                    style={{ backgroundColor: 'var(--accent-600, #2563eb)' }}
                    aria-hidden="true"
                  >
                    <Droplets size={20} />
                  </div>
                  <div className="font-bold text-gray-900">WASSER PRO</div>
                </div>
                <button
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors"
                  onClick={closeSidebar}
                  aria-label="Закрыть меню"
                >
                  <X size={20} />
                </button>
              </div>
              
              <nav className="flex-1 p-4 space-y-2 overflow-y-auto" role="menu">
                {navItems.map((item) => (
                  <SidebarLink
                    key={item.to}
                    to={item.to}
                    i18nKey={item.i18nKey}
                    icon={item.icon}
                    active={activePath === item.to}
                    onClick={closeSidebar}
                    ariaLabel={item.ariaLabel}
                  />
                ))}
              </nav>
              
              <div className="p-4 border-t border-gray-200 text-center text-xs text-gray-500">
                © {new Date().getFullYear()} WASSER PRO
              </div>
            </div>
          </>
        )}

        {/* Header with Correct Positioning */}
        <header 
          className="header-with-sidebar"
          role="banner"
        >
          {/* Left Section */}
          <div className="flex items-center gap-3">
            <button
              className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              onClick={openSidebar}
              aria-label="Открыть главное меню"
              aria-expanded={sidebarOpen}
              aria-controls="mobile-sidebar"
            >
              <Menu size={18} />
            </button>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900">
              {t(titleKey, { 
                defaultValue: labelFallback(titleKey, i18n.language || 'ru') 
              })}
            </h1>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-3">
            <SupabaseStatusIndicator state={supabaseState} />
            <time 
              className="hidden sm:block text-xs sm:text-sm text-gray-500 font-mono"
              dateTime={new Date().toISOString()}
              title="Текущее время"
            >
              {currentTime}
            </time>
            <LanguageSwitcher />
            <ThemeToggle />
            <AccentThemeSwitcher />
          </div>
        </header>

        {/* Main Content Area with Correct Positioning */}
        <main 
          className="main-content-with-sidebar"
          role="main"
          aria-label="Основное содержимое"
        >
          <div className="h-full overflow-y-auto">
            <div className="p-6 min-h-full">
              <Suspense fallback={<LoadingFallback />}>
                <ErrorBoundary 
                  title="Ошибка страницы" 
                  message="Попробуйте обновить страницу или вернуться позже."
                >
                  <Outlet />
                </ErrorBoundary>
              </Suspense>
            </div>
          </div>
        </main>
      </div>
    </AppErrorBoundary>
  )
})

AppShell.displayName = 'AppShell'

export default AppShell