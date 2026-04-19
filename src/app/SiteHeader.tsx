import type { AppLocale } from './i18n'
import type { AppNavigationItem } from './appNavigation'
import { HeaderTopbar } from './HeaderTopbar'
import { PrimaryNavigation } from './PrimaryNavigation'
import { useSiteHeaderState } from './useSiteHeaderState'

interface SiteHeaderProps {
  activeNavigationItem: AppNavigationItem
  locale: AppLocale
  setLocale: (locale: AppLocale) => void
  pathname: string
  t: (text: { zh: string; en: string }) => string
}

export function SiteHeader({ activeNavigationItem, locale, setLocale, pathname, t }: SiteHeaderProps) {
  const { closeMobileNav, headerClassName, isMobileNavOpen, toggleMobileNav } = useSiteHeaderState(pathname)

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
          <div className="site-header__copy">
            <div className="site-header__title-line">
              <h1 className="site-title">{t({ zh: '个人成长决策台', en: 'Growth-Oriented Formation Desk' })}</h1>
              <p className="site-subtitle">
                {t({
                  zh: '筛英雄 · 查立绘 · 排阵型 · 存方案',
                  en: 'Filters · Art · Formations · Presets',
                })}
              </p>
            </div>
          </div>
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
