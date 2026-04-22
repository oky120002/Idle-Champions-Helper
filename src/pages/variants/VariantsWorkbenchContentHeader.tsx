import { MAX_VISIBLE_VARIANTS } from './constants'
import { VariantsMetrics } from './VariantsMetrics'
import type { VariantsPageModel } from './types'

interface VariantsWorkbenchContentHeaderProps {
  model: VariantsPageModel
}

export function VariantsWorkbenchContentHeader({ model }: VariantsWorkbenchContentHeaderProps) {
  const { t, activeFilters, filteredVariants, visibleVariants, canToggleResultVisibility, filters, copyCurrentLink, shareLinkState, shareButtonLabel } = model
  const hasMatches = filteredVariants.length > 0

  return (
    <div className="variants-workbench__results-head page-tab-header">
      <div className="variants-workbench__results-summary">
        <div className="variants-workbench__results-titlebar">
          <div className="variants-workbench__results-copy">
            <p className="page-tab-header__eyebrow page-tab-header__eyebrow--accent-only variants-workbench__results-kicker">
              <span className="page-tab-header__eyebrow-accent">VARIANTS</span>
            </p>
            <h2 className="variants-workbench__results-title">{t({ zh: '变体筛选', en: 'Variant filters' })}</h2>
            <p className="supporting-text variants-workbench__results-description">
              {hasMatches
                ? t({
                    zh: `当前展示 ${visibleVariants.length} / ${filteredVariants.length} 个变体，并继续按战役 -> 冒险两层结构展开。`,
                    en: `Showing ${visibleVariants.length} / ${filteredVariants.length} variants while preserving the campaign -> adventure reading model.`,
                  })
                : t({
                    zh: '当前筛选条件下没有匹配变体。先放宽一个维度，再逐步缩回来，会比一次勾很多条件更稳。',
                    en: 'No variants match yet. Loosen one dimension first, then tighten it back down for a steadier search flow.',
                  })}
            </p>
          </div>

          <div className="variants-workbench__results-metrics">
            <VariantsMetrics model={model} />
          </div>
        </div>

        {activeFilters.length > 0 ? (
          <p className="results-panel__filter-summary variants-workbench__results-filter-summary">
            {`${t({ zh: '当前筛选：', en: 'Active filters: ' })}${activeFilters.join(' · ')}`}
          </p>
        ) : null}
      </div>

      <div className="variants-workbench__results-actions">
        {hasMatches ? (
          <span className="results-summary-pill variants-workbench__results-pill">
            {canToggleResultVisibility
              ? filters.showAllResults
                ? t({ zh: `已展开全部 ${filteredVariants.length} 个变体`, en: `Showing all ${filteredVariants.length} variants` })
                : t({ zh: `默认先展示 ${MAX_VISIBLE_VARIANTS} 个变体`, en: `Defaulting to the first ${MAX_VISIBLE_VARIANTS} variants` })
              : t({ zh: '当前结果已全部展开', en: 'The current result set is already fully visible' })}
          </span>
        ) : (
          <span className="results-summary-pill variants-workbench__results-pill variants-workbench__results-pill--muted">
            {t({ zh: '等待新的变体命中', en: 'Waiting for the next match set' })}
          </span>
        )}

        <div className="variants-workbench__results-action-row">
          {canToggleResultVisibility ? (
            <button type="button" className="results-visibility-toggle" onClick={model.toggleResultVisibility}>
              {filters.showAllResults
                ? t({ zh: `收起到默认 ${MAX_VISIBLE_VARIANTS} 个`, en: `Collapse back to ${MAX_VISIBLE_VARIANTS}` })
                : t({ zh: `显示全部 ${filteredVariants.length} 个`, en: `Show all ${filteredVariants.length}` })}
            </button>
          ) : null}

          <button
            type="button"
            className={
              shareLinkState === 'success'
                ? 'results-visibility-toggle results-visibility-toggle--ghost action-button--toggled'
                : 'results-visibility-toggle results-visibility-toggle--ghost'
            }
            onClick={() => {
              void copyCurrentLink()
            }}
          >
            {shareButtonLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
