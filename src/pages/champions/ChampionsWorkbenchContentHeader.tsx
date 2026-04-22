import { PageHeaderMetrics, type PageHeaderMetricItem } from '../../components/PageHeaderMetrics'
import { WorkbenchFilterResultsHeader } from '../../components/workbench/WorkbenchScaffold'
import { collectChampionFacetSummary } from '../../features/champion-filters/headerMetrics'
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
  const metricItems: PageHeaderMetricItem[] =
    model.state.status === 'ready'
      ? (() => {
          const summary = collectChampionFacetSummary(filteredChampions, model.locale)

          return [
            {
              label: t({ zh: '当前展示', en: 'Showing' }),
              value: t({
                zh: `${visibleChampions.length} / ${filteredChampions.length}`,
                en: `${visibleChampions.length} / ${filteredChampions.length} champions`,
              }),
            },
            { label: t({ zh: '英雄总数', en: 'Roster' }), value: model.state.champions.length },
            { label: t({ zh: '覆盖座位', en: 'Seats' }), value: summary.seatCount },
            { label: t({ zh: '联动队伍', en: 'Affiliations' }), value: summary.affiliationCount },
            { label: t({ zh: '种族', en: 'Races' }), value: summary.raceCount },
            { label: t({ zh: '性别', en: 'Genders' }), value: summary.genderCount },
            { label: t({ zh: '阵营', en: 'Alignments' }), value: summary.alignmentCount },
            { label: t({ zh: '职业', en: 'Professions' }), value: summary.professionCount },
            { label: t({ zh: '获取方式', en: 'Availability' }), value: summary.acquisitionCount },
            { label: t({ zh: '特殊机制', en: 'Mechanics' }), value: summary.mechanicCount },
          ]
        })()
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
              ? showAllResults
                ? t({ zh: `已展开全部 ${filteredChampions.length}`, en: `Showing all ${filteredChampions.length} champions` })
                : t({ zh: `默认先展示 ${MAX_VISIBLE_RESULTS}`, en: `Defaulting to the first ${MAX_VISIBLE_RESULTS} champions` })
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
            <button
              type="button"
              className="results-visibility-toggle results-visibility-toggle--primary"
              onClick={toggleResultVisibility}
            >
              {showAllResults
                ? t({ zh: `收起到默认 ${MAX_VISIBLE_RESULTS}`, en: `Collapse back to ${MAX_VISIBLE_RESULTS}` })
                : t({ zh: `显示全部 ${filteredChampions.length}`, en: `Show all ${filteredChampions.length}` })}
            </button>
          ) : null}

          <button
            type="button"
            className="results-visibility-toggle results-visibility-toggle--secondary"
            onClick={randomizeResultOrder}
          >
            {randomOrderLabel}
          </button>
        </>
      )}
    />
  )
}
