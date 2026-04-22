import { IllustrationsMetrics } from './IllustrationsMetrics'
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

  return (
    <div className="illustrations-workbench__results-head page-tab-header">
      <div className="illustrations-workbench__results-summary">
        <div className="illustrations-workbench__results-titlebar">
          <div className="illustrations-workbench__results-copy">
            <p className="page-tab-header__eyebrow page-tab-header__eyebrow--accent-only illustrations-workbench__results-kicker">
              <span className="page-tab-header__eyebrow-accent">ART CODEX</span>
            </p>
            <h2 className="illustrations-workbench__results-title">{t({ zh: '立绘图鉴', en: 'Illustration catalog' })}</h2>
            <p className="supporting-text illustrations-workbench__results-description">
              {hasMatches
                ? t({
                    zh: `当前展示 ${results.visibleIllustrationEntries.length} / ${results.filteredIllustrationEntries.length} 张立绘。左侧先缩范围，右侧再比较本体、皮肤和动态资源。`,
                    en: `Showing ${results.visibleIllustrationEntries.length} / ${results.filteredIllustrationEntries.length} illustrations. Narrow the scope on the left, then compare base art, skins, and motion resources on the right.`,
                  })
                : t({
                    zh: '当前筛选条件下没有匹配立绘。先放宽一个维度，再逐步缩回来，会比直接清空更稳。',
                    en: 'No illustrations match yet. Loosen one dimension first, then tighten it back down for a steadier search flow.',
                  })}
            </p>
          </div>

          <div className="illustrations-workbench__results-metrics">
            <IllustrationsMetrics model={model} />
          </div>
        </div>

        {activeFilters.length > 0 ? (
          <p className="results-panel__filter-summary illustrations-workbench__results-filter-summary">
            {`${t({ zh: '当前筛选：', en: 'Active filters: ' })}${activeFilters.join(' · ')}`}
          </p>
        ) : null}
      </div>

      <div className="illustrations-workbench__results-actions">
        {hasMatches ? (
          <span className="results-summary-pill illustrations-workbench__results-pill">
            {results.canToggleResultVisibility
              ? filters.showAllResults
                ? t({ zh: `已展开全部 ${results.filteredIllustrationEntries.length} 张立绘`, en: `Showing all ${results.filteredIllustrationEntries.length} illustrations` })
                : t({ zh: `默认先展示 ${MAX_VISIBLE_ILLUSTRATIONS} 张立绘`, en: `Defaulting to the first ${MAX_VISIBLE_ILLUSTRATIONS} illustrations` })
              : t({ zh: '当前结果已全部展开', en: 'The current result set is already fully visible' })}
          </span>
        ) : (
          <span className="results-summary-pill illustrations-workbench__results-pill illustrations-workbench__results-pill--muted">
            {t({ zh: '等待新的立绘命中', en: 'Waiting for the next match set' })}
          </span>
        )}

        <div className="illustrations-workbench__results-action-row">
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
        </div>
      </div>
    </div>
  )
}
