import type { HeroAbilitySignal } from '../../abilities/abilityModel'
import { matchesHeroQualifier } from '../../abilities/signalSemantics'
import type { EvaluatePlacementFitInput } from '../placementFitTypes'
import {
  computeSlotDistance,
  findScenarioSlot,
  matchesSlotRelation,
  resolvePositionRelation,
} from '../placementSlotRelation'

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
 * 每种 stackFunc 对应的计数来源 + warning 用的上下文标签。
 * keys 即 scorer 支持的 stackFunc 集合——signal-coverage 的覆盖率报告必须与此同步，
 * 否则统计失真（见 src/domain/planner/scoringSupportSync.test.ts 守护）。
 */
export const STACK_COUNT_RESOLVERS: Record<string, {
  count: (input: EvaluatePlacementFitInput, signal: HeroAbilitySignal) => number | null
  contextLabel: string
}> = {
  // 机制: formation-count-mult-stack / formation-count-add-stack（per_hero 是 per_crusader 同义词）
  per_crusader: { count: (input, signal) => countQualifiedHeroes(input, signal), contextLabel: '整队计数' },
  per_hero: { count: (input, signal) => countQualifiedHeroes(input, signal), contextLabel: '整队计数' },
  per_tagged_crusader_mult: { count: (input, signal) => countQualifiedHeroes(input, signal), contextLabel: '整队计数' },
  per_target_crusader: { count: (input, signal) => countQualifiedHeroes(input, signal), contextLabel: '整队目标计数' },
  per_hero_attribute: { count: (input, signal) => countQualifiedHeroes(input, signal), contextLabel: '整队属性计数' },
  per_upgrade_targets: { count: (input, signal) => countUpgradeTargets(input, signal), contextLabel: '整队目标' },
  // 机制: topology-count-stack（列/槽位距离拓扑计数）
  per_col_behind: { count: (input) => countColumnsCarryBehindSupport(input), contextLabel: '阵型列拓扑' },
  per_slot_distance_from_source: { count: (input) => countSlotDistanceFromSource(input), contextLabel: '阵型槽位距离' },
}

/**
 * scorer 已注册的 stackFunc 名集合（STACK_COUNT_RESOLVERS keys 的派生视图，单一源无重复）。
 * 供 gain profile（abilityModel.aggregateGainByDimension）跳过未注册 stackFunc 信号——实际评分
 * resolveSignalMultiplier 走 stackFunc 路径找不到 resolver 恒丢弃，gain 须对称不计入。
 */
export const REGISTERED_STACK_FUNCS: ReadonlySet<string> = new Set(Object.keys(STACK_COUNT_RESOLVERS))
