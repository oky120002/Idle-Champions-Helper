import type { ResolvedPlannerScenarioModel } from './plannerModel'
import type { HeroAbilitySignal, HeroPositionRelation } from '../abilities/abilityModel'
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

    if (relation === 'withinTwoSlots') {
      return slotDistance >= 1 && slotDistance <= 2
    }

    if (relation === 'withinTwoSlotsOrSelf') {
      return slotDistance <= 2
    }

    if (relation === 'withinThreeSlots') {
      return slotDistance >= 1 && slotDistance <= 3
    }

    return slotDistance <= 3
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
  const frontColumns = columns.slice(-2)
  const backColumns = columns.slice(0, 2)

  switch (relation) {
    case 'sameColumn':
      return delta === 0
    case 'sameOrAheadColumns':
      return delta >= 0
    case 'adjacentColumns':
      return Math.abs(delta) === 1
    case 'aheadColumn':
      return delta === 1
    case 'allAheadColumns':
      return delta >= 1
    case 'behindColumn':
      return delta === -1
    case 'aheadTwoColumns':
      return delta >= 1 && delta <= 2
    case 'behindTwoColumns':
      return delta <= -1 && delta >= -2
    case 'allBehindColumns':
      return delta <= -1
    case 'sameOrBehindColumn':
      return delta === 0 || delta === -1
    case 'sameOrBehindColumns':
      return delta <= 0
    case 'selfAndBehindTwoColumns':
      return delta === 0 || (delta <= -1 && delta >= -2)
    case 'exactlyBehindOneColumn':
      return delta === -1
    case 'exactlyBehindTwoColumns':
      return delta === -2
    case 'exactlyBehindThreeColumns':
      return delta === -3
    case 'frontTwoColumns':
      return frontColumns.includes(targetColumn)
    case 'backTwoColumns':
      return backColumns.includes(targetColumn)
    case 'selfAndAheadAndBehindColumns':
      // 自身列 + 立即相邻两列（3 列宽带）
      return Math.abs(delta) <= 1
    case 'rearMostColumn':
      return targetColumn === columns[0]
    case 'secondRearMostColumn':
      return columns.length >= 2 && targetColumn === columns[1]
    case 'thirdRearMostColumn':
      return columns.length >= 3 && targetColumn === columns[2]
    default:
      return false
  }
}

export function resolvePositionRelation(signal: HeroAbilitySignal): HeroPositionRelation {
  if (signal.positionQualifier?.relation) {
    return signal.positionQualifier.relation
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
