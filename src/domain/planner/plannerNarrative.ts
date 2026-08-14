/**
 * 推荐结果的双语叙事文案生成（展示层关注点）。
 * 纯函数：消费已成型的 scenario / placement / hero / signal 数据，产出 PlannerNarrativeLine[]。
 * 与推算引擎的搜索/评估逻辑解耦——文案措辞调整不波及引擎算法，反之亦然。
 * PlannerResult.explanations 被 UI 与 CLI 双消费（见 recommendationTypes），故留在 domain 层。
 */
import { formatGameNumber, type GameNumberValue } from '../gameNumber'
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
    { key: '当前结果先填满 {p0} 个槽位，并确保每个 seat 只使用一名已拥有英雄。', params: { p0: placementEntries.length } },
  ]

  if (scoringMode === 'team-gold') {
    explanations.push({ key: '当前结果按全队金币收益排序，由 gold pool 聚合每位英雄的金币加成。' })
    return explanations
  }

  if (scoringMode === 'team-speed') {
    explanations.push({ key: '当前结果按区域推进效率排序（{p0}），聚合阵型中所有速度英雄的效果。', params: { p0: formatGameNumber(objectiveValue) } })
    return explanations
  }

  if (leadChampion) {
    const supportSummaryZh = supportChampions.length > 0 ? supportChampions.join('、') : '其余已拥有英雄'
    explanations.push({ key: '核心输出位 {p0}（Seat {p1}）的 carryDps 约 {p2}，再用 {p3} 提供加成。', params: { p0: leadChampion.name.display, p1: leadChampion.seat, p2: formatGameNumber(objectiveValue), p3: supportSummaryZh } })
  }

  if (hasHeroSignal) {
    explanations.push({ key: '这条推荐已经计入英雄自带倍率，carryDps 由 baseDamage × levelCurve × 加成聚合得出。' })
  } else {
    explanations.push({ key: scenario.scenarioWarnings.length > 0
      ? '当前版本按 carryDps 排序候选；场景限制仍需你手动复核。'
      : '当前版本按 carryDps 排序候选；后续再逐步补进技能联动和场景机制。' })
  }

  return explanations
}
