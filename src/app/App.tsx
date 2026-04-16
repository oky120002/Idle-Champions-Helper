import { useEffect, useRef, useState } from 'react'
import { NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { ChampionDetailPage } from '../pages/ChampionDetailPage'
import { ChampionsPage } from '../pages/ChampionsPage'
import { FormationPage } from '../pages/FormationPage'
import { HomePage } from '../pages/HomePage'
import { IllustrationsPage } from '../pages/IllustrationsPage'
import { PresetsPage } from '../pages/PresetsPage'
import { UserDataPage } from '../pages/UserDataPage'
import { VariantsPage } from '../pages/VariantsPage'
import { type AppLocale, type LocaleText, useI18n } from './i18n'

const navigation: Array<{ to: string; label: LocaleText }> = [
  { to: '/', label: { zh: '总览', en: 'Overview' } },
  { to: '/champions', label: { zh: '英雄筛选', en: 'Champions' } },
  { to: '/illustrations', label: { zh: '立绘页', en: 'Illustrations' } },
  { to: '/variants', label: { zh: '变体限制', en: 'Variants' } },
  { to: '/formation', label: { zh: '阵型编辑', en: 'Formation' } },
  { to: '/presets', label: { zh: '方案存档', en: 'Presets' } },
  { to: '/user-data', label: { zh: '个人数据', en: 'User Data' } },
]

const localeOptions: Array<{ id: AppLocale; shortLabel: string; title: string }> = [
  { id: 'zh-CN', shortLabel: '中', title: '中文' },
  { id: 'en-US', shortLabel: 'EN', title: 'English' },
]

function getNavClassName(isActive: boolean): string {
  return isActive ? 'nav-link nav-link--active' : 'nav-link'
}

function isNavigationItemActive(pathname: string, to: string): boolean {
  if (to === '/') {
    return pathname === '/'
  }

  return pathname === to || pathname.startsWith(`${to}/`)
}

function MobileMenuIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      {isOpen ? (
        <>
          <path d="M6.5 6.5 17.5 17.5" strokeLinecap="round" />
          <path d="M17.5 6.5 6.5 17.5" strokeLinecap="round" />
        </>
      ) : (
        <>
          <path d="M4.5 7h15" strokeLinecap="round" />
          <path d="M4.5 12h15" strokeLinecap="round" />
          <path d="M4.5 17h15" strokeLinecap="round" />
        </>
      )}
    </svg>
  )
}

function DisclosureCaretIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      {isOpen ? <path d="M6 14.5 12 9.5 18 14.5" strokeLinecap="round" strokeLinejoin="round" /> : <path d="M6 9.5 12 14.5 18 9.5" strokeLinecap="round" strokeLinejoin="round" />}
    </svg>
  )
}

