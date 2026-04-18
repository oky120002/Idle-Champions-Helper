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
  const headerSignals = [
    {
      index: '01',
      title: t({ zh: '本地优先', en: 'Local-first' }),
      description: t({
        zh: '筛选、草稿与方案存档都保留在当前浏览器，不要求在线账号。',
        en: 'Filters, drafts, and preset archives stay in the current browser without requiring an online account.',
      }),
    },
    {
      index: '02',
      title: t({ zh: '可解释判断', en: 'Explainable picks' }),
      description: t({
        zh: '先做规则过滤，再进详情、立绘和阵型编辑继续缩小候选。',
        en: 'Rule filters come first, then details, art, and formation editing continue the narrowing process.',
      }),
    },
    {
      index: '03',
      title: t({ zh: '版本化官方数据', en: 'Versioned official data' }),
      description: t({
        zh: '所有查询都建立在本地版本化的官方公共数据之上。',
        en: 'Every lookup is grounded in locally versioned official public data.',
      }),
    },
  ]

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

          <div
            className="site-header__brief"
            aria-label={t({ zh: '站点工作原则', en: 'Site operating principles' })}
          >
            {headerSignals.map((signal) => (
              <article key={signal.index} className="site-header__brief-card">
                <span className="site-header__brief-index" aria-hidden="true">
                  {signal.index}
                </span>
                <div className="site-header__brief-copy">
                  <strong className="site-header__brief-title">{signal.title}</strong>
                  <span className="site-header__brief-text">{signal.description}</span>
                </div>
              </article>
            ))}
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
