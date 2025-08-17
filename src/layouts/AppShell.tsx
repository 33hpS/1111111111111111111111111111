/**
 * AppShell.tsx - ТОЧНОЕ исправление для полной ширины экрана
 * Заменить ПОЛНОСТЬЮ содержимое файла src/layouts/AppShell.tsx
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
 * NavItem — пункт боковой навигации
 */
interface NavItem {
  to: string
  i18nKey: string
  icon: React.ComponentType<{ size?: number; className?: string }>
}

/**
 * Базовый список пунктов навигации
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

function getTitleKeyByPath(pathname: string, items: NavItem[]): string {
  const item = items.find((n) => n.to === pathname)
  return item?.i18nKey || 'nav.home'
}

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
 * SidebarLink — ссылка в боковой панели
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

function localeForLang(lang: string): string {
  if (lang.startsWith('ky')) return 'ky-KG'
  if (lang.startsWith('en')) return 'en-US'
  return 'ru-RU'
}

type SupaStatus = 'idle' | 'checking' | 'ok' | 'error'

/**
 * AppShell — ИСПРАВЛЕННЫЙ layout с полной шириной
 */
const AppShell = memo(function AppShell(): React.ReactElement {
  const { pathname } = useLocation()
  const { i18n, t } = useTranslation()

  useEffect(() => {
    applyStoredTheme()
    try {
      applyAccent(readAccent())
    } catch {}
  }, [])

  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false)
  
  const closeSidebar = useCallback(() => {
    setSidebarOpen(false)
  }, [])
  
  const openSidebar = useCallback(() => {
    setSidebarOpen(true)
  }, [])

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

  const [booting, setBooting] = useState<boolean>(true)
  useEffect(() => {
    const tmr = setTimeout(() => setBooting(false), 450)
    return () => clearTimeout(tmr)
  }, [])

  const [devVisible, setDevVisible] = useState<boolean>(false)

  const recomputeDevVisible = useCallback(() => {
    try {
      const lsFlag = localStorage.getItem('wasser_devtools') === '1'
      const supaOn = isSupabaseEnabled()
      setDevVisible(Boolean(lsFlag || supaOn))
    } catch {
      setDevVisible(false)
    }
  }, [])

  const [supa, setSupa] = useState<{ enabled: boolean; status: SupaStatus }>({ 
    enabled: false, 
    status: 'idle' 
  })

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

  const navItems: NavItem[] = useMemo(() => {
    const items = [...BASE_NAV_ITEMS]
    if (devVisible) {
      items.push({ to: '/dev', i18nKey: 'nav.dev', icon: SatelliteDish })
    }
    return items
  }, [devVisible])

  const activePath = pathname
  const titleKey = useMemo(() => getTitleKeyByPath(activePath, navItems), [activePath, navItems])

  const nowString = useMemo(() => {
    try {
      const loc = localeForLang(i18n.language || 'ru')
      return new Date().toLocaleString(loc, { dateStyle: 'medium', timeStyle: 'short' })
    } catch {
      return new Date().toLocaleString()
    }
  }, [i18n.language])

  const supaStatusLabel = (enabled: boolean, status: SupaStatus, lang: string): string => {
    const L = (r: string, e: string, k: string) => (lang.startsWith('en') ? e : lang.startsWith('ky') ? k : r)
    if (!enabled) return L('Выключено', 'Disabled', 'Өчүрүлгөн')
    if (status === 'checking') return L('Проверка', 'Checking', 'Текшерүү')
    if (status === 'ok') return L('Онлайн', 'Online', 'Онлайн')
    return L('Офлайн', 'Offline', 'Оффлайн')
  }

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
    <>
      {/* ПОЛНЫЙ ЭКРАН LAYOUT */}
      <div className="h-screen w-screen overflow-hidden bg-gradient-to-br from-[var(--bg-from,#f8fafc)] to-[var(--bg-to,#eff6ff)]">
        
        {/* Header - фиксированный сверху */}
        <header className="h-16 bg-white/80 backdrop-blur-lg border-b border-gray-200/70 flex items-center justify-between px-4 sm:px-6 relative z-30">
          {/* Левый блок */}
          <div className="flex items-center gap-3">
            <button
              className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 transition-colors"
              onClick={openSidebar}
              aria-label="Открыть меню"
            >
              <Menu size={18} />
            </button>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900">
              {t(titleKey, { defaultValue: labelFallback(titleKey, i18n.language || 'ru') })}
            </h1>
          </div>

          {/* Правый блок */}
          <div className="flex items-center gap-2">
            {renderSupaPill()}
            <div className="hidden sm:block text-xs sm:text-sm text-gray-500">{nowString}</div>
            <LanguageSwitcher />
            <ThemeToggle />
            <AccentThemeSwitcher />
          </div>
        </header>

        {/* Основной контейнер - ПОЛНАЯ ВЫСОТА без header */}
        <div className="h-[calc(100vh-4rem)] flex">
          
          {/* SIDEBAR - ПОЛНАЯ ВЫСОТА */}
          <aside className="hidden md:flex w-80 bg-white/90 backdrop-blur-lg border-r border-gray-200/70 flex-col">
            {/* Логотип */}
            <div className="p-6 border-b border-gray-200/70">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-xl text-white flex items-center justify-center shadow-md"
                  style={{ backgroundColor: 'var(--accent-600)' }}
                >
                  <Droplets size={24} />
                </div>
                <div>
                  <div className="text-lg font-extrabold text-gray-900 tracking-tight">WASSER PRO</div>
                  <div className="text-sm text-gray-500">Управление витриной и прайсом</div>
                </div>
              </div>
            </div>
            
            {/* Навигация - растягивается */}
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
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
            
            {/* Footer - внизу */}
            <div className="p-4 border-t border-gray-200/70 text-center text-sm text-gray-500">
              © {new Date().getFullYear()} WASSER PRO
            </div>
          </aside>

          {/* Mobile Sidebar */}
          {sidebarOpen && (
            <>
              <div 
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 md:hidden"
                onClick={closeSidebar}
              />
              
              <div className="fixed inset-y-0 left-0 w-80 bg-white/95 backdrop-blur-lg border-r border-gray-200 shadow-xl z-50 md:hidden flex flex-col">
                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-10 h-10 rounded-lg text-white flex items-center justify-center"
                      style={{ backgroundColor: 'var(--accent-600)' }}
                    >
                      <Droplets size={20} />
                    </div>
                    <div className="font-bold text-gray-900">WASSER PRO</div>
                  </div>
                  <button
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-700"
                    onClick={closeSidebar}
                  >
                    <X size={20} />
                  </button>
                </div>
                
                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
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
                
                <div className="p-4 border-t border-gray-200 text-center text-sm text-gray-500">
                  © {new Date().getFullYear()}
                </div>
              </div>
            </>
          )}

          {/* CONTENT - ПОЛНАЯ ШИРИНА ОСТАВШЕГОСЯ ПРОСТРАНСТВА */}
          <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto">
              <div className="p-6">
                {/* УБРАНО max-w-6xl - контент на всю ширину! */}
                <ErrorBoundary title="Ошибка на странице" message="Попробуйте обновить или вернуться позже.">
                  <Outlet />
                </ErrorBoundary>
              </div>
            </div>
          </main>
        </div>
      </div>
    </>
  )
})

export default AppShell