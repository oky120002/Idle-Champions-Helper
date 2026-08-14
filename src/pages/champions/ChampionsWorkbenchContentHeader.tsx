import { ConfiguredWorkbenchMetricsHeader } from '../../components/workbench/ConfiguredWorkbenchMetricsHeader'
import { createWorkbenchShowingMetricItem } from '../../components/workbench/workbenchMetricItemBuilders'
import { collectChampionFacetSummary } from '../../features/champion-filters/headerMetrics'
import type { ChampionsPageModel } from './types'

interface ChampionsWorkbenchContentHeaderProps {
  readonly model: ChampionsPageModel
}

export function ChampionsWorkbenchContentHeader({ model }: ChampionsWorkbenchContentHeaderProps) {
  const { filteredChampions, visibleChampions, activeFilters, t } = model
  const metricItems =
    model.state.status === 'ready'
      ? (() => {
          const summary = collectChampionFacetSummary(filteredChampions, model.locale)

          return [
            createWorkbenchShowingMetricItem({
              t,
              locale: model.locale,
              visibleCount: visibleChampions.length,
              filteredCount: filteredChampions.length,
              enUnitLabel: 'champions',
            }),
            { label: t("英雄总数"), value: model.state.champions.length },
            { label: t("覆盖座位"), value: summary.seatCount },
            { label: t("联动队伍"), value: summary.affiliationCount },
            { label: t("种族"), value: summary.raceCount },
            { label: t("性别"), value: summary.genderCount },
            { label: t("阵营"), value: summary.alignmentCount },
            { label: t("职业"), value: summary.professionCount },
            { label: t("获取方式"), value: summary.acquisitionCount },
            { label: t("特殊机制"), value: summary.mechanicCount },
          ]
        })()
      : []

  return <ConfiguredWorkbenchMetricsHeader items={metricItems} activeFilters={activeFilters} />
}
