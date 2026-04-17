import type { ChampionsPageModel } from './types'

interface ChampionsMetricsProps {
  model: ChampionsPageModel
}

export function ChampionsMetrics({ model }: ChampionsMetricsProps) {
  const { state, filteredChampions, matchedSeats, affiliations, t } = model

  if (state.status !== 'ready') {
    return null
  }

  return (
    <div className="metric-grid">
      <MetricCard label={t({ zh: '英雄总数', en: 'Champions' })} value={state.champions.length} />
      <MetricCard label={t({ zh: '当前匹配', en: 'Matches' })} value={filteredChampions.length} />
      <MetricCard label={t({ zh: '覆盖座位', en: 'Seats covered' })} value={matchedSeats} />
      <MetricCard label={t({ zh: '联动队伍标签', en: 'Affiliations' })} value={affiliations.length} />
    </div>
  )
}

interface MetricCardProps {
  label: string
  value: string | number
}

function MetricCard({ label, value }: MetricCardProps) {
  return (
    <article className="metric-card">
      <span className="metric-card__label">{label}</span>
      <strong className="metric-card__value">{value}</strong>
    </article>
  )
}
