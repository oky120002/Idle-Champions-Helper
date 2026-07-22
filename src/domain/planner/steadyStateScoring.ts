import Decimal from 'break_eternity.js'

import type { ResolvedPlannerScenarioModel } from './plannerModel'
import type { HeroAbilityKind, ResolvedHeroAbilityProfile } from '../abilities/abilityModel'
import { evaluatePlacementFit, type AggregatedPool, type PlacementFitScorePart } from './placementFit'
import type { ObjectiveResult } from './objectiveModel'
import { computeCarryDps } from '../simulator/baseDps'
import { computeTeamGoldFind } from './goldObjective'
import type { GameNumberValue } from '../simulator/gameNumber'
import { compareGameNumbers } from '../simulator/gameNumberArithmetic'

/**
 * 推荐模式。carry-dps = 最大化单英雄 carryDps（默认）；team-gold = 最大化全队 team_gold_find。
 * 不强枚举 ObjectiveKind（Ponytail）；新增模式扩展此联合类型。
 */
export type ScoringMode = 'carry-dps' | 'team-gold'

// 无 profile（用户未导入存档）或英雄不在 ownedHeroes 时 carryLevel 回退 1。
// 此处 levelCurve = rate^1 = 英雄自身 costCurve rate（约 1.05–1.1），carryDps 仍含英雄间
// 增长率差异但无法反映高等级 scale；属 MVP 近似（evolution-plan「BUD 对阵型模拟的价值」），
// 精确化依赖 profile heroLevels + 阶段 7 官方 DPS 增长曲线。
const DEFAULT_CARRY_LEVEL = 1

export interface ScoringInput {
  placements: Record<string, string>
  heroesById: Map<string, ResolvedHeroAbilityProfile>
  scenario: ResolvedPlannerScenarioModel
  heroLevels?: Map<string, number>
  scoringMode?: ScoringMode
}

export interface ScoringResult {
  score: GameNumberValue
  warnings: string[]
  explanations: string[]
  carryHeroId: string | null
  objective: ObjectiveResult
  /** best carry 的 active signal kind 集合，供叙事层结构化消费（避免字符串匹配）。 */
  activeSignalKinds: Set<HeroAbilityKind>
}

const ZERO: GameNumberValue = new Decimal(0)

type PlacedEntry = { slotId: string; hero: ResolvedHeroAbilityProfile }

/** 把一批 pool 合并进 sharedPools（同 dimension:scope 的 addPercent 相加、multFactor 相乘）。 */
function mergePools(sharedPools: Map<string, AggregatedPool>, pools: AggregatedPool[]): void {
  for (const pool of pools) {
    const key = `${pool.dimension}:${pool.scope}`
    const merged = sharedPools.get(key) ?? {
      dimension: pool.dimension,
      scope: pool.scope,
      addPercent: 0,
      multFactor: 1,
      poolMultiplier: 1,
    }
    merged.addPercent += pool.addPercent
    merged.multFactor *= pool.multFactor
    merged.poolMultiplier = (1 + merged.addPercent / 100) * merged.multFactor
    sharedPools.set(key, merged)
  }
}

/** Π(poolMultiplier)：pool 间乘法。 */
function productOfPoolMultipliers(pools: Map<string, AggregatedPool>): number {
  let aggregate = 1
  for (const pool of pools.values()) {
    aggregate *= pool.poolMultiplier
  }
  return aggregate
}

// crit_factor 默认值来自 default_crit_info（游戏全局）：chance 2.5%，crit damage +100%（×2）。
const DEFAULT_CRIT_CHANCE_PERCENT = 2.5
const DEFAULT_CRIT_DAMAGE_PERCENT = 100
// 基线 raw crit factor（无任何 crit signal 时）：1 + 0.025 × (2−1) = 1.025。
const BASE_CRIT_FACTOR = 1
  + (DEFAULT_CRIT_CHANCE_PERCENT / 100)
  * (1 + DEFAULT_CRIT_DAMAGE_PERCENT / 100 - 1)

const CRIT_CHANCE_KINDS: ReadonlySet<HeroAbilityKind> = new Set<HeroAbilityKind>([
  'globalCritChance',
  'heroCritChance',
])

/**
 * crit_factor（阶段 4.3/4.4）：1 + total_chance × (total_damage_mult − 1)，基线归一化。
 * - 无 crit signal → 1.0（base crit 在归一中抵消，保持非 crit 阵型 carryDps 不变）。
 * - base chance(2.5%) 始终参与，使「纯 damage buff」类 crit signal 有效（否则 chance=0 无暴击）。
 * - ponytail/BUD 局限：crit 期望值在 BUD 机制下低估（批判③），MVP 可接受；绝对值偏差由归一基线吸收。
 */
