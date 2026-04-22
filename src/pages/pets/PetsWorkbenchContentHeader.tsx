import { PageHeaderMetrics, type PageHeaderMetricItem } from '../../components/PageHeaderMetrics'
import { WorkbenchFilterResultsHeader } from '../../components/workbench/WorkbenchScaffold'
import { MAX_VISIBLE_PETS } from './constants'
import type { PetsPageModel } from './types'

interface PetsWorkbenchContentHeaderProps {
  model: PetsPageModel
}

export function PetsWorkbenchContentHeader({ model }: PetsWorkbenchContentHeaderProps) {
  const { t, ui, results, filters, summary, actions } = model
  const hasMatches = results.filteredPets.length > 0
  const randomOrderLabel = ui.hasRandomOrder
    ? t({ zh: '重新随机', en: 'Reshuffle' })
    : t({ zh: '随机排序', en: 'Shuffle order' })
  const metricItems: PageHeaderMetricItem[] = [
    {
      label: t({ zh: '当前展示', en: 'Showing' }),
      value: t({
        zh: `${results.visiblePets.length} / ${results.filteredPets.length}`,
        en: `${results.visiblePets.length} / ${results.filteredPets.length} pets`,
      }),
    },
    { label: t({ zh: '宠物总数', en: 'Pets' }), value: summary.total },
    { label: t({ zh: '完整图像', en: 'Full art' }), value: summary.completeArt },
    { label: t({ zh: '宝石商店', en: 'Gem shop' }), value: summary.gems },
    { label: t({ zh: '付费来源', en: 'Premium' }), value: summary.premium },
    { label: t({ zh: '赞助商商店', en: 'Patron shop' }), value: summary.patron },
    { label: t({ zh: '暂未开放', en: 'Unavailable' }), value: summary.unavailable },
  ]

  return (
    <WorkbenchFilterResultsHeader
      metrics={<PageHeaderMetrics items={metricItems} variant="compact" />}
      summaryBadge={
        hasMatches ? (
          <span className="results-summary-pill workbench-filter-header__pill">
            {results.canToggleResultVisibility
              ? filters.showAllResults
                ? t({ zh: `已展开全部 ${results.filteredPets.length}`, en: `Showing all ${results.filteredPets.length} pets` })
                : t({ zh: `默认先展示 ${MAX_VISIBLE_PETS}`, en: `Defaulting to the first ${MAX_VISIBLE_PETS} pets` })
              : t({ zh: '当前结果已全部展开', en: 'The current result set is already fully visible' })}
          </span>
        ) : (
          <span className="results-summary-pill workbench-filter-header__pill workbench-filter-header__pill--muted">
            {t({ zh: '等待新的宠物命中', en: 'Waiting for the next match set' })}
          </span>
        )
      }
      actions={(
        <>
          {results.canToggleResultVisibility ? (
            <button
              type="button"
              className="results-visibility-toggle results-visibility-toggle--primary"
              onClick={actions.toggleResultVisibility}
            >
              {filters.showAllResults
                ? t({ zh: `收起到默认 ${MAX_VISIBLE_PETS}`, en: `Collapse back to ${MAX_VISIBLE_PETS}` })
                : t({ zh: `显示全部 ${results.filteredPets.length}`, en: `Show all ${results.filteredPets.length}` })}
            </button>
          ) : null}

          <button
            type="button"
            className="results-visibility-toggle results-visibility-toggle--secondary"
            onClick={actions.randomizeResultOrder}
          >
            {randomOrderLabel}
          </button>
        </>
      )}
    />
  )
}
