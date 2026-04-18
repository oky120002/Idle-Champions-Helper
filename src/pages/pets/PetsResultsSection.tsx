import { useI18n } from '../../app/i18n'
import type { Pet, PetAnimation } from '../../domain/types'
import { MAX_VISIBLE_PETS } from './constants'
import { PetResultsGrid } from './PetResultsGrid'

interface PetsResultsSectionProps {
  filteredPets: Pet[]
  visiblePets: Pet[]
  animationByPetId: ReadonlyMap<string, PetAnimation>
  totalPets: number
  showAllResults: boolean
  canToggleResultVisibility: boolean
  hasRandomOrder: boolean
  onToggleResultVisibility: () => void
  onRandomizeResultOrder: () => void
}

export function PetsResultsSection({
  filteredPets,
  visiblePets,
  animationByPetId,
  totalPets,
  showAllResults,
  canToggleResultVisibility,
  hasRandomOrder,
  onToggleResultVisibility,
  onRandomizeResultOrder,
}: PetsResultsSectionProps) {
  const { t } = useI18n()
  const randomOrderLabel = hasRandomOrder
    ? { zh: '重新随机', en: 'Reshuffle' }
    : { zh: '随机排序', en: 'Shuffle order' }
  const hasMatches = filteredPets.length > 0

  return (
    <section className="results-panel" aria-label={t({ zh: '宠物筛选结果', en: 'Pet filter results' })}>
      <div className="results-panel__meta">
        <p className="supporting-text">
          {hasMatches
            ? t({
                zh: `当前展示 ${visiblePets.length} / ${filteredPets.length} / ${totalPets} 只宠物。若结果仍偏多，优先用左侧搜索、来源或图像状态继续缩小范围；想换一批浏览顺序时可以直接随机打散，悬停卡片还能快速查看动图预览。`,
                en: `Showing ${visiblePets.length} / ${filteredPets.length} / ${totalPets} pets. Narrow the list further with the left-side search, source, or asset-state filters, reshuffle the current set when you want a different scan order, and hover a card for a quick motion preview.`,
              })
            : t({
                zh: '当前筛选条件下没有匹配宠物。可以先清空搜索词，或把来源和图像状态放宽一点再继续看。',
                en: 'No pets match the current filters. Clear the query first, or broaden the source and asset-state filters before narrowing again.',
              })}
        </p>

        {hasMatches ? (
          <div className="results-panel__actions">
            <span className="results-summary-pill">
              {canToggleResultVisibility
                ? showAllResults
                  ? t({
                      zh: `已展开全部 ${filteredPets.length} 只宠物`,
                      en: `Showing all ${filteredPets.length} pets`,
                    })
                  : t({
                      zh: `默认先展示 ${MAX_VISIBLE_PETS} 只宠物`,
                      en: `Defaulting to the first ${MAX_VISIBLE_PETS} pets`,
                    })
                : t({
                    zh: '当前结果已全部展开',
                    en: 'The current result set is already fully visible',
                  })}
            </span>
            {canToggleResultVisibility ? (
              <button type="button" className="results-visibility-toggle" onClick={onToggleResultVisibility}>
                {showAllResults
                  ? t({
                      zh: `收起到默认 ${MAX_VISIBLE_PETS} 只`,
                      en: `Collapse back to ${MAX_VISIBLE_PETS}`,
                    })
                  : t({
                      zh: `显示全部 ${filteredPets.length} 只`,
                      en: `Show all ${filteredPets.length}`,
                    })}
              </button>
            ) : null}
            <button
              type="button"
              className="results-visibility-toggle results-visibility-toggle--ghost"
              onClick={onRandomizeResultOrder}
            >
              {t(randomOrderLabel)}
            </button>
          </div>
        ) : null}
      </div>

      <PetResultsGrid pets={visiblePets} animationByPetId={animationByPetId} />

      {hasMatches && canToggleResultVisibility ? (
        <div className="results-panel__tail">
          <button
            type="button"
            className="results-visibility-toggle results-visibility-toggle--tail"
            onClick={onToggleResultVisibility}
          >
            {showAllResults
              ? t({
                  zh: `收起到默认 ${MAX_VISIBLE_PETS} 只`,
                  en: `Collapse back to ${MAX_VISIBLE_PETS}`,
                })
              : t({
                  zh: `继续展开剩余 ${filteredPets.length - MAX_VISIBLE_PETS} 只宠物`,
                  en: `Reveal the remaining ${filteredPets.length - MAX_VISIBLE_PETS} pets`,
                })}
          </button>
        </div>
      ) : null}
    </section>
  )
}
