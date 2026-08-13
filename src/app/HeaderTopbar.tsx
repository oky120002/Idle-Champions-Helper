import { GlobalSearchBox } from '../features/search/GlobalSearchBox'
import type { AppLocale } from './i18n'
import { MobileMenuIcon } from './AppIcons'
import type { AppNavigationItem, TranslationFn } from './appNavigation'
import { ThemeToggle } from './ThemeToggle'
import { ToolbarLocaleSwitcher } from './LocaleSwitcher'

interface HeaderTopbarProps {
  readonly activeNavigationItem: AppNavigationItem
  readonly dataUpdatedAt: string | null
  readonly isMobileNavOpen: boolean
  readonly locale: AppLocale
  readonly onLocaleSelect: (locale: AppLocale) => void
  readonly onMobileNavToggle: () => void
  readonly t: TranslationFn
}

function formatDataSyncDate(value: string | null, locale: AppLocale): string {
  if (value == null || value === '') {
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
          <p className="site-kicker">{t("Idle Champions 辅助站")}</p>
          <p
            className="site-data-sync"
            title={t("当前站点公共数据的同步日期")}
          >
            <span className="site-data-sync__label">{t("数据同步")}</span>
            <time dateTime={dataUpdatedAt ?? undefined}>{formatDataSyncDate(dataUpdatedAt, locale)}</time>
          </p>
        </div>
        <div className="site-header__compact-brand" aria-hidden="true">
          <span className="site-header__compact-mark" />
          <span className="site-header__compact-title">
            {t("最佳阵型推算")}
          </span>
        </div>
      </div>
      <div className="site-header__topbar-actions">
        <GlobalSearchBox />
        <ThemeToggle />
        <ToolbarLocaleSwitcher locale={locale} onSelect={onLocaleSelect} t={t} />

        <button
          type="button"
          className={isMobileNavOpen ? 'site-header__menu-toggle site-header__menu-toggle--active' : 'site-header__menu-toggle'}
          aria-controls="site-primary-nav"
          aria-expanded={isMobileNavOpen}
          aria-label={isMobileNavOpen ? t("收起主导航") : t("展开主导航")}
          onClick={onMobileNavToggle}
        >
          <span className="site-header__menu-toggle-copy">
            <span className="site-header__menu-toggle-label">{t("快速导航")}</span>
            <strong className="site-header__menu-toggle-value">{t(activeNavigationItem.label)}</strong>
          </span>
          <span className="site-header__menu-toggle-indicator">
            <span className="site-header__menu-toggle-indicator-icon">
              <MobileMenuIcon isOpen={isMobileNavOpen} />
            </span>
            <span className="site-header__menu-toggle-indicator-text">
              {isMobileNavOpen ? t("收起") : t("展开")}
            </span>
          </span>
        </button>
      </div>
    </div>
  )
}
