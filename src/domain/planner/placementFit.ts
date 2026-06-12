import type {
  PlannerEffectSignal,
  PlannerPositionRelation,
  PlannerSignalSource,
  ResolvedPlannerHeroModel,
  ResolvedPlannerScenarioModel,
} from './plannerModel'
import { matchesPlannerHeroQualifier } from './plannerSignalSemantics.js'

export interface PlacementFitScorePart {
  signalKind: PlannerEffectSignal['kind']
  rawEffect: string
  multiplier: number
  active: boolean
  reasonCode:
    | 'global-match'
    | 'carry-self-match'
    | 'adjacent-match'
    | 'adjacent-or-self-match'
    | 'non-adjacent-match'
    | 'within-two-slots-match'
    | 'within-two-slots-or-self-match'
    | 'within-three-slots-match'
    | 'within-three-slots-or-self-match'
    | 'same-column-match'
    | 'same-or-ahead-columns-match'
    | 'adjacent-columns-match'
    | 'ahead-column-match'
    | 'all-ahead-columns-match'
    | 'behind-column-match'
    | 'ahead-two-columns-match'
    | 'behind-two-columns-match'
    | 'all-behind-columns-match'
    | 'same-or-behind-column-match'
    | 'same-or-behind-columns-match'
    | 'self-and-behind-two-columns-match'
    | 'exactly-behind-one-column-match'
    | 'exactly-behind-two-columns-match'
    | 'exactly-behind-three-columns-match'
    | 'front-two-columns-match'
    | 'back-two-columns-match'
    | 'rear-most-column-match'
    | 'second-rear-most-column-match'
    | 'third-rear-most-column-match'
    | 'tag-match'
    | 'stat-match'
    | 'tag-mismatch'
    | 'stat-mismatch'
    | 'position-mismatch'
    | 'missing-target-qualifier'
    | 'unsupported-composition'
  source: PlannerSignalSource
}

export interface PlacementFit {
  heroId: string
  slotId: string
  carryHeroId: string
  carrySlotId: string
  fitScore: number
  scoreBreakdown: PlacementFitScorePart[]
  reasonCodes: string[]
  warnings: string[]
  fallbackSources: PlannerSignalSource[]
}

export interface EvaluatePlacementFitInput {
  carryHero: ResolvedPlannerHeroModel
  carrySlotId: string
  supportHero: ResolvedPlannerHeroModel
  supportSlotId: string
  scenario: ResolvedPlannerScenarioModel
  placements?: Record<string, string>
  heroesById?: Map<string, ResolvedPlannerHeroModel>
}

function effectValueToMultiplier(value: number): number {
  return 1 + (value / 100)
}

function invertEffectMultiplier(multiplier: number): number | null {
  if (!Number.isFinite(multiplier) || multiplier <= 0) {
    return null
  }

  return ((multiplier - 1) * 100)
}

function percentToMultiplier(percent: number): number {
  return 1 + (percent / 100)
}

function findScenarioSlot(scenario: ResolvedPlannerScenarioModel, slotId: string) {
  return scenario.slotTopology.find((slot) => slot.slotId === slotId)
}

function countQualifiedHeroes(input: EvaluatePlacementFitInput, signal: PlannerEffectSignal): number | null {
  if (!input.placements || !input.heroesById) {
    return null
  }

  const countRelation = signal.formationCountPositionQualifier?.relation ?? 'any'

  return Object.entries(input.placements).reduce((count, [slotId, heroId]) => {
    if (signal.excludeSelf && heroId === input.supportHero.heroId) {
      return count
    }

    const hero = input.heroesById?.get(heroId)
    if (!hero) {
      return count
    }

    if (countRelation !== 'any' && !matchesSlotRelation(input.scenario, input.supportSlotId, slotId, countRelation)) {
      return count
    }

    return matchesPlannerHeroQualifier(hero, signal.formationCountQualifier) ? count + 1 : count
  }, 0)
}

