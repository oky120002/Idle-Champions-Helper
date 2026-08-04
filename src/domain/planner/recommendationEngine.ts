import Decimal from 'decimal.js'

import { compareGameNumbers, formatGameNumber, type GameNumberValue } from '../simulator/gameNumber'
import type { HeroDpsContribution } from '../buffs/externalHeroDpsMult'
import { applyFeatsToProfile, type FeatCatalog } from '../abilities/featSignals'
import { applySpecializationsToProfile, type SpecializationCatalog } from '../abilities/specializationSignals'
import { applyEquipmentBuffsToProfile } from '../abilities/equipmentBuffSignals'
import type { EquipmentBuff } from '../buffs/equipmentMult'
import type { FormationSlot, ScenarioRef, Variant } from '../types'
import type { OwnedHero, UserProfileSnapshot } from '../user-profile/types'
import type { HeroAbilityKind, ResolvedHeroAbilityProfile } from '../abilities/abilityModel'
import { beamSearch, type BeamSearchResult } from './beamSearchRanking'
import { buildCandidatePool, type CandidateMode } from './candidatePool'
import { checkFormationLegality, type LegalityViolation } from './formationLegality'
import { applyComputationMode, type ComputationMode } from './computationMode'
import { findPlannerScenarioForVariant, type ResolvedPlannerScenarioModel } from './plannerModel'
import { buildPlannerExplanations } from './plannerNarrative'
import {
  type PlannerCollections,
  type PlannerPlacementEntry,
  type PlannerRecommendation,
  type PlannerRecommendationBlocker,
  type PlannerResult,
} from './recommendationTypes'
import { scoreFormation, type AggregateProjection, type ScoringResult, type ScoringMode } from './steadyStateScoring'
import type { VariantRuleResult } from './variantConstraints'

const PLANNER_TOP_K = 3
/**
 * beam search 默认宽度（每轮保留的候选阵型数）。越大越精确越慢；越小越快越可能漏最优。
 * 实测（benchmark beamWidth 扫描）：width=8 安全；width=4 多数 variant 无损但偶发质量塌方；
 * width≤3 在候选多的 variant 上 objectiveValue 崩溃（log10 比 -4）。故默认保守留 8——
 * 真正可靠的加速走 computationMode 候选裁剪（少评分次数，非降搜索质量）。
 * 调用方可经 PlannerRecommendationOptions.beamWidth 覆盖（CLI/测试/调优）。
 */
const PLANNER_BEAM_WIDTH = 8
const SCORE_ZERO: GameNumberValue = new Decimal(0)

function sortSlots(scenario: ResolvedPlannerScenarioModel): string[] {
  return [...scenario.slotTopology]
    .sort((left, right) => left.row - right.row || left.column - right.column || left.slotId.localeCompare(right.slotId))
    .map((slot) => slot.slotId)
}

/** scenario.slotTopology → FormationSlot[]。 */
function toFormationSlots(scenario: ResolvedPlannerScenarioModel): FormationSlot[] {
  return scenario.slotTopology.map((slot) => ({
    id: slot.slotId,
    row: slot.row,
    column: slot.column,
  }))
}

function formatLegalityViolation(violation: LegalityViolation): string {
  switch (violation.kind) {
    case 'seatConflict':
      return `seat ${violation.seat} 冲突：${violation.heroes.join(', ')}`
    case 'missingForced':
      return `缺少强制英雄：${violation.heroIds.join(', ')}`
  }
}

function buildPlannerWarnings(scenario: ResolvedPlannerScenarioModel, snapshot: UserProfileSnapshot | null): string[] {
  return [...new Set([...(snapshot?.warnings ?? []), ...scenario.scenarioWarnings])]
}

function buildPlacementEntries(
  slots: string[],
  placements: Record<string, string>,
  heroById: Map<string, ResolvedHeroAbilityProfile>,
): PlannerPlacementEntry[] {
  return slots
    .flatMap((slotId) => {
      const heroId = placements[slotId]
      if (heroId === undefined) return []
      const hero = heroById.get(heroId)

      return [{
        heroId,
        slotId,
        heroName: hero?.name.display ?? heroId,
        seat: hero?.seat ?? null,
        slotLabel: slotId,
      }]
    })
}

