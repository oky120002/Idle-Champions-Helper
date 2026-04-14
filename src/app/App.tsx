import { useState } from 'react'
import { NavLink, Route, Routes } from 'react-router-dom'
import { ChampionDetailPage } from '../pages/ChampionDetailPage'
import { ChampionsPage } from '../pages/ChampionsPage'
import { FormationPage } from '../pages/FormationPage'
import { HomePage } from '../pages/HomePage'
import { PresetsPage } from '../pages/PresetsPage'
import { UserDataPage } from '../pages/UserDataPage'
import { VariantsPage } from '../pages/VariantsPage'
import { type AppLocale, type LocaleText, useI18n } from './i18n'

const navigation: Array<{ to: string; label: LocaleText }> = [
  { to: '/', label: { zh: '总览', en: 'Overview' } },
  { to: '/champions', label: { zh: '英雄筛选', en: 'Champions' } },
  { to: '/variants', label: { zh: '变体限制', en: 'Variants' } },
  { to: '/formation', label: { zh: '阵型编辑', en: 'Formation' } },
  { to: '/presets', label: { zh: '方案存档', en: 'Presets' } },
  { to: '/user-data', label: { zh: '个人数据', en: 'User Data' } },
]

const localeOptions: Array<{ id: AppLocale; label: string }> = [
  { id: 'zh-CN', label: '中' },
  { id: 'en-US', label: 'EN' },
]

function getNavClassName(isActive: boolean): string {
  return isActive ? 'nav-link nav-link--active' : 'nav-link'
}

function MobileMenuIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      {isOpen ? (
        <>
          <path d="M6.5 6.5 17.5 17.5" strokeLinecap="round" />
          <path d="M17.5 6.5 6.5 17.5" strokeLinecap="round" />
        </>
      ) : (
        <>
          <path d="M4.5 7h15" strokeLinecap="round" />
          <path d="M4.5 12h15" strokeLinecap="round" />
          <path d="M4.5 17h15" strokeLinecap="round" />
        </>
      )}
    </svg>
  )
}

export function App() {
  const { locale, setLocale, t } = useI18n()
  const [isMobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <div className="app-shell">
      <div className="background-orb background-orb--one" />
      <div className="background-orb background-orb--two" />

      <header className={isMobileNavOpen ? 'site-header site-header--mobile-nav-open' : 'site-header'}>
        <div className="site-header__topbar">
          <p className="site-kicker">{t({ zh: 'Idle Champions 辅助站', en: 'Idle Champions Helper' })}</p>
          <div className="site-header__topbar-actions">
            <div
              className="locale-switcher"
              role="group"
              aria-label={t({ zh: '界面语言切换', en: 'Interface language switcher' })}
            >
              <span className="locale-switcher__label">{t({ zh: '界面语言', en: 'UI language' })}</span>
              <div className="locale-switcher__controls">
                {localeOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={
                      locale === option.id
                        ? 'locale-switcher__button locale-switcher__button--active'
                        : 'locale-switcher__button'
                    }
                    onClick={() => setLocale(option.id)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              className={isMobileNavOpen ? 'site-header__menu-toggle site-header__menu-toggle--active' : 'site-header__menu-toggle'}
              aria-controls="site-primary-nav"
              aria-expanded={isMobileNavOpen}
              aria-label={isMobileNavOpen ? t({ zh: '收起主导航', en: 'Close primary navigation' }) : t({ zh: '展开主导航', en: 'Open primary navigation' })}
              onClick={() => setMobileNavOpen((current) => !current)}
            >
              <MobileMenuIcon isOpen={isMobileNavOpen} />
              <span>{isMobileNavOpen ? t({ zh: '收起', en: 'Close' }) : t({ zh: '菜单', en: 'Menu' })}</span>
            </button>
          </div>
        </div>

        <div className="site-header__content">
          <h1 className="site-title">{t({ zh: '个人成长决策台', en: 'Growth-Oriented Formation Desk' })}</h1>
          <p className="site-subtitle">
            {t({
              zh: '先把查询、筛选、阵型和保存做扎实，再逐步扩到推荐层。',
              en: 'Nail search, filtering, formations, and saves first, then grow into explainable recommendations.',
            })}
          </p>
        </div>

        <nav
          id="site-primary-nav"
          className={isMobileNavOpen ? 'site-nav site-nav--mobile-open' : 'site-nav'}
          aria-label={t({ zh: '主导航', en: 'Primary navigation' })}
        >
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => getNavClassName(isActive)}
              onClick={() => setMobileNavOpen(false)}
            >
              {t(item.label)}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="site-main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/champions" element={<ChampionsPage />} />
          <Route path="/champions/:championId" element={<ChampionDetailPage />} />
          <Route path="/variants" element={<VariantsPage />} />
          <Route path="/formation" element={<FormationPage />} />
          <Route path="/presets" element={<PresetsPage />} />
          <Route path="/user-data" element={<UserDataPage />} />
          <Route path="*" element={<HomePage />} />
        </Routes>
      </main>
    </div>
  )
}
