/* eslint-disable max-lines -- planner 核心评分引擎：scoreFormation 主流程 + 7 个紧密协作的子函数（已全部 ≤50 行/max-lines-per-function 已清）。拆到多个文件会让评分逻辑修改需同时打开多个单元，破坏 AI-first 一跳命中率（CLAUDE.md 根目标）。 */
import { Decimal } from 'decimal.js'

import type { HeroAbilityKind, ResolvedHeroAbilityProfile } from '../abilities/abilityModel'
import { DIMENSION_BY_KIND } from '../abilities/abilityModel'
import type { HeroDpsContribution } from '../buffs/externalHeroDpsMult'
import { matchesHeroQualifier } from '../abilities/signalSemantics'
import { computeCarryDps, computeLevelCurve } from '../simulator/baseDps'
import { computeEffectiveHealth } from '../simulator/survivalCalculation'
import { computeSingleHitDamage } from '../simulator/budCalculation'
import { estimateMaxArea, type AreaEstimationResult } from '../simulator/areaEstimation'
import { compareGameNumbers, formatGameNumber, type GameNumberValue } from '../simulator/gameNumber'
import type { EquipmentCritBonus } from '../buffs/equipmentMult'
import { mergePools, productOfPoolMultipliers } from './scoring/poolAggregation'
import { computeCritFactor } from './scoring/critFactor'
import { computeVulnerabilityFactor, isVulnerabilityMatched } from './scoring/vulnerabilityFactor'
import { computeTeamGoldFind } from './goldObjective'
import { evaluatePlacementFit, type AggregatedPool, type PlacementFitScorePart } from './placementFit'
import type { ResolvedPlannerScenarioModel } from './plannerModel'

/**
 * 推荐模式。carry-dps = 最大化单英雄 carryDps（默认）；team-gold = 最大化全队 team_gold_find。
 * 不强枚举 ObjectiveKind（Ponytail）；新增模式扩展此联合类型。
 */
export type ScoringMode = 'carry-dps' | 'team-gold'

