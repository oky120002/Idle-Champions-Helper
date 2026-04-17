import type { AppLocale } from './i18n'
import { localeOptions, navigation, isNavigationItemActive } from './appNavigation'
import { HeaderTopbar } from './HeaderTopbar'
import { PrimaryNavigation } from './PrimaryNavigation'
import { useSiteHeaderState } from './useSiteHeaderState'

interface SiteHeaderProps {
  locale: AppLocale
  setLocale: (locale: AppLocale) => void
  pathname: string
  t: (text: { zh: string; en: string }) => string
}

export function SiteHeader({ locale, setLocale, pathname, t }: SiteHeaderProps) {
  const {
    closeMobileNav,
    headerClassName,
    isLocaleMenuOpen,
    isMobileNavOpen,
    localeSwitcherRef,
    setLocaleMenuOpen,
    toggleMobileNav,
  } = useSiteHeaderState(pathname)
  const activeNavigationItem = navigation.find((item) => isNavigationItemActive(pathname, item.to)) ?? navigation[0]
  const activeLocaleOption = localeOptions.find((option) => option.id === locale) ?? localeOptions[0]

  const handleLocaleSelect = (nextLocale: AppLocale) => {
    setLocale(nextLocale)
    setLocaleMenuOpen(false)
  }

  return (
    <header className={headerClassName}>
      <HeaderTopbar
        activeLocaleOption={activeLocaleOption}
        activeNavigationItem={activeNavigationItem}
        isLocaleMenuOpen={isLocaleMenuOpen}
        isMobileNavOpen={isMobileNavOpen}
        locale={locale}
        localeSwitcherRef={localeSwitcherRef}
        onLocaleSelect={handleLocaleSelect}
        onLocaleToggle={() => setLocaleMenuOpen((current) => !current)}
        onMobileNavToggle={toggleMobileNav}
        t={t}
      />

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

      <PrimaryNavigation
        activeNavigationItem={activeNavigationItem}
        isMobileNavOpen={isMobileNavOpen}
        locale={locale}
        onLocaleSelect={handleLocaleSelect}
        onNavigate={closeMobileNav}
        t={t}
      />
    </header>
  )
}