export interface PlannerRecommendationOptions {
  scoringMode?: ScoringMode
  /**
   * 候选范围；默认 owned-only。
   * owned-only = 仅本地已拥有英雄；all-hypothetical = 所有英雄（未拥有走 hypotheticalBaseline 假设）。
   * hypothetical 候选的装备精确化由 equipmentAdjustmentByHero（13.4）负责。
   */
  candidateMode?: CandidateMode
  /**
   * 计算模式（性能 vs 精度）；默认 p50。
   * full = 全量候选；p90/p80/p70/p60/p50 = 每席位按复合收益取前对应比例（见 computationMode.ts）。
   * 收益由 build 期预算进 hero-abilities.json 的 gainProfile，运行时零重算。
   */
  computationMode?: ComputationMode
  /**
   * beam search 宽度（每轮保留候选阵型数）；默认 PLANNER_BEAM_WIDTH（8）。
   * 越大越精确越慢；UI 不暴露，供 CLI/测试/调优覆盖。
   */
  beamWidth?: number
  /** 强制指定核心输出位英雄（结果 carryHeroId 与之一致）。 */
  lockedCarryHeroId?: string | null
  /** 用户锁定槽位（slotId→heroId，预填且不被搜索替换）。 */
  lockedSlots?: Record<string, string>
  /**
   * 全局 buff pool 乘数。
   * 由调用方从 patron-perks + blessings 经 computeActual*GlobalBuff 解析后传入（combineGlobalBuffMultipliers 合成）；
   * 默认 1（无全局加成）。
   */
  globalBuffMultiplier?: number
  /**
   * 装备调整比：carryId → adjustment（ownedEquipMult / theoreticalLootMult）。
   * 由调用方从 `loot-catalog.json` + profileSnapshot.ownedHeroes[].lootBySlot 经 computeEquipmentAdjustmentByHero 算后传入；
   * 默认无（=1，保持 理论 loot 基线）。UI 接入（owned 装备读取）在
   */
  equipmentAdjustmentByHero?: Map<string, number>
  /** 装备 per-carry health multiplier（health_mult，hero-scoped 生命）；透传 scoreFormation survival 段。默认无（=1）。 */
  equipmentHealthByHero?: Map<string, number>
  /** 装备 global_dps per-hero addPercent（global-scope）；scoreFormation 按 placed 求和并入 damage:global。默认空。 */
  equipmentGlobalDpsByHero?: ReadonlyMap<string, number>
  /** 装备 gold per-hero addPercent（global-scope）；scoreTeamGold 按 placed 求和并入 gold:global。默认空。 */
  equipmentGoldByHero?: ReadonlyMap<string, number>
  /** 装备 per-carry crit mult（hero-scope buff_base_crit_*_mult，{chanceMult, damageMult}）；scoreFormation 经 critFactor 注入。默认空。 */
  equipmentCritByHero?: ReadonlyMap<string, { chanceMult: number; damageMult: number }>
  /**
   * 装备 buff_upgrade wrapper 元数据（per-hero，owned loot + loot-catalog + enchant 缩放）。
   * engine applyEquipmentBuffs 按 target upgradeId 反查 base signal 构造 wrapper 注入 profile（与 feat/专精
   * 同层 profile 改写，非 scoreFormation 加性数值通道）。默认空（无 buff_upgrade 装备或未导入存档）。
   */
  equipmentBuffsByHero?: ReadonlyMap<string, EquipmentBuff[]>
  /**
   * 外部 hero_dps per-carry 贡献（patron/blessing effect_def hero_dps，带 filter）。
   * 由调用方从 effect-definitions.json + active patron/blessing effect_def 经 collectHeroDpsContributions 算后传入；
   * scoreFormation 内按 carry 属性匹配，与 equipment 同 add pool 合并。默认空（无外部 hero_dps 加成）。
   */
  externalHeroDpsContributions?: readonly HeroDpsContribution[]
  /** 动态层数假设（dynamic-stack-multiply 机制，如蔚出言不逊）；透传 scoreFormation→evaluatePlacementFit。 */
  manualStackCount?: number
  /**
   * 投影模式（约束②）；默认 'absolute-dps'。透传 scoreFormation。
   * 'formation-buff' = 只阵型内聚合，不乘 baseDamage/levelCurve/外部加成（见 architecture.md「投影模式」）。
   */
  aggregateProjection?: AggregateProjection
}

/**
 * 统一入参（约束③：所有数据外部传入，见 architecture.md「入参契约」）。
 * engine 层全合并 variant + collections + profileSnapshot + placements + options 为单对象。
 */
