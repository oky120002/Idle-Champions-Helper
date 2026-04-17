import { StatusBanner } from '../../components/StatusBanner'
import { MAX_VISIBLE_VARIANTS } from './constants'
import { VariantCampaignSection } from './VariantCampaignSection'
import type { VariantsPageModel } from './types'

type VariantsResultsSectionProps = {
  model: VariantsPageModel
}

export function VariantsResultsSection({ model }: VariantsResultsSectionProps) {
  const {
    t,
    activeFilters,
    filteredVariants,
    visibleVariants,
    visibleCampaignGroups,
    canToggleResultVisibility,
    showAllResults,
    toggleResultVisibility,
  } = model
  const hasMatches = filteredVariants.length > 0

  return (
    <section className="variants-results" aria-label={t({ zh: '变体筛选结果', en: 'Variant filter results' })}>
      <div className="results-panel">
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
                  zh: `当前展示 ${visibleVariants.length} / ${filteredVariants.length} 个变体，并按战役 -> 冒险两层结构展开。先看阵型图、敌人类型、攻击占比、特别敌人数与区域列表，再决定是否细看具体限制。`,
                  en: `Showing ${visibleVariants.length} / ${filteredVariants.length} variants in a campaign -> adventure hierarchy. Scan the formation map, enemy types, attack mix, special enemy count, and area list before drilling into individual restrictions.`,
                })
              : t({
                  zh: '当前筛选条件下没有匹配变体。先放宽一个维度，再逐步缩回来，会比一次勾很多条件更稳。',
                  en: 'No variants match the current filter set. Loosen one dimension first, then tighten it back down for a steadier search flow.',
                })}
          </p>

          {hasMatches ? (
            <div className="results-panel__actions">
              <span className="results-summary-pill">
                {canToggleResultVisibility
                  ? showAllResults
                    ? t({ zh: `已展开全部 ${filteredVariants.length} 个变体`, en: `Showing all ${filteredVariants.length} variants` })
                    : t({ zh: `默认先展示 ${MAX_VISIBLE_VARIANTS} 个变体`, en: `Defaulting to the first ${MAX_VISIBLE_VARIANTS} variants` })
                  : t({ zh: '当前结果已全部展开', en: 'The current result set is already fully visible' })}
              </span>

              {canToggleResultVisibility ? (
                <button type="button" className="results-visibility-toggle" onClick={toggleResultVisibility}>
                  {showAllResults
                    ? t({ zh: `收起到默认 ${MAX_VISIBLE_VARIANTS} 个`, en: `Collapse back to ${MAX_VISIBLE_VARIANTS}` })
                    : t({ zh: `显示全部 ${filteredVariants.length} 个变体`, en: `Show all ${filteredVariants.length}` })}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        {hasMatches ? (
          <>
            <div className="variant-campaign-stack">
              {visibleCampaignGroups.map((group) => (
                <VariantCampaignSection key={group.id} model={model} group={group} />
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
                    ? t({ zh: `收起到默认 ${MAX_VISIBLE_VARIANTS} 个`, en: `Collapse back to ${MAX_VISIBLE_VARIANTS}` })
                    : t({ zh: `继续展开剩余 ${filteredVariants.length - MAX_VISIBLE_VARIANTS} 个变体`, en: `Reveal the remaining ${filteredVariants.length - MAX_VISIBLE_VARIANTS} variants` })}
                </button>
              </div>
            ) : null}
          </>
        ) : (
          <div className="results-panel__empty">
            <StatusBanner
              tone="info"
              title={t({ zh: '没有匹配变体', en: 'No variants match' })}
              detail={t({
                zh: '可以先清掉敌人类型 / 场景 / 特别敌人这些次级条件，再回到关键词或战役重新缩小范围。',
                en: 'Try clearing secondary filters like enemy type, scene, or special enemies first, then narrow things down again with keyword or campaign.',
              })}
            />
          </div>
        )}
      </div>
    </section>
  )
}
