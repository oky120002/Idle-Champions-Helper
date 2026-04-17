import { ChampionsAdditionalFilters } from './ChampionsAdditionalFilters'
import { ChampionsPrimaryFilters } from './ChampionsPrimaryFilters'
import type { ChampionsPageModel } from './types'

interface ChampionsSidebarProps {
  model: ChampionsPageModel
}

export function ChampionsSidebar({ model }: ChampionsSidebarProps) {
  return (
    <aside className="champions-sidebar">
      <div className="champions-sidebar__sticky">
        <div className="champions-sidebar__surface">
          <ChampionsPrimaryFilters model={model} />
          <ChampionsAdditionalFilters model={model} />
        </div>
      </div>
    </aside>
  )
}
