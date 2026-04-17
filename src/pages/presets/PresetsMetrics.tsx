import type { PresetsPageModel } from './types'

type PresetsMetricsProps = {
  model: PresetsPageModel
}

export function PresetsMetrics({ model }: PresetsMetricsProps) {
  const { t, metrics } = model

  return (
    <div className="metric-grid">
      <article className="metric-card">
        <span className="metric-card__label">{t({ zh: '命名方案总数', en: 'Named presets' })}</span>
        <strong className="metric-card__value">{metrics.total}</strong>
      </article>
      <article className="metric-card">
        <span className="metric-card__label">{t({ zh: '可恢复方案', en: 'Restorable presets' })}</span>
        <strong className="metric-card__value">{metrics.recoverable}</strong>
      </article>
      <article className="metric-card">
        <span className="metric-card__label">{t({ zh: '需注意方案', en: 'Risky presets' })}</span>
        <strong className="metric-card__value">{metrics.risky}</strong>
      </article>
    </div>
  )
}
