import Decimal from 'break_eternity.js'

import type { ResolvedPlannerScenarioModel } from './plannerModel'
import type { HeroAbilityKind, ResolvedHeroAbilityProfile } from '../abilities/abilityModel'
import { DIMENSION_BY_KIND } from '../abilities/abilityModel'
import { evaluatePlacementFit, type AggregatedPool, type PlacementFitScorePart } from './placementFit'
import type { HeroDpsContribution } from '../simulator/externalHeroDpsMult'
import { matchesHeroQualifier } from '../abilities/signalSemantics'
import { computeCarryDps, computeLevelCurve } from '../simulator/baseDps'
import { computeTeamGoldFind } from './goldObjective'
import { computeEffectiveHealth } from '../simulator/survivalCalculation'
import { computeSingleHitDamage } from '../simulator/budCalculation'
import { estimateMaxArea, type AreaEstimationResult } from './areaEstimation'
import { formatGameNumber, type GameNumberValue } from '../simulator/gameNumber'
import { compareGameNumbers } from '../simulator/gameNumberArithmetic'
import { mergePools, productOfPoolMultipliers } from './scoring/poolAggregation'
import { computeCritFactor } from './scoring/critFactor'
import { computeVulnerabilityFactor, isVulnerabilityMatched } from './scoring/vulnerabilityFactor'

/**
 * 推荐模式。carry-dps = 最大化单英雄 carryDps（默认）；team-gold = 最大化全队 team_gold_find。
 * 不强枚举 ObjectiveKind（Ponytail）；新增模式扩展此联合类型。
 */
export type ScoringMode = 'carry-dps' | 'team-gold'

/**
 * 投影模式（约束②，见 architecture.md「投影模式」）——把阵型加成聚合投影成 objectiveValue 的方式。
 * - 'absolute-dps'（默认）：baseDamage × levelCurve × 全因子（damagePool×crit×vuln×globalBuff×equipmentAdj）。
 *   绝对量未校准（baseDamage/BUD 未校准），作 BUD 校准回归基线。
 * - 'formation-buff'：只阵型内聚合 damagePool×crit×vuln，**不含** baseDamage/levelCurve/外部加成。
 *   阵型模拟器本质是阵型内 signal 聚合，外部全局加成不属于阵型（游戏只给全量数据故加开关）。
 * 禁复用 ComputationMode（已用于 beam-search 候选裁剪 `computationMode.ts`，两者正交）。
 */
export type AggregateProjection = 'absolute-dps' | 'formation-buff'

// 无 profile（用户未导入存档）或英雄不在 ownedHeroes 时 carryLevel 回退 1。
// 此处 levelCurve = rate^1 = 英雄自身 costCurve rate（约 1.05–1.1），carryDps 仍含英雄间
// 增长率差异但无法反映高等级 scale；属 MVP 近似（见 docs/research/data/planner/bud-calibration.md），
// 精确化依赖 profile heroLevels + 官方 DPS 增长曲线。
const DEFAULT_CARRY_LEVEL = 1

