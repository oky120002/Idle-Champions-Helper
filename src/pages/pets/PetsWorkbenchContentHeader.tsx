import { MAX_VISIBLE_PETS } from './constants'
import { PetsMetrics } from './PetsMetrics'
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

  return (
    <div className="pets-workbench__results-head page-tab-header">
      <div className="pets-workbench__results-summary">
        <div className="pets-workbench__results-titlebar">
          <div className="pets-workbench__results-copy">
            <p className="page-tab-header__eyebrow page-tab-header__eyebrow--accent-only pets-workbench__results-kicker">
              <span className="page-tab-header__eyebrow-accent">PETS</span>
            </p>
            <h2 className="pets-workbench__results-title">{t({ zh: '宠物图鉴', en: 'Pet catalog' })}</h2>
            <p className="supporting-text pets-workbench__results-description">
              {hasMatches
                ? t({
                    zh: `当前展示 ${results.visiblePets.length} / ${results.filteredPets.length} / ${summary.total} 只宠物。左侧先定范围，右侧再看立绘、来源与资源完整度。`,
                    en: `Showing ${results.visiblePets.length} / ${results.filteredPets.length} / ${summary.total} pets. Narrow the roster on the left, then compare art, source, and asset completeness on the right.`,
                  })
                : t({
                    zh: '当前筛选条件下没有匹配宠物。先放宽来源或图像状态，再继续缩回来。',
                    en: 'No pets match yet. Loosen source or asset state first, then narrow things down again.',
                  })}
            </p>
          </div>

          <div className="pets-workbench__results-metrics">
            <PetsMetrics summary={summary} />
          </div>
        </div>
      </div>

      <div className="pets-workbench__results-actions">
        {hasMatches ? (
          <span className="results-summary-pill pets-workbench__results-pill">
            {results.canToggleResultVisibility
              ? filters.showAllResults
                ? t({ zh: `已展开全部 ${results.filteredPets.length} 只宠物`, en: `Showing all ${results.filteredPets.length} pets` })
                : t({ zh: `默认先展示 ${MAX_VISIBLE_PETS} 只宠物`, en: `Defaulting to the first ${MAX_VISIBLE_PETS} pets` })
              : t({ zh: '当前结果已全部展开', en: 'The current result set is already fully visible' })}
          </span>
        ) : (
          <span className="results-summary-pill pets-workbench__results-pill pets-workbench__results-pill--muted">
            {t({ zh: '等待新的宠物命中', en: 'Waiting for the next match set' })}
          </span>
        )}

        <div className="pets-workbench__results-action-row">
          {results.canToggleResultVisibility ? (
            <button type="button" className="results-visibility-toggle" onClick={actions.toggleResultVisibility}>
              {filters.showAllResults
                ? t({ zh: `收起到默认 ${MAX_VISIBLE_PETS} 只`, en: `Collapse back to ${MAX_VISIBLE_PETS}` })
                : t({ zh: `显示全部 ${results.filteredPets.length} 只`, en: `Show all ${results.filteredPets.length}` })}
            </button>
          ) : null}

          <button type="button" className="results-visibility-toggle results-visibility-toggle--ghost" onClick={actions.randomizeResultOrder}>
            {randomOrderLabel}
          </button>

          <button
            type="button"
            className={
              ui.shareLinkState === 'success'
                ? 'results-visibility-toggle results-visibility-toggle--ghost action-button--toggled'
                : 'results-visibility-toggle results-visibility-toggle--ghost'
            }
            onClick={() => {
              void actions.copyCurrentLink()
            }}
          >
            {ui.shareButtonLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
