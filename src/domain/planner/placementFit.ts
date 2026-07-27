import { DIMENSION_BY_KIND, POOL_SCOPE_BY_KIND, type HeroAbilitySignal } from '../abilities/abilityModel'
import { matchesHeroQualifier } from '../abilities/signalSemantics'
import { predicateHasNode } from '../abilities/heroPredicate'
import type {
  AggregatedPool,
  EvaluatePlacementFitInput,
  PlacementFitScorePart,
  PoolAggregateResult,
} from './placementFitTypes'
import {
  computeSlotDistance,
  findScenarioSlot,
  matchesPositionQualifier,
  matchesSlotRelation,
  resolvePositionRelation,
} from './placementSlotRelation'
import { inferMismatchReason, resolveActiveReasonCode } from './placementReasonCode'

export type { AggregatedPool, EvaluatePlacementFitInput, PlacementFitScorePart, PoolAggregateResult } from './placementFitTypes'

function invertEffectMultiplier(multiplier: number): number | null {
  if (!Number.isFinite(multiplier) || multiplier <= 0) {
    return null
  }

  return (multiplier - 1) * 100
}

function percentToMultiplier(percent: number): number {
  return 1 + (percent / 100)
}

function countQualifiedHeroes(input: EvaluatePlacementFitInput, signal: HeroAbilitySignal): number | null {
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

    return matchesHeroQualifier(hero, signal.formationCountQualifier) ? count + 1 : count
  }, 0)
}

function countUpgradeTargets(input: EvaluatePlacementFitInput, signal: HeroAbilitySignal): number | null {
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

    return matchesHeroQualifier(hero, signal.targetQualifier) ? count + 1 : count
  }, 0)
}

function countColumnsCarryBehindSupport(input: EvaluatePlacementFitInput): number | null {
  const supportSlot = findScenarioSlot(input.scenario, input.supportSlotId)
  const carrySlot = findScenarioSlot(input.scenario, input.carrySlotId)

  if (typeof supportSlot?.column !== 'number' || typeof carrySlot?.column !== 'number') {
    return null
  }

  // column 约定：0 = 最后排（远离怪物），数值越大越靠前排。
  // carry 落后 support 的列数 = support.column - carry.column（carry 在 support 身后时为正）。
  const columnDistance = supportSlot.column - carrySlot.column
  return columnDistance > 0 ? columnDistance : 0
}

function countSlotDistanceFromSource(input: EvaluatePlacementFitInput): number | null {
  return computeSlotDistance(input.scenario, input.supportSlotId, input.carrySlotId)
}

/**
 * 动态层数假设默认值（manualStackCount 缺省时用）。1000 ≈ area=100 冒险的出言不逊上限。
 * UI 可手动覆盖（评估页/计划页）；见 champion-reference-verification.md。
 */
export const DEFAULT_MANUAL_STACK_COUNT = 1000

/**
 * 每种 stackFunc 对应的计数来源 + warning 用的上下文标签。
 * keys 即 scorer 支持的 stackFunc 集合——signal-coverage 的覆盖率报告必须与此同步，
 * 否则统计失真（见 tests/unit/planner/scoringSupportSync.test.ts 守护）。
 */
export const STACK_COUNT_RESOLVERS: Record<string, {
  count: (input: EvaluatePlacementFitInput, signal: HeroAbilitySignal) => number | null
  contextLabel: string
}> = {
  per_crusader: { count: (input, signal) => countQualifiedHeroes(input, signal), contextLabel: '整队计数' },
  // 机制: formation-count-mult-stack（per_hero 是 per_crusader 同义词，raw 自带 stack_func:per_hero）
  per_hero: { count: (input, signal) => countQualifiedHeroes(input, signal), contextLabel: '整队计数' },
  per_tagged_crusader_mult: { count: (input, signal) => countQualifiedHeroes(input, signal), contextLabel: '整队计数' },
  per_target_crusader: { count: (input, signal) => countQualifiedHeroes(input, signal), contextLabel: '整队目标计数' },
  per_hero_attribute: { count: (input, signal) => countQualifiedHeroes(input, signal), contextLabel: '整队属性计数' },
  per_upgrade_targets: { count: (input, signal) => countUpgradeTargets(input, signal), contextLabel: '整队目标' },
  per_col_behind: { count: (input) => countColumnsCarryBehindSupport(input), contextLabel: '阵型列拓扑' },
  per_slot_distance_from_source: { count: (input) => countSlotDistanceFromSource(input), contextLabel: '阵型槽位距离' },
}

function resolveSignalMultiplier(
  input: EvaluatePlacementFitInput,
  signal: HeroAbilitySignal,
): { ok: true; multiplier: number } | { ok: false; warning: string } {
  if (signal.applyManually) {
    return {
      ok: false,
      warning: `${signal.rawEffect} 依赖手动触发或专精选择，当前不计分。`,
    }
  }

  // 机制: dynamic-stack-multiply（stacksMultiply=true + 无 stackFunc；如蔚出言不逊）
  // 层数来自数值表达式（当前 unsupported），用 manualStackCount 提供假设值（默认 1000）。
  if (signal.stacksMultiply === true) {
    const stackCount = input.manualStackCount ?? DEFAULT_MANUAL_STACK_COUNT
    const mult = percentToMultiplier(signal.value) ** stackCount
    if (!Number.isFinite(mult)) {
      return { ok: false, warning: `${signal.rawEffect} 乘算堆叠溢出，当前不计分。` }
    }
    // bonus-scale-linkage：联动 signal 只在基础 signal 可计分时生效（依赖检查，不卷入数值）
    if (signal.bonusScaleOfSignal) {
      const dep = resolveSignalMultiplier(input, signal.bonusScaleOfSignal)
      if (!dep.ok) {
        return { ok: false, warning: `${signal.rawEffect} 依赖的基础增益尚未稳定计分，当前不计分。` }
      }
    }
    return { ok: true, multiplier: mult }
  }

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

  const resolver = STACK_COUNT_RESOLVERS[stackFunc]
  if (!resolver) {
    return {
      ok: false,
      warning: `${signal.rawEffect} 的叠层方式(${signal.amountFunc ?? 'null'} / ${stackFunc}) 尚未稳定解析，当前不计分。`,
    }
  }

  const count = resolver.count(input, signal)
  if (count === null) {
    return {
      ok: false,
      warning: `${signal.rawEffect} 需要${resolver.contextLabel}上下文，当前不计分。`,
    }
  }

  const amountFunc = signal.amountFunc ?? null
  if (amountFunc === 'add') {
    return applySignalPercent(signal.value * count)
  }

  if (amountFunc === 'mult') {
    const multiplier = percentToMultiplier(signal.value) ** count
    const percent = invertEffectMultiplier(multiplier)
    if (percent === null) {
      return {
        ok: false,
        warning: `${signal.rawEffect} 的乘算堆叠结果非法，当前不计分。`,
      }
    }
    return applySignalPercent(percent)
  }

  return {
    ok: false,
    warning: `${signal.rawEffect} 的叠层方式(${amountFunc} / ${stackFunc}) 尚未稳定解析，当前不计分。`,
  }
}

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

  for (const signal of collectSignals(input)) {
    if (dimensionFilterSet) {
      const signalDimension = DIMENSION_BY_KIND[signal.kind]
      if (!dimensionFilterSet.has(signalDimension)) {
        continue
      }
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
