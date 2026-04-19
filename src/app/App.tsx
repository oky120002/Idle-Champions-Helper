import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { ChampionDetailPage } from '../pages/ChampionDetailPage'
import { ChampionsPage } from '../pages/ChampionsPage'
import { FormationPage } from '../pages/FormationPage'
import { IllustrationsPage } from '../pages/IllustrationsPage'
import { PetsPage } from '../pages/PetsPage'
import { PresetsPage } from '../pages/PresetsPage'
import { UserDataPage } from '../pages/UserDataPage'
import { VariantsPage } from '../pages/VariantsPage'
import { SiteHeader } from './SiteHeader'
import { resolveActiveNavigationItem } from './appNavigation'
import { useI18n } from './i18n'

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
      </main>
    </div>
  )
}
