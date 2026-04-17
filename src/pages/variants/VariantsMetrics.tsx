import type { VariantsPageModel } from './types'

type VariantsMetricsProps = {
  model: VariantsPageModel
}

export function VariantsMetrics({ model }: VariantsMetricsProps) {
  const { t, state, filteredVariants, campaignsWithResults } = model

  if (state.status !== 'ready') {
    return null
  }

  return (
    <div className="metric-grid">
      <article className="metric-card">
        <span className="metric-card__label">{t({ zh: '变体总数', en: 'Variants' })}</span>
        <strong className="metric-card__value">{state.variants.length}</strong>
      </article>
      <article className="metric-card">
        <span className="metric-card__label">{t({ zh: '当前匹配', en: 'Matches' })}</span>
        <strong className="metric-card__value">{filteredVariants.length}</strong>
      </article>
      <article className="metric-card">
        <span className="metric-card__label">{t({ zh: '覆盖战役', en: 'Campaigns covered' })}</span>
        <strong className="metric-card__value">{campaignsWithResults}</strong>
      </article>
      <article className="metric-card">
        <span className="metric-card__label">{t({ zh: '战役枚举', en: 'Campaign options' })}</span>
        <strong className="metric-card__value">{state.campaigns.length}</strong>
      </article>
    </div>
  )
}