export interface PlannerInput {
  variant: Variant | null
  collections: PlannerCollections
  profileSnapshot: UserProfileSnapshot | null
  /** 仅 evaluateFormation 用；buildPlannerRecommendation 搜索时不传。 */
  placements?: Record<string, string>
  options?: PlannerRecommendationOptions | undefined
}

/**
 * Runner per-call 入参（collections 走 updateCollections 缓存通道，不在此——worker 性能：
 * 避免每次 postMessage 重传全英雄+场景）。Runner 内部把它与缓存的 collections 合成 PlannerInput 调 engine。
 */
export interface PlannerEvaluateInput {
  variant: Variant | null
  profileSnapshot: UserProfileSnapshot | null
  placements: Record<string, string>
  options?: PlannerRecommendationOptions | undefined
}

export interface PlannerRecommendInput {
  variant: Variant | null
  profileSnapshot: UserProfileSnapshot | null
  options?: PlannerRecommendationOptions | undefined
}

/**
 * 解析 variant → scenario + blocker（搜索 buildPlannerRecommendation 与评估 evaluateFormation 共用）。
 * - 无 variant/英雄数据：scenarioRef=null、blocker=null（调用方按"无输入"处理）。
 * - owned-only 模式缺 profileSnapshot：blocker='missing-profile'（仅已拥有模式需要真实快照提供候选与等级）。
 * - all-hypothetical 模式缺 profileSnapshot：放行（未拥有英雄走 level 1 假设基线，DPS 模拟不依赖个人数据）。
 * - scenario/阵型缺失：blocker='missing-formation'。
 * - 否则 scenario 就绪、blocker=null。
 */
function resolvePlannerScenario(
  selectedVariant: Variant | null,
  collections: PlannerCollections,
  profileSnapshot: UserProfileSnapshot | null,
  candidateMode: CandidateMode,
): { scenario: ResolvedPlannerScenarioModel | null; scenarioRef: ScenarioRef | null; blocker: PlannerRecommendationBlocker | null } {
  if (!selectedVariant || collections.plannerHeroes.length === 0) {
    return { scenario: null, scenarioRef: null, blocker: null }
  }

  const scenarioRef: ScenarioRef = { kind: 'variant', id: selectedVariant.id }

  if (!profileSnapshot && candidateMode === 'owned-only') {
    return { scenario: null, blocker: 'missing-profile', scenarioRef }
  }

  const scenario = findPlannerScenarioForVariant(collections.plannerScenarios, selectedVariant)
  const hasFormation = scenario !== null
    && scenario.formationLayoutId !== null
    && scenario.formationLayoutId !== ''
    && scenario.slotTopology.length > 0
  if (!hasFormation) {
    return { scenario: null, blocker: 'missing-formation', scenarioRef }
  }

  return { scenario, scenarioRef, blocker: null }
}

/** 指定阵型评估结果：单条 PlannerResult + 棋盘上下文（与 PlannerRecommendation 同构但单结果）。 */
export interface FormationEvaluation {
  result: PlannerResult | null
  layoutId: string | null
  slots: FormationSlot[]
  scenarioRef: ScenarioRef | null
  blocker: PlannerRecommendationBlocker | null
}

/**
 * 评估用户指定的单一阵型（slotId→heroId），输出该阵型的完整模拟拆解（DPS/加成/站位）。
 * 与 buildPlannerRecommendation（beam search 找最佳）对应：本函数不搜索，直接对给定 placements 计算。
 * 用于 UI 调整英雄后重算当前阵型、CLI 指定阵型输出 JSON。合法性违规作为 warning 附加（仍出拆解）。
 */

// 应用玩家 active feat（OwnedHero.feats）到 profile：注入选中 feat 的全部 signal（按 bucket 追加），
// scoring 按模式自取所需维度——与专精同构（ADR 0017 不变量），不做 scoringMode 维度预过滤
// （否则 carry-dps 漏 crit 维度 feat）。featCatalog 缺省（未加载）或英雄无 active feat → 跳过/原样。
function applyActiveFeats(
  heroById: Map<string, ResolvedHeroAbilityProfile>,
  ownedHeroes: readonly OwnedHero[],
  featCatalog: FeatCatalog | undefined,
): void {
  if (!featCatalog) {
    return
  }
  const ownedById = new Map(ownedHeroes.map((owned) => [owned.heroId, owned]))
  for (const [heroId, profile] of heroById) {
    const owned = ownedById.get(heroId)
    if (!owned?.feats || owned.feats.length === 0) {
      continue
    }
    heroById.set(heroId, applyFeatsToProfile(profile, owned.feats, featCatalog[heroId]))
  }
}

