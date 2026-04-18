import type { AppLocale } from './i18n'
import { navigation, isNavigationItemActive } from './appNavigation'
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
  const fallbackNavigationItem = navigation[0]

  if (!fallbackNavigationItem) {
    throw new Error('Site navigation requires at least one navigation item.')
  }

  const { closeMobileNav, headerClassName, isMobileNavOpen, toggleMobileNav } = useSiteHeaderState(pathname)
  const activeNavigationItem =
    navigation.find((item) => isNavigationItemActive(pathname, item.to)) ?? fallbackNavigationItem

  const handleLocaleSelect = (nextLocale: AppLocale) => setLocale(nextLocale)

  return (
    <header className={headerClassName}>
      <HeaderTopbar
        activeNavigationItem={activeNavigationItem}
        isMobileNavOpen={isMobileNavOpen}
        locale={locale}
        onLocaleSelect={handleLocaleSelect}
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
