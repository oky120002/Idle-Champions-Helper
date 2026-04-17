import type { IllustrationsPageModel } from './types'

type IllustrationsMetricsProps = {
  model: IllustrationsPageModel
}

export function IllustrationsMetrics({ model }: IllustrationsMetricsProps) {
  const { t, results } = model

  return (
    <div className="metric-grid">
      <article className="metric-card">
        <span className="metric-card__label">{t({ zh: '立绘总数', en: 'Illustrations' })}</span>
        <strong className="metric-card__value">{results.illustrations.length}</strong>
      </article>
      <article className="metric-card">
        <span className="metric-card__label">{t({ zh: '当前匹配', en: 'Matches' })}</span>
        <strong className="metric-card__value">{results.filteredIllustrationEntries.length}</strong>
      </article>
      <article className="metric-card">
        <span className="metric-card__label">{t({ zh: '英雄本体', en: 'Hero base' })}</span>
        <strong className="metric-card__value">{results.totalHeroCount}</strong>
      </article>
      <article className="metric-card">
        <span className="metric-card__label">{t({ zh: '皮肤立绘', en: 'Skin art' })}</span>
        <strong className="metric-card__value">{results.totalSkinCount}</strong>
      </article>
    </div>
  )
}
