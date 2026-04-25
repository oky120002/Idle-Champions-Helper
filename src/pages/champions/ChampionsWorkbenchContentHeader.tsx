import { ConfiguredWorkbenchMetricsHeader } from '../../components/workbench/ConfiguredWorkbenchMetricsHeader'
import { createWorkbenchShowingMetricItem } from '../../components/workbench/workbenchMetricItemBuilders'
import { collectChampionFacetSummary } from '../../features/champion-filters/headerMetrics'
import type { ChampionsPageModel } from './types'

interface ChampionsWorkbenchContentHeaderProps {
  model: ChampionsPageModel
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
              visibleCount: visibleChampions.length,
              filteredCount: filteredChampions.length,
              enUnitLabel: 'champions',
            }),
            { label: t({ zh: '英雄总数', en: 'Roster' }), value: model.state.champions.length },
            { label: t({ zh: '覆盖座位', en: 'Seats' }), value: summary.seatCount },
            { label: t({ zh: '联动队伍', en: 'Affiliations' }), value: summary.affiliationCount },
            { label: t({ zh: '种族', en: 'Races' }), value: summary.raceCount },
            { label: t({ zh: '性别', en: 'Genders' }), value: summary.genderCount },
            { label: t({ zh: '阵营', en: 'Alignments' }), value: summary.alignmentCount },
            { label: t({ zh: '职业', en: 'Professions' }), value: summary.professionCount },
            { label: t({ zh: '获取方式', en: 'Availability' }), value: summary.acquisitionCount },
            { label: t({ zh: '特殊机制', en: 'Mechanics' }), value: summary.mechanicCount },
          ]
        })()
      : []

  return <ConfiguredWorkbenchMetricsHeader items={metricItems} activeFilters={activeFilters} />
}
