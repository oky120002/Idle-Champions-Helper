import { DIMENSION_BY_KIND, POOL_SCOPE_BY_KIND, type HeroAbilitySignal } from '../abilities/abilityModel'
import { matchesHeroQualifier } from '../abilities/signalSemantics'
import { predicateHasNode } from '../abilities/heroPredicate'
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

export function evaluatePlacementFit(input: EvaluatePlacementFitInput): PoolAggregateResult {
  const scoreBreakdown: PlacementFitScorePart[] = []
  const warnings: string[] = []
  // pool 聚合：key = `${dimension}:${scope}`；同一 pool 内 additive 累加百分比、multiplicative 累乘因子；pool 间乘法。
  const poolsByKey = new Map<string, AggregatedPool>()

  // dimension 支持单值或数组（多维度一次跑）；归一化成 Set 做 O(1) 过滤。
  const dimensionFilterRaw = input.dimension
  const dimensionFilterSet = dimensionFilterRaw
    ? new Set(Array.isArray(dimensionFilterRaw) ? dimensionFilterRaw : [dimensionFilterRaw])
    : null
  // aggregatePools=false 时跳过 pool 构建，只产 scoreBreakdown（crit/vulnerability 维度省去死代码计算）。
  const aggregatePools = input.aggregatePools ?? true

  // 等级解锁门控：supportLevel 不传（MAX_SAFE_INTEGER）= 无等级限制（向后兼容）。
  const supportLevel = input.supportLevel ?? Number.MAX_SAFE_INTEGER

  for (const signal of collectSignals(input)) {
    if (dimensionFilterSet) {
      const signalDimension = DIMENSION_BY_KIND[signal.kind]
      if (!dimensionFilterSet.has(signalDimension)) {
        continue
      }
    }

    // 等级解锁门控：signal 所需等级 > support 当前等级 → 未解锁，不计分。
    if (typeof signal.requiredLevel === 'number' && signal.requiredLevel > supportLevel) {
      scoreBreakdown.push({
        signalKind: signal.kind,
        rawEffect: signal.rawEffect,
        multiplier: 1,
        active: false,
        reasonCode: 'level-locked',
        source: signal.source,
      })
      continue
    }

    if (!matchesPositionQualifier(input, signal)) {
      scoreBreakdown.push({
        signalKind: signal.kind,
        rawEffect: signal.rawEffect,
        multiplier: 1,
        active: false,
        reasonCode: 'position-mismatch',
        source: signal.source,
      })
      continue
    }

    // taggedChampionBuff 只检查 tag/stat 目标限定节点，漏 attackType：纯 attackType
    // 限定的 taggedChampionBuff 会被误判「缺少 carry 目标标签」不计分。全量核验 raw
    // （被引用 effect_keys）：「只有 attack_type/hero_expr 限定、无 tag/stat」的组合
    // = 0 个，当前不触发，故不补 attackType 检查；若未来出现此类 effect 需 revisit。
    if (
      signal.kind === 'taggedChampionBuff'
      && !predicateHasNode(signal.targetQualifier?.predicate, 'tag')
      && !predicateHasNode(signal.targetQualifier?.predicate, 'stat')
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
      continue
    }

    if (!matchesHeroQualifier(input.carryHero, signal.targetQualifier)) {
      const reasonCode = inferMismatchReason(signal)
      scoreBreakdown.push({
        signalKind: signal.kind,
        rawEffect: signal.rawEffect,
        multiplier: 1,
        active: false,
        reasonCode,
        source: signal.source,
      })
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
      continue
    }

    const multiplier = multiplierResult.multiplier
    const relation = resolvePositionRelation(signal)
    const reasonCode = resolveActiveReasonCode(signal, relation)

    if (aggregatePools) {
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

    scoreBreakdown.push({
      signalKind: signal.kind,
      rawEffect: signal.rawEffect,
      multiplier,
      active: true,
      reasonCode,
      source: signal.source,
      amountFunc: signal.amountFunc ?? null,
      monsterTags: signal.monsterTags ?? null,
    })
  }

  let totalMultiplier = 1
  if (aggregatePools) {
    for (const pool of poolsByKey.values()) {
      totalMultiplier *= pool.poolMultiplier
    }
  }

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
