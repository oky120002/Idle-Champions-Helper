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
              zh: '筛英雄、查立绘、比变体、排阵型、存方案；所有判断都建立在本地版本化的官方数据上。',
              en: 'Filter champions, inspect illustrations, compare variants, draft formations, and save presets on top of local versioned official data.',
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
