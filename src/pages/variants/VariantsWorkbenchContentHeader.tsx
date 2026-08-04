import { ConfiguredWorkbenchMetricsHeader } from '../../components/workbench/ConfiguredWorkbenchMetricsHeader'
import { createWorkbenchShowingMetricItem } from '../../components/workbench/workbenchMetricItemBuilders'
import type { VariantsPageModel } from './types'

interface VariantsWorkbenchContentHeaderProps {
  model: VariantsPageModel
}

export function VariantsWorkbenchContentHeader({ model }: VariantsWorkbenchContentHeaderProps) {
  const { t, activeFilters, filteredVariants, visibleVariants } = model
  const metricItems =
    model.state.status === 'ready'
      ? [
          createWorkbenchShowingMetricItem({
            t,
            visibleCount: visibleVariants.length,
            filteredCount: filteredVariants.length,
            enUnitLabel: 'variants',
          }),
          { label: t({ zh: '变体总数', en: 'Variants' }), value: model.state.variants.length },
          { label: t({ zh: '可见冒险分组', en: 'Adventure groups' }), value: model.adventuresWithResults },
          {
            label: t({ zh: '覆盖战役 / 场景', en: 'Campaigns / scenes' }),
            value: `${model.campaignsWithResults} / ${model.scenesWithResults}`,
          },
        ]
      : []

  return <ConfiguredWorkbenchMetricsHeader items={metricItems} activeFilters={activeFilters} />
}