function computeSlotDistance(
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

function matchesSlotRelation(
  scenario: ResolvedPlannerScenarioModel,
  sourceSlotId: string,
  targetSlotId: string,
  relation: PlannerPositionRelation,
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

function countUpgradeTargets(input: EvaluatePlacementFitInput, signal: PlannerEffectSignal): number | null {
  if (!input.placements || !input.heroesById) {
    return null
  }

  const relation = resolvePositionRelation(signal)

  return Object.entries(input.placements).reduce((count, [slotId, heroId]) => {
    if (signal.excludeSelf && heroId === input.supportHero.heroId) {
      return count
    }

    const hero = input.heroesById?.get(heroId)
    if (!hero) {
      return count
    }

    if (!matchesSlotRelation(input.scenario, input.supportSlotId, slotId, relation)) {
      return count
    }

    return matchesPlannerHeroQualifier(hero, signal.targetQualifier) ? count + 1 : count
  }, 0)
}

function countColumnsBehindCarry(input: EvaluatePlacementFitInput): number | null {
  const supportSlot = findScenarioSlot(input.scenario, input.supportSlotId)
  const carrySlot = findScenarioSlot(input.scenario, input.carrySlotId)

  if (typeof supportSlot?.column !== 'number' || typeof carrySlot?.column !== 'number') {
    return null
  }

  const columnDistance = supportSlot.column - carrySlot.column
  return columnDistance > 0 ? columnDistance : 0
}

function countSlotDistanceFromSource(input: EvaluatePlacementFitInput): number | null {
  return computeSlotDistance(input.scenario, input.supportSlotId, input.carrySlotId)
}

function resolveSignalMultiplier(
  input: EvaluatePlacementFitInput,
  signal: PlannerEffectSignal,
): { ok: true; multiplier: number } | { ok: false; warning: string } {
  if (signal.applyManually) {
    return {
      ok: false,
      warning: `${signal.rawEffect} 依赖手动触发或专精选择，当前不计分。`,
    }
  }

  const amountFunc = signal.amountFunc ?? null
  const stackFunc = signal.stackFunc ?? null

  const applySignalPercent = (
    resolvedPercent: number,
  ): { ok: true; multiplier: number } | { ok: false; warning: string } => {
    if (!signal.bonusScaleOfSignal) {
      return { ok: true, multiplier: percentToMultiplier(resolvedPercent) }
    }

    const baseMultiplierResult = resolveSignalMultiplier(input, signal.bonusScaleOfSignal)
    if (!baseMultiplierResult.ok) {
      return {
        ok: false,
        warning: `${signal.rawEffect} 依赖的基础增益尚未稳定计分，当前不计分。`,
      }
    }

    const basePercent = invertEffectMultiplier(baseMultiplierResult.multiplier)
    if (basePercent === null) {
      return {
        ok: false,
        warning: `${signal.rawEffect} 依赖的基础增益倍率非法，当前不计分。`,
      }
    }

    return { ok: true, multiplier: percentToMultiplier((basePercent * resolvedPercent) / 100) }
  }

  if (!stackFunc) {
    return applySignalPercent(signal.value)
  }

  if (stackFunc === 'per_crusader' || stackFunc === 'per_tagged_crusader_mult') {
    const qualifiedCount = countQualifiedHeroes(input, signal)

    if (qualifiedCount === null) {
      return {
        ok: false,
        warning: `${signal.rawEffect} 需要整队计数上下文，当前不计分。`,
      }
    }

    if (amountFunc === 'add') {
      return applySignalPercent(signal.value * qualifiedCount)
    }

    if (amountFunc === 'mult') {
      const multiplier = effectValueToMultiplier(signal.value) ** qualifiedCount
      const percent = invertEffectMultiplier(multiplier)
      if (percent === null) {
        return {
          ok: false,
          warning: `${signal.rawEffect} 的乘算堆叠结果非法，当前不计分。`,
        }
      }
      return applySignalPercent(percent)
    }
  }

  if (stackFunc === 'per_target_crusader') {
    const qualifiedCount = countQualifiedHeroes(input, signal)

    if (qualifiedCount === null) {
      return {
        ok: false,
        warning: `${signal.rawEffect} 需要整队目标计数上下文，当前不计分。`,
      }
    }

    if (amountFunc === 'add') {
      return applySignalPercent(signal.value * qualifiedCount)
    }

    if (amountFunc === 'mult') {
      const multiplier = effectValueToMultiplier(signal.value) ** qualifiedCount
      const percent = invertEffectMultiplier(multiplier)
      if (percent === null) {
        return {
          ok: false,
          warning: `${signal.rawEffect} 的乘算堆叠结果非法，当前不计分。`,
        }
      }
      return applySignalPercent(percent)
    }
  }

  if (stackFunc === 'per_hero_attribute') {
    const qualifiedCount = countQualifiedHeroes(input, signal)

    if (qualifiedCount === null) {
      return {
        ok: false,
        warning: `${signal.rawEffect} 需要整队属性计数上下文，当前不计分。`,
      }
    }

    if (amountFunc === 'mult') {
      const multiplier = effectValueToMultiplier(signal.value) ** qualifiedCount
      const percent = invertEffectMultiplier(multiplier)
      if (percent === null) {
        return {
          ok: false,
          warning: `${signal.rawEffect} 的乘算堆叠结果非法，当前不计分。`,
        }
      }
      return applySignalPercent(percent)
    }

    if (amountFunc === 'add') {
      return applySignalPercent(signal.value * qualifiedCount)
    }
  }

  if (stackFunc === 'per_upgrade_targets') {
    const qualifiedCount = countUpgradeTargets(input, signal)

    if (qualifiedCount === null) {
      return {
        ok: false,
        warning: `${signal.rawEffect} 需要整队目标上下文，当前不计分。`,
      }
    }

    if (amountFunc === 'mult') {
      const multiplier = effectValueToMultiplier(signal.value) ** qualifiedCount
      const percent = invertEffectMultiplier(multiplier)
      if (percent === null) {
        return {
          ok: false,
          warning: `${signal.rawEffect} 的乘算堆叠结果非法，当前不计分。`,
        }
      }
      return applySignalPercent(percent)
    }

    if (amountFunc === 'add') {
      return applySignalPercent(signal.value * qualifiedCount)
    }
  }

  if (stackFunc === 'per_col_behind') {
    const columnCount = countColumnsBehindCarry(input)

    if (columnCount === null) {
      return {
        ok: false,
        warning: `${signal.rawEffect} 需要阵型列拓扑上下文，当前不计分。`,
      }
    }

    if (amountFunc === 'add') {
      return applySignalPercent(signal.value * columnCount)
    }

    if (amountFunc === 'mult') {
      const multiplier = effectValueToMultiplier(signal.value) ** columnCount
      const percent = invertEffectMultiplier(multiplier)
      if (percent === null) {
        return {
          ok: false,
          warning: `${signal.rawEffect} 的乘算堆叠结果非法，当前不计分。`,
        }
      }
      return applySignalPercent(percent)
    }
  }

  if (stackFunc === 'per_slot_distance_from_source') {
    const slotDistance = countSlotDistanceFromSource(input)

    if (slotDistance === null) {
      return {
        ok: false,
        warning: `${signal.rawEffect} 需要阵型槽位距离上下文，当前不计分。`,
      }
    }

    if (amountFunc === 'add') {
      return applySignalPercent(signal.value * slotDistance)
    }

    if (amountFunc === 'mult') {
      const multiplier = effectValueToMultiplier(signal.value) ** slotDistance
      const percent = invertEffectMultiplier(multiplier)
      if (percent === null) {
        return {
          ok: false,
          warning: `${signal.rawEffect} 的乘算堆叠结果非法，当前不计分。`,
        }
      }
      return applySignalPercent(percent)
    }
  }

  return {
    ok: false,
    warning: `${signal.rawEffect} 的叠层方式(${amountFunc ?? 'null'} / ${stackFunc}) 尚未稳定解析，当前不计分。`,
  }
}

function resolvePositionRelation(signal: PlannerEffectSignal): PlannerPositionRelation {
  if (signal.positionQualifier?.relation) {
    return signal.positionQualifier.relation
  }

  if (signal.kind === 'adjacentBuff') {
    return 'adjacent'
  }

  if (signal.kind === 'heroDpsMultiplier') {
    return 'self'
  }

  return 'any'
}

function matchesPositionQualifier(input: EvaluatePlacementFitInput, signal: PlannerEffectSignal): boolean {
  const relation = resolvePositionRelation(signal)

  if (relation === 'any') {
    return true
  }

  if (relation === 'self') {
    return input.supportSlotId === input.carrySlotId
  }

  return matchesSlotRelation(input.scenario, input.supportSlotId, input.carrySlotId, relation)
}

function resolveActiveReasonCode(signal: PlannerEffectSignal, relation: PlannerPositionRelation): PlacementFitScorePart['reasonCode'] {
  if (signal.kind === 'globalDpsMultiplier') {
    return 'global-match'
  }

  switch (relation) {
    case 'self':
      return 'carry-self-match'
    case 'adjacent':
      return 'adjacent-match'
    case 'adjacentOrSelf':
      return 'adjacent-or-self-match'
    case 'nonAdjacent':
      return 'non-adjacent-match'
    case 'withinTwoSlots':
      return 'within-two-slots-match'
    case 'withinTwoSlotsOrSelf':
      return 'within-two-slots-or-self-match'
    case 'withinThreeSlots':
      return 'within-three-slots-match'
    case 'withinThreeSlotsOrSelf':
      return 'within-three-slots-or-self-match'
    case 'sameColumn':
      return 'same-column-match'
    case 'sameOrAheadColumns':
      return 'same-or-ahead-columns-match'
    case 'adjacentColumns':
      return 'adjacent-columns-match'
    case 'aheadColumn':
      return 'ahead-column-match'
    case 'allAheadColumns':
      return 'all-ahead-columns-match'
    case 'behindColumn':
      return 'behind-column-match'
    case 'aheadTwoColumns':
      return 'ahead-two-columns-match'
    case 'behindTwoColumns':
      return 'behind-two-columns-match'
    case 'allBehindColumns':
      return 'all-behind-columns-match'
    case 'sameOrBehindColumn':
      return 'same-or-behind-column-match'
    case 'sameOrBehindColumns':
      return 'same-or-behind-columns-match'
    case 'selfAndBehindTwoColumns':
      return 'self-and-behind-two-columns-match'
    case 'exactlyBehindOneColumn':
      return 'exactly-behind-one-column-match'
    case 'exactlyBehindTwoColumns':
      return 'exactly-behind-two-columns-match'
    case 'exactlyBehindThreeColumns':
      return 'exactly-behind-three-columns-match'
    case 'frontTwoColumns':
      return 'front-two-columns-match'
    case 'backTwoColumns':
      return 'back-two-columns-match'
    case 'rearMostColumn':
      return 'rear-most-column-match'
    case 'secondRearMostColumn':
      return 'second-rear-most-column-match'
    case 'thirdRearMostColumn':
      return 'third-rear-most-column-match'
    default:
      return (signal.targetQualifier?.requiredStats?.length ?? 0) > 0 ? 'stat-match' : 'tag-match'
  }
}

function inferMismatchReason(signal: PlannerEffectSignal): 'tag-mismatch' | 'stat-mismatch' {
  if ((signal.targetQualifier?.requiredStats?.length ?? 0) > 0) {
    return 'stat-mismatch'
  }

  return 'tag-mismatch'
}

function collectSignals(input: EvaluatePlacementFitInput): PlannerEffectSignal[] {
  if (input.supportHero.heroId === input.carryHero.heroId) {
    return [...input.supportHero.carrySignals, ...input.supportHero.supportSignals]
  }

  return input.supportHero.supportSignals
}

export function evaluatePlacementFit(input: EvaluatePlacementFitInput): PlacementFit {
  const scoreBreakdown: PlacementFitScorePart[] = []
  const reasonCodes: string[] = []
  const warnings: string[] = []
  const fallbackSources = new Set<PlannerSignalSource>()
  let fitScore = 1

  for (const signal of collectSignals(input)) {
    if (!matchesPositionQualifier(input, signal)) {
      scoreBreakdown.push({
        signalKind: signal.kind,
        rawEffect: signal.rawEffect,
        multiplier: 1,
        active: false,
        reasonCode: 'position-mismatch',
        source: signal.source,
      })
      reasonCodes.push('position-mismatch')
      continue
    }

    if (
      signal.kind === 'taggedChampionBuff'
      && (signal.targetQualifier?.requiredTags?.length ?? 0) === 0
      && (signal.targetQualifier?.requiredStats?.length ?? 0) === 0
    ) {
      warnings.push(`${signal.rawEffect} 缺少 carry 目标标签，当前不计分。`)
      scoreBreakdown.push({
        signalKind: signal.kind,
        rawEffect: signal.rawEffect,
        multiplier: 1,
        active: false,
        reasonCode: 'missing-target-qualifier',
        source: signal.source,
      })
      reasonCodes.push('missing-target-qualifier')
      continue
    }

    if (!matchesPlannerHeroQualifier(input.carryHero, signal.targetQualifier)) {
      const reasonCode = inferMismatchReason(signal)
      scoreBreakdown.push({
        signalKind: signal.kind,
        rawEffect: signal.rawEffect,
        multiplier: 1,
        active: false,
        reasonCode,
        source: signal.source,
      })
      reasonCodes.push(reasonCode)
      continue
    }

    const multiplierResult = resolveSignalMultiplier(input, signal)
    if (!multiplierResult.ok) {
      warnings.push(multiplierResult.warning)
      scoreBreakdown.push({
        signalKind: signal.kind,
        rawEffect: signal.rawEffect,
        multiplier: 1,
        active: false,
        reasonCode: 'unsupported-composition',
        source: signal.source,
      })
      reasonCodes.push('unsupported-composition')
      continue
    }

    const multiplier = multiplierResult.multiplier
    const relation = resolvePositionRelation(signal)
    const reasonCode = resolveActiveReasonCode(signal, relation)

    fitScore *= multiplier
    scoreBreakdown.push({
      signalKind: signal.kind,
      rawEffect: signal.rawEffect,
      multiplier,
      active: true,
      reasonCode,
      source: signal.source,
    })
    reasonCodes.push(reasonCode)

    if (signal.source === 'heuristic-fallback') {
      fallbackSources.add(signal.source)
    }
  }

  return {
    heroId: input.supportHero.heroId,
    slotId: input.supportSlotId,
    carryHeroId: input.carryHero.heroId,
    carrySlotId: input.carrySlotId,
    fitScore,
    scoreBreakdown,
    reasonCodes,
    warnings,
    fallbackSources: [...fallbackSources],
  }
}