export function App() {
  const { locale, setLocale, t } = useI18n()
  const location = useLocation()
  const localeSwitcherRef = useRef<HTMLDivElement | null>(null)
  const [mobileNavState, setMobileNavState] = useState(() => ({
    isOpen: false,
    pathname: location.pathname,
  }))
  const [isLocaleMenuOpen, setLocaleMenuOpen] = useState(false)
  const [scrollY, setScrollY] = useState(() => (typeof window === 'undefined' ? 0 : window.scrollY))
  const isHomeRoute = location.pathname === '/'
  const isMobileNavOpen = mobileNavState.isOpen && mobileNavState.pathname === location.pathname
  const isHeaderCondensed = !isHomeRoute && Math.max(scrollY, typeof window === 'undefined' ? 0 : window.scrollY) > 56
  const activeNavigationItem = navigation.find((item) => isNavigationItemActive(location.pathname, item.to)) ?? navigation[0]
  const activeLocaleOption = localeOptions.find((option) => option.id === locale) ?? localeOptions[0]

  useEffect(() => {
    const syncScrollY = () => {
      setScrollY(window.scrollY)
    }

    window.addEventListener('scroll', syncScrollY, { passive: true })

    return () => {
      window.removeEventListener('scroll', syncScrollY)
    }
  }, [])

  useEffect(() => {
    if (!isLocaleMenuOpen) {
      return
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!localeSwitcherRef.current || !(event.target instanceof Node)) {
        return
      }

      if (!localeSwitcherRef.current.contains(event.target)) {
        setLocaleMenuOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setLocaleMenuOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isLocaleMenuOpen])

  const headerClassName = [
    'site-header',
    !isHomeRoute ? 'site-header--subpage' : '',
    isHeaderCondensed ? 'site-header--condensed' : '',
    isMobileNavOpen ? 'site-header--mobile-nav-open' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const renderLocaleButtons = (surface: 'toolbar' | 'panel') =>
    localeOptions.map((option) => (
      <button
        key={`${surface}-${option.id}`}
        type="button"
        className={
          locale === option.id ? 'locale-switcher__button locale-switcher__button--active' : 'locale-switcher__button'
        }
        onClick={() => {
          setLocale(option.id)
          if (surface === 'toolbar') {
            setLocaleMenuOpen(false)
          }
        }}
      >
        <span className="locale-switcher__button-title">{option.title}</span>
        <span className="locale-switcher__button-short" aria-hidden="true">
          {option.shortLabel}
        </span>
      </button>
    ))

  return (
    <div className="app-shell">
      <div className="background-orb background-orb--one" />
      <div className="background-orb background-orb--two" />

      <header className={headerClassName}>
        <div className="site-header__topbar">
          <div className="site-header__brand-group">
            <p className="site-kicker">{t({ zh: 'Idle Champions 辅助站', en: 'Idle Champions Helper' })}</p>
            <div className="site-header__compact-brand" aria-hidden="true">
              <span className="site-header__compact-mark" />
              <span className="site-header__compact-title">
                {t({ zh: '个人成长决策台', en: 'Growth-Oriented Formation Desk' })}
              </span>
            </div>
          </div>
          <div className="site-header__topbar-actions">
            <div
              ref={localeSwitcherRef}
              className={isLocaleMenuOpen ? 'locale-switcher locale-switcher--toolbar locale-switcher--open' : 'locale-switcher locale-switcher--toolbar'}
            >
              <button
                type="button"
                className="locale-switcher__trigger"
                aria-expanded={isLocaleMenuOpen}
                aria-haspopup="true"
                aria-label={t({
                  zh: `界面语言，当前${activeLocaleOption.title}`,
                  en: `Interface language, current ${activeLocaleOption.title}`,
                })}
                onClick={() => setLocaleMenuOpen((current) => !current)}
              >
                <span className="locale-switcher__trigger-copy">
                  <span className="locale-switcher__trigger-label">{t({ zh: '界面语言', en: 'Locale' })}</span>
                  <strong className="locale-switcher__trigger-value">{activeLocaleOption.title}</strong>
                </span>
                <span className="locale-switcher__trigger-icon">
                  <DisclosureCaretIcon isOpen={isLocaleMenuOpen} />
                </span>
              </button>
              {isLocaleMenuOpen ? (
                <div
                  className="locale-switcher__controls"
                  role="group"
                  aria-label={t({ zh: '界面语言切换', en: 'Interface language switcher' })}
                >
                  {renderLocaleButtons('toolbar')}
                </div>
              ) : null}
            </div>

            <button
              type="button"
              className={isMobileNavOpen ? 'site-header__menu-toggle site-header__menu-toggle--active' : 'site-header__menu-toggle'}
              aria-controls="site-primary-nav"
              aria-expanded={isMobileNavOpen}
              aria-label={isMobileNavOpen ? t({ zh: '收起主导航', en: 'Close primary navigation' }) : t({ zh: '展开主导航', en: 'Open primary navigation' })}
              onClick={() =>
                setMobileNavState((current) => ({
                  isOpen: current.pathname === location.pathname ? !current.isOpen : true,
                  pathname: location.pathname,
                }))
              }
            >
              <span className="site-header__menu-toggle-copy">
                <span className="site-header__menu-toggle-label">{t({ zh: '快速导航', en: 'Quick nav' })}</span>
                <strong className="site-header__menu-toggle-value">{t(activeNavigationItem.label)}</strong>
              </span>
              <span className="site-header__menu-toggle-indicator">
                <span className="site-header__menu-toggle-indicator-icon">
                  <MobileMenuIcon isOpen={isMobileNavOpen} />
                </span>
                <span className="site-header__menu-toggle-indicator-text">
                  {isMobileNavOpen ? t({ zh: '收起', en: 'Close' }) : t({ zh: '展开', en: 'Open' })}
                </span>
              </span>
            </button>
          </div>
        </div>

        <div className="site-header__content-shell">
          <div className="site-header__content">
            <h1 className="site-title">{t({ zh: '个人成长决策台', en: 'Growth-Oriented Formation Desk' })}</h1>
            <p className="site-subtitle">
              {t({
                zh: '先把查询、筛选、阵型和保存做扎实，再逐步扩到推荐层。',
                en: 'Nail search, filtering, formations, and saves first, then grow into explainable recommendations.',
              })}
            </p>
          </div>
        </div>

        <nav
          id="site-primary-nav"
          className={isMobileNavOpen ? 'site-nav site-nav--mobile-open' : 'site-nav'}
          aria-label={t({ zh: '主导航', en: 'Primary navigation' })}
        >
          <div className="site-nav__mobile-head" aria-hidden="true">
            <span className="site-nav__eyebrow">{t({ zh: '切换工作台', en: 'Switch workspaces' })}</span>
            <div className="site-nav__summary">
              <strong>{t(activeNavigationItem.label)}</strong>
              <span>
                {t({
                  zh: '在资料、阵型、限制与个人数据之间快速跳转，不依赖横向滑动。',
                  en: 'Jump between lookup, formations, restrictions, and personal data without horizontal scrolling.',
                })}
              </span>
            </div>
          </div>
          {navigation.map((item, index) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => getNavClassName(isActive)}
              onClick={() =>
                setMobileNavState({
                  isOpen: false,
                  pathname: location.pathname,
                })
              }
            >
              <span className="nav-link__index" aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="nav-link__label">{t(item.label)}</span>
            </NavLink>
          ))}
          <div className="site-nav__locale-panel">
            <span className="site-nav__eyebrow">{t({ zh: '低频设置', en: 'Low-frequency setting' })}</span>
            <div className="site-nav__locale-card">
              <div className="site-nav__locale-copy">
                <strong>{t({ zh: '界面语言', en: 'Interface language' })}</strong>
                <span>
                  {t({
                    zh: '这个站点默认按当前语言继续浏览；只有需要时再在菜单里切换。',
                    en: 'The site stays in the current language by default, so switching lives inside the menu.',
                  })}
                </span>
              </div>
              <div className="locale-switcher locale-switcher--panel">
                <div
                  className="locale-switcher__controls"
                  role="group"
                  aria-label={t({ zh: '界面语言切换', en: 'Interface language switcher' })}
                >
                  {renderLocaleButtons('panel')}
                </div>
              </div>
            </div>
          </div>
        </nav>
      </header>

      <main className="site-main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/champions" element={<ChampionsPage />} />
          <Route path="/champions/:championId" element={<ChampionDetailPage />} />
          <Route path="/illustrations" element={<IllustrationsPage />} />
          <Route path="/variants" element={<VariantsPage />} />
          <Route path="/formation" element={<FormationPage />} />
          <Route path="/presets" element={<PresetsPage />} />
          <Route path="/user-data" element={<UserDataPage />} />
          <Route path="*" element={<HomePage />} />
        </Routes>
      </main>
    </div>
  )
}
