import type { HeroAbilitySignal, HeroPositionRelation, ResolvedHeroAbilityProfile } from '../abilities/abilityModel'
import type { ResolvedPlannerScenarioModel } from './plannerModel'
import type { EvaluatePlacementFitInput } from './placementFitTypes'

export function findScenarioSlot(scenario: ResolvedPlannerScenarioModel, slotId: string) {
  return scenario.slotTopology.find((slot) => slot.slotId === slotId)
}

export function computeSlotDistance(
  scenario: ResolvedPlannerScenarioModel,
  sourceSlotId: string,
  targetSlotId: string,
): number | null {
  if (sourceSlotId === targetSlotId) {
    return 0
  }

  const visited = new Set([sourceSlotId])
  const queue: Array<{ slotId: string; distance: number }> = [{ slotId: sourceSlotId, distance: 0 }]

  while (queue.length > 0) {
    const current = queue.shift()
    if (!current) {
      break
    }

    const slot = scenario.slotTopology.find((item) => item.slotId === current.slotId)
    for (const adjacentSlotId of slot?.adjacentSlotIds ?? []) {
      if (visited.has(adjacentSlotId)) {
        continue
      }

      const nextDistance = current.distance + 1
      if (adjacentSlotId === targetSlotId) {
        return nextDistance
      }

      visited.add(adjacentSlotId)
      queue.push({ slotId: adjacentSlotId, distance: nextDistance })
    }
  }

  return null
}

function matchDistanceRelation(
  relation: HeroPositionRelation,
  slotDistance: number,
): boolean {
  if (relation === 'withinTwoSlots') return slotDistance >= 1 && slotDistance <= 2
  if (relation === 'withinTwoSlotsOrSelf') return slotDistance <= 2
  if (relation === 'withinThreeSlots') return slotDistance >= 1 && slotDistance <= 3
  return slotDistance <= 3 // withinThreeSlotsOrSelf
}

const COLUMN_DELTA_MATCHERS: Partial<Record<HeroPositionRelation, (delta: number) => boolean>> = {
  sameColumn: (d) => d === 0,
  sameOrAheadColumns: (d) => d >= 0,
  adjacentColumns: (d) => Math.abs(d) === 1,
  aheadColumn: (d) => d === 1,
  allAheadColumns: (d) => d >= 1,
  behindColumn: (d) => d === -1,
  aheadTwoColumns: (d) => d >= 1 && d <= 2,
  behindTwoColumns: (d) => d <= -1 && d >= -2,
  allBehindColumns: (d) => d <= -1,
  sameOrBehindColumn: (d) => d === 0 || d === -1,
  sameOrBehindColumns: (d) => d <= 0,
  selfAndBehindTwoColumns: (d) => d === 0 || (d <= -1 && d >= -2),
  exactlyBehindOneColumn: (d) => d === -1,
  exactlyBehindTwoColumns: (d) => d === -2,
  exactlyBehindThreeColumns: (d) => d === -3,
  // 自身列 + 立即相邻两列（3 列宽带）
  selfAndAheadAndBehindColumns: (d) => Math.abs(d) <= 1,
}

function matchColumnRelation(
  relation: HeroPositionRelation,
  delta: number,
  targetColumn: number,
  columns: number[],
): boolean {
  const deltaMatcher = COLUMN_DELTA_MATCHERS[relation]
  if (deltaMatcher != null) {
    return deltaMatcher(delta)
  }
  const frontColumns = columns.slice(-2)
  const backColumns = columns.slice(0, 2)
  if (relation === 'frontTwoColumns') return frontColumns.includes(targetColumn)
  if (relation === 'backTwoColumns') return backColumns.includes(targetColumn)
  if (relation === 'rearMostColumn') return targetColumn === columns[0]
  if (relation === 'secondRearMostColumn') return columns.length >= 2 && targetColumn === columns[1]
  if (relation === 'thirdRearMostColumn') return columns.length >= 3 && targetColumn === columns[2]
  return false
}

