import type { SpeedBreakdown, SpeedCategory, SpeedEffectEntry } from '../../domain/planner/speedScoring'
import { useI18n, type LocaleText } from '../../app/i18n'
import { formatFactor } from './factorFormat'

const SPEED_CATEGORY_LABEL: Record<SpeedCategory, LocaleText> = {
  questProgress: { zh: '任务倍增', en: 'Quest progress' },
  spawnSpeed: { zh: '刷新加速', en: 'Spawn speed' },
  extraEnemies: { zh: '额外敌人', en: 'Extra enemies' },
  timeScale: { zh: '时间加速', en: 'Time scale' },
  transitionSpeedup: { zh: '转换加速', en: 'Transition speedup' },
  simultaneousSpawn: { zh: '同步刷新', en: 'Simultaneous spawn' },
  preSpawn: { zh: '预刷新', en: 'Pre-spawn' },
  areaSkip: { zh: '跳层/秒杀', en: 'Area skip' },
}

/** 格式化单条速度效果为人类可读描述（与类别相关）。 */
function describeEffect(effect: SpeedEffectEntry, t: (text: LocaleText) => string): string {
  switch (effect.category) {
    case 'questProgress':
      if (effect.multiplier != null) return `${String(effect.value)}% ×${String(effect.multiplier)}`
      if (effect.reductionAmount != null) return `${String(effect.value)}% −${String(effect.reductionAmount)}%`
      return `${String(effect.value)}%`
    case 'spawnSpeed':
    case 'timeScale':
    case 'transitionSpeedup':
    case 'extraEnemies':
    case 'areaSkip':
      return `+${String(effect.value)}%`
    case 'simultaneousSpawn':
    case 'preSpawn':
      return t({ zh: '在场生效', en: 'active' })
  }
}

export interface PlannerSpeedBreakdownProps {
  readonly breakdown: SpeedBreakdown | null | undefined
  /** heroId → 展示名（由调用方从 placementEntries 构造）。 */
  readonly heroNameById: Map<string, string>
}

/**
 * team-speed 模式的速度拆解面板：各类别因子 + 按英雄贡献。
 * breakdown 为 null/undefined（非 team-speed 模式或空阵型）时不渲染。
 */
export function PlannerSpeedBreakdown({ breakdown, heroNameById }: PlannerSpeedBreakdownProps) {
  const { t } = useI18n()

  if (!breakdown) return null

  return (
    <section data-section="speed-breakdown" className="planner-speed-breakdown">
      <h4 className="planner-result-card__section-title">
        {t({ zh: '速度拆解', en: 'Speed breakdown' })}
      </h4>
      <p className="planner-breakdown__formula" data-testid="planner-speed-breakdown-total">
        {t({ zh: `总速度因子 ×${formatFactor(breakdown.total)}`, en: `Total speed ×${formatFactor(breakdown.total)}` })}
      </p>

      {breakdown.categoryFactors.length > 0 ? (
        <ul className="planner-breakdown__factors">
          {breakdown.categoryFactors.map((factor) => (
            <li key={factor.category} className="planner-breakdown__factor">
              <span className="planner-breakdown__factor-label">{t(SPEED_CATEGORY_LABEL[factor.category])}</span>
              <strong className="planner-breakdown__factor-value">×{formatFactor(factor.factor)}</strong>
            </li>
          ))}
        </ul>
      ) : null}

      {breakdown.heroContributions.length > 0 ? (
        <>
          <p className="planner-breakdown__sources-title">
            {t({ zh: '速度贡献（按英雄）', en: 'Speed sources (by hero)' })}
          </p>
          <ul className="planner-breakdown__contributions" data-testid="planner-speed-breakdown-contributions">
            {breakdown.heroContributions.map((contribution) => {
              const name = heroNameById.get(contribution.heroId) ?? contribution.heroId
              return (
                <li key={contribution.heroId} className="planner-breakdown__contribution">
                  <p className="planner-breakdown__contribution-head">
                    <strong>{name}</strong>
                  </p>
                  <ul className="planner-breakdown__signals">
                    {contribution.effects.map((effect, index) => (
                      <li key={`${effect.category}:${String(index)}`}>
                        <span>{t(SPEED_CATEGORY_LABEL[effect.category])}</span>
                        <strong>{describeEffect(effect, t)}</strong>
                      </li>
                    ))}
                  </ul>
                </li>
              )
            })}
          </ul>
        </>
      ) : null}
    </section>
  )
}