// 应用玩家已选专精（OwnedHero.specializations）到 profile：注入选中 upgradeId 的全部 scoring signal
//（不做 scoringMode 维度过滤——专精是全局互斥选择，scoring 按模式自取所需维度；ADR 0017）。
// 与 feat 的差异：feat 按 scoringMode 取 damage/gold 维度；专精不过滤，否则漏 vulnerability 维度
//（如明斯克偏好敌人 enemyVulnerability）。catalog 缺省（未加载）或英雄无已选专精 → 跳过/原样。
function applyActiveSpecializations(
  heroById: Map<string, ResolvedHeroAbilityProfile>,
  ownedHeroes: readonly OwnedHero[],
  specializationCatalog: SpecializationCatalog | undefined,
): void {
  if (!specializationCatalog) {
    return
  }
  const ownedById = new Map(ownedHeroes.map((owned) => [owned.heroId, owned]))
  for (const [heroId, profile] of heroById) {
    const owned = ownedById.get(heroId)
    if (!owned?.specializations || owned.specializations.length === 0) {
      continue
    }
    heroById.set(heroId, applySpecializationsToProfile(profile, owned.specializations, specializationCatalog[heroId]))
  }
}

// 应用 owned 装备 buff_upgrade wrapper 到 profile：按 target upgradeId 反查 direct base signal 构造 wrapper
// 注入（与 feat/专精同层 profile 改写，appendHeroAbilitySignals 追加保留 base）。equipmentBuffsByHero 缺省
//（未加载/未导入存档）或英雄无 owned buff_upgrade 装备 → 跳过/原样。wrapper 通道独立于 5 个加性装备数值通道。
function applyEquipmentBuffs(
  heroById: Map<string, ResolvedHeroAbilityProfile>,
  equipmentBuffsByHero: ReadonlyMap<string, EquipmentBuff[]> | undefined,
): void {
  if (!equipmentBuffsByHero || equipmentBuffsByHero.size === 0) {
    return
  }
  for (const [heroId, profile] of heroById) {
    const buffs = equipmentBuffsByHero.get(heroId)
    if (!buffs || buffs.length === 0) {
      continue
    }
    heroById.set(heroId, applyEquipmentBuffsToProfile(profile, buffs))
  }
}

// 注入存档派生的上下文，供存档依赖谓词（GetUpgradeUnlocked/GetUpgradePurchased/GetFeatEquipped/
// EligibleForPatron）在 matchesHeroQualifier→evalHeroPredicate 求值。必须在 feat/专精/装备注入之后（追加
// ownedSaveContext 到已改写的 profile）。ownedLevels + ownedSpecializations + currentPatronId 是
// formation-global（所有 profile 共享同一 ref）——upgrade 谓词按 ownerHeroId 查、patron 全局。equippedFeatIds
// 是 per-hero（被评估英雄的 feats）。无存档（未导入）→ 空 map/集 + patronId null，谓词恒 false。
function attachOwnedSaveContext(
  heroById: Map<string, ResolvedHeroAbilityProfile>,
  ownedHeroes: readonly OwnedHero[],
  currentPatronId: number | null,
): void {
  const ownedById = new Map(ownedHeroes.map((owned) => [owned.heroId, owned]))
  const ownedLevels = new Map(ownedHeroes.map((owned) => [owned.heroId, owned.level]))
  const ownedSpecializations = new Map(
    ownedHeroes.map((owned) => [owned.heroId, new Set(owned.specializations.map(String))]),
  )
  for (const [heroId, profile] of heroById) {
    const owned = ownedById.get(heroId)
    const equippedFeatIds = new Set((owned?.feats ?? []).map(String))
    heroById.set(heroId, {
      ...profile,
      ownedSaveContext: { ownedLevels, ownedSpecializations, equippedFeatIds, currentPatronId },
    })
  }
}

/**
 * evaluate/recommend 两入口共用 scoreFormation 调用：placements + 评分上下文 + options 对称透传。
 * 抽成单一来源，结构性锁定两入口透传一致——否则新增透传字段（如 aggregateProjection）漏改一处，
 * evaluate 与 recommend 会对同一阵型算出不同 DPS 且无诊断。
 */