/* eslint-disable-next-line sonarjs/cognitive-complexity, complexity -- 位置关系分支众多（distance/column/adjacent/tallest 等）为关系语义的固有复杂度 */
export function matchesSlotRelation(
  scenario: ResolvedPlannerScenarioModel,
  sourceSlotId: string,
  targetSlotId: string,
  relation: HeroPositionRelation,
): boolean {
  if (relation === 'any') {
    return true
  }

  if (relation === 'self') {
    return sourceSlotId === targetSlotId
  }

  const sourceSlot = findScenarioSlot(scenario, sourceSlotId)
  const isAdjacent = sourceSlot?.adjacentSlotIds.includes(targetSlotId) ?? false

  if (relation === 'adjacent') {
    return isAdjacent
  }

  if (relation === 'adjacentOrSelf') {
    return sourceSlotId === targetSlotId || isAdjacent
  }

  if (relation === 'nonAdjacent') {
    return sourceSlotId !== targetSlotId && !isAdjacent
  }

  if (
    relation === 'withinTwoSlots'
    || relation === 'withinTwoSlotsOrSelf'
    || relation === 'withinThreeSlots'
    || relation === 'withinThreeSlotsOrSelf'
  ) {
    const slotDistance = computeSlotDistance(scenario, sourceSlotId, targetSlotId)
    if (slotDistance === null) {
      return false
    }
    return matchDistanceRelation(relation, slotDistance)
  }

  const sourceColumn = sourceSlot?.column
  const targetSlot = findScenarioSlot(scenario, targetSlotId)
  const targetColumn = targetSlot?.column

  if (typeof sourceColumn !== 'number' || typeof targetColumn !== 'number') {
    return false
  }

  const delta = targetColumn - sourceColumn
  const columns = scenario.slotTopology
    .map((slot) => slot.column)
    .filter((column, index, list) => Number.isFinite(column) && list.indexOf(column) === index)
    .sort((left, right) => left - right)

  if (relation === 'tallestColumn') {
    // Windfall(167): column(s) with the most slots in the formation layout
    const slotCountByColumn = new Map<number, number>()
    for (const slot of scenario.slotTopology) {
      if (Number.isFinite(slot.column)) {
        slotCountByColumn.set(slot.column, (slotCountByColumn.get(slot.column) ?? 0) + 1)
      }
    }
    const maxSlots = Math.max(...slotCountByColumn.values())
    return (slotCountByColumn.get(targetColumn) ?? 0) === maxSlots
  }

  if (relation === 'middleColumns') {
    // Lark(170): columns excluding the first (backmost) and last (frontmost)
    return columns.length >= 3 && targetColumn !== columns[0] && targetColumn !== columns[columns.length - 1]
  }

  if (relation === 'slotsWithMaxTwoAdjacent') {
    // Jang Sao(140): slots with ≤2 adjacent slots
    return (targetSlot?.adjacentSlotIds.length ?? 0) <= 2
  }

  return matchColumnRelation(relation, delta, targetColumn, columns)
}

export function resolvePositionRelation(signal: HeroAbilitySignal): HeroPositionRelation {
  const relation = signal.positionQualifier?.relation
  if (relation != null) {
    return relation
  }

  if (signal.kind === 'heroDpsMultiplier') {
    return 'self'
  }

  return 'any'
}

export function matchesPositionQualifier(input: EvaluatePlacementFitInput, signal: HeroAbilitySignal): boolean {
  const relation = resolvePositionRelation(signal)

  if (relation === 'any') {
    return true
  }

  if (relation === 'self') {
    return input.supportSlotId === input.carrySlotId
  }

  return matchesSlotRelation(input.scenario, input.supportSlotId, input.carrySlotId, relation)
}

/**
 * 从阵型组成一次性计算每个英雄的 active effect key 集合。
 *
 * 对每个在阵型中的授予英雄 G，遍历其 effectGrants：
 * - 等级达 requiredLevel 才激活
 * - 按 grant.relation 判定目标槽位是否在 G 的作用范围内
 * - excludeSelf（targets 含 'other'）排除 G 自身
 * 命中的目标英雄获得 grant.effectKeys + '#effectDefId'。
 *
 * 供 HasEffect(name)/HasEffectByID(N) 谓词求值；在 scoreFormation 层算一次，透传到 evaluatePlacementFit。
 */
/* eslint-disable-next-line sonarjs/cognitive-complexity -- 双重循环+条件分支是 effect grant 图遍历的固有复杂度 */
export function computeEffectActivation(
  placements: Record<string, string>,
  heroesById: Map<string, ResolvedHeroAbilityProfile>,
  scenario: ResolvedPlannerScenarioModel,
  heroLevels?: ReadonlyMap<string, number>,
): Map<string, Set<string>> {
  const result = new Map<string, Set<string>>()

  for (const [grantingSlotId, grantingHeroId] of Object.entries(placements)) {
    const grantingHero = heroesById.get(grantingHeroId)
    if (!grantingHero?.effectGrants) continue

    const grantingLevel = heroLevels?.get(grantingHeroId) ?? Number.MAX_SAFE_INTEGER

    for (const grant of grantingHero.effectGrants) {
      if (grant.requiredLevel > grantingLevel) continue

      for (const [targetSlotId, targetHeroId] of Object.entries(placements)) {
        if (grant.excludeSelf && targetHeroId === grantingHeroId) continue
        if (!matchesSlotRelation(scenario, grantingSlotId, targetSlotId, grant.relation)) continue

        let effectSet = result.get(targetHeroId)
        if (!effectSet) {
          effectSet = new Set<string>()
          result.set(targetHeroId, effectSet)
        }
        for (const key of grant.effectKeys) {
          effectSet.add(key)
        }
        effectSet.add(`#${grant.effectDefId}`)
      }
    }
  }

  return result
}
