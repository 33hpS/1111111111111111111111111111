/**
 * AppShell — исправленный layout для полного использования экрана
 * ИСПРАВЛЕНИЯ:
 * - Убрано ограничение max-w-6xl для использования всей ширины на desktop
 * - Сайдбар растягивается до конца страницы (full viewport height)
 * - Улучшен responsive дизайн для больших экранов
 * - Добавлена настройка ширины контента через CSS переменные
 */

import React, { memo, useMemo, useState, useEffect, useCallback } from 'react'
import { Link, Outlet, useLocation } from 'react-router'
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
} from 'lucide-react'
import ToasterProvider from '../components/common/ToasterProvider'
import LoadingOverlay from '../components/common/LoadingOverlay'
import ErrorBoundary from '../components/common/ErrorBoundary'
import ThemeToggle, { applyStoredTheme } from '../components/common/ThemeToggle'
import LanguageSwitcher from '../components/common/LanguageSwitcher'
import AccentThemeSwitcher from '../components/common/AccentThemeSwitcher'
import { useTranslation } from 'react-i18next'
import { isSupabaseEnabled, testSupabaseConnection } from '../services/supabase'
import { readAccent, applyAccent } from '../themeAccent'

/**
 * NavItem — пункт боковой навигации (с i18n-ключом)
 */
interface NavItem {
  /** Путь маршрута */
  to: string
  /** Ключ перевода для подписи */
  i18nKey: string
  /** Иконка */
  icon: React.ComponentType<{ size?: number; className?: string }>
}

/**
 * Базовый список пунктов навигации (без Dev)
 */
const BASE_NAV_ITEMS: NavItem[] = [
  { to: '/', i18nKey: 'nav.home', icon: HomeIcon },
  { to: '/collections', i18nKey: 'nav.collections', icon: Grid2X2 },
  { to: '/products', i18nKey: 'nav.products', icon: Package },
  { to: '/materials', i18nKey: 'nav.materials', icon: Layers },
  { to: '/pricelist', i18nKey: 'nav.pricelist', icon: FileSpreadsheet },
  { to: '/settings', i18nKey: 'nav.settings', icon: Settings },
  { to: '/journal', i18nKey: 'nav.journal', icon: BookOpenCheck },
]

/**
 * Получить i18n-ключ заголовка страницы по пути
 */
function getTitleKeyByPath(pathname: string, items: NavItem[]): string {
  const item = items.find((n) => n.to === pathname)
  return item?.i18nKey || 'nav.home'
}

/**
 * Локальный fallback для подписи i18n-ключей.
 */
function labelFallback(i18nKey: string, lang: string): string {
  const L = (r: string, e: string, k: string) => (lang.startsWith('en') ? e : lang.startsWith('ky') ? k : r)

  switch (i18nKey) {
    case 'nav.home': return L('Главная', 'Home', 'Башкы')
    case 'nav.collections': return L('Коллекции', 'Collections', 'Коллекциялар')
    case 'nav.products': return L('Изделия', 'Products', 'Буюмдар')
    case 'nav.materials': return L('Материалы', 'Materials', 'Материалдар')
    case 'nav.pricelist': return L('Прайс-лист', 'Price List', 'Баа тизмеси')
    case 'nav.settings': return L('Настройки', 'Settings', 'Жөндөөлөр')
    case 'nav.journal': return L('Журнал', 'Journal', 'Журнал')
    case 'nav.dev': return L('Dev', 'Dev', 'Dev')
    default: return i18nKey
  }
}

/**
 * SidebarLink — ссылка в боковой панели с улучшенной accessibility
 */
interface SidebarLinkProps {
  to: string
  i18nKey: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  active: boolean
  onClick?: () => void
}

