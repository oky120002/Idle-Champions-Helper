import { PageHeaderMetrics, type PageHeaderMetricItem } from '../../components/PageHeaderMetrics'
import { WorkbenchFilterResultsHeader } from '../../components/workbench/WorkbenchScaffold'
import { collectChampionFacetSummary } from '../../features/champion-filters/headerMetrics'
import type { ChampionsPageModel } from './types'

interface ChampionsWorkbenchContentHeaderProps {
  model: ChampionsPageModel
}

export function ChampionsWorkbenchContentHeader({ model }: ChampionsWorkbenchContentHeaderProps) {
  const { filteredChampions, visibleChampions, activeFilters, t } = model
  const metricItems: PageHeaderMetricItem[] =
    model.state.status === 'ready'
      ? (() => {
          const summary = collectChampionFacetSummary(filteredChampions, model.locale)

          return [
            {
              label: t({ zh: '当前展示', en: 'Showing' }),
              value: t({
                zh: `${visibleChampions.length} / ${filteredChampions.length}`,
                en: `${visibleChampions.length} / ${filteredChampions.length} champions`,
              }),
            },
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

  return (
    <WorkbenchFilterResultsHeader
      metrics={metricItems.length > 0 ? <PageHeaderMetrics items={metricItems} variant="compact" /> : null}
      filterSummary={
        activeFilters.length > 0
          ? `${t({ zh: '当前筛选：', en: 'Active filters: ' })}${activeFilters.join(' · ')}`
          : ''
      }
    />
  )
}