function computeCritFactor(parts: PlacementFitScorePart[]): number {
  let chanceAddPercent = 0
  let chanceMult = 1
  let damageAddPercent = 0
  let damageMult = 1
  let hasCrit = false

  for (const part of parts) {
    if (!part.active) {
      continue
    }
    const isChance = CRIT_CHANCE_KINDS.has(part.signalKind)
    if (part.amountFunc === 'mult') {
      if (isChance) {
        chanceMult *= part.multiplier
      } else {
        damageMult *= part.multiplier
      }
    } else {
      // add：evaluatePlacementFit 折算 multiplier = 1 + percent/100 → percent = (multiplier−1)×100
      const percent = (part.multiplier - 1) * 100
      if (isChance) {
        chanceAddPercent += percent
      } else {
        damageAddPercent += percent
      }
    }
    hasCrit = true
  }

  if (!hasCrit) {
    return 1
  }

  const totalChanceFraction = ((DEFAULT_CRIT_CHANCE_PERCENT + chanceAddPercent) * chanceMult) / 100
  const totalDamageMult = 1 + ((DEFAULT_CRIT_DAMAGE_PERCENT + damageAddPercent) * damageMult) / 100
  const rawCritFactor = 1 + totalChanceFraction * (totalDamageMult - 1)
  return rawCritFactor / BASE_CRIT_FACTOR
}

/**
 * vulnerability factor（阶段 6.3/6.4）：已按场景怪物类型匹配的 vulnerability Π 进 DPS。
 * 匹配筛选（monsterTags vs scenario.enemyTypes）在收集循环完成（批判③ 条件性匹配，保守跳过不匹配）；
 * 此处仅对已匹配的 active 信号 Π 累乘（vulnerability 是受伤倍率，add/mult 都还原为乘数）。
 */
function computeVulnerabilityFactor(parts: PlacementFitScorePart[]): number {
  let factor = 1
  let hasVuln = false
  for (const part of parts) {
    factor *= part.multiplier
    hasVuln = true
  }
  return hasVuln ? factor : 1
}

/**
 * team-gold 模式：全队聚合 gold signal（dimension:'gold'），无 carry 概念。
 * 每个英雄作为自身 support（collectSignals 返回其 carry+support gold signal）；
 * global-scope gold 不依赖位置/目标即生效，tagged gold 按 formation 计数。
 */
function scoreTeamGold(placedEntries: PlacedEntry[], input: ScoringInput): ScoringResult {
  const warnings: string[] = []
  const activeKinds = new Set<HeroAbilityKind>()
  const sharedPools = new Map<string, AggregatedPool>()

  for (const entry of placedEntries) {
    warnings.push(...entry.hero.unsupportedSignals.map((signal) => `${signal.rawEffect}: ${signal.note}`))

    const fit = evaluatePlacementFit({
      carryHero: entry.hero,
      carrySlotId: entry.slotId,
      supportHero: entry.hero,
      supportSlotId: entry.slotId,
      scenario: input.scenario,
      placements: input.placements,
      heroesById: input.heroesById,
      dimension: 'gold',
    })

    warnings.push(...fit.warnings)
    for (const part of fit.scoreBreakdown) {
      if (part.active) {
        activeKinds.add(part.signalKind)
      }
    }
    mergePools(sharedPools, fit.pools)
  }

  const aggregate = productOfPoolMultipliers(sharedPools)
  const teamGold = computeTeamGoldFind(aggregate)

  return {
    score: teamGold,
    warnings: [...new Set(warnings)],
    explanations: [],
    carryHeroId: null,
    activeSignalKinds: activeKinds,
    objective: {
      value: teamGold,
      breakdown: [{ label: 'teamGoldFind', value: teamGold }],
    },
  }
}

