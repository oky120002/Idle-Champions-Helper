import { PageHeaderMetrics, type PageHeaderMetricItem } from '../../components/PageHeaderMetrics'
import { WorkbenchFilterResultsHeader } from '../../components/workbench/WorkbenchScaffold'
import { MAX_VISIBLE_VARIANTS } from './constants'
import type { VariantsPageModel } from './types'

interface VariantsWorkbenchContentHeaderProps {
  model: VariantsPageModel
}

export function VariantsWorkbenchContentHeader({ model }: VariantsWorkbenchContentHeaderProps) {
  const { t, activeFilters, filteredVariants, visibleVariants, canToggleResultVisibility, filters } = model
  const hasMatches = filteredVariants.length > 0
  const metricItems: PageHeaderMetricItem[] =
    model.state.status === 'ready'
      ? [
          {
            label: t({ zh: '当前展示', en: 'Showing' }),
            value: t({
              zh: `${visibleVariants.length} / ${filteredVariants.length} 个变体`,
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
      summaryBadge={
        hasMatches ? (
          <span className="results-summary-pill workbench-filter-header__pill">
            {canToggleResultVisibility
              ? filters.showAllResults
                ? t({ zh: `已展开全部 ${filteredVariants.length} 个变体`, en: `Showing all ${filteredVariants.length} variants` })
                : t({ zh: `默认先展示 ${MAX_VISIBLE_VARIANTS} 个变体`, en: `Defaulting to the first ${MAX_VISIBLE_VARIANTS} variants` })
              : t({ zh: '当前结果已全部展开', en: 'The current result set is already fully visible' })}
          </span>
        ) : (
          <span className="results-summary-pill workbench-filter-header__pill workbench-filter-header__pill--muted">
            {t({ zh: '等待新的变体命中', en: 'Waiting for the next match set' })}
          </span>
        )
      }
      actions={
        canToggleResultVisibility ? (
          <button type="button" className="results-visibility-toggle" onClick={model.toggleResultVisibility}>
            {filters.showAllResults
              ? t({ zh: `收起到默认 ${MAX_VISIBLE_VARIANTS} 个`, en: `Collapse back to ${MAX_VISIBLE_VARIANTS}` })
              : t({ zh: `显示全部 ${filteredVariants.length} 个`, en: `Show all ${filteredVariants.length}` })}
          </button>
        ) : null
      }
    />
  )
}
