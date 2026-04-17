import { NavLink } from 'react-router-dom'
import type { AppLocale } from './i18n'
import {
  getNavClassName,
  navigation,
  type AppNavigationItem,
  type TranslationFn,
} from './appNavigation'
import { PanelLocaleSwitcher } from './LocaleSwitcher'

interface PrimaryNavigationProps {
  activeNavigationItem: AppNavigationItem
  isMobileNavOpen: boolean
  locale: AppLocale
  onLocaleSelect: (locale: AppLocale) => void
  onNavigate: () => void
  t: TranslationFn
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
      aria-label={t({ zh: '主导航', en: 'Primary navigation' })}
    >
      <div className="site-nav__mobile-head" aria-hidden="true">
        <span className="site-nav__eyebrow">{t({ zh: '切换工作台', en: 'Switch workspaces' })}</span>
        <div className="site-nav__summary">
          <strong>{t(activeNavigationItem.label)}</strong>
          <span>
            {t({
              zh: '在资料、阵型、限制与个人数据之间快速跳转，不依赖横向滑动。',
              en: 'Jump between lookup, formations, restrictions, and personal data without horizontal scrolling.',
            })}
          </span>
        </div>
      </div>
      {navigation.map((item, index) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) => getNavClassName(isActive)}
          onClick={onNavigate}
        >
          <span className="nav-link__index" aria-hidden="true">
            {String(index + 1).padStart(2, '0')}
          </span>
          <span className="nav-link__label">{t(item.label)}</span>
        </NavLink>
      ))}
      <div className="site-nav__locale-panel">
        <span className="site-nav__eyebrow">{t({ zh: '低频设置', en: 'Low-frequency setting' })}</span>
        <div className="site-nav__locale-card">
          <div className="site-nav__locale-copy">
            <strong>{t({ zh: '界面语言', en: 'Interface language' })}</strong>
            <span>
              {t({
                zh: '这个站点默认按当前语言继续浏览；只有需要时再在菜单里切换。',
                en: 'The site stays in the current language by default, so switching lives inside the menu.',
              })}
            </span>
          </div>
          <PanelLocaleSwitcher locale={locale} onSelect={onLocaleSelect} t={t} />
        </div>
      </div>
    </nav>
  )
}
