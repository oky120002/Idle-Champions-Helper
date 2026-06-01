import type { ChampionRosterSummary as ChampionRosterSummaryModel } from './championRoster'

interface ChampionRosterSummaryProps {
  summary: ChampionRosterSummaryModel | null
  sourceLabel?: string
  eyebrow?: string
  title?: string
  highlightLabel?: string
}

export function ChampionRosterSummary({
  summary,
  sourceLabel = '未同步账号快照',
  eyebrow = '账号概览',
  title = '全英雄矩阵',
  highlightLabel = '高亮',
}: ChampionRosterSummaryProps) {
  if (!summary) {
    return null
  }

  return (
    <section className="champion-roster-summary" aria-label="英雄账号概览">
      <header className="champion-roster-summary__header">
        <div>
          <p className="champion-roster-summary__eyebrow">{eyebrow}</p>
          <h2 className="champion-roster-summary__title">{title}</h2>
        </div>
        <div className="champion-roster-summary__context">
          <span className="champion-roster-summary__source">{sourceLabel}</span>
          <span className="champion-roster-summary__highlight">
            {highlightLabel} {summary.matchedOwnedChampionCount} / {summary.totalChampionCount}
          </span>
        </div>
      </header>

      <div className="champion-roster-summary__metrics">
        {summary.metrics.map((metric) => {
          const percent = metric.total > 0 ? Math.min(100, (metric.value / metric.total) * 100) : 0

          return (
            <article key={metric.id} className="champion-roster-summary__metric">
              <div className="champion-roster-summary__metric-topline">
                <span className="champion-roster-summary__metric-label">{metric.label}</span>
                <span className="champion-roster-summary__metric-value">
                  {metric.value}/{metric.total}
                </span>
              </div>
              <div className="champion-roster-summary__meter" aria-hidden="true">
                <span className="champion-roster-summary__meter-fill" style={{ width: `${percent}%` }} />
              </div>
              <p className="champion-roster-summary__metric-detail">{metric.description}</p>
            </article>
          )
        })}
      </div>
    </section>
  )
}
