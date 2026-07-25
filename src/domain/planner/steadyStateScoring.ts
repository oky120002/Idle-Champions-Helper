import Decimal from 'break_eternity.js'

import type { ResolvedPlannerScenarioModel } from './plannerModel'
import type {
  HeroAbilityDimension,
  HeroAbilityKind,
  ResolvedHeroAbilityProfile,
} from '../abilities/abilityModel'
import { evaluatePlacementFit, type AggregatedPool, type PlacementFitScorePart } from './placementFit'
import { computeCarryDps, computeLevelCurve } from '../simulator/baseDps'
import { computeTeamGoldFind } from './goldObjective'
import { computeEffectiveHealth } from '../simulator/survivalCalculation'
import { computeSingleHitDamage } from '../simulator/budCalculation'
import { estimateMaxArea, type AreaEstimationResult } from './areaEstimation'
import { formatGameNumber, type GameNumberValue } from '../simulator/gameNumber'
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
  /**
   * 全局 buff pool 乘数（阶段 11.4：patron-perk 等）。
   * 由调用方按玩家选择 patron 从 `global-buffs.json` 经 computeGlobalBuffMultiplier 解析后传入。
   * 默认 1（无全局加成）；乘进 carryDps：baseDps × levelCurve × damagePool × crit × vuln × globalBuff。
   */
  globalBuffMultiplier?: number | undefined
  /**
   * 装备调整比（阶段 13.4）：carryId → adjustment（ownedEquipMult / theoreticalLootMult）。
   * 把 M1 理论 loot 基线缩放到玩家实际装备；默认无（=1，保持理论基线）。
   * 由调用方从 loot-catalog.json + owned loot 经 computeEquipmentAdjustment 解析后传入。
   */
  equipmentAdjustmentByHero?: Map<string, number> | undefined
  /** 阶段 15.4：强制指定 carry（只评该英雄作核心输出位）。 */
  lockedCarryHeroId?: string | undefined
}

export interface SimulationFactor {
  /** damage 维度 pool 间乘积（global_dps × hero_dps × formation × static_dps）*/
  damagePool: number
  /** crit 期望因子（基线归一；无 crit signal 时为 1）*/
  crit: number
  /** vulnerability 因子（按场景怪物类型条件匹配后聚合）*/
  vulnerability: number
  /** 全局 buff pool 乘数（patron-perk 等，调用方传入）*/
  globalBuff: number
  /** 装备调整比（owned 装备相对理论最大的缩放，调用方传入）*/
  equipmentAdjustment: number
}

export interface SimulationContribution {
  supportHeroId: string
  supportSlotId: string
  /** 该支持位对 carry 的 active signal（damage + crit + 已匹配 vulnerability），含 multiplier/reasonCode */
  signals: PlacementFitScorePart[]
}

/**
 * 单次模拟的结构化加成拆解（JSON 可序列化）：把 scoreFormation 内部已计算但原先压成字符串丢弃的
 * pool/signal/factor 中间量透出，供 UI 渲染每位英雄加成与 CLI JSON 输出。
 * baseDps/levelCurve/carryDps 均为游戏记数法字符串（可超 Number.MAX_VALUE，JSON 可序列化）：
 * levelCurve 原 .toNumber() 在高 level（如 1.06^20000）溢出 Infinity，JSON.stringify 静默变 null 破坏契约。
 */
export interface SimulationBreakdown {
  carryHeroId: string
  carrySlotId: string
  carryLevel: number
  /** baseDamage × levelCurve（加成前基线）*/
  baseDps: string
  /** costCurve rate^level 的游戏记数法字符串（与 baseDps/carryDps 同契约）*/
  levelCurve: string
  /** 最终 carryDps = baseDps × factors 各项之积 */
  carryDps: string
  factors: SimulationFactor
  /** damage 维度聚合 pools（跨支持位合并；pool 间相乘 = factors.damagePool）*/
  pools: AggregatedPool[]
  /** 每位支持位对 carry 的 active signal 拆解 */
  contributions: SimulationContribution[]
}