const SidebarLink = memo(function SidebarLink({ to, i18nKey, icon: Icon, active, onClick }: SidebarLinkProps) {
  const { t, i18n } = useTranslation()
  const label = t(i18nKey, { defaultValue: labelFallback(i18nKey, i18n.language || 'ru') })

  return (
    <Link
      to={to}
      onClick={onClick}
      className={`
        group flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-all duration-200
        focus-enhanced mobile-touch button-enhanced
        ${active 
          ? 'text-white font-medium shadow-sm' 
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        }
      `}
      aria-current={active ? 'page' : undefined}
      title={label}
      style={
        active
          ? {
              backgroundColor: 'var(--accent-600)',
              color: 'white',
            }
          : undefined
      }
    >
      <Icon
        size={18}
        className={active ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'}
      />
      <span className="truncate">{label}</span>
    </Link>
  )
})

/**
 * Соответствие языку — локали форматирования даты
 */
function localeForLang(lang: string): string {
  if (lang.startsWith('ky')) return 'ky-KG'
  if (lang.startsWith('en')) return 'en-US'
  return 'ru-RU'
}

/** Состояние статуса Supabase */
type SupaStatus = 'idle' | 'checking' | 'ok' | 'error'

/**
 * AppShell — каркас с full-width layout и full-height sidebar
 */
const AppShell = memo(function AppShell(): React.ReactElement {
  const { pathname } = useLocation()
  const { i18n, t } = useTranslation()

  /** Применяем сохранённую тему и акцент сразу при монтировании */
  useEffect(() => {
    applyStoredTheme()
    try {
      applyAccent(readAccent())
    } catch {}
  }, [])

  /** Управление мобильным сайдбаром с улучшенной accessibility */
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false)
  
  const closeSidebar = useCallback(() => {
    setSidebarOpen(false)
    // Возвращаем фокус на кнопку меню
    setTimeout(() => {
      const menuButton = document.querySelector('[aria-label="Открыть меню"]') as HTMLElement
      menuButton?.focus()
    }, 100)
  }, [])
  
  const openSidebar = useCallback(() => {
    setSidebarOpen(true)
    // Фокус на первую ссылку в сайдбаре
    setTimeout(() => {
      const firstLink = document.querySelector('.sidebar-mobile nav a') as HTMLElement
      firstLink?.focus()
    }, 100)
  }, [])

  // Закрытие сайдбара по Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && sidebarOpen) {
        closeSidebar()
      }
    }

    if (sidebarOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [sidebarOpen, closeSidebar])

  /** Стартовый лоадер (кратковременно) */
  const [booting, setBooting] = useState<boolean>(true)
  useEffect(() => {
    const tmr = setTimeout(() => setBooting(false), 450)
    return () => clearTimeout(tmr)
  }, [])

  /** Видимость Dev-пункта: по флагу LS или если Supabase включён */
  const [devVisible, setDevVisible] = useState<boolean>(false)

  /**
   * Пересчёт видимости Dev-пункта
   */
  const recomputeDevVisible = useCallback(() => {
    try {
      const lsFlag = localStorage.getItem('wasser_devtools') === '1'
      const supaOn = isSupabaseEnabled()
      setDevVisible(Boolean(lsFlag || supaOn))
    } catch {
      setDevVisible(false)
    }
  }, [])

  /** Состояние статуса Supabase для индикатора в шапке */
  const [supa, setSupa] = useState<{ enabled: boolean; status: SupaStatus }>({ 
    enabled: false, 
    status: 'idle' 
  })

  /**
   * Проверка статуса Supabase
   */
  const checkSupa = useCallback(async () => {
    const enabled = isSupabaseEnabled()
    if (!enabled) {
      setSupa({ enabled: false, status: 'idle' })
      return
    }
    setSupa({ enabled: true, status: 'checking' })
    try {
      const ok = await testSupabaseConnection('materials')
      setSupa({ enabled: true, status: ok ? 'ok' : 'error' })
    } catch {
      setSupa({ enabled: true, status: 'error' })
    }
  }, [])

  useEffect(() => {
    recomputeDevVisible()
    checkSupa()

    const onStorage = (e: StorageEvent) => {
      if (e.key === 'wasser_devtools' || e.key === 'wasser_supabase_cfg') {
        recomputeDevVisible()
        checkSupa()
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [recomputeDevVisible, checkSupa])

  /** Итоговый список пунктов навигации с учётом Dev */
  const navItems: NavItem[] = useMemo(() => {
    const items = [...BASE_NAV_ITEMS]
    if (devVisible) {
      items.push({ to: '/dev', i18nKey: 'nav.dev', icon: SatelliteDish })
    }
    return items
  }, [devVisible])

  /** Активный путь для подсветки */
  const activePath = pathname

  /** Ключ заголовка страницы */
  const titleKey = useMemo(() => getTitleKeyByPath(activePath, navItems), [activePath, navItems])

  /** Форматирование текущей даты/времени с учётом языка */
  const nowString = useMemo(() => {
    try {
      const loc = localeForLang(i18n.language || 'ru')
      return new Date().toLocaleString(loc, { dateStyle: 'medium', timeStyle: 'short' })
    } catch {
      return new Date().toLocaleString()
    }
  }, [i18n.language])

  /**
   * Локализованная подпись статуса Supabase для бейджа
   */
  const supaStatusLabel = (enabled: boolean, status: SupaStatus, lang: string): string => {
    const L = (r: string, e: string, k: string) => (lang.startsWith('en') ? e : lang.startsWith('ky') ? k : r)
    if (!enabled) return L('Выключено', 'Disabled', 'Өчүрүлгөн')
    if (status === 'checking') return L('Проверка', 'Checking', 'Текшерүү')
    if (status === 'ok') return L('Онлайн', 'Online', 'Онлайн')
    return L('Офлайн', 'Offline', 'Оффлайн')
  }

  /**
   * Вспомогательный рендер: маленький бейдж статуса Supabase в шапке
   */
  const renderSupaPill = () => {
    const colorDot =
      supa.enabled
        ? supa.status === 'ok'
          ? 'bg-emerald-500'
          : supa.status === 'checking'
            ? 'bg-yellow-500'
            : 'bg-red-500'
        : 'bg-gray-400'

    return (
      <div 
        className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-full bg-gray-100 text-xs"
        title={`Supabase: ${supaStatusLabel(supa.enabled, supa.status, i18n.language || 'ru')}`}
      >
        <div className={`w-2 h-2 rounded-full ${colorDot}`} />
        <span className="text-gray-600">
          {supa.enabled ? (supa.status === 'checking' ? '...' : supa.status.toUpperCase()) : 'OFF'}
        </span>
      </div>
    )
  }

  if (booting) {
    return <LoadingOverlay />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--bg-from,#f8fafc)] to-[var(--bg-to,#eff6ff)] ios-viewport-fix">
      {/* Шапка - sticky для прокрутки */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-gray-200/70">
        <div className="px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Левый блок: кнопка меню + заголовок */}
          <div className="flex items-center gap-3">
            <button
              className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 focus-enhanced mobile-touch button-enhanced"
              onClick={openSidebar}
              aria-label="Открыть меню"
              title="Меню"
            >
              <Menu size={18} />
            </button>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900">
              {t(titleKey, { defaultValue: labelFallback(titleKey, i18n.language || 'ru') })}
            </h1>
          </div>

          {/* Правый блок: статус Supabase + дата + язык + тема + акцент */}
          <div className="flex items-center gap-2">
            {renderSupaPill()}
            <div className="hidden sm:block text-xs sm:text-sm text-gray-500">{nowString}</div>
            <LanguageSwitcher />
            <ThemeToggle />
            <AccentThemeSwitcher />
          </div>
        </div>
      </header>

      {/* Основной layout контейнер - FULL HEIGHT */}
      <div className="flex h-[calc(100vh-4rem)]"> {/* Вычитаем высоту header */}
        
        {/* Сайдбар: desktop - FULL HEIGHT */}
        <aside className="hidden md:flex w-72 flex-col bg-white/90 backdrop-blur-lg border-r border-gray-200/70 flex-shrink-0">
          {/* Верхняя секция с логотипом */}
          <div className="px-5 py-5 border-b border-gray-200/70 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl text-white flex items-center justify-center shadow-md"
                style={{ backgroundColor: 'var(--accent-600)' }}
                title="WASSER PRO"
              >
                <Droplets size={20} />
              </div>
              <div>
                <div className="text-base font-extrabold text-gray-900 tracking-tight">WASSER PRO</div>
                <div className="text-xs text-gray-500">Управление витриной и прайсом</div>
              </div>
            </div>
          </div>
          
          {/* Навигация - растягивается */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
            {navItems.map((item) => (
              <SidebarLink
                key={item.to}
                to={item.to}
                i18nKey={item.i18nKey}
                icon={item.icon}
                active={activePath === item.to}
              />
            ))}
          </nav>
          
          {/* Footer - закреплён внизу */}
          <div className="px-5 py-4 border-t border-gray-200/70 text-center text-xs text-gray-500 flex-shrink-0">
            © {new Date().getFullYear()} WASSER PRO
          </div>
        </aside>

        {/* Сайдбар: mobile drawer */}
        {sidebarOpen && (
          <>
            {/* Backdrop с правильным z-index */}
            <div 
              className="fixed inset-0 bg-black/40 backdrop-blur-[2px] md:hidden mobile-menu-backdrop"
              onClick={closeSidebar}
              aria-hidden="true"
            />
            
            {/* Mobile sidebar с focus trap - FULL HEIGHT */}
            <div 
              className="fixed inset-y-0 left-0 w-72 md:hidden flex flex-col sidebar-mobile mobile-menu-panel"
              role="dialog"
              aria-modal="true"
              aria-label="Навигационное меню"
            >
              {/* Заголовок mobile sidebar */}
              <div className="px-4 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2">
                  <div
                    className="w-9 h-9 rounded-lg text-white flex items-center justify-center"
                    style={{ backgroundColor: 'var(--accent-600)' }}
                  >
                    <Droplets size={18} />
                  </div>
                  <div className="text-sm font-bold text-gray-900">WASSER PRO</div>
                </div>
                <button
                  className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 focus-enhanced mobile-touch button-enhanced"
                  onClick={closeSidebar}
                  aria-label="Закрыть меню"
                >
                  <X size={16} />
                </button>
              </div>
              
              {/* Навигация mobile */}
              <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
                {navItems.map((item) => (
                  <SidebarLink
                    key={item.to}
                    to={item.to}
                    i18nKey={item.i18nKey}
                    icon={item.icon}
                    active={activePath === item.to}
                    onClick={closeSidebar}
                  />
                ))}
              </nav>
              
              {/* Footer mobile */}
              <div className="px-5 py-4 border-t border-gray-200 text-center text-xs text-gray-500 flex-shrink-0">
                © {new Date().getFullYear()}
              </div>
            </div>
          </>
        )}

        {/* Контент - FULL WIDTH без ограничений */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 sm:p-6 h-full">
              {/* УБРАНО max-w-6xl ограничение для использования полной ширины */}
              <div className="h-full">
                <ErrorBoundary title="Ошибка на странице" message="Попробуйте обновить или вернуться позже.">
                  <Outlet />
                </ErrorBoundary>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
})

export default AppShell