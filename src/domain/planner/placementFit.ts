import { DIMENSION_BY_KIND, type HeroAbilityDimension, type HeroAbilitySignal } from '../abilities/abilityModel'
import { POOL_SCOPE_BY_KIND } from '../abilities/poolScope'
import { matchesHeroQualifier } from '../abilities/signalSemantics'
import type {
  AggregatedPool,
  EvaluatePlacementFitInput,
  PlacementFitScorePart,
  PoolAggregateResult,
} from './placementFitTypes'
import { matchesPositionQualifier, resolvePositionRelation } from './placementSlotRelation'
import { inferMismatchReason, resolveActiveReasonCode } from './placementReasonCode'
import { resolveSignalMultiplier } from './mechanics/signalMultiplier'

export type { AggregatedPool, EvaluatePlacementFitInput, PlacementFitScorePart, PoolAggregateResult } from './placementFitTypes'
// signal → 乘数 + 叠层计数 dispatch 抽到 ./mechanics/（可独立单测）；re-export 保持外部调用方零改动。
export { DEFAULT_MANUAL_STACK_COUNT } from './mechanics/signalMultiplier'
export { STACK_COUNT_RESOLVERS } from './mechanics/stackCountResolver'

function collectSignals(input: EvaluatePlacementFitInput): HeroAbilitySignal[] {
  if (input.supportHero.heroId === input.carryHero.heroId) {
    return [...input.supportHero.carrySignals, ...input.supportHero.supportSignals]
  }

  return input.supportHero.supportSignals
}

// dimension 支持单值或数组（多维度一次跑）；归一化成 Set 做 O(1) 过滤。
function toDimensionSet(
  dimension: HeroAbilityDimension | readonly HeroAbilityDimension[],
): Set<HeroAbilityDimension> {
  return new Set<HeroAbilityDimension>(Array.isArray(dimension) ? dimension : [dimension])
}

function buildInactiveScorePart(
  signal: HeroAbilitySignal,
  reasonCode: PlacementFitScorePart['reasonCode'],
): PlacementFitScorePart {
  return {
    reasonCode,
    signalKind: signal.kind,
    rawEffect: signal.rawEffect,
    multiplier: 1,
    active: false,
    source: signal.source,
  }
}

function buildActiveScorePart(
  signal: HeroAbilitySignal,
  multiplier: number,
  reasonCode: PlacementFitScorePart['reasonCode'],
): PlacementFitScorePart {
  return {
    multiplier,
    reasonCode,
    signalKind: signal.kind,
    rawEffect: signal.rawEffect,
    active: true,
    source: signal.source,
    amountFunc: signal.amountFunc ?? null,
    monsterTags: signal.monsterTags ?? null,
  }
}

// pool 聚合：key = `${dimension}:${scope}`；同一 pool 内 additive 累加百分比、multiplicative 累乘因子；pool 间乘法。
function aggregateSignalToPool(
  signal: HeroAbilitySignal,
  multiplier: number,
  poolsByKey: Map<string, AggregatedPool>,
  aggregatePools: boolean,
): void {
  if (!aggregatePools) return
  const dimension = DIMENSION_BY_KIND[signal.kind]
  const scope = POOL_SCOPE_BY_KIND[signal.kind]
  const poolKey = `${dimension}:${scope}`

  const pool = poolsByKey.get(poolKey) ?? {
    dimension,
    scope,
    addPercent: 0,
    multFactor: 1,
    poolMultiplier: 1,
  }
  // 机制: pool 按 amountFunc 分流；stacksMultiply（如出言不逊 amountFunc=null）按乘算进 multFactor
  if (signal.amountFunc === 'mult' || signal.stacksMultiply === true) {
    pool.multFactor *= multiplier
  } else {
    // add / unknown / 默认：把已折算倍率还原为百分比，同一 pool 内 additive 相加。
    pool.addPercent += (multiplier - 1) * 100
  }
  pool.poolMultiplier = (1 + pool.addPercent / 100) * pool.multFactor
  poolsByKey.set(poolKey, pool)
}

function computeTotalMultiplier(poolsByKey: Map<string, AggregatedPool>): number {
  let total = 1
  for (const pool of poolsByKey.values()) {
    total *= pool.poolMultiplier
  }
  return total
}

export function evaluatePlacementFit(input: EvaluatePlacementFitInput): PoolAggregateResult {
  const scoreBreakdown: PlacementFitScorePart[] = []
  const warnings: string[] = []
  const poolsByKey = new Map<string, AggregatedPool>()

  const dimensionFilterSet = input.dimension != null ? toDimensionSet(input.dimension) : null
  // aggregatePools=false 时跳过 pool 构建，只产 scoreBreakdown（crit/vulnerability 维度省去死代码计算）。
  const aggregatePools = input.aggregatePools ?? true
  // 等级解锁门控：supportLevel 不传（MAX_SAFE_INTEGER）= 无等级限制（向后兼容）。
  const supportLevel = input.supportLevel ?? Number.MAX_SAFE_INTEGER

  for (const signal of collectSignals(input)) {
    if (dimensionFilterSet != null && !dimensionFilterSet.has(DIMENSION_BY_KIND[signal.kind])) {
      continue
    }

    // 等级解锁门控：signal 所需等级 > support 当前等级 → 未解锁，不计分。
    if (typeof signal.requiredLevel === 'number' && signal.requiredLevel > supportLevel) {
      scoreBreakdown.push(buildInactiveScorePart(signal, 'level-locked'))
      continue
    }

    if (!matchesPositionQualifier(input, signal)) {
      scoreBreakdown.push(buildInactiveScorePart(signal, 'position-mismatch'))
      continue
    }

    if (!matchesHeroQualifier(input.carryHero, signal.targetQualifier)) {
      scoreBreakdown.push(buildInactiveScorePart(signal, inferMismatchReason(signal)))
      continue
    }

    const multiplierResult = resolveSignalMultiplier(input, signal)
    if (!multiplierResult.ok) {
      warnings.push(multiplierResult.warning)
      scoreBreakdown.push(buildInactiveScorePart(signal, 'unsupported-composition'))
      continue
    }

    const multiplier = multiplierResult.multiplier
    const reasonCode = resolveActiveReasonCode(signal, resolvePositionRelation(signal))

    aggregateSignalToPool(signal, multiplier, poolsByKey, aggregatePools)

    scoreBreakdown.push(buildActiveScorePart(signal, multiplier, reasonCode))
  }

  const totalMultiplier = aggregatePools ? computeTotalMultiplier(poolsByKey) : 1

  return {
    heroId: input.supportHero.heroId,
    slotId: input.supportSlotId,
    carryHeroId: input.carryHero.heroId,
    carrySlotId: input.carrySlotId,
    pools: [...poolsByKey.values()],
    totalMultiplier,
    scoreBreakdown,
    warnings,
  }
}
