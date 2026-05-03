import { useI18n } from '../../app/i18n'

export interface PlannerResultCardProps {
  score: string
  placements: Record<string, string>
  explanations: string[]
  warnings: string[]
}

export function PlannerResultCard({ score, placements, explanations, warnings }: PlannerResultCardProps) {
  const { t } = useI18n()

  return (
    <article
      className="surface-card planner-result-card"
      aria-label={t({ zh: '推荐结果', en: 'Recommended result' })}
    >
      <div className="surface-card__header">
        <div className="surface-card__header-copy">
          <p className="surface-card__eyebrow">
            {t({ zh: '推荐结果', en: 'Recommended result' })}
          </p>
          <h3 className="surface-card__title">
            {t({ zh: '当前推荐阵型', en: 'Current recommended formation' })}
          </h3>
          <p className="planner-result-card__score">
            <span>{t({ zh: '评分：', en: 'Score: ' })}</span>
            <span>{score}</span>
          </p>
        </div>
      </div>

      <div className="surface-card__body">
        <ul className="planner-result-card__placements">
          {Object.entries(placements)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([slot, heroId]) => (
              <li key={slot}>
                {t({ zh: `槽位 ${slot}: ${heroId}`, en: `Slot ${slot}: ${heroId}` })}
              </li>
            ))}
        </ul>

        {explanations.length > 0 && (
          <section data-section="explanations" className="planner-result-card__explanations">
            <h4 className="planner-result-card__section-title">
              {t({ zh: '说明', en: 'Explanations' })}
            </h4>
            <ul>
              {explanations.map((text, index) => (
                <li key={index}>{text}</li>
              ))}
            </ul>
          </section>
        )}

        {warnings.length > 0 && (
          <section data-section="warnings" className="planner-result-card__warnings">
            <h4 className="planner-result-card__section-title">
              {t({ zh: '不支持警告', en: 'Unsupported warnings' })}
            </h4>
            <ul>
              {warnings.map((text, index) => (
                <li key={index}>{text}</li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </article>
  )
}
