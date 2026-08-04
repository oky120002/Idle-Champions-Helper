import type { HeroAbilitySignal, HeroPositionRelation } from '../abilities/abilityModel'
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