function scorePlannerFormation(
  placements: Record<string, string>,
  heroesById: Map<string, ResolvedHeroAbilityProfile>,
  scenario: ResolvedPlannerScenarioModel,
  heroLevels: Map<string, number>,
  scoringMode: ScoringMode,
  options: PlannerRecommendationOptions,
) {
  return scoreFormation({
    placements,
    heroesById,
    scenario,
    heroLevels,
    scoringMode,
    lockedCarryHeroId: options.lockedCarryHeroId ?? undefined,
    // globalBuff/equipment 对称透传 options；默认值兜底统一在 steadyStateScoring（?? 1）。
    globalBuffMultiplier: options.globalBuffMultiplier,
    equipmentAdjustmentByHero: options.equipmentAdjustmentByHero,
    equipmentHealthByHero: options.equipmentHealthByHero,
    equipmentGlobalDpsByHero: options.equipmentGlobalDpsByHero,
    equipmentGoldByHero: options.equipmentGoldByHero,
    equipmentCritByHero: options.equipmentCritByHero,
    externalHeroDpsContributions: options.externalHeroDpsContributions,
    manualStackCount: options.manualStackCount,
    aggregateProjection: options.aggregateProjection,
  })
}

/** distinct-carry Top-K selection from beam search results. */
function selectTopResults(
  results: readonly BeamSearchResult[],
): BeamSearchResult[] {
  const legal = results.filter((result) => compareGameNumbers(result.objectiveValue, SCORE_ZERO) > 0)
  const bestByCarry = new Map<string, BeamSearchResult>()
  for (const result of legal) {
    const key = result.carryHeroId ?? '__none__'
    const existing = bestByCarry.get(key)
    if (existing === undefined || compareGameNumbers(result.objectiveValue, existing.objectiveValue) > 0) {
      bestByCarry.set(key, result)
    }
  }
  return [...bestByCarry.values()]
    .sort((left, right) => compareGameNumbers(right.objectiveValue, left.objectiveValue))
    .slice(0, PLANNER_TOP_K)
}

/** Build final PlannerResult[] from top beam-search results, merging locked placements. */
function buildTopPlannerResults(
  topResults: readonly BeamSearchResult[],
  slots: readonly string[],
  userLockedSlots: Record<string, string>,
  scenario: ResolvedPlannerScenarioModel,
  heroById: Map<string, ResolvedHeroAbilityProfile>,
  scoringMode: ScoringMode,
  scenarioWarnings: readonly string[],
): PlannerResult[] {
  const slotOrder = new Map(sortSlots(scenario).map((slotId, index) => [slotId, index]))
  const lockedPlacementEntries = Object.entries(userLockedSlots).map(([slotId, heroId]) => {
    const hero = heroById.get(heroId)
    return {
      heroId,
      slotId,
      heroName: hero?.name.display ?? heroId,
      seat: hero?.seat ?? null,
      slotLabel: slotId,
    }
  })
  return topResults.map((top) => {
    const placementEntries = [...buildPlacementEntries([...slots], top.placements, heroById), ...lockedPlacementEntries]
      .sort((left, right) => (slotOrder.get(left.slotId) ?? Infinity) - (slotOrder.get(right.slotId) ?? Infinity))
    return {
      placements: top.placements,
      objectiveValue: formatGameNumber(top.objectiveValue),
      carryHeroId: top.carryHeroId,
      explanations: buildPlannerExplanations(
        scenario,
        placementEntries,
        heroById,
        top.carryHeroId,
        top.objectiveValue,
        top.activeSignalKinds,
        scoringMode,
      ),
      warnings: [...new Set([...top.warnings, ...scenarioWarnings])],
      areaEstimate: top.areaEstimate ?? null,
      breakdown: top.breakdown,
      placementEntries,
    }
  })
}

/** Build variant rules from scenario forced heroes and warnings. */
function buildVariantRules(scenario: ResolvedPlannerScenarioModel): VariantRuleResult {
  return {
    constraints: [
      ...(scenario.forcedHeroes.length > 0 ? [{ kind: 'forceInclude' as const, heroIds: scenario.forcedHeroes }] : []),
    ],
    warnings: scenario.scenarioWarnings,
  }
}

