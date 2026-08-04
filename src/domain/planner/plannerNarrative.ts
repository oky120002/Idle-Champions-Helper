/**
 * 推荐结果的双语叙事文案生成（展示层关注点）。
 * 纯函数：消费已成型的 scenario / placement / hero / signal 数据，产出 PlannerNarrativeLine[]。
 * 与推荐引擎的搜索/评分逻辑解耦——文案措辞调整不波及引擎算法，反之亦然。
 * PlannerResult.explanations 被 UI 与 CLI 双消费（见 recommendationTypes），故留在 domain 层。
 */
import { formatGameNumber, type GameNumberValue } from '../simulator/gameNumber'
import type { HeroAbilityKind, ResolvedHeroAbilityProfile } from '../abilities/abilityModel'
import type { PlannerNarrativeLine, PlannerPlacementEntry } from './recommendationTypes'
import type { ResolvedPlannerScenarioModel } from './plannerModel'
import type { ScoringMode } from './steadyStateScoring'

function collectSupportChampionNames(
  placementEntries: PlannerPlacementEntry[],
  heroById: Map<string, ResolvedHeroAbilityProfile>,
  carryHeroId: string | null,
): string[] {
  return placementEntries
    .map((entry) => heroById.get(entry.heroId))
    .filter((hero): hero is ResolvedHeroAbilityProfile => hero != null && hero.heroId !== carryHeroId)
    .slice(0, 4)
    .map((hero) => hero.name.display)
}

export function buildPlannerExplanations(
  scenario: ResolvedPlannerScenarioModel,
  placementEntries: PlannerPlacementEntry[],
  heroById: Map<string, ResolvedHeroAbilityProfile>,
  carryHeroId: string | null,
  objectiveValue: GameNumberValue,
  activeSignalKinds: Set<HeroAbilityKind>,
  scoringMode: ScoringMode,
): PlannerNarrativeLine[] {
  const leadChampion = carryHeroId != null && carryHeroId !== ''
    ? heroById.get(carryHeroId) ?? null
    : null
  const supportChampions = collectSupportChampionNames(placementEntries, heroById, carryHeroId)

  const hasHeroSignal = activeSignalKinds.has('heroDpsMultiplier')

  const explanations: PlannerNarrativeLine[] = [
    {
      zh: `当前结果先填满 ${String(placementEntries.length)} 个槽位，并确保每个 seat 只使用一名已拥有英雄。`,
      en: `This result fills ${String(placementEntries.length)} slots first and keeps each seat assigned to only one owned champion.`,
    },
  ]

  if (scoringMode === 'team-gold') {
    explanations.push({
      zh: '当前结果按全队金币收益（team_gold_find）排序，由 gold pool 聚合每位英雄的金币加成。',
      en: `This result ranks by team gold find, aggregating each champion's gold bonuses into the gold pool.`,
    })
    return explanations
  }

  if (leadChampion) {
    const supportSummaryZh = supportChampions.length > 0 ? supportChampions.join('、') : '其余已拥有英雄'
    const supportSummaryEn = supportChampions.length > 0 ? supportChampions.join(', ') : 'the remaining owned champions'

    explanations.push({
      zh: `核心输出位 ${leadChampion.name.display}（Seat ${String(leadChampion.seat)}）的 carryDps 约 ${formatGameNumber(objectiveValue)}，再用 ${supportSummaryZh} 提供加成。`,
      en: `Carry ${leadChampion.name.display} (Seat ${String(leadChampion.seat)}) reaches ~${formatGameNumber(objectiveValue)} carryDps, with ${supportSummaryEn} providing buffs.`,
    })
  }

  if (hasHeroSignal) {
    explanations.push({
      zh: '这条推荐已经计入英雄自带倍率，carryDps 由 baseDamage × levelCurve × 加成聚合得出。',
      en: 'This recommendation accounts for hero-specific multipliers; carryDps = baseDamage × levelCurve × aggregated buffs.',
    })
  } else {
    explanations.push({
      zh: `当前版本按 carryDps 排序候选；${scenario.scenarioWarnings.length > 0 ? '场景限制仍需你手动复核。' : '后续再逐步补进技能联动和场景机制。'}`,
      en: `This version ranks candidates by carryDps; ${scenario.scenarioWarnings.length > 0 ? 'scenario restrictions still need manual review.' : 'skill synergies and scenario mechanics will be layered in later.'}`,
    })
  }

  return explanations
}
