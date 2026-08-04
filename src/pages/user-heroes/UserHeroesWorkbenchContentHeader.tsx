import { ConfiguredWorkbenchMetricsHeader } from '../../components/workbench/ConfiguredWorkbenchMetricsHeader'
import { createWorkbenchShowingMetricItem } from '../../components/workbench/workbenchMetricItemBuilders'
import type { UserHeroesPageModel } from './types'

interface UserHeroesWorkbenchContentHeaderProps {
  model: UserHeroesPageModel
}

export function UserHeroesWorkbenchContentHeader({ model }: UserHeroesWorkbenchContentHeaderProps) {
  const { filteredChampions, activeFilters, rosterSummary, t } = model
  const metricItems =
    model.state.status === 'ready' && rosterSummary
      ? [
          createWorkbenchShowingMetricItem({
            t,
            visibleCount: filteredChampions.length,
            filteredCount: filteredChampions.length,
            enUnitLabel: 'champions',
          }),
          { label: t({ zh: '高亮已拥有', en: 'Highlighted owned' }), value: rosterSummary.matchedOwnedChampionCount },
          { label: t({ zh: '已拥有', en: 'Owned' }), value: rosterSummary.ownedChampionCount },
          { label: t({ zh: '全英雄', en: 'Roster' }), value: rosterSummary.totalChampionCount },
          { label: t({ zh: '覆盖座位', en: 'Seats' }), value: model.matchedSeats },
        ]
      : []

  return <ConfiguredWorkbenchMetricsHeader items={metricItems} activeFilters={activeFilters} />
}
