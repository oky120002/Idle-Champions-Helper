import type { AppLocale } from './i18n'
import { MobileMenuIcon } from './AppIcons'
import type { AppNavigationItem, TranslationFn } from './appNavigation'
import { ToolbarLocaleSwitcher } from './LocaleSwitcher'

interface HeaderTopbarProps {
  activeNavigationItem: AppNavigationItem
  dataUpdatedAt: string | null
  isMobileNavOpen: boolean
  locale: AppLocale
  onLocaleSelect: (locale: AppLocale) => void
  onMobileNavToggle: () => void
  t: TranslationFn
}

function formatDataSyncDate(value: string | null, locale: AppLocale): string {
  if (!value) {
    return locale === 'zh-CN' ? '待确认' : 'pending'
  }

  const date = new Date(`${value}T00:00:00`)

  if (!Number.isNaN(date.getTime())) {
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date)
  }

  return value
}

export function HeaderTopbar({
  activeNavigationItem,
  dataUpdatedAt,
  isMobileNavOpen,
  locale,
  onLocaleSelect,
  onMobileNavToggle,
  t,
}: HeaderTopbarProps) {
  return (
    <div className="site-header__topbar">
      <div className="site-header__brand-group">
        <div className="site-header__brand-stack">
          <p className="site-kicker">{t({ zh: 'Idle Champions 辅助站', en: 'Idle Champions Helper' })}</p>
          <p
            className="site-data-sync"
            title={t({ zh: '当前站点公共数据的同步日期', en: 'The sync date for the site public data' })}
          >
            <span className="site-data-sync__label">{t({ zh: '数据同步', en: 'Data sync' })}</span>
            <time dateTime={dataUpdatedAt ?? undefined}>{formatDataSyncDate(dataUpdatedAt, locale)}</time>
          </p>
        </div>
        <div className="site-header__compact-brand" aria-hidden="true">
          <span className="site-header__compact-mark" />
          <span className="site-header__compact-title">
            {t({ zh: '个人成长决策台', en: 'Growth-Oriented Formation Desk' })}
          </span>
        </div>
      </div>
      <div className="site-header__topbar-actions">
        <ToolbarLocaleSwitcher locale={locale} onSelect={onLocaleSelect} t={t} />

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
