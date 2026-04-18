import { PageHeaderMetrics, type PageHeaderMetricItem } from '../../components/PageHeaderMetrics'
import type { ChampionsPageModel } from './types'

interface ChampionsMetricsProps {
  model: ChampionsPageModel
}

export function ChampionsMetrics({ model }: ChampionsMetricsProps) {
  const { state, filteredChampions, matchedSeats, affiliations, t } = model

  if (state.status !== 'ready') {
    return null
  }

  const items: PageHeaderMetricItem[] = [
    { label: t({ zh: '英雄总数', en: 'Champions' }), value: state.champions.length },
    { label: t({ zh: '当前匹配', en: 'Matches' }), value: filteredChampions.length },
    { label: t({ zh: '覆盖座位', en: 'Seats covered' }), value: matchedSeats },
    { label: t({ zh: '联动队伍标签', en: 'Affiliations' }), value: affiliations.length },
  ]

  return <PageHeaderMetrics items={items} />
}