/**
 * 投影模式（约束②，见 architecture.md「投影模式」）——把阵型加成聚合投影成 objectiveValue 的方式。
 * - 'absolute-dps'（默认）：baseDamage × levelCurve × globalBuff × heroDpsPool × damagePool × crit × vuln。
 *   globalBuff/heroDpsPool 是 ability 池与外部加成（patron/blessing/装备）同 key 加法合并后的 unified 池
 *   （A1：IC 同 key 全来源加法，非跨源相乘）；damagePool 为残余非 global/hero 池。绝对量未校准，作 BUD 回归基线。
 * - 'formation-buff'：只阵型内 ability 聚合（globalBuff×heroDpsPool×damagePool×crit×vuln），**不含**
 *   baseDamage/levelCurve/外部加成。阵型模拟器本质是阵型内 signal 聚合，外部全局加成不属于阵型。
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
   * 外部 global_dps 乘数（patron-perks + blessings 的 global_dps_multiplier_mult，add pool = 1+Σ/100）。
   * 由调用方经 computeActual*GlobalBuff 解析 + combineGlobalBuffMultipliers 合成后传入。
   * 默认 1（无外部加成）。absolute-dps 下与 ability 的 global_dps 同 key 加法合并进 unified global 池
   * （A1：IC 同 key 全来源加法，非 ability 池 × 外部池 相乘）；formation-buff 不消费（排除外部加成）。
   */
  globalBuffMultiplier?: number | undefined
  /**
   * 装备调整比：carryId → adjustment（ownedEquipMult / theoreticalLootMult）。
   * 把理论 loot 基线缩放到玩家实际装备；默认无（=1，保持理论基线）。
   * 由调用方从 loot-catalog.json + owned loot 经 computeEquipmentAdjustmentByHero 解析后传入。
   * absolute-dps 下与 ability 的 hero_dps 同 key 加法合并进 unified hero 池（A1）。
   */
  equipmentAdjustmentByHero?: Map<string, number> | undefined
  /**
   * 装备 per-carry health multiplier（ownedHeroes health_mult，hero-scoped 生命加成，1+Σ/100）。
   * survival 段把 carry 的 health 并入 survival:hero 池（影响 effectiveHealth/推图层数，非 carryDps）。
   * 默认无（=1，无生命加成）。absolute-dps 专用（formation-buff 跳过 survival）。
   */
  equipmentHealthByHero?: Map<string, number> | undefined
  /**
   * 装备 global_dps per-hero addPercent（global_dps_multiplier_mult，global-scope）。scoreFormation 按 placed
   * 英雄求和并入 damage:global 池（装备英雄绑定，排除 bench；与账号级 globalBuffMultiplier 分列）。默认空 map。
   */
  equipmentGlobalDpsByHero?: ReadonlyMap<string, number> | undefined
  /** 装备 gold per-hero addPercent（gold_multiplier_mult，global-scope）。scoreTeamGold 按 placed 求和并入 gold:global 池。默认空 map。 */
  equipmentGoldByHero?: ReadonlyMap<string, number> | undefined
  /**
   * 装备 per-carry crit mult（hero-scope buff_base_crit_*_mult，{chanceMult, damageMult}）。
   * scoreFormation 取 carry 值经 computeCritFactor 独立通道注入（非池聚合，mult 语义）。默认空 map。
   */
  equipmentCritByHero?: ReadonlyMap<string, EquipmentCritBonus> | undefined
  /**
   * 外部 hero_dps per-carry 贡献（patron_perk + blessing 的 effect_def hero_dps，带 filter 限定）。
   * scoreFormation 内按 carry 属性匹配 qualifier；absolute-dps 下与装备 + ability hero_dps 同 key 加法
   * 合并进 unified hero 池（IC hero_dps_multiplier_mult 同英雄 base DPS，A1 同 key 全源加法）。
   * 由调用方经 collectHeroDpsContributions 解析后传入。
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
  /** hero_dps 加成池：装备 + 外部（patron/blessing）hero_dps_multiplier_mult 同 key 加法合并
   *  （IC 同 key effect 加法叠加，非各自独立乘）= equipmentAdjustment + externalAddPercent/100。
   *  作单一因子乘进 carryDps，使 breakdown 因子可相乘复现 carryDps。*/
  heroDpsPool: number
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
 * 按 placed 英雄求和装备 per-hero addPercent（global-scope 装备：装备者必须在阵型内才生效，排除 bench）。
 * 用于 global_dps（damage:global 池）与 gold（gold:global 池）的 placement-aware 注入。
 */
