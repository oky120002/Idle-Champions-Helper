import { useI18n } from '../../app/i18n'
import type { ChampionRosterSummary as ChampionRosterSummaryModel } from './championRoster'

interface ChampionRosterSummaryProps {
  readonly summary: ChampionRosterSummaryModel | null
  readonly sourceLabel?: string
  readonly eyebrow?: string
  readonly title?: string
  readonly highlightLabel?: string
  readonly activeMetricId?: string | null
  readonly onMetricToggle?: (metricId: string) => void
}

export function ChampionRosterSummary({
  summary,
  sourceLabel,
  eyebrow,
  title,
  highlightLabel,
  activeMetricId = null,
  onMetricToggle,
}: ChampionRosterSummaryProps) {
  const { t } = useI18n()

  if (!summary) {
    return null
  }

  return (
    <section className="champion-roster-summary" aria-label={t({ zh: '英雄账号概览', en: 'Champion roster overview' })}>
      <header className="champion-roster-summary__header">
        <div>
          <p className="champion-roster-summary__eyebrow">
            {eyebrow ?? t({ zh: '账号概览', en: 'Account overview' })}
          </p>
          <h2 className="champion-roster-summary__title">
            {title ?? t({ zh: '全英雄矩阵', en: 'Full champion roster' })}
          </h2>
        </div>
        <div className="champion-roster-summary__context">
          <span className="champion-roster-summary__source">
            {sourceLabel ?? t({ zh: '未同步账号快照', en: 'No synced account snapshot' })}
          </span>
          <span className="champion-roster-summary__highlight">
            {highlightLabel ?? t({ zh: '高亮', en: 'Highlight' })}{' '}
            {summary.matchedOwnedChampionCount} / {summary.totalChampionCount}
          </span>
        </div>
      </header>

      <div className="champion-roster-summary__metrics">
        {summary.metrics.map((metric) => {
          const percent = metric.total > 0 ? Math.min(100, (metric.value / metric.total) * 100) : 0
          const isActive = activeMetricId === metric.id

          return (
            <button
              key={metric.id}
              type="button"
              className={`champion-roster-summary__metric ${isActive ? 'champion-roster-summary__metric--active' : ''}`}
              aria-pressed={isActive}
              onClick={() => onMetricToggle?.(metric.id)}
            >
              <div className="champion-roster-summary__metric-topline">
                <span className="champion-roster-summary__metric-label">{metric.label}</span>
                <span className="champion-roster-summary__metric-value">
                  {metric.value}/{metric.total}
                </span>
              </div>
              <div className="champion-roster-summary__meter" aria-hidden="true">
                <span className="champion-roster-summary__meter-fill" style={{ width: `${String(percent)}%` }} />
              </div>
              <p className="champion-roster-summary__metric-detail">{metric.description}</p>
            </button>
          )
        })}
      </div>
    </section>
  )
}