export interface ScoringInput {
  placements: Record<string, string>
  heroesById: Map<string, ResolvedHeroAbilityProfile>
  scenario: ResolvedPlannerScenarioModel
  heroLevels?: Map<string, number>
  scoringMode?: ScoringMode
  /**
   * 全局 buff pool 乘数。
   * 由调用方按玩家选择 patron 从 `global-buffs.json` 经 computeGlobalBuffMultiplier 解析后传入。
   * 默认 1（无全局加成）；乘进 carryDps：baseDps × levelCurve × damagePool × crit × vuln × globalBuff。
   */
  globalBuffMultiplier?: number | undefined
  /**
   * 装备调整比：carryId → adjustment（ownedEquipMult / theoreticalLootMult）。
   * 把理论 loot 基线缩放到玩家实际装备；默认无（=1，保持理论基线）。
   * 由调用方从 loot-catalog.json + owned loot 经 computeEquipmentAdjustmentByHero 解析后传入。
   */
  equipmentAdjustmentByHero?: Map<string, number> | undefined
  /**
   * 外部 hero_dps per-carry 贡献（patron_perk + blessing 的 effect_def hero_dps，带 filter 限定）。
   * scoreFormation 内按 carry 属性匹配 qualifier，与 equipment 同 add pool 合并
   * （IC hero_dps_multiplier_mult 同英雄 base DPS）。由调用方经 collectHeroDpsContributions 解析后传入。
   */
  externalHeroDpsContributions?: ReadonlyArray<HeroDpsContribution> | undefined
  /** 强制指定 carry（只评该英雄作核心输出位）。 */
  lockedCarryHeroId?: string | undefined
  /**
   * 动态层数假设（dynamic-stack-multiply 机制用，如蔚出言不逊）。
   * stacksMultiply=true 的 signal 按此值乘算；缺省走 placementFit 的 DEFAULT_MANUAL_STACK_COUNT(1000)。
   * 由 UI 让用户按当前冒险最高区域手动设定（如 area×10）。
   */
  manualStackCount?: number | undefined
  /**
   * 投影模式（约束②）；默认 'absolute-dps'。
   * 'formation-buff' 时 objectiveValue = 阵型内聚合 damagePool×crit×vuln（不乘 baseDamage/levelCurve/globalBuff/equipmentAdj），
   * 且跳过 areaEstimate（非真实 DPS，BUD 估算无意义）。
   */
  aggregateProjection?: AggregateProjection | undefined
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
  /** 外部 hero_dps 加成（patron/blessing effect_def hero_dps，per-carry 条件生效；与装备同 add pool）*/
  externalHeroDps: number
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
  /** 当前模式优化目标量：carry-dps=carryDps，team-gold=teamGoldFind。取代旧"评分"概念。 */
  objectiveValue: GameNumberValue
  warnings: string[]
  carryHeroId: string | null
  /** best carry 的 active signal kind 集合，供叙事层结构化消费（避免字符串匹配）。 */
  activeSignalKinds: Set<HeroAbilityKind>
  /**
   * 推图层数预估：best carry 的 BUD（carry 单次伤害近似）+ effectiveHealth（survival pool）
   * 经 estimateMaxArea 得出。team-gold 模式或缺 carry 时为 null。
   */
  areaEstimate?: AreaEstimationResult | null
  /** best carry 的结构化加成拆解；team-gold 模式或空阵型时为 null。 */
  breakdown: SimulationBreakdown | null
}

const ZERO: GameNumberValue = new Decimal(0)

