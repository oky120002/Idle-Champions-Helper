import { NavLink, Route, Routes } from 'react-router-dom'
import { HomePage } from '../pages/HomePage'
import { ChampionsPage } from '../pages/ChampionsPage'
import { VariantsPage } from '../pages/VariantsPage'
import { FormationPage } from '../pages/FormationPage'
import { PresetsPage } from '../pages/PresetsPage'

const navigation = [
  { to: '/', label: '总览' },
  { to: '/champions', label: '英雄筛选' },
  { to: '/variants', label: '变体限制' },
  { to: '/formation', label: '阵型编辑' },
  { to: '/presets', label: '方案存档' },
]

function getNavClassName(isActive: boolean): string {
  return isActive ? 'nav-link nav-link--active' : 'nav-link'
}

export function App() {
  return (
    <div className="app-shell">
      <div className="background-orb background-orb--one" />
      <div className="background-orb background-orb--two" />

      <header className="site-header">
        <div>
          <p className="site-kicker">Idle Champions 辅助站</p>
          <h1 className="site-title">个人成长决策台</h1>
          <p className="site-subtitle">先把查询、筛选、阵型和保存做扎实，再逐步扩到推荐层。</p>
        </div>

        <nav className="site-nav" aria-label="主导航">
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => getNavClassName(isActive)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="site-main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/champions" element={<ChampionsPage />} />
          <Route path="/variants" element={<VariantsPage />} />
          <Route path="/formation" element={<FormationPage />} />
          <Route path="/presets" element={<PresetsPage />} />
          <Route path="*" element={<HomePage />} />
        </Routes>
      </main>
    </div>
  )
}
