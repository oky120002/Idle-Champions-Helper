import { IllustrationsAdditionalFilters } from './IllustrationsAdditionalFilters'
import { IllustrationsPrimaryFilters } from './IllustrationsPrimaryFilters'
import type { IllustrationsPageModel } from './types'

type IllustrationsSidebarProps = {
  model: IllustrationsPageModel
}

export function IllustrationsSidebar({ model }: IllustrationsSidebarProps) {
  return (
    <div className="illustrations-workbench__sidebar-stack">
      <IllustrationsPrimaryFilters model={model} />
      <IllustrationsAdditionalFilters model={model} />
    </div>
  )
}