type PlacedEntry = { slotId: string; hero: ResolvedHeroAbilityProfile }

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
      manualStackCount: input.manualStackCount,
      supportLevel: input.heroLevels?.get(entry.hero.heroId) ?? DEFAULT_CARRY_LEVEL,
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
    objectiveValue: teamGold,
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
      objectiveValue: ZERO,
      warnings: [],
      carryHeroId: null,
      activeSignalKinds: new Set(),
      breakdown: null,
    }
  }

  if (input.scoringMode === 'team-gold') {
    return scoreTeamGold(placedEntries, input)
  }

  const aggregateProjection = input.aggregateProjection ?? 'absolute-dps'
  let bestCarryDps: GameNumberValue = ZERO
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
    externalHeroDpsMult: number
    damagePool: number
    contributions: SimulationContribution[]
  } | null = null

  const enemyTypeSet = new Set(input.scenario.enemyTypes)

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
      // 一次跑 damage/crit/vulnerability 三维度（dimension 数组），signal 只迭代一遍 + 一次 qualifier 匹配，
      // 避免原 3 次 evaluatePlacementFit 对同一批 signal 重复匹配（结构性加速 ~3x 内层）。
      const fit = evaluatePlacementFit({
        carryHero: carryEntry.hero,
        carrySlotId: carryEntry.slotId,
        supportHero: supportEntry.hero,
        supportSlotId: supportEntry.slotId,
        scenario: input.scenario,
        placements: input.placements,
        heroesById: input.heroesById,
        dimension: ['damage', 'crit', 'vulnerability'],
        aggregatePools: true,
        manualStackCount: input.manualStackCount,
        supportLevel: input.heroLevels?.get(supportEntry.hero.heroId) ?? DEFAULT_CARRY_LEVEL,
      })
      warnings.push(...fit.warnings)
      // 只把 damage 维度 pool 并入 sharedPools；crit/vulnerability 的 pool 不消费（走 scoreBreakdown→factor）。
      mergePools(sharedPools, fit.pools.filter((pool) => pool.dimension === 'damage'))

      // 按 dimension 拆 scoreBreakdown：crit 全量进 critParts；vuln 经 monsterTags 条件匹配进 vulnParts；
      // damage/crit active + vuln(active 且匹配) 合并进 contributions。
      const supportActiveParts: PlacementFitScorePart[] = []
      for (const part of fit.scoreBreakdown) {
        const dim = DIMENSION_BY_KIND[part.signalKind]
        if (dim === 'crit') {
          critParts.push(part)
          if (part.active) {
            activeKinds.add(part.signalKind)
            supportActiveParts.push(part)
          }
        } else if (dim === 'vulnerability') {
          // 条件性匹配（active + monsterTags 与场景 enemyTypes 相交）下沉到 isVulnerabilityMatched。
          if (!isVulnerabilityMatched(part, enemyTypeSet)) {
            continue
          }
          activeKinds.add(part.signalKind)
          vulnParts.push(part)
          supportActiveParts.push(part)
        } else if (dim === 'damage' && part.active) {
          activeKinds.add(part.signalKind)
          supportActiveParts.push(part)
        }
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
    // 外部 hero_dps（patron/blessing effect_def）按 carry 属性匹配，与装备同 add pool。
    let externalHeroDpsAddPercent = 0
    for (const contribution of input.externalHeroDpsContributions ?? []) {
      if (matchesHeroQualifier(carryEntry.hero, contribution.qualifier)) {
        externalHeroDpsAddPercent += contribution.value
      }
    }
    const externalHeroDpsMult = 1 + externalHeroDpsAddPercent / 100
    // hero_dps add pool：装备 + 外部 effect_def（IC hero_dps_multiplier_mult 同英雄 base DPS add 合并）。
    const heroDpsPool = equipmentAdjustment + externalHeroDpsAddPercent / 100
    const damagePool = productOfPoolMultipliers(sharedPools)
    const formationAggregate = damagePool * critFactor * vulnFactor
    // 投影模式（约束②）：formation-buff 只取阵型内聚合，不乘 baseDamage/levelCurve/外部加成。
    const carryDps = aggregateProjection === 'formation-buff'
      ? new Decimal(formationAggregate)
      : computeCarryDps(carryEntry.hero, carryLevel, formationAggregate * globalBuff * heroDpsPool)

    if (compareGameNumbers(carryDps, bestCarryDps) > 0) {
      bestCarryDps = carryDps
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
        externalHeroDpsMult,
        damagePool,
        contributions,
      }
    }
  }

  let areaEstimate: AreaEstimationResult | null = null
  // formation-buff 模式 bestCarryDps 是阵型聚合倍率（非真实 DPS），BUD/推图层数估算无意义，跳过。
  if (bestCarryHeroId && aggregateProjection === 'absolute-dps') {
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
          manualStackCount: input.manualStackCount,
          supportLevel: input.heroLevels?.get(supportEntry.hero.heroId) ?? DEFAULT_CARRY_LEVEL,
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
      const bud = computeSingleHitDamage(bestCarryDps, bestCarryEntry.hero.baseAttackCooldown)
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
      externalHeroDpsMult,
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
      carryDps: formatGameNumber(bestCarryDps),
      factors: {
        damagePool,
        crit: critFactor,
        vulnerability: vulnFactor,
        globalBuff,
        equipmentAdjustment,
        externalHeroDps: externalHeroDpsMult,
      },
      pools: [...pools.values()],
      contributions,
    }
  }

  return {
    objectiveValue: bestCarryDps,
    warnings: bestWarnings,
    carryHeroId: bestCarryHeroId,
    activeSignalKinds: bestActiveKinds,
    areaEstimate,
    breakdown,
  }
}
