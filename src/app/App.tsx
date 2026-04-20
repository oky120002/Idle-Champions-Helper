import { lazy, Suspense, type ComponentType } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { SiteHeader } from './SiteHeader'
import { resolveActiveNavigationItem } from './appNavigation'
import { useI18n } from './i18n'

function lazyNamedPage<TModule extends Record<string, ComponentType>, TKey extends keyof TModule>(
  load: () => Promise<TModule>,
  key: TKey,
) {
  return lazy(async () => {
    const module = await load()

    return {
      default: module[key],
    }
  })
}

const ChampionsPage = lazyNamedPage(() => import('../pages/ChampionsPage'), 'ChampionsPage')
const ChampionDetailPage = lazyNamedPage(() => import('../pages/ChampionDetailPage'), 'ChampionDetailPage')
const IllustrationsPage = lazyNamedPage(() => import('../pages/IllustrationsPage'), 'IllustrationsPage')
const PetsPage = lazyNamedPage(() => import('../pages/PetsPage'), 'PetsPage')
const VariantsPage = lazyNamedPage(() => import('../pages/VariantsPage'), 'VariantsPage')
const FormationPage = lazyNamedPage(() => import('../pages/FormationPage'), 'FormationPage')
const PresetsPage = lazyNamedPage(() => import('../pages/PresetsPage'), 'PresetsPage')
const UserDataPage = lazyNamedPage(() => import('../pages/UserDataPage'), 'UserDataPage')

export function App() {
  const { locale, setLocale, t } = useI18n()
  const location = useLocation()
  const activeNavigationItem = resolveActiveNavigationItem(location.pathname, location.state)

  return (
    <div className="app-shell">
      <div className="background-orb background-orb--one" />
      <div className="background-orb background-orb--two" />

      <SiteHeader
        activeNavigationItem={activeNavigationItem}
        locale={locale}
        setLocale={setLocale}
        pathname={location.pathname}
        t={t}
      />

      <main className="site-main">
        <Suspense
          fallback={(
            <section className="surface-card page-shell" aria-live="polite">
              <div className="surface-card__header">
                <div className="surface-card__header-copy">
                  <p className="surface-card__eyebrow">
                    {t({ zh: '按需加载页面', en: 'Loading route bundle' })}
                  </p>
                  <h2 className="surface-card__title">
                    {t({ zh: '正在加载当前页面', en: 'Loading current page' })}
                  </h2>
                  <p className="surface-card__description">
                    {t({
                      zh: '已改为按路由分包，当前只拉取命中的页面代码。',
                      en: 'Routes are code-split, so the app only fetches the page that is currently needed.',
                    })}
                  </p>
                </div>
              </div>
            </section>
          )}
        >
          <Routes>
            <Route path="/" element={<Navigate to="/champions" replace />} />
            <Route path="/champions" element={<ChampionsPage />} />
            <Route path="/champions/:championId" element={<ChampionDetailPage />} />
            <Route path="/illustrations" element={<IllustrationsPage />} />
            <Route path="/pets" element={<PetsPage />} />
            <Route path="/variants" element={<VariantsPage />} />
            <Route path="/formation" element={<FormationPage />} />
            <Route path="/presets" element={<PresetsPage />} />
            <Route path="/user-data" element={<UserDataPage />} />
            <Route path="*" element={<Navigate to="/champions" replace />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  )
}
