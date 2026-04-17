import { IllustrationsAdditionalFilters } from './IllustrationsAdditionalFilters'
import { IllustrationsPrimaryFilters } from './IllustrationsPrimaryFilters'
import type { IllustrationsPageModel } from './types'

type IllustrationsSidebarProps = {
  model: IllustrationsPageModel
}

export function IllustrationsSidebar({ model }: IllustrationsSidebarProps) {
  return (
    <section className="champions-sidebar__surface illustrations-page__filter-surface">
      <IllustrationsPrimaryFilters model={model} />
      <IllustrationsAdditionalFilters model={model} />
    </section>
  )
}