/** Compute candidate heroes and available slots; returns null if insufficient heroes. */
function prepareCandidatesAndSlots(
  scenario: ResolvedPlannerScenarioModel,
  collections: PlannerCollections,
  profileSnapshot: UserProfileSnapshot | null,
  candidateMode: CandidateMode,
  computationMode: ComputationMode,
  scoringMode: ScoringMode,
  options: PlannerRecommendationOptions,
): {
  heroes: ResolvedHeroAbilityProfile[]
  slots: string[]
  userLockedSlots: Record<string, string>
  forcedHeroSet: Set<string>
  ownedHeroes: readonly OwnedHero[]
} | null {
  const ownedHeroes = profileSnapshot?.ownedHeroes ?? []
  const userLockedSlots = options.lockedSlots ?? {}
  const userLockedSlotSet = new Set(Object.keys(userLockedSlots))
  const forcedHeroSet = new Set([
    ...scenario.forcedHeroes,
    ...(options.lockedCarryHeroId !== undefined && options.lockedCarryHeroId !== null ? [options.lockedCarryHeroId] : []),
    ...Object.values(userLockedSlots),
  ])

  const availableCapacity = Math.max(
    0, scenario.slotTopology.length - scenario.occupiedSlotCount - userLockedSlotSet.size,
  )
  const slots = sortSlots(scenario)
    .filter((slotId) => !userLockedSlotSet.has(slotId))
    .slice(0, availableCapacity)

  const candidateIds = new Set(
    buildCandidatePool({
      mode: candidateMode,
      allChampionIds: collections.plannerHeroes.map((hero) => hero.heroId),
      ownedHeroes,
    }),
  )
  let heroes = filterCandidateHeroes(collections.plannerHeroes, scenario, candidateIds, forcedHeroSet)
    .sort((left, right) => left.seat - right.seat || left.heroId.localeCompare(right.heroId))

  if (heroes.length < slots.length) return null

  heroes = applyComputationMode(heroes, computationMode, scoringMode, forcedHeroSet)
  return { heroes, slots, userLockedSlots, forcedHeroSet, ownedHeroes }
}

/** Execute beam search with legality checking and scoring. */
function runBeamSearch(
  heroes: readonly ResolvedHeroAbilityProfile[],
  slots: string[],
  scenario: ResolvedPlannerScenarioModel,
  heroById: Map<string, ResolvedHeroAbilityProfile>,
  heroSeats: Record<string, number>,
  heroLevels: Map<string, number>,
  scoringMode: ScoringMode,
  options: PlannerRecommendationOptions,
  userLockedSlots: Record<string, string>,
): BeamSearchResult[] {
  return beamSearch({
    slots,
    heroes: heroes.map((hero) => ({ heroId: hero.heroId, seat: hero.seat })),
    beamWidth: options.beamWidth ?? PLANNER_BEAM_WIDTH,
    lockedPlacements: userLockedSlots,
    scoreFormation: (placements) => {
      const legality = checkFormationLegality({
        placements,
        heroSeats,
        variantRules: buildVariantRules(scenario),
      })

      if (!legality.legal) {
        return {
          objectiveValue: SCORE_ZERO,
          warnings: legality.violations.map(formatLegalityViolation),
          carryHeroId: null,
          activeSignalKinds: new Set<HeroAbilityKind>(),
          breakdown: null,
        }
      }

      return scorePlannerFormation(placements, heroById, scenario, heroLevels, scoringMode, options)
    },
  })
}

/** Enrich hero profiles: create heroById/heroSeats/heroLevels + apply feats/specs/equipment/save context. */
function enrichHeroProfiles(
  heroes: readonly ResolvedHeroAbilityProfile[],
  ownedHeroes: readonly OwnedHero[],
  collections: PlannerCollections,
  options: PlannerRecommendationOptions,
  patronId: number | null,
): {
  heroById: Map<string, ResolvedHeroAbilityProfile>
  heroSeats: Record<string, number>
  heroLevels: Map<string, number>
} {
  const heroById = new Map(heroes.map((hero) => [hero.heroId, hero]))
  const heroSeats = Object.fromEntries(heroes.map((hero) => [hero.heroId, hero.seat]))
  applyActiveFeats(heroById, ownedHeroes, collections.featCatalog)
  applyActiveSpecializations(heroById, ownedHeroes, collections.specializationCatalog)
  applyEquipmentBuffs(heroById, options.equipmentBuffsByHero)
  attachOwnedSaveContext(heroById, ownedHeroes, patronId)
  const heroLevels = new Map(ownedHeroes.map((owned) => [owned.heroId, owned.level]))
  return { heroById, heroSeats, heroLevels }
}

