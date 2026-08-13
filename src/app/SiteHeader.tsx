import { useDataVersionState } from '../data/useDataVersionState'
import type { LocaleText, TranslateParams, AppLocale  } from "./i18n"
import type { AppNavigationItem } from './appNavigation'
import { HeaderTopbar } from './HeaderTopbar'
import { PrimaryNavigation } from './PrimaryNavigation'
import { useSiteHeaderState } from './useSiteHeaderState'

interface SiteHeaderProps {
  readonly activeNavigationItem: AppNavigationItem
  readonly locale: AppLocale
  readonly setLocale: (locale: AppLocale) => void
  readonly pathname: string
  readonly t: (text: string | LocaleText, params?: TranslateParams) => string
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
              <h1 className="site-title">{t("最佳阵型推算")}</h1>
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
