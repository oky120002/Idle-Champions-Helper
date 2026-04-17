import type { RefObject } from 'react'
import type { AppLocale } from './i18n'
import { MobileMenuIcon } from './AppIcons'
import type { AppNavigationItem, LocaleOption, TranslationFn } from './appNavigation'
import { ToolbarLocaleSwitcher } from './LocaleSwitcher'

interface HeaderTopbarProps {
  activeLocaleOption: LocaleOption
  activeNavigationItem: AppNavigationItem
  isLocaleMenuOpen: boolean
  isMobileNavOpen: boolean
  locale: AppLocale
  localeSwitcherRef: RefObject<HTMLDivElement | null>
  onLocaleSelect: (locale: AppLocale) => void
  onLocaleToggle: () => void
  onMobileNavToggle: () => void
  t: TranslationFn
}

export function HeaderTopbar({
  activeLocaleOption,
  activeNavigationItem,
  isLocaleMenuOpen,
  isMobileNavOpen,
  locale,
  localeSwitcherRef,
  onLocaleSelect,
  onLocaleToggle,
  onMobileNavToggle,
  t,
}: HeaderTopbarProps) {
  return (
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
        <ToolbarLocaleSwitcher
          activeLocaleOption={activeLocaleOption}
          isOpen={isLocaleMenuOpen}
          locale={locale}
          localeSwitcherRef={localeSwitcherRef}
          onSelect={onLocaleSelect}
          onToggle={onLocaleToggle}
          t={t}
        />

        <button
          type="button"
          className={isMobileNavOpen ? 'site-header__menu-toggle site-header__menu-toggle--active' : 'site-header__menu-toggle'}
          aria-controls="site-primary-nav"
          aria-expanded={isMobileNavOpen}
          aria-label={isMobileNavOpen ? t({ zh: '收起主导航', en: 'Close primary navigation' }) : t({ zh: '展开主导航', en: 'Open primary navigation' })}
          onClick={onMobileNavToggle}
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
  )
}