/** Filter candidate heroes by ownership, whitelist, and force-include rules. */
function filterCandidateHeroes(
  allHeroes: readonly ResolvedHeroAbilityProfile[],
  scenario: ResolvedPlannerScenarioModel,
  candidateIds: Set<string>,
  forcedHeroSet: Set<string>,
): ResolvedHeroAbilityProfile[] {
  const allowedHeroSet = new Set(scenario.allowedHeroes)
  const allowedTagSet = new Set(scenario.allowedTags)
  const hasAllowedRestriction = allowedHeroSet.size > 0 || allowedTagSet.size > 0
  return allHeroes.filter((hero) => {
    if (forcedHeroSet.has(hero.heroId)) return true
    if (!candidateIds.has(hero.heroId)) return false
    return !hasAllowedRestriction
      || allowedHeroSet.has(hero.heroId)
      || hero.tags.some((tag) => allowedTagSet.has(tag))
  })
}

/** evaluateFormation 的候选/白名单限制 warning：非候选英雄或不在白名单 → warning。 */
function buildRestrictionWarnings(
  placements: Record<string, string>,
  scenario: ResolvedPlannerScenarioModel,
  candidateIds: Set<string>,
  heroById: Map<string, ResolvedHeroAbilityProfile>,
): string[] {
  const forcedHeroSet = new Set(scenario.forcedHeroes)
  const allowedHeroSet = new Set(scenario.allowedHeroes)
  const allowedTagSet = new Set(scenario.allowedTags)
  const hasAllowedRestriction = allowedHeroSet.size > 0 || allowedTagSet.size > 0
  const warnings: string[] = []
  for (const heroId of Object.values(placements)) {
    if (forcedHeroSet.has(heroId)) continue
    if (!candidateIds.has(heroId)) {
      warnings.push(`${heroId} 不在账号快照中，按 level 1 估算`)
    }
    if (hasAllowedRestriction) {
      const hero = heroById.get(heroId)
      const allowed = allowedHeroSet.has(heroId)
        || (hero?.tags.some((tag) => allowedTagSet.has(tag)) ?? false)
      if (!allowed) {
        warnings.push(`${heroId} 不在当前变体的允许名单（only_allow_crusaders）内`)
      }
    }
  }
  return warnings
}

/** Build a PlannerResult from scoring output. */
function buildPlannerResult(
  placements: Record<string, string>,
  placementEntries: PlannerPlacementEntry[],
  scoring: ScoringResult,
  scenario: ResolvedPlannerScenarioModel,
  heroById: Map<string, ResolvedHeroAbilityProfile>,
  scoringMode: ScoringMode,
  extraWarnings: string[],
): PlannerResult {
  return {
    placements,
    placementEntries,
    objectiveValue: formatGameNumber(scoring.objectiveValue),
    carryHeroId: scoring.carryHeroId,
    explanations: buildPlannerExplanations(
      scenario,
      placementEntries,
      heroById,
      scoring.carryHeroId,
      scoring.objectiveValue,
      scoring.activeSignalKinds,
      scoringMode,
    ),
    warnings: [...new Set([...scoring.warnings, ...extraWarnings, ...scenario.scenarioWarnings])],
    areaEstimate: scoring.areaEstimate ?? null,
    breakdown: scoring.breakdown,
  }
}

export function evaluateFormation({
  variant: selectedVariant,
  collections,
  profileSnapshot,
  placements = {},
  options = {},
}: PlannerInput): FormationEvaluation {
  const scoringMode = options.scoringMode ?? 'carry-dps'
  const candidateMode = options.candidateMode ?? 'owned-only'
  const { scenario, scenarioRef, blocker } = resolvePlannerScenario(selectedVariant, collections, profileSnapshot, candidateMode)

  // owned-only 模式下 resolvePlannerScenario 保证 profileSnapshot 非空；all-hypothetical 模式 profileSnapshot 可为 null。
  if (!scenario || !scenarioRef || blocker) {
    return { result: null, layoutId: null, slots: [], scenarioRef: scenarioRef ?? null, blocker }
  }

  // evaluateFormation 不做候选过滤——用户已显式指定阵型，heroById 用全量英雄保证放置的英雄都能解析。
  const ownedHeroes = profileSnapshot?.ownedHeroes ?? []
  const { heroById, heroSeats, heroLevels } = enrichHeroProfiles(
    collections.plannerHeroes, ownedHeroes, collections, options,
    profileSnapshot?.activeContext?.patronId ?? null,
  )
  const candidateIds = new Set(
    buildCandidatePool({
      mode: candidateMode,
      allChampionIds: collections.plannerHeroes.map((hero) => hero.heroId),
      ownedHeroes,
    }),
  )

  const legality = checkFormationLegality({
    placements,
    heroSeats,
    variantRules: buildVariantRules(scenario),
  })
  const legalityWarnings = legality.legal ? [] : legality.violations.map(formatLegalityViolation)

  const restrictionWarnings = buildRestrictionWarnings(placements, scenario, candidateIds, heroById)

  const scoring = scorePlannerFormation(placements, heroById, scenario, heroLevels, scoringMode, options)

  const placementEntries = buildPlacementEntries(sortSlots(scenario), placements, heroById)
  const result = buildPlannerResult(
    placements, placementEntries, scoring, scenario, heroById, scoringMode,
    [...legalityWarnings, ...restrictionWarnings],
  )

  return {
    result,
    scenarioRef,
    layoutId: scenario.formationLayoutId,
    slots: toFormationSlots(scenario),
    blocker: null,
  }
}

