import type {
  PlannerEffectSignal,
  PlannerPositionRelation,
  PlannerSignalSource,
  ResolvedPlannerHeroModel,
  ResolvedPlannerScenarioModel,
} from './plannerModel'

export interface PlacementFitScorePart {
  signalKind: PlannerEffectSignal['kind']
  rawEffect: string
  multiplier: number
  active: boolean
  reasonCode:
    | 'global-match'
    | 'carry-self-match'
    | 'adjacent-match'
    | 'tag-match'
    | 'tag-mismatch'
    | 'position-mismatch'
    | 'missing-target-qualifier'
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
}

function effectValueToMultiplier(value: number): number {
  return 1 + (value / 100)
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

  const supportSlot = input.scenario.slotTopology.find((slot) => slot.slotId === input.supportSlotId)
  return supportSlot?.adjacentSlotIds.includes(input.carrySlotId) ?? false
}

function matchesTargetQualifier(carryHero: ResolvedPlannerHeroModel, signal: PlannerEffectSignal): boolean {
  const requiredTags = signal.targetQualifier?.requiredTags ?? []

  if (requiredTags.length === 0) {
    return true
  }

  const carryTags = new Set(carryHero.tags.map((tag) => tag.toLowerCase()))
  const normalizedTags = requiredTags.map((tag) => tag.toLowerCase())
  const matchMode = signal.targetQualifier?.matchMode ?? 'any'

  if (matchMode === 'all') {
    return normalizedTags.every((tag) => carryTags.has(tag))
  }

  return normalizedTags.some((tag) => carryTags.has(tag))
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

    if (signal.kind === 'taggedChampionBuff' && (signal.targetQualifier?.requiredTags?.length ?? 0) === 0) {
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

    if (!matchesTargetQualifier(input.carryHero, signal)) {
      scoreBreakdown.push({
        signalKind: signal.kind,
        rawEffect: signal.rawEffect,
        multiplier: 1,
        active: false,
        reasonCode: 'tag-mismatch',
        source: signal.source,
      })
      reasonCodes.push('tag-mismatch')
      continue
    }

    const multiplier = effectValueToMultiplier(signal.value)
    const reasonCode =
      signal.kind === 'globalDpsMultiplier'
        ? 'global-match'
        : signal.kind === 'heroDpsMultiplier'
          ? 'carry-self-match'
          : signal.kind === 'adjacentBuff'
            ? 'adjacent-match'
            : 'tag-match'

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
