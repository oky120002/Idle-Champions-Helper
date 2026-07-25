import { getPrimaryLocalizedText } from '../../domain/localizedText'
import type { Champion } from '../../domain/types'
import type { PlannerResult } from '../../domain/planner/recommendationTypes'
import { useI18n } from '../../app/i18n'

interface PlannerCarryRankingProps {
  results: PlannerResult[]
  selectedIndex: number
  championById: Map<string, Champion>
  onSelect: (index: number) => void
}

/**
 * carry 排行（阶段 15.2）：Top K 阵型按 carryDps 降序的核心输出位候选列表。
 * 点击某项切换结果卡片到该 carry 的最佳阵型。results 为空时不渲染。
 */
export function PlannerCarryRanking({ results, selectedIndex, championById, onSelect }: PlannerCarryRankingProps) {
  const { t, locale } = useI18n()

  if (results.length === 0) {
    return null
  }

  return (
    <section
      className="surface-card planner-carry-ranking"
      aria-label={t({ zh: 'carry 排行', en: 'Carry ranking' })}
    >
      <div className="surface-card__header">
        <div className="surface-card__header-copy">
          <p className="surface-card__eyebrow">{t({ zh: 'carry 排行', en: 'Carry ranking' })}</p>
          <h3 className="surface-card__title">{t({ zh: '核心输出位候选', en: 'Carry candidates' })}</h3>
        </div>
      </div>
      <div className="surface-card__body">
        <ol className="planner-carry-ranking__list" data-testid="planner-carry-ranking">
          {results.map((result, index) => {
            const carry = result.carryHeroId ? championById.get(result.carryHeroId) ?? null : null
            const carryName = carry
              ? getPrimaryLocalizedText(carry.name, locale)
              : (result.carryHeroId ?? '—')

            return (
              <li
                key={index}
                className={[
                  'planner-carry-ranking__item',
                  index === selectedIndex ? 'is-selected' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <button
                  type="button"
                  data-testid={`planner-carry-ranking-item-${index}`}
                  className={index === selectedIndex ? 'is-selected' : ''}
                  onClick={() => onSelect(index)}
                >
                  <span className="planner-carry-ranking__rank">{index + 1}</span>
                  <span className="planner-carry-ranking__name">{carryName}</span>
                  {carry ? (
                    <span className="planner-carry-ranking__seat">
                      {t({ zh: `Seat ${carry.seat}`, en: `Seat ${carry.seat}` })}
                    </span>
                  ) : null}
                  <span className="planner-carry-ranking__score">{result.score}</span>
                </button>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
