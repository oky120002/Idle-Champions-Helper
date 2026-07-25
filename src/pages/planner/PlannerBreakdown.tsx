import type { SimulationBreakdown } from '../../domain/planner/steadyStateScoring'
import { useI18n } from '../../app/i18n'

/** 紧凑格式化因子数值：极大/极小用科学计数，常规保留两位。 */
function formatFactor(value: number): string {
  if (!Number.isFinite(value)) {
    return value > 0 ? '∞' : '0'
  }
  if (value >= 1e4 || (value > 0 && value < 0.01)) {
    return value.toExponential(2)
  }
  return value.toFixed(2)
}

/** 每位英雄最多展示的加成条目数；超出折叠为「+N」，避免几十条 signal 刷屏。 */
const SIGNAL_SHOW_LIMIT = 3

interface PlannerBreakdownProps {
  breakdown: SimulationBreakdown | null
  /** heroId → 展示名（由调用方从 placementEntries 构造）。 */
  heroNameById: Map<string, string>
}

/**
 * 渲染 scoreFormation 的结构化拆解（baseDps → carryDps 的因子构成 + 每位英雄的加成来源）。
 * breakdown 为 null（team-gold 模式或缺 carry）时不渲染。
 */
export function PlannerBreakdown({ breakdown, heroNameById }: PlannerBreakdownProps) {
  const { t } = useI18n()

  if (!breakdown) {
    return null
  }

  const factors: Array<{ key: string; label: string; value: number }> = [
    { key: 'damagePool', label: t({ zh: '加成池', en: 'Buffs' }), value: breakdown.factors.damagePool },
    { key: 'crit', label: t({ zh: '暴击', en: 'Crit' }), value: breakdown.factors.crit },
    { key: 'vulnerability', label: t({ zh: '易伤', en: 'Vulnerability' }), value: breakdown.factors.vulnerability },
    { key: 'globalBuff', label: t({ zh: '全局', en: 'Global' }), value: breakdown.factors.globalBuff },
    { key: 'equipment', label: t({ zh: '装备', en: 'Equipment' }), value: breakdown.factors.equipmentAdjustment },
  ]

  return (
    <section data-section="breakdown" className="planner-breakdown">
      <h4 className="planner-result-card__section-title">
        {t({ zh: '加成拆解', en: 'DPS breakdown' })}
      </h4>
      <p className="planner-breakdown__formula" data-testid="planner-breakdown-formula">
        {t({
          zh: `基线 ${breakdown.baseDps} × 加成 = ${breakdown.carryDps}`,
          en: `${breakdown.baseDps} × buffs = ${breakdown.carryDps}`,
        })}
      </p>
      <ul className="planner-breakdown__factors">
        {factors.map((factor) => (
          <li key={factor.key} className="planner-breakdown__factor">
            <span className="planner-breakdown__factor-label">{factor.label}</span>
            <strong className="planner-breakdown__factor-value">×{formatFactor(factor.value)}</strong>
          </li>
        ))}
      </ul>

      <p className="planner-breakdown__sources-title">
        {t({ zh: '加成来源（按英雄）', en: 'Buff sources (by hero)' })}
      </p>
      <ul className="planner-breakdown__contributions">
        {breakdown.contributions.map((contribution) => {
          const name = heroNameById.get(contribution.supportHeroId) ?? contribution.supportHeroId
          const ranked = [...contribution.signals].sort((left, right) => right.multiplier - left.multiplier)
          const top = ranked.slice(0, SIGNAL_SHOW_LIMIT)
          const remaining = ranked.length - top.length
          return (
            <li
              key={`${contribution.supportHeroId}:${contribution.supportSlotId}`}
              className="planner-breakdown__contribution"
            >
              <p className="planner-breakdown__contribution-head">
                <strong>{name}</strong>
                <span>
                  {t({
                    zh: `槽位 ${contribution.supportSlotId} · ${contribution.signals.length} 个生效加成`,
                    en: `slot ${contribution.supportSlotId} · ${contribution.signals.length} active`,
                  })}
                </span>
              </p>
              <ul className="planner-breakdown__signals">
                {top.map((signal, index) => (
                  <li key={`${signal.signalKind}:${index}`}>
                    <span>{signal.signalKind}</span>
                    <strong>×{formatFactor(signal.multiplier)}</strong>
                  </li>
                ))}
                {remaining > 0 ? (
                  <li className="planner-breakdown__more">
                    {t({ zh: `+${remaining} 个`, en: `+${remaining} more` })}
                  </li>
                ) : null}
              </ul>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
