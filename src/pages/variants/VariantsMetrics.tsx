import { PageHeaderMetrics, type PageHeaderMetricItem } from '../../components/PageHeaderMetrics'
import type { VariantsPageModel } from './types'

type VariantsMetricsProps = {
  model: VariantsPageModel
}

export function VariantsMetrics({ model }: VariantsMetricsProps) {
  const { t, state, filteredVariants, campaignsWithResults, adventuresWithResults, scenesWithResults } = model

  if (state.status !== 'ready') {
    return null
  }

  const items: PageHeaderMetricItem[] = [
    { label: t({ zh: '变体总数', en: 'Variants' }), value: state.variants.length },
    { label: t({ zh: '当前匹配', en: 'Matches' }), value: filteredVariants.length },
    { label: t({ zh: '可见冒险分组', en: 'Adventure groups' }), value: adventuresWithResults },
    { label: t({ zh: '覆盖战役 / 场景', en: 'Campaigns / scenes' }), value: `${campaignsWithResults} / ${scenesWithResults}` },
  ]

  return <PageHeaderMetrics items={items} />
}
