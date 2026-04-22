import { WorkbenchFilterResultsHeader } from '../../components/workbench/WorkbenchScaffold'
import { ChampionsMetrics } from './ChampionsMetrics'
import { MAX_VISIBLE_RESULTS } from './constants'
import type { ChampionsPageModel } from './types'

interface ChampionsWorkbenchContentHeaderProps {
  model: ChampionsPageModel
}

export function ChampionsWorkbenchContentHeader({ model }: ChampionsWorkbenchContentHeaderProps) {
  const {
    filteredChampions,
    visibleChampions,
    activeFilters,
    canToggleResultVisibility,
    showAllResults,
    hasRandomOrder,
    toggleResultVisibility,
    randomizeResultOrder,
    t,
  } = model

  const hasMatches = filteredChampions.length > 0
  const randomOrderLabel = hasRandomOrder
    ? t({ zh: '重新随机', en: 'Reshuffle' })
    : t({ zh: '随机排序', en: 'Shuffle order' })

  return (
    <WorkbenchFilterResultsHeader
      eyebrow="CHAMPIONS"
      title={t({ zh: '英雄筛选', en: 'Champion filters' })}
      description={
        hasMatches
          ? t({
              zh: `当前展示 ${visibleChampions.length} / ${filteredChampions.length} 名英雄。先用左侧抽屉缩小候选池，再在这里对比视觉档案、属性标签与联动队伍。`,
              en: `Showing ${visibleChampions.length} / ${filteredChampions.length} champions. Narrow the pool in the left drawer, then compare visuals, tags, and affiliations here.`,
            })
          : t({
              zh: '当前筛选条件下没有匹配英雄。先回退一个维度，再逐步缩回来，会比一次清空全部更稳。',
              en: 'No champions match the current filter set. Roll one dimension back first, then narrow things down again.',
            })
      }
      metrics={<ChampionsMetrics model={model} />}
      filterSummary={
        activeFilters.length > 0
          ? `${t({ zh: '当前筛选：', en: 'Active filters: ' })}${activeFilters.join(' · ')}`
          : null
      }
      summaryBadge={
        hasMatches ? (
          <span className="results-summary-pill workbench-filter-header__pill">
            {canToggleResultVisibility
              ? showAllResults
                ? t({ zh: `已展开全部 ${filteredChampions.length} 名英雄`, en: `Showing all ${filteredChampions.length} champions` })
                : t({ zh: `默认先展示 ${MAX_VISIBLE_RESULTS} 名英雄`, en: `Defaulting to the first ${MAX_VISIBLE_RESULTS} champions` })
              : t({ zh: '当前结果已全部展开', en: 'The current result set is already fully visible' })}
          </span>
        ) : (
          <span className="results-summary-pill workbench-filter-header__pill workbench-filter-header__pill--muted">
            {t({ zh: '等待新的筛选命中', en: 'Waiting for the next match set' })}
          </span>
        )
      }
      actions={(
        <>
          {canToggleResultVisibility ? (
            <button type="button" className="results-visibility-toggle" onClick={toggleResultVisibility}>
              {showAllResults
                ? t({ zh: `收起到默认 ${MAX_VISIBLE_RESULTS} 名`, en: `Collapse back to ${MAX_VISIBLE_RESULTS}` })
                : t({ zh: `显示全部 ${filteredChampions.length} 名`, en: `Show all ${filteredChampions.length}` })}
            </button>
          ) : null}

          <button
            type="button"
            className="results-visibility-toggle results-visibility-toggle--ghost"
            onClick={randomizeResultOrder}
          >
            {randomOrderLabel}
          </button>
        </>
      )}
    />
  )
}
