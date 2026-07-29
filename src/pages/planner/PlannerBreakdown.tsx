import type { SimulationBreakdown } from '../../domain/planner/steadyStateScoring'
import type { HeroAbilityKind } from '../../domain/abilities/abilityModel'
import { useI18n, type LocaleText } from '../../app/i18n'

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

/**
 * HeroAbilityKind → 友好标签（双语）。Record 强制 17 种全覆盖，
 * 新增 kind 时 TS 报错提醒补标签，避免技术名直出。
 */
const SIGNAL_KIND_LABEL: Record<HeroAbilityKind, LocaleText> = {
  globalDpsMultiplier: { zh: '全局 DPS', en: 'Global DPS' },
  heroDpsMultiplier: { zh: '英雄 DPS', en: 'Hero DPS' },
  adjacentBuff: { zh: '邻位加成', en: 'Adjacent buff' },
  taggedChampionBuff: { zh: '标签加成', en: 'Tagged buff' },
  globalGoldMultiplier: { zh: '全局金币', en: 'Global gold' },
  heroGoldMultiplier: { zh: '英雄金币', en: 'Hero gold' },
  globalCritChance: { zh: '全局暴击率', en: 'Global crit chance' },
  heroCritChance: { zh: '英雄暴击率', en: 'Hero crit chance' },
  globalCritDamage: { zh: '全局暴击伤', en: 'Global crit dmg' },
  heroCritDamage: { zh: '英雄暴击伤', en: 'Hero crit dmg' },
  globalHealthMultiplier: { zh: '全局生命', en: 'Global health' },
  heroHealthMultiplier: { zh: '英雄生命', en: 'Hero health' },
  damageReduction: { zh: '伤害减免', en: 'Damage reduction' },
  enemyVulnerability: { zh: '易伤', en: 'Vulnerability' },
  attackSpeedMult: { zh: '攻速', en: 'Attack speed' },
  cooldownReduction: { zh: '冷却缩减', en: 'Cooldown' },
  patronPerkMult: { zh: '保卫者特权', en: 'Patron perk' },
}

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
    { key: 'externalHeroDps', label: t({ zh: '外部加成', en: 'External' }), value: breakdown.factors.externalHeroDps },
  ]
  // 值显示为 ×1.00 的因子无贡献，渲染纯噪声（典型场景 crit/globalBuff/equipment 常为默认 1）——隐藏。
  const visibleFactors = factors.filter((factor) => formatFactor(factor.value) !== '1.00')

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
      {visibleFactors.length > 0 ? (
        <ul className="planner-breakdown__factors">
          {visibleFactors.map((factor) => (
            <li key={factor.key} className="planner-breakdown__factor">
              <span className="planner-breakdown__factor-label">{factor.label}</span>
              <strong className="planner-breakdown__factor-value">×{formatFactor(factor.value)}</strong>
            </li>
          ))}
        </ul>
      ) : null}

      {breakdown.contributions.length > 0 ? (
        <>
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
                        <span>{t(SIGNAL_KIND_LABEL[signal.signalKind])}</span>
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
        </>
      ) : null}
    </section>
  )
}