export function buildPlannerRecommendation({
  variant: selectedVariant,
  collections,
  profileSnapshot,
  options = {},
}: PlannerInput): PlannerRecommendation {
  const scoringMode = options.scoringMode ?? 'carry-dps'
  const candidateMode = options.candidateMode ?? 'owned-only'
  const computationMode = options.computationMode ?? 'p50'
  const { scenario, scenarioRef, blocker } = resolvePlannerScenario(selectedVariant, collections, profileSnapshot, candidateMode)

  // owned-only 模式下 resolvePlannerScenario 保证 profileSnapshot 非空；all-hypothetical 模式 profileSnapshot 可为 null。
  if (!scenario || !scenarioRef || blocker) {
    return { result: null, results: [], layoutId: null, slots: [], scenarioRef: scenarioRef ?? null, blocker }
  }

  const prepared = prepareCandidatesAndSlots(scenario, collections, profileSnapshot, candidateMode, computationMode, scoringMode, options)
  if (prepared === null) {
    return {
      scenarioRef,
      result: null,
      results: [],
      layoutId: scenario.formationLayoutId,
      slots: toFormationSlots(scenario),
      blocker: 'insufficient-owned-heroes',
    }
  }

  const { heroes, slots, userLockedSlots, ownedHeroes } = prepared

  const { heroById, heroSeats, heroLevels } = enrichHeroProfiles(
    heroes, ownedHeroes, collections, options,
    profileSnapshot?.activeContext?.patronId ?? null,
  )

  const results = runBeamSearch(
    heroes, slots, scenario, heroById, heroSeats, heroLevels, scoringMode, options, userLockedSlots,
  )

  // distinct-carry Top K。beamSearch 已按 carryDps 降序；先过滤非法（score≤0），
  // 再按 carryHeroId 去重（每个 carry 取最高分阵型），取前 PLANNER_TOP_K 作为多阵型输出。
  const topResults = selectTopResults(results)

  if (topResults.length === 0) {
    return {
      scenarioRef,
      result: null,
      results: [],
      layoutId: scenario.formationLayoutId,
      slots: toFormationSlots(scenario),
      blocker: 'no-legal-recommendation',
    }
  }

  return buildRecommendationResult(topResults, slots, userLockedSlots, scenario, heroById, scoringMode, profileSnapshot, scenarioRef)
}

/** Assemble final PlannerRecommendation from top beam-search results. */
function buildRecommendationResult(
  topResults: readonly BeamSearchResult[],
  slots: readonly string[],
  userLockedSlots: Record<string, string>,
  scenario: ResolvedPlannerScenarioModel,
  heroById: Map<string, ResolvedHeroAbilityProfile>,
  scoringMode: ScoringMode,
  profileSnapshot: UserProfileSnapshot | null,
  scenarioRef: ScenarioRef,
): PlannerRecommendation {
  const scenarioWarnings = buildPlannerWarnings(scenario, profileSnapshot)
  const plannerResults = buildTopPlannerResults(
    topResults, slots, userLockedSlots, scenario, heroById, scoringMode, scenarioWarnings,
  )
  return {
    results: plannerResults,
    result: plannerResults[0] ?? null,
    layoutId: scenario.formationLayoutId,
    slots: toFormationSlots(scenario),
    blocker: null,
    scenarioRef,
  }
}
