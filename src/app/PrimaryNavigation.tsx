import { Link } from 'react-router-dom'
import type { AppLocale } from './i18n'
import {
  getNavClassName,
  navigation,
  type AppNavigationItem,
  type TranslationFn,
} from './appNavigation'
import { PanelLocaleSwitcher } from './LocaleSwitcher'

interface PrimaryNavigationProps {
  readonly activeNavigationItem: AppNavigationItem
  readonly isMobileNavOpen: boolean
  readonly locale: AppLocale
  readonly onLocaleSelect: (locale: AppLocale) => void
  readonly onNavigate: () => void
  readonly t: TranslationFn
}

export function PrimaryNavigation({
  activeNavigationItem,
  isMobileNavOpen,
  locale,
  onLocaleSelect,
  onNavigate,
  t,
}: PrimaryNavigationProps) {
  return (
    <nav
      id="site-primary-nav"
      className={isMobileNavOpen ? 'site-nav site-nav--mobile-open' : 'site-nav'}
      aria-label={t("主导航")}
    >
      <div className="site-nav__mobile-head" aria-hidden="true">
        <span className="site-nav__eyebrow">{t("切换工作台")}</span>
        <div className="site-nav__summary">
          <strong>{t(activeNavigationItem.label)}</strong>
          <span>
            {t("在资料、筛选、阵型与个人数据之间快速跳转，不依赖横向滑动。")}
          </span>
        </div>
      </div>
      {navigation.map((item) => {
        const isActive = activeNavigationItem.to === item.to
        const Icon = item.Icon

        return (
          <Link
            key={item.to}
            to={item.to}
            aria-current={isActive ? 'page' : undefined}
            className={getNavClassName(isActive)}
            onClick={onNavigate}
          >
            <Icon className="nav-link__icon" aria-hidden="true" strokeWidth={1.85} />
            <span className="nav-link__label">{t(item.label)}</span>
          </Link>
        )
      })}
      <div className="site-nav__locale-panel">
        <span className="site-nav__eyebrow">{t("低频设置")}</span>
        <div className="site-nav__locale-card">
          <div className="site-nav__locale-copy">
            <strong>{t("界面语言")}</strong>
            <span>
              {t("这个站点默认按当前语言继续浏览；只有需要时再在菜单里切换。")}
            </span>
          </div>
          <PanelLocaleSwitcher locale={locale} onSelect={onLocaleSelect} t={t} />
        </div>
      </div>
    </nav>
  )
}
