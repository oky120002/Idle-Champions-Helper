import { StatusBanner } from '../../components/StatusBanner'
import { MAX_VISIBLE_ILLUSTRATIONS } from './constants'
import { IllustrationResultCard } from './IllustrationResultCard'
import type { IllustrationsPageModel } from './types'

type IllustrationsResultsSectionProps = {
  model: IllustrationsPageModel
}

export function IllustrationsResultsSection({ model }: IllustrationsResultsSectionProps) {
  const { locale, t, activeFilters, filters, results, actions, animationByIllustrationId } = model
  const hasMatches = results.filteredIllustrationEntries.length > 0
  const randomOrderLabel = uiHasRandomOrderLabel(model.ui.hasRandomOrder)

  return (
    <section className="results-panel" aria-label={t({ zh: '立绘筛选结果', en: 'Illustration filter results' })}>
      <div className="results-panel__meta">
        <p
          className={activeFilters.length > 0 ? 'supporting-text' : 'supporting-text supporting-text--placeholder'}
          aria-hidden={activeFilters.length === 0}
        >
          {activeFilters.length > 0
            ? `${t({ zh: '当前筛选：', en: 'Active filters: ' })}${activeFilters.join(' · ')}`
            : t({ zh: '当前筛选：', en: 'Active filters: ' })}
        </p>

        <p className="supporting-text">
          {hasMatches
            ? t({
                zh: `当前展示 ${results.visibleIllustrationEntries.length} / ${results.filteredIllustrationEntries.length} 张立绘（${results.filteredHeroCount} 张本体 / ${results.filteredSkinCount} 张皮肤）。若列表仍偏大，优先加关键词、范围、座位、定位、联动队伍或标签缩小范围。`,
                en: `Showing ${results.visibleIllustrationEntries.length} / ${results.filteredIllustrationEntries.length} illustrations (${results.filteredHeroCount} hero base / ${results.filteredSkinCount} skins). If the list still feels broad, narrow it with a keyword, scope, seat, role, affiliation, or tags.`,
              })
            : t({
                zh: '当前筛选条件下没有匹配立绘。可以直接点上方已选条件逐项回退，或用清空全部重新开始。',
                en: 'No illustrations match this filter set yet. Roll chips back one by one, or reset everything to start over.',
              })}
        </p>

        {hasMatches ? (
          <div className="results-panel__actions">
            <span className="results-summary-pill">
              {results.canToggleResultVisibility
                ? filters.showAllResults
                  ? t({
                      zh: `已展开全部 ${results.filteredIllustrationEntries.length} 张立绘`,
                      en: `Showing all ${results.filteredIllustrationEntries.length} illustrations`,
                    })
                  : t({
                      zh: `默认先展示 ${MAX_VISIBLE_ILLUSTRATIONS} 张立绘`,
                      en: `Defaulting to the first ${MAX_VISIBLE_ILLUSTRATIONS} illustrations`,
                    })
                : t({
                    zh: '当前结果已全部展开',
                    en: 'The current result set is already fully visible',
                  })}
            </span>

            {results.canToggleResultVisibility ? (
              <button type="button" className="results-visibility-toggle" onClick={actions.toggleResultVisibility}>
                {filters.showAllResults
                  ? t({
                      zh: `收起到默认 ${MAX_VISIBLE_ILLUSTRATIONS} 张`,
                      en: `Collapse back to ${MAX_VISIBLE_ILLUSTRATIONS}`,
                    })
                  : t({
                      zh: `显示全部 ${results.filteredIllustrationEntries.length} 张`,
                      en: `Show all ${results.filteredIllustrationEntries.length}`,
                    })}
              </button>
            ) : null}

            <button type="button" className="results-visibility-toggle results-visibility-toggle--ghost" onClick={actions.randomizeResultOrder}>
              {t(randomOrderLabel)}
            </button>
          </div>
        ) : null}
      </div>

      {hasMatches ? (
        <>
          <div className="illustrations-grid" aria-label={t({ zh: '立绘结果', en: 'Illustration results' })}>
            {results.visibleIllustrationEntries.map((entry) => (
              <IllustrationResultCard
                key={entry.illustration.id}
                entry={entry}
                animation={animationByIllustrationId.get(entry.illustration.id) ?? null}
                locale={locale}
                t={t}
              />
            ))}
          </div>

          {results.canToggleResultVisibility ? (
            <div className="results-panel__tail">
              <button
                type="button"
                className="results-visibility-toggle results-visibility-toggle--tail"
                onClick={actions.toggleResultVisibility}
              >
                {filters.showAllResults
                  ? t({
                      zh: `收起到默认 ${MAX_VISIBLE_ILLUSTRATIONS} 张`,
                      en: `Collapse back to ${MAX_VISIBLE_ILLUSTRATIONS}`,
                    })
                  : t({
                      zh: `继续展开剩余 ${results.filteredIllustrationEntries.length - MAX_VISIBLE_ILLUSTRATIONS} 张立绘`,
                      en: `Reveal the remaining ${results.filteredIllustrationEntries.length - MAX_VISIBLE_ILLUSTRATIONS} illustrations`,
                    })}
              </button>
            </div>
          ) : null}
        </>
      ) : (
        <div className="results-panel__empty">
          <StatusBanner
            tone="info"
            title={t({ zh: '没有匹配结果', en: 'No illustrations match' })}
            detail={t({
              zh: '当前筛选条件下没有可展示的立绘，试试清空一两个条件或先切回更宽的范围。',
              en: 'No illustrations match the current filters. Try clearing one or two filters, or broaden the scope first.',
            })}
          />
        </div>
      )}
    </section>
  )
}

function uiHasRandomOrderLabel(hasRandomOrder: boolean) {
  return hasRandomOrder
    ? { zh: '重新随机', en: 'Reshuffle' }
    : { zh: '随机排序', en: 'Shuffle order' }
}
