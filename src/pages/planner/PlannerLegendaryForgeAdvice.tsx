import { useMemo } from 'react'

import { useI18n } from '../../app/i18n'
import { rankLegendaryForgeCandidates } from '../../domain/buffs/legendaryEffects'
import type { LegendaryEffectCatalogEntry } from '../../domain/buffs/legendaryEffects'
import type { ResolvedHeroAbilityProfile } from '../../domain/abilities/abilityModel'

interface PlannerLegendaryForgeAdviceProps {
  readonly heroes: readonly ResolvedHeroAbilityProfile[]
  readonly placements: Record<string, string>
  readonly catalog: readonly LegendaryEffectCatalogEntry[]
  readonly level?: number
}

export function PlannerLegendaryForgeAdvice({ heroes, placements, catalog, level = 1 }: PlannerLegendaryForgeAdviceProps) {
  const { t, locale } = useI18n()
  const recommendations = useMemo(() => rankLegendaryForgeCandidates(
    heroes.map((hero) => hero.heroId),
    new Map(heroes.map((hero) => [hero.heroId, hero.tags])),
    new Map(Object.entries(placements)),
    catalog,
    level,
  ).slice(0, 5), [heroes, placements, catalog, level])

  if (recommendations.length === 0) return null

  const nameById = new Map(heroes.map((hero) => [hero.heroId, locale === 'zh-CN' ? hero.name.display : hero.name.original]))
  return (
    <section className="surface-card planner-legendary-advice" aria-label={t('锻造优先级建议')}>
      <div className="surface-card__header">
        <div className="surface-card__header-copy">
          <p className="surface-card__eyebrow">{t('传奇装备')}</p>
          <h3 className="surface-card__title">{t('锻造优先级建议')}</h3>
          <p className="surface-card__description">{t('按当前阵型估算未锻造传奇的伤害贡献')}</p>
        </div>
      </div>
      <div className="surface-card__body">
        <ol className="planner-legendary-advice__list">
          {recommendations.map((recommendation) => (
            <li key={recommendation.heroId} className="planner-legendary-advice__item">
              <strong>{nameById.get(recommendation.heroId) ?? recommendation.heroId}</strong>
              <span>{t('{p0} 个效果 · 预计 +{p1}%', { p0: recommendation.effectCount, p1: recommendation.score })}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
