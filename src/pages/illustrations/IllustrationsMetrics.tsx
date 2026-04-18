import { PageHeaderMetrics, type PageHeaderMetricItem } from '../../components/PageHeaderMetrics'
import type { IllustrationsPageModel } from './types'

interface IllustrationsMetricsProps {
  model: IllustrationsPageModel
}

export function IllustrationsMetrics({ model }: IllustrationsMetricsProps) {
  const { results, t } = model

  const items: PageHeaderMetricItem[] = [
    { label: t({ zh: '立绘总数', en: 'Illustrations' }), value: results.illustrations.length },
    { label: t({ zh: '当前匹配', en: 'Matches' }), value: results.filteredIllustrationEntries.length },
    { label: t({ zh: '英雄本体', en: 'Hero base' }), value: results.totalHeroCount },
    { label: t({ zh: '皮肤立绘', en: 'Skins' }), value: results.totalSkinCount },
  ]

  return <PageHeaderMetrics items={items} />
}