function sumPlacedEquipmentAddPercent(
  placements: Record<string, string>,
  equipmentByHero?: ReadonlyMap<string, number>,
): number {
  if (!equipmentByHero || equipmentByHero.size === 0) {
    return 0
  }
  let sum = 0
  for (const heroId of Object.values(placements)) {
    sum += equipmentByHero.get(heroId) ?? 0
  }
  return sum
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

  // 装备 gold（global-scope，placement-aware）并入 gold:global 池（只计阵型内英雄装备，排除 bench）。
  const equipmentGoldAddPercent = sumPlacedEquipmentAddPercent(input.placements, input.equipmentGoldByHero)
  if (equipmentGoldAddPercent !== 0) {
    mergePools(sharedPools, [{ dimension: 'gold', scope: 'global', addPercent: equipmentGoldAddPercent, multFactor: 1, poolMultiplier: 1 }])
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

/**
 * 按 dimension 拆 evaluatePlacementFit.scoreBreakdown：crit 全量进 critParts；
 * vuln 经 monsterTags 条件匹配进 vulnParts；damage/crit active + vuln(active 且匹配) 合并进 supportActiveParts。
 * 提取自 scoreFormation 内层 support 循环以降低嵌套（nested-control-flow）并复用分类逻辑。
 * activeKinds 按 active + matched 累积（mutate），跨 supportEntry 生效。
 */
function classifyScoreBreakdownParts(
  parts: readonly PlacementFitScorePart[],
  enemyTypeSet: Set<string>,
  activeKinds: Set<HeroAbilityKind>,
): { critParts: PlacementFitScorePart[]; vulnParts: PlacementFitScorePart[]; supportActiveParts: PlacementFitScorePart[] } {
  const critParts: PlacementFitScorePart[] = []
  const vulnParts: PlacementFitScorePart[] = []
  const supportActiveParts: PlacementFitScorePart[] = []
  for (const part of parts) {
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
  return { critParts, vulnParts, supportActiveParts }
}

/**
 * 把阵型内 ability 池与外部加成（globalBuff/equipment/externalHeroDps）合成 unified 池并求积。
 * - formation-buff 投影：只取 ability 聚合（排除外部加成，约束②）。
 * - absolute-dps 投影：IC 同 key 全源加法（A1）注入 ability 池副本得 unified 池，返回 unified 聚合 + breakdown 用副本。
 * 提取自 scoreFormation 以降嵌套（nested-control-flow）与复杂度；语义零改变（变量传递完全对称）。
 */
function aggregateExternalDamagePools(
  sharedPools: Map<string, AggregatedPool>,
  input: ScoringInput,
  carryHero: ResolvedHeroAbilityProfile,
  abilityDamageAggregate: number,
  aggregateProjection: AggregateProjection,
): { damageAggregate: number; breakdownPools: Map<string, AggregatedPool> } {
  if (aggregateProjection === 'formation-buff') {
    return { damageAggregate: abilityDamageAggregate, breakdownPools: sharedPools }
  }
  const externalPools: AggregatedPool[] = []
  const globalBuffMultiplier = input.globalBuffMultiplier ?? 1
  // 账号级 patron/blessing global_dps（不依赖 placed）+ 装备 global_dps（placement-aware，只计阵型内英雄）。
  const globalAddPercent = (globalBuffMultiplier - 1) * 100 + sumPlacedEquipmentAddPercent(input.placements, input.equipmentGlobalDpsByHero)
  if (globalAddPercent !== 0) {
    externalPools.push({ dimension: 'damage', scope: 'global', addPercent: globalAddPercent, multFactor: 1, poolMultiplier: 1 })
  }
  const equipmentAdjustment = input.equipmentAdjustmentByHero?.get(carryHero.heroId) ?? 1
  let externalHeroDpsAddPercent = 0
  for (const contribution of input.externalHeroDpsContributions ?? []) {
    if (matchesHeroQualifier(carryHero, contribution.qualifier)) {
      externalHeroDpsAddPercent += contribution.value
    }
  }
  const heroAddPercent = (equipmentAdjustment - 1) * 100 + externalHeroDpsAddPercent
  if (heroAddPercent !== 0) {
    externalPools.push({ dimension: 'damage', scope: 'hero', addPercent: heroAddPercent, multFactor: 1, poolMultiplier: 1 })
  }
  const unifiedPools = new Map<string, AggregatedPool>()
  for (const [key, pool] of sharedPools) {
    unifiedPools.set(key, { ...pool })
  }
  mergePools(unifiedPools, externalPools)
  return { damageAggregate: productOfPoolMultipliers(unifiedPools), breakdownPools: unifiedPools }
}

/** best carry 的拆解中间量（scoreFormation 主循环结束后据此构建 SimulationBreakdown）。 */
type BreakdownData = {
  carryEntry: PlacedEntry
  carryLevel: number
  pools: Map<string, AggregatedPool>
  critFactor: number
  vulnFactor: number
  contributions: SimulationContribution[]
}

/**
 * 迭代所有 support 位求 damage/crit/vuln 加成池（一次跑三维度避免重复匹配）。
 * 提取自 scoreCarryCandidate 内层循环以降函数行数；语义零改变。
 */
function collectSupportSignalsForCarry(
  carryEntry: PlacedEntry,
  placedEntries: readonly PlacedEntry[],
  input: ScoringInput,
  enemyTypeSet: Set<string>,
): {
  warnings: string[]
  activeKinds: Set<HeroAbilityKind>
  sharedPools: Map<string, AggregatedPool>
  critParts: PlacementFitScorePart[]
  vulnParts: PlacementFitScorePart[]
  contributions: SimulationContribution[]
} {
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
    const classified = classifyScoreBreakdownParts(fit.scoreBreakdown, enemyTypeSet, activeKinds)
    critParts.push(...classified.critParts)
    vulnParts.push(...classified.vulnParts)

    if (classified.supportActiveParts.length > 0) {
      contributions.push({
        supportHeroId: supportEntry.hero.heroId,
        supportSlotId: supportEntry.slotId,
        signals: classified.supportActiveParts,
      })
    }
  }

  return { warnings, activeKinds, sharedPools, critParts, vulnParts, contributions }
}

/**
 * 评估单个 carry 候选：collectSupportSignalsForCarry 收集三维度信号池 → 合成 unified damageAggregate
 * → carryDps。提取自 scoreFormation 以降复杂度；语义零改变。
 */
function scoreCarryCandidate(
  carryEntry: PlacedEntry,
  placedEntries: readonly PlacedEntry[],
  input: ScoringInput,
  aggregateProjection: AggregateProjection,
  enemyTypeSet: Set<string>,
): { carryDps: GameNumberValue; warnings: string[]; activeKinds: Set<HeroAbilityKind> } & BreakdownData {
  const carryLevel = input.heroLevels?.get(carryEntry.hero.heroId) ?? DEFAULT_CARRY_LEVEL
  const { warnings, activeKinds, sharedPools, critParts, vulnParts, contributions } = collectSupportSignalsForCarry(carryEntry, placedEntries, input, enemyTypeSet)

  const critFactor = computeCritFactor(critParts, carryEntry.hero.baseCritChancePercent, input.equipmentCritByHero?.get(carryEntry.hero.heroId))
  const vulnFactor = computeVulnerabilityFactor(vulnParts)
  const critVuln = critFactor * vulnFactor

  // 阵型内 ability 加成池聚合（formation-buff 投影的 objective 与 breakdown 都用它）。
  const abilityDamageAggregate = productOfPoolMultipliers(sharedPools)
  const { damageAggregate, breakdownPools } = aggregateExternalDamagePools(
    sharedPools,
    input,
    carryEntry.hero,
    abilityDamageAggregate,
    aggregateProjection,
  )

  // 投影模式（约束②）：formation-buff 只取阵型内 ability 聚合，不乘 baseDamage/levelCurve/外部加成。
  const carryDps = aggregateProjection === 'formation-buff'
    ? new Decimal(damageAggregate * critVuln)
    : computeCarryDps(carryEntry.hero, carryLevel, damageAggregate * critVuln)

  return {
    pools: breakdownPools,
    carryDps,
    warnings,
    activeKinds,
    carryEntry,
    carryLevel,
    critFactor,
    vulnFactor,
    contributions,
  }
}

/**
 * best carry 的 survival 池聚合 → effectiveHealth + BUD → 推图层数预估。
 * 提取自 scoreFormation 尾段以降复杂度；语义零改变（变量传递完全对称）。
 */
function computeAreaEstimateForBestCarry(
  bestCarryHeroId: string,
  bestCarryDps: GameNumberValue,
  placedEntries: readonly PlacedEntry[],
  input: ScoringInput,
): AreaEstimationResult | null {
  const bestCarryEntry = placedEntries.find((entry) => entry.hero.heroId === bestCarryHeroId)
  if (!bestCarryEntry) {
    return null
  }
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
  // 装备 health_mult（per-carry，hero-scoped）并入 carry 的 survival:hero 池（外部加成，同 ability survival 池加法）。
  const equipmentHealthMult = input.equipmentHealthByHero?.get(bestCarryHeroId) ?? 1
  const equipmentHealthAddPercent = (equipmentHealthMult - 1) * 100
  if (equipmentHealthAddPercent !== 0) {
    mergePools(survivalPools, [{ dimension: 'survival', scope: 'hero', addPercent: equipmentHealthAddPercent, multFactor: 1, poolMultiplier: 1 }])
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
  return estimateMaxArea({ bud, effectiveHealth })
}

/**
 * 从 best carry 的中间量构建 SimulationBreakdown（JSON 可序列化）：factors 从 pools 提取，
 * baseDps/levelCurve/carryDps 用游戏记数法字符串。提取自 scoreFormation 尾段；语义零改变。
 */
function buildSimulationBreakdown(data: BreakdownData, bestCarryDps: GameNumberValue): SimulationBreakdown {
  const { carryEntry, carryLevel, pools, critFactor, vulnFactor, contributions } = data
  const levelCurve = computeLevelCurve(carryEntry.hero, carryLevel)
  const baseDamage = carryEntry.hero.baseDamage > 0 ? carryEntry.hero.baseDamage : 1
  const baseDps = new Decimal(baseDamage).mul(levelCurve)
  // factors 从 pools 提取：damage:global/hero 池各外露为 globalBuff/heroDpsPool（unified = ability + 外部同 key 加法）；
  // damagePool 为残余（非 global/hero 的 damage 池，当前结构性 =1）。
  const globalBuff = pools.get('damage:global')?.poolMultiplier ?? 1
  const heroDpsPool = pools.get('damage:hero')?.poolMultiplier ?? 1
  let damagePool = 1
  for (const [key, pool] of pools) {
    if (key !== 'damage:global' && key !== 'damage:hero') damagePool *= pool.poolMultiplier
  }
  return {
    carryHeroId: carryEntry.hero.heroId,
    carrySlotId: carryEntry.slotId,
    baseDps: formatGameNumber(baseDps),
    levelCurve: formatGameNumber(levelCurve),
    carryDps: formatGameNumber(bestCarryDps),
    factors: {
      crit: critFactor,
      vulnerability: vulnFactor,
      damagePool,
      globalBuff,
      heroDpsPool,
    },
    pools: [...pools.values()],
    carryLevel,
    contributions,
  }
}

/**
 * 外层 carry 候选循环：迭代 placedEntries，对每个候选调 scoreCarryCandidate，
 * 返回 carryDps 最高的候选中间量。提取自 scoreFormation 以降主函数行数；语义零改变。
 */
function findBestCarry(
  placedEntries: readonly PlacedEntry[],
  input: ScoringInput,
  aggregateProjection: AggregateProjection,
  enemyTypeSet: Set<string>,
): {
  carryDps: GameNumberValue
  warnings: string[]
  carryHeroId: string | null
  activeKinds: Set<HeroAbilityKind>
  breakdownData: BreakdownData | null
} {
  let carryDps: GameNumberValue = ZERO
  let warnings: string[] = []
  let carryHeroId: string | null = null
  let activeKinds: Set<HeroAbilityKind> = new Set()
  let breakdownData: BreakdownData | null = null

  for (const carryEntry of placedEntries) {
    if (input.lockedCarryHeroId != null && input.lockedCarryHeroId !== '' && carryEntry.hero.heroId !== input.lockedCarryHeroId) {
      continue
    }
    const candidate = scoreCarryCandidate(carryEntry, placedEntries, input, aggregateProjection, enemyTypeSet)
    if (compareGameNumbers(candidate.carryDps, carryDps) > 0) {
      carryDps = candidate.carryDps
      warnings = [...new Set(candidate.warnings)]
      carryHeroId = carryEntry.hero.heroId
      activeKinds = candidate.activeKinds
      breakdownData = {
        pools: candidate.pools,
        carryEntry: candidate.carryEntry,
        carryLevel: candidate.carryLevel,
        critFactor: candidate.critFactor,
        vulnFactor: candidate.vulnFactor,
        contributions: candidate.contributions,
      }
    }
  }

  return { carryDps, warnings, carryHeroId, activeKinds, breakdownData }
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
  const enemyTypeSet = new Set(input.scenario.enemyTypes)
  const { carryDps: bestCarryDps, warnings: bestWarnings, carryHeroId: bestCarryHeroId, activeKinds: bestActiveKinds, breakdownData: bestBreakdownData } = findBestCarry(placedEntries, input, aggregateProjection, enemyTypeSet)

  // formation-buff 模式 bestCarryDps 是阵型聚合倍率（非真实 DPS），BUD/推图层数估算无意义，跳过。
  const areaEstimate = bestCarryHeroId != null && bestCarryHeroId !== '' && aggregateProjection === 'absolute-dps'
    ? computeAreaEstimateForBestCarry(bestCarryHeroId, bestCarryDps, placedEntries, input)
    : null

  const breakdown = bestBreakdownData != null ? buildSimulationBreakdown(bestBreakdownData, bestCarryDps) : null

  return {
    objectiveValue: bestCarryDps,
    warnings: bestWarnings,
    carryHeroId: bestCarryHeroId,
    activeSignalKinds: bestActiveKinds,
    areaEstimate,
    breakdown,
  }
}