export interface ScoringResult {
  score: GameNumberValue
  warnings: string[]
  carryHeroId: string | null
  /** best carry 的 active signal kind 集合，供叙事层结构化消费（避免字符串匹配）。 */
  activeSignalKinds: Set<HeroAbilityKind>
  /**
   * 推图层数预估（阶段 15.2）：best carry 的 BUD（carry 单次伤害近似）+ effectiveHealth（survival pool）
   * 经 estimateMaxArea 得出。team-gold 模式或缺 carry 时为 null。
   */
  areaEstimate?: AreaEstimationResult | null
  /** best carry 的结构化加成拆解；team-gold 模式或空阵型时为 null。 */
  breakdown: SimulationBreakdown | null
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
 * vulnerability factor（阶段 6.3/6.4）：已按场景怪物类型匹配的 vulnerability 进 DPS。
 * 匹配筛选（monsterTags vs scenario.enemyTypes）在收集循环完成（批判③ 条件性匹配，保守跳过不匹配）。
 * 聚合与 damage/gold pool 一致：add 类（amountFunc 缺省）同 pool 百分比相加 (1+Σadd/100)，
 * mult 类独立累乘；pool 内 (1+Σadd/100)×Πmult。原一律 Π 累乘把两个 +100% 易伤算成 4（正确 3）。
 */
function computeVulnerabilityFactor(parts: PlacementFitScorePart[]): number {
  let addPercent = 0
  let multFactor = 1
  let hasVuln = false
  for (const part of parts) {
    if (part.amountFunc === 'mult') {
      multFactor *= part.multiplier
    } else {
      addPercent += (part.multiplier - 1) * 100
    }
    hasVuln = true
  }
  if (!hasVuln) {
    return 1
  }
  return (1 + addPercent / 100) * multFactor
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
    carryHeroId: null,
    activeSignalKinds: activeKinds,
    breakdown: null,
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
      carryHeroId: null,
      activeSignalKinds: new Set(),
      breakdown: null,
    }
  }

  if (input.scoringMode === 'team-gold') {
    return scoreTeamGold(placedEntries, input)
  }

  let bestScore: GameNumberValue = ZERO
  let bestWarnings: string[] = []
  let bestCarryHeroId: string | null = null
  let bestActiveKinds: Set<HeroAbilityKind> = new Set()
  // best carry 的拆解中间量；循环结束据此构建 SimulationBreakdown。
  let bestBreakdownData: {
    carryEntry: PlacedEntry
    carryLevel: number
    pools: Map<string, AggregatedPool>
    critFactor: number
    vulnFactor: number
    globalBuff: number
    equipmentAdjustment: number
    damagePool: number
    contributions: SimulationContribution[]
  } | null = null

  const enemyTypeSet = new Set(input.scenario.enemyTypes)

  // 维度评分闭包：damage/crit/vulnerability 三维度共用同一组位置/目标参数，仅 dimension 不同，
  // 抽出来避免三段重复（原三段 evaluatePlacementFit 仅 dimension 字段不同）。
  const scoreSupportDimension = (
    carry: PlacedEntry,
    support: PlacedEntry,
    dimension: HeroAbilityDimension,
  ) =>
    evaluatePlacementFit({
      carryHero: carry.hero,
      carrySlotId: carry.slotId,
      supportHero: support.hero,
      supportSlotId: support.slotId,
      scenario: input.scenario,
      placements: input.placements,
      heroesById: input.heroesById,
      // carryDps 只聚合 damage 维度；gold/crit/survival 等非伤害 pool 必须显式过滤，
      // 否则阶段 3+ 引入新维度后会泄漏进 carryDps（同 typecheck masking 教训）。
      dimension,
      // crit/vulnerability 只消费 scoreBreakdown（喂 computeCritFactor/computeVulnerabilityFactor），
      // 不读 pools——跳过聚合避免死代码计算。damage 维度的 pools 才喂 productOfPoolMultipliers。
      aggregatePools: dimension === 'damage',
    })

  for (const carryEntry of placedEntries) {
    if (input.lockedCarryHeroId && carryEntry.hero.heroId !== input.lockedCarryHeroId) {
      continue
    }
    const carryLevel = input.heroLevels?.get(carryEntry.hero.heroId) ?? DEFAULT_CARRY_LEVEL
    const warnings = [...carryEntry.hero.unsupportedSignals.map((signal) => `${signal.rawEffect}: ${signal.note}`)]
    const activeKinds = new Set<HeroAbilityKind>()
    // pool 在整队层面聚合：同一 dimension:scope 的 pool 跨所有支持位合并
    // （addPercent 相加、multFactor 相乘），pool 间再相乘。
    // 不能按支持位独立 pool 乘积再相乘——那会把不同位向同一 pool 的 additive 贡献变成累乘。
    const sharedPools = new Map<string, AggregatedPool>()
    const critParts: PlacementFitScorePart[] = []
    const vulnParts: PlacementFitScorePart[] = []
    const contributions: SimulationContribution[] = []

    for (const supportEntry of placedEntries) {
      const damageFit = scoreSupportDimension(carryEntry, supportEntry, 'damage')
      warnings.push(...damageFit.warnings)
      mergePools(sharedPools, damageFit.pools)

      // crit 维度单独聚合（chance/damage 不能混入 damage pool），供 crit_factor 使用。
      const critFit = scoreSupportDimension(carryEntry, supportEntry, 'crit')
      critParts.push(...critFit.scoreBreakdown)

      // vulnerability 维度按场景怪物类型条件性匹配（阶段 6），进 vulnFactor。
      const vulnFit = scoreSupportDimension(carryEntry, supportEntry, 'vulnerability')

      // 该支持位对 carry 的 active signal（三维度合并）→ 结构化 contributions。
      const supportActiveParts: PlacementFitScorePart[] = []
      for (const part of damageFit.scoreBreakdown) {
        if (!part.active) {
          continue
        }
        activeKinds.add(part.signalKind)
        supportActiveParts.push(part)
      }
      for (const part of critFit.scoreBreakdown) {
        if (!part.active) {
          continue
        }
        activeKinds.add(part.signalKind)
        supportActiveParts.push(part)
      }
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
        supportActiveParts.push(part)
      }

      if (supportActiveParts.length > 0) {
        contributions.push({
          supportHeroId: supportEntry.hero.heroId,
          supportSlotId: supportEntry.slotId,
          signals: supportActiveParts,
        })
      }
    }

    const critFactor = computeCritFactor(critParts)
    const vulnFactor = computeVulnerabilityFactor(vulnParts)
    const globalBuff = input.globalBuffMultiplier ?? 1
    const equipmentAdjustment = input.equipmentAdjustmentByHero?.get(carryEntry.hero.heroId) ?? 1
    const damagePool = productOfPoolMultipliers(sharedPools)
    const carryDps = computeCarryDps(
      carryEntry.hero,
      carryLevel,
      damagePool * critFactor * vulnFactor * globalBuff * equipmentAdjustment,
    )

    if (compareGameNumbers(carryDps, bestScore) > 0) {
      bestScore = carryDps
      bestWarnings = [...new Set(warnings)]
      bestCarryHeroId = carryEntry.hero.heroId
      bestActiveKinds = activeKinds
      bestBreakdownData = {
        carryEntry,
        carryLevel,
        pools: sharedPools,
        critFactor,
        vulnFactor,
        globalBuff,
        equipmentAdjustment,
        damagePool,
        contributions,
      }
    }
  }

  let areaEstimate: AreaEstimationResult | null = null
  if (bestCarryHeroId) {
    const bestCarryEntry = placedEntries.find((entry) => entry.hero.heroId === bestCarryHeroId)
    if (bestCarryEntry) {
      const survivalPools = new Map<string, AggregatedPool>()
      for (const supportEntry of placedEntries) {
        const fit = evaluatePlacementFit({
          carryHero: bestCarryEntry.hero,
          carrySlotId: bestCarryEntry.slotId,
          supportHero: supportEntry.hero,
          supportSlotId: supportEntry.slotId,
          scenario: input.scenario,
          placements: input.placements,
          heroesById: input.heroesById,
          dimension: 'survival',
        })
        mergePools(survivalPools, fit.pools)
      }
      const carryLevel = input.heroLevels?.get(bestCarryHeroId) ?? DEFAULT_CARRY_LEVEL
      const effectiveHealth = computeEffectiveHealth(
        bestCarryEntry.hero,
        carryLevel,
        productOfPoolMultipliers(survivalPools),
      )
      // ponytail: BUD 用 carry 单次伤害近似（carryDps × attackCooldown）；carry 通常设 BUD，
      // 绝对值偏差归 7.5 BUD 实测校准。相对比较保序。
      const bud = computeSingleHitDamage(bestScore, bestCarryEntry.hero.baseAttackCooldown)
      areaEstimate = estimateMaxArea({ bud, effectiveHealth })
    }
  }

  let breakdown: SimulationBreakdown | null = null
  if (bestBreakdownData) {
    const {
      carryEntry,
      carryLevel,
      pools,
      critFactor,
      vulnFactor,
      globalBuff,
      equipmentAdjustment,
      damagePool,
      contributions,
    } = bestBreakdownData
    const levelCurve = computeLevelCurve(carryEntry.hero, carryLevel)
    const baseDamage = carryEntry.hero.baseDamage > 0 ? carryEntry.hero.baseDamage : 1
    const baseDps = new Decimal(baseDamage).times(levelCurve)
    breakdown = {
      carryHeroId: carryEntry.hero.heroId,
      carrySlotId: carryEntry.slotId,
      carryLevel,
      baseDps: formatGameNumber(baseDps),
      levelCurve: formatGameNumber(levelCurve),
      carryDps: formatGameNumber(bestScore),
      factors: {
        damagePool,
        crit: critFactor,
        vulnerability: vulnFactor,
        globalBuff,
        equipmentAdjustment,
      },
      pools: [...pools.values()],
      contributions,
    }
  }

  return {
    score: bestScore,
    warnings: bestWarnings,
    carryHeroId: bestCarryHeroId,
    activeSignalKinds: bestActiveKinds,
    areaEstimate,
    breakdown,
  }
}
