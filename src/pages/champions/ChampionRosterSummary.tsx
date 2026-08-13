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
    <section className="champion-roster-summary" aria-label={t("英雄账号概览")}>
      <header className="champion-roster-summary__header">
        <div>
          <p className="champion-roster-summary__eyebrow">
            {eyebrow ?? t("账号概览")}
          </p>
          <h2 className="champion-roster-summary__title">
            {title ?? t("全英雄矩阵")}
          </h2>
        </div>
        <div className="champion-roster-summary__context">
          <span className="champion-roster-summary__source">
            {sourceLabel ?? t("未同步账号快照")}
          </span>
          <span className="champion-roster-summary__highlight">
            {highlightLabel ?? t("高亮")}{' '}
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
                <span className="champion-roster-summary__metric-label">{t(metric.label)}</span>
                <span className="champion-roster-summary__metric-value">
                  {metric.value}/{metric.total}
                </span>
              </div>
              <div className="champion-roster-summary__meter" aria-hidden="true">
                <span className="champion-roster-summary__meter-fill" style={{ width: `${String(percent)}%` }} />
              </div>
              <p className="champion-roster-summary__metric-detail">{t(metric.description)}</p>
            </button>
          )
        })}
      </div>
    </section>
  )
}
