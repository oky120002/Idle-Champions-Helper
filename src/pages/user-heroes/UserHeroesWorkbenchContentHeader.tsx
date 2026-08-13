import { ConfiguredWorkbenchMetricsHeader } from '../../components/workbench/ConfiguredWorkbenchMetricsHeader'
import { createWorkbenchShowingMetricItem } from '../../components/workbench/workbenchMetricItemBuilders'
import type { UserHeroesPageModel } from './types'

interface UserHeroesWorkbenchContentHeaderProps {
  readonly model: UserHeroesPageModel
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
          { label: t("高亮已拥有"), value: rosterSummary.matchedOwnedChampionCount },
          { label: t("已拥有"), value: rosterSummary.ownedChampionCount },
          { label: t("全英雄"), value: rosterSummary.totalChampionCount },
          { label: t("覆盖座位"), value: model.matchedSeats },
        ]
      : []

  return <ConfiguredWorkbenchMetricsHeader items={metricItems} activeFilters={activeFilters} />
}
