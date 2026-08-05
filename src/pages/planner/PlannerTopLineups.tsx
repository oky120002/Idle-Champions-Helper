import { getPrimaryLocalizedText } from '../../domain/localizedText'
import type { Champion } from '../../domain/types'
import type { PlannerResult } from '../../domain/planner/recommendationTypes'
import { useI18n } from '../../app/i18n'

interface PlannerTopLineupsProps {
  readonly results: PlannerResult[]
  readonly selectedIndex: number
  readonly championById: Map<string, Champion>
  readonly onSelect: (index: number) => void
}

/**
 * 候选阵型切换：distinct-carry Top K 标签，点击切换结果卡片展示的阵型。
 * results ≤ 1 时不渲染（只有 top1 无需切换）。
 */
export function PlannerTopLineups({ results, selectedIndex, championById, onSelect }: PlannerTopLineupsProps) {
  const { t, locale } = useI18n()

  if (results.length <= 1) {
    return null
  }

  return (
    <section
      className="surface-card planner-top-lineups"
      aria-label={t({ zh: '候选阵型切换', en: 'Top lineups' })}
    >
      <div className="surface-card__body">
        <div className="planner-top-lineups__tabs" role="tablist">
          {results.map((result, index) => {
            const carry =
              result.carryHeroId != null && result.carryHeroId !== ''
                ? (championById.get(result.carryHeroId) ?? null)
                : null
            const carryName = carry
              ? getPrimaryLocalizedText(carry.name, locale)
              : (result.carryHeroId ?? '—')

            return (
              <button
                key={index}
                type="button"
                role="tab"
                aria-selected={index === selectedIndex}
                data-testid={`planner-top-lineup-tab-${String(index)}`}
                className={[
                  'planner-top-lineups__tab',
                  index === selectedIndex ? 'is-selected' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => onSelect(index)}
              >
                <span className="planner-top-lineups__tab-carry">{carryName}</span>
                <span className="planner-top-lineups__tab-score">{result.objectiveValue}</span>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
