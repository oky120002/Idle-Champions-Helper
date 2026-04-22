import { PageHeaderMetrics, type PageHeaderMetricItem } from '../../components/PageHeaderMetrics'
import { WorkbenchFilterResultsHeader } from '../../components/workbench/WorkbenchScaffold'
import { collectChampionFacetSummary } from '../../features/champion-filters/headerMetrics'
import { MAX_VISIBLE_ILLUSTRATIONS } from './constants'
import type { IllustrationsPageModel } from './types'

interface IllustrationsWorkbenchContentHeaderProps {
  model: IllustrationsPageModel
}

export function IllustrationsWorkbenchContentHeader({ model }: IllustrationsWorkbenchContentHeaderProps) {
  const { t, activeFilters, results, filters, ui, actions } = model
  const hasMatches = results.filteredIllustrationEntries.length > 0
  const randomOrderLabel = ui.hasRandomOrder
    ? t({ zh: '重新随机', en: 'Reshuffle' })
    : t({ zh: '随机排序', en: 'Shuffle order' })
  const champions = Array.from(
    new Map(
      results.filteredIllustrationEntries.flatMap(({ champion }) =>
        champion ? [[champion.id, champion] as const] : [],
      ),
    ).values(),
  )
  const summary = collectChampionFacetSummary(champions, model.locale)
  const metricItems: PageHeaderMetricItem[] = [
    { label: t({ zh: '立绘总数', en: 'Illustrations' }), value: results.illustrations.length },
    { label: t({ zh: '当前匹配', en: 'Matches' }), value: results.filteredIllustrationEntries.length },
    { label: t({ zh: '覆盖英雄', en: 'Champions' }), value: champions.length },
    { label: t({ zh: '本体', en: 'Base' }), value: results.filteredHeroCount },
    { label: t({ zh: '皮肤', en: 'Skins' }), value: results.filteredSkinCount },
    { label: t({ zh: '覆盖座位', en: 'Seats' }), value: summary.seatCount },
    { label: t({ zh: '联动队伍', en: 'Affiliations' }), value: summary.affiliationCount },
    { label: t({ zh: '种族', en: 'Races' }), value: summary.raceCount },
    { label: t({ zh: '阵营', en: 'Alignments' }), value: summary.alignmentCount },
    { label: t({ zh: '获取方式', en: 'Availability' }), value: summary.acquisitionCount },
    { label: t({ zh: '特殊机制', en: 'Mechanics' }), value: summary.mechanicCount },
  ]

  return (
    <WorkbenchFilterResultsHeader
      eyebrow="ART CODEX"
      title={t({ zh: '立绘图鉴', en: 'Illustration catalog' })}
      description={
        hasMatches
          ? t({
              zh: `当前展示 ${results.visibleIllustrationEntries.length} / ${results.filteredIllustrationEntries.length} 张立绘。左侧先缩范围，右侧再比较本体、皮肤和动态资源。`,
              en: `Showing ${results.visibleIllustrationEntries.length} / ${results.filteredIllustrationEntries.length} illustrations. Narrow the scope on the left, then compare base art, skins, and motion resources on the right.`,
            })
          : t({
              zh: '当前筛选条件下没有匹配立绘。先放宽一个维度，再逐步缩回来，会比直接清空更稳。',
              en: 'No illustrations match yet. Loosen one dimension first, then tighten it back down for a steadier search flow.',
            })
      }
      metrics={<PageHeaderMetrics items={metricItems} variant="compact" />}
      filterSummary={
        activeFilters.length > 0
          ? `${t({ zh: '当前筛选：', en: 'Active filters: ' })}${activeFilters.join(' · ')}`
          : null
      }
      summaryBadge={
        hasMatches ? (
          <span className="results-summary-pill workbench-filter-header__pill">
            {results.canToggleResultVisibility
              ? filters.showAllResults
                ? t({ zh: `已展开全部 ${results.filteredIllustrationEntries.length} 张立绘`, en: `Showing all ${results.filteredIllustrationEntries.length} illustrations` })
                : t({ zh: `默认先展示 ${MAX_VISIBLE_ILLUSTRATIONS} 张立绘`, en: `Defaulting to the first ${MAX_VISIBLE_ILLUSTRATIONS} illustrations` })
              : t({ zh: '当前结果已全部展开', en: 'The current result set is already fully visible' })}
          </span>
        ) : (
          <span className="results-summary-pill workbench-filter-header__pill workbench-filter-header__pill--muted">
            {t({ zh: '等待新的立绘命中', en: 'Waiting for the next match set' })}
          </span>
        )
      }
      actions={(
        <>
          {results.canToggleResultVisibility ? (
            <button type="button" className="results-visibility-toggle" onClick={actions.toggleResultVisibility}>
              {filters.showAllResults
                ? t({ zh: `收起到默认 ${MAX_VISIBLE_ILLUSTRATIONS} 张`, en: `Collapse back to ${MAX_VISIBLE_ILLUSTRATIONS}` })
                : t({ zh: `显示全部 ${results.filteredIllustrationEntries.length} 张`, en: `Show all ${results.filteredIllustrationEntries.length}` })}
            </button>
          ) : null}

          <button type="button" className="results-visibility-toggle results-visibility-toggle--ghost" onClick={actions.randomizeResultOrder}>
            {randomOrderLabel}
          </button>
        </>
      )}
    />
  )
}
