import type { AppLocale } from './i18n'
import type { AppNavigationItem } from './appNavigation'
import { HeaderTopbar } from './HeaderTopbar'
import { PrimaryNavigation } from './PrimaryNavigation'
import { useSiteHeaderState } from './useSiteHeaderState'
import { useDataVersionState } from '../data/useDataVersionState'

interface SiteHeaderProps {
  activeNavigationItem: AppNavigationItem
  locale: AppLocale
  setLocale: (locale: AppLocale) => void
  pathname: string
  t: (text: { zh: string; en: string }) => string
}

export function SiteHeader({ activeNavigationItem, locale, setLocale, pathname, t }: SiteHeaderProps) {
  const { closeMobileNav, headerClassName, isMobileNavOpen, toggleMobileNav } = useSiteHeaderState(pathname)
  const dataVersionState = useDataVersionState()
  const dataUpdatedAt = dataVersionState.status === 'ready' ? dataVersionState.data.updatedAt : null

  const handleLocaleSelect = (nextLocale: AppLocale) => setLocale(nextLocale)

  return (
    <header className={headerClassName}>
      <HeaderTopbar
        activeNavigationItem={activeNavigationItem}
        dataUpdatedAt={dataUpdatedAt}
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
