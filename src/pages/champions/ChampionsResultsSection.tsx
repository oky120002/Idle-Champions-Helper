import { ChampionVisualWorkbench } from '../../components/ChampionVisualWorkbench'
import { StatusBanner } from '../../components/StatusBanner'
import { ChampionResultCard } from './ChampionResultCard'
import { MAX_VISIBLE_RESULTS } from './constants'
import type { ChampionsPageModel } from './types'

interface ChampionsResultsSectionProps {
  model: ChampionsPageModel
}

export function ChampionsResultsSection({ model }: ChampionsResultsSectionProps) {
  const {
    t,
    filteredChampions,
    visibleChampions,
    selectedChampion,
    selectedChampionVisual,
    activeFilters,
    canToggleResultVisibility,
    showAllResults,
    resultsShellHeight,
    resultsShellRef,
    resultsContentRef,
    showResultsQuickNavTop,
    showResultsQuickNavBottom,
    toggleResultVisibility,
    clearSelectedChampion,
    scrollResultsToBoundary,
  } = model

  return (
    <section className="champions-results">
      <section
        ref={resultsShellRef}
        className="results-panel-shell"
        aria-label={t({ zh: '英雄筛选结果', en: 'Champion filter results' })}
        style={resultsShellHeight !== null ? { height: `${resultsShellHeight}px` } : undefined}
      >
        <div ref={resultsContentRef} className="results-panel">
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
              {filteredChampions.length > 0
                ? t({
                    zh: `当前展示 ${visibleChampions.length} / ${filteredChampions.length} 名英雄。如果结果过多，优先加关键词、座位、定位、联动队伍、种族、性别、阵营、职业、获取方式或特殊机制缩小范围。`,
                    en: `Showing ${visibleChampions.length} / ${filteredChampions.length} champions. Narrow things down with a keyword, seat, role, affiliation, race, gender, alignment, profession, availability, or special mechanic if the list feels too broad.`,
                  })
                : t({
                    zh: '当前筛选条件下没有匹配英雄。可以直接点左侧已选条件逐项回退，或用筛选头部的清空全部重新开始。',
                    en: 'No champions match this filter set yet. Peel the left-side chips back one by one, or use the reset button in the filter header to start over.',
                  })}
            </p>

            {filteredChampions.length > 0 ? (
              <div className="results-panel__actions">
                <span className="results-summary-pill">
                  {canToggleResultVisibility
                    ? showAllResults
                      ? t({ zh: `已展开全部 ${filteredChampions.length} 名英雄`, en: `Showing all ${filteredChampions.length} champions` })
                      : t({ zh: `默认先展示 ${MAX_VISIBLE_RESULTS} 名英雄`, en: `Defaulting to the first ${MAX_VISIBLE_RESULTS} champions` })
                    : t({ zh: '当前结果已全部展开', en: 'The current result set is already fully visible' })}
                </span>

                {canToggleResultVisibility ? (
                  <button type="button" className="results-visibility-toggle" onClick={toggleResultVisibility}>
                    {showAllResults
                      ? t({ zh: `收起到默认 ${MAX_VISIBLE_RESULTS} 名`, en: `Collapse back to ${MAX_VISIBLE_RESULTS}` })
                      : t({ zh: `显示全部 ${filteredChampions.length} 名`, en: `Show all ${filteredChampions.length}` })}
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          {filteredChampions.length > 0 ? (
            <>
              {selectedChampion ? (
                <ChampionVisualWorkbench
                  key={selectedChampion.id}
                  champion={selectedChampion}
                  visual={selectedChampionVisual}
                  locale={model.locale}
                  onClose={clearSelectedChampion}
                />
              ) : null}

              <div className="results-grid results-grid--stable">
                {visibleChampions.map((champion) => (
                  <ChampionResultCard key={champion.id} champion={champion} model={model} />
                ))}
              </div>

              {canToggleResultVisibility ? (
                <div className="results-panel__tail">
                  <button
                    type="button"
                    className="results-visibility-toggle results-visibility-toggle--tail"
                    onClick={toggleResultVisibility}
                  >
                    {showAllResults
                      ? t({ zh: `收起到默认 ${MAX_VISIBLE_RESULTS} 名`, en: `Collapse back to ${MAX_VISIBLE_RESULTS}` })
                      : t({ zh: `继续展开剩余 ${filteredChampions.length - MAX_VISIBLE_RESULTS} 名英雄`, en: `Reveal the remaining ${filteredChampions.length - MAX_VISIBLE_RESULTS} champions` })}
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            <div className="results-panel__empty">
              <StatusBanner tone="info">
                {t({
                  zh: '暂时没有可展示的英雄结果。先放宽一个过滤维度，再继续缩小范围会更顺手。',
                  en: 'There are no champions to show right now. Loosen one filter group first, then narrow it back down.',
                })}
              </StatusBanner>
            </div>
          )}
        </div>
      </section>

      {showResultsQuickNavTop || showResultsQuickNavBottom ? (
        <div
          className={
            showResultsQuickNavTop && showResultsQuickNavBottom
              ? 'results-quick-nav'
              : 'results-quick-nav results-quick-nav--single'
          }
          role="group"
          aria-label={t({ zh: '结果列表快捷滚动', en: 'Results quick scrolling' })}
        >
          {showResultsQuickNavTop ? (
            <button
              type="button"
              className="results-quick-nav__button"
              onClick={() => scrollResultsToBoundary('top')}
              aria-label={t({ zh: '返回结果顶部', en: 'Back to results top' })}
            >
              <ResultsQuickNavIcon direction="up" />
              <span>{t({ zh: '顶部', en: 'Top' })}</span>
            </button>
          ) : null}
          {showResultsQuickNavBottom ? (
            <button
              type="button"
              className="results-quick-nav__button results-quick-nav__button--accent"
              onClick={() => scrollResultsToBoundary('bottom')}
              aria-label={t({ zh: '跳到结果底部', en: 'Jump to results bottom' })}
            >
              <ResultsQuickNavIcon direction="down" />
              <span>{t({ zh: '到底', en: 'End' })}</span>
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

function ResultsQuickNavIcon({ direction }: { direction: 'up' | 'down' }) {
  const path =
    direction === 'up'
      ? 'M12 5.75l5.25 6.25h-3.25v6h-4v-6H6.75L12 5.75z'
      : 'M10 6h4v6h3.25L12 18.25 6.75 12H10V6z'

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M4.75 12h14.5" strokeLinecap="round" strokeOpacity="0.18" />
      <path d={path} fill="currentColor" stroke="none" />
    </svg>
  )
}
