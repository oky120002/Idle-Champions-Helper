import { lazy, Suspense, useEffect, type ComponentType } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { SiteHeader } from './SiteHeader'
import { resolveActiveNavigationItem } from './appNavigation'
import { useI18n } from './i18n'
import { isWorkbenchRoute } from './workbenchRoutes'

type MediaQueryListener = (event: MediaQueryListEvent) => void

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
const AnimationAuditPage = lazyNamedPage(() => import('../pages/AnimationAuditPage'), 'AnimationAuditPage')
const PetsPage = lazyNamedPage(() => import('../pages/PetsPage'), 'PetsPage')
const VariantsPage = lazyNamedPage(() => import('../pages/VariantsPage'), 'VariantsPage')
const FormationPage = lazyNamedPage(() => import('../pages/FormationPage'), 'FormationPage')
const PresetsPage = lazyNamedPage(() => import('../pages/PresetsPage'), 'PresetsPage')
const UserDataPage = lazyNamedPage(() => import('../pages/UserDataPage'), 'UserDataPage')

export function App() {
  const { locale, setLocale, t } = useI18n()
  const location = useLocation()
  const activeNavigationItem = resolveActiveNavigationItem(location.pathname, location.state)
  const isWorkbench = isWorkbenchRoute(location.pathname)

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const root = document.documentElement
    const body = document.body
    const mediaQuery =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(min-width: 1080px)')
        : {
            matches: false,
            addEventListener: undefined as ((type: 'change', listener: MediaQueryListener) => void) | undefined,
            removeEventListener: undefined as ((type: 'change', listener: MediaQueryListener) => void) | undefined,
            addListener: (listener: MediaQueryListener) => {
              void listener
            },
            removeListener: (listener: MediaQueryListener) => {
              void listener
            },
          }
    const syncScrollLock = () => {
      const shouldLockScroll = isWorkbench && mediaQuery.matches

      root.classList.toggle('page-scroll-locked', shouldLockScroll)
      body.classList.toggle('page-scroll-locked', shouldLockScroll)
    }

    syncScrollLock()

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', syncScrollLock)
    } else {
      mediaQuery.addListener(syncScrollLock)
    }

    return () => {
      root.classList.remove('page-scroll-locked')
      body.classList.remove('page-scroll-locked')

      if (typeof mediaQuery.removeEventListener === 'function') {
        mediaQuery.removeEventListener('change', syncScrollLock)
      } else {
        mediaQuery.removeListener(syncScrollLock)
      }
    }
  }, [isWorkbench])

  return (
    <div className={['app-shell', isWorkbench ? 'app-shell--workbench' : ''].filter(Boolean).join(' ')}>
      <div className="background-orb background-orb--one" />
      <div className="background-orb background-orb--two" />

      <SiteHeader
        activeNavigationItem={activeNavigationItem}
        locale={locale}
        setLocale={setLocale}
        pathname={location.pathname}
        t={t}
      />

      <main className={['site-main', isWorkbench ? 'site-main--workbench' : ''].filter(Boolean).join(' ')}>
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
            <Route path="/illustrations/audit" element={<AnimationAuditPage />} />
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
