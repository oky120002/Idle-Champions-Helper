import { PageHeaderMetrics, type PageHeaderMetricItem } from '../../components/PageHeaderMetrics'
import { WorkbenchFilterResultsHeader } from '../../components/workbench/WorkbenchScaffold'
import type { VariantsPageModel } from './types'

interface VariantsWorkbenchContentHeaderProps {
  model: VariantsPageModel
}

export function VariantsWorkbenchContentHeader({ model }: VariantsWorkbenchContentHeaderProps) {
  const { t, activeFilters, filteredVariants, visibleVariants } = model
  const metricItems: PageHeaderMetricItem[] =
    model.state.status === 'ready'
      ? [
          {
            label: t({ zh: '当前展示', en: 'Showing' }),
            value: t({
              zh: `${visibleVariants.length} / ${filteredVariants.length}`,
              en: `${visibleVariants.length} / ${filteredVariants.length} variants`,
            }),
          },
          { label: t({ zh: '变体总数', en: 'Variants' }), value: model.state.variants.length },
          { label: t({ zh: '可见冒险分组', en: 'Adventure groups' }), value: model.adventuresWithResults },
          {
            label: t({ zh: '覆盖战役 / 场景', en: 'Campaigns / scenes' }),
            value: `${model.campaignsWithResults} / ${model.scenesWithResults}`,
          },
        ]
      : []

  return (
    <WorkbenchFilterResultsHeader
      metrics={metricItems.length > 0 ? <PageHeaderMetrics items={metricItems} variant="compact" /> : null}
      filterSummary={
        activeFilters.length > 0
          ? `${t({ zh: '当前筛选：', en: 'Active filters: ' })}${activeFilters.join(' · ')}`
          : null
      }
    />
  )
}
