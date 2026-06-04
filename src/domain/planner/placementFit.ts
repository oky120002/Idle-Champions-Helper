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

function countQualifiedHeroes(input: EvaluatePlacementFitInput, signal: PlannerEffectSignal): number | null {
  if (!input.placements || !input.heroesById) {
    return null
  }

  return Object.values(input.placements).reduce((count, heroId) => {
    if (signal.excludeSelf && heroId === input.supportHero.heroId) {
      return count
    }

    const hero = input.heroesById?.get(heroId)
    if (!hero) {
      return count
    }

    return matchesPlannerHeroQualifier(hero, signal.formationCountQualifier) ? count + 1 : count
  }, 0)
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

  if (!stackFunc) {
    return { ok: true, multiplier: effectValueToMultiplier(signal.value) }
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
      return { ok: true, multiplier: 1 + ((signal.value * qualifiedCount) / 100) }
    }

    if (amountFunc === 'mult') {
      return { ok: true, multiplier: effectValueToMultiplier(signal.value) ** qualifiedCount }
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
      return { ok: true, multiplier: effectValueToMultiplier(signal.value) ** qualifiedCount }
    }

    if (amountFunc === 'add') {
      return { ok: true, multiplier: 1 + ((signal.value * qualifiedCount) / 100) }
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

  const supportSlot = input.scenario.slotTopology.find((slot) => slot.slotId === input.supportSlotId)
  return supportSlot?.adjacentSlotIds.includes(input.carrySlotId) ?? false
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
    const reasonCode =
      signal.kind === 'globalDpsMultiplier'
        ? 'global-match'
        : signal.kind === 'heroDpsMultiplier'
          ? 'carry-self-match'
          : signal.kind === 'adjacentBuff'
            ? 'adjacent-match'
            : (signal.targetQualifier?.requiredStats?.length ?? 0) > 0
              ? 'stat-match'
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
