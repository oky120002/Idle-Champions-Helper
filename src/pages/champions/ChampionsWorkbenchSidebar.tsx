import { ChampionsAdditionalFilters } from './ChampionsAdditionalFilters'
import { ChampionsPrimaryFilters } from './ChampionsPrimaryFilters'
import type { ChampionsPageModel } from './types'

interface ChampionsWorkbenchSidebarProps {
  model: ChampionsPageModel
}

export function ChampionsWorkbenchSidebar({ model }: ChampionsWorkbenchSidebarProps) {
  return (
    <div className="champions-workbench__sidebar-stack">
      <ChampionsPrimaryFilters model={model} />
      <ChampionsAdditionalFilters model={model} />
    </div>
  )
}