export function scoreFormation(input: ScoringInput): ScoringResult {
  const placedEntries = Object.entries(input.placements)
    .map(([slotId, heroId]) => {
      const hero = input.heroesById.get(heroId)
      return hero ? { slotId, hero } : null
    })
    .filter((entry): entry is { slotId: string; hero: ResolvedHeroAbilityProfile } => Boolean(entry))

  if (placedEntries.length === 0) {
    return {
      score: ZERO,
      warnings: [],
      explanations: [],
      carryHeroId: null,
      objective: { value: ZERO, breakdown: [] },
      activeSignalKinds: new Set(),
    }
  }

  if (input.scoringMode === 'team-gold') {
    return scoreTeamGold(placedEntries, input)
  }

  let bestScore: GameNumberValue = ZERO
  let bestWarnings: string[] = []
  let bestExplanations: string[] = []
  let bestCarryHeroId: string | null = null
  let bestActiveKinds: Set<HeroAbilityKind> = new Set()

  const enemyTypeSet = new Set(input.scenario.enemyTypes)

  for (const carryEntry of placedEntries) {
    const carryLevel = input.heroLevels?.get(carryEntry.hero.heroId) ?? DEFAULT_CARRY_LEVEL
    const warnings = [...carryEntry.hero.unsupportedSignals.map((signal) => `${signal.rawEffect}: ${signal.note}`)]
    const explanations: string[] = []
    const activeKinds = new Set<HeroAbilityKind>()
    // pool 在整队层面聚合：同一 dimension:scope 的 pool 跨所有支持位合并
    // （addPercent 相加、multFactor 相乘），pool 间再相乘。
    // 不能按支持位独立 pool 乘积再相乘——那会把不同位向同一 pool 的 additive 贡献变成累乘。
    const sharedPools = new Map<string, AggregatedPool>()
    const critParts: PlacementFitScorePart[] = []
    const vulnParts: PlacementFitScorePart[] = []

    for (const supportEntry of placedEntries) {
      const fit = evaluatePlacementFit({
        carryHero: carryEntry.hero,
        carrySlotId: carryEntry.slotId,
        supportHero: supportEntry.hero,
        supportSlotId: supportEntry.slotId,
        scenario: input.scenario,
        placements: input.placements,
        heroesById: input.heroesById,
        // carryDps 只聚合 damage 维度；gold/crit/survival 等非伤害 pool 必须显式过滤，
        // 否则阶段 3+ 引入新维度后会泄漏进 carryDps（同 typecheck masking 教训）。
        dimension: 'damage',
      })

      warnings.push(...fit.warnings)

      for (const part of fit.scoreBreakdown) {
        if (!part.active) {
          continue
        }

        activeKinds.add(part.signalKind)
        explanations.push(
          `${supportEntry.hero.heroId}: ${part.signalKind} x${part.multiplier.toFixed(2)} -> ${carryEntry.hero.heroId}`,
        )
      }

      mergePools(sharedPools, fit.pools)

      // crit 维度单独聚合（chance/damage 不能混入 damage pool），供 crit_factor 使用。
      const critFit = evaluatePlacementFit({
        carryHero: carryEntry.hero,
        carrySlotId: carryEntry.slotId,
        supportHero: supportEntry.hero,
        supportSlotId: supportEntry.slotId,
        scenario: input.scenario,
        placements: input.placements,
        heroesById: input.heroesById,
        dimension: 'crit',
      })
      for (const part of critFit.scoreBreakdown) {
        if (part.active) {
          activeKinds.add(part.signalKind)
        }
      }
      critParts.push(...critFit.scoreBreakdown)

      // vulnerability 维度按场景怪物类型条件性匹配（阶段 6），进 vulnFactor。
      const vulnFit = evaluatePlacementFit({
        carryHero: carryEntry.hero,
        carrySlotId: carryEntry.slotId,
        supportHero: supportEntry.hero,
        supportSlotId: supportEntry.slotId,
        scenario: input.scenario,
        placements: input.placements,
        heroesById: input.heroesById,
        dimension: 'vulnerability',
      })
      for (const part of vulnFit.scoreBreakdown) {
        if (!part.active) {
          continue
        }
        // 条件性匹配：monsterTags 非空时仅当任一 tag ∈ 场景 enemyTypes 才计入（批判③ 保守跳过不匹配）。
        const tags = part.monsterTags
        if (tags && tags.length > 0 && !tags.some((tag) => enemyTypeSet.has(tag))) {
          continue
        }
        activeKinds.add(part.signalKind)
        vulnParts.push(part)
      }
    }

    const critFactor = computeCritFactor(critParts)
    const vulnFactor = computeVulnerabilityFactor(vulnParts)
    const carryDps = computeCarryDps(
      carryEntry.hero,
      carryLevel,
      productOfPoolMultipliers(sharedPools) * critFactor * vulnFactor,
    )

    if (compareGameNumbers(carryDps, bestScore) > 0) {
      bestScore = carryDps
      bestWarnings = [...new Set(warnings)]
      bestExplanations = explanations
      bestCarryHeroId = carryEntry.hero.heroId
      bestActiveKinds = activeKinds
    }
  }

  return {
    score: bestScore,
    warnings: bestWarnings,
    explanations: bestExplanations,
    carryHeroId: bestCarryHeroId,
    activeSignalKinds: bestActiveKinds,
    objective: {
      value: bestScore,
      breakdown: bestCarryHeroId
        ? [{ label: `carryDps:${bestCarryHeroId}`, value: bestScore }]
        : [],
    },
  }
}
