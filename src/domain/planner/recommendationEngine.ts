import Decimal from 'decimal.js'

import { compareGameNumbers, formatGameNumber, type GameNumberValue } from '../simulator/gameNumber'
import type { HeroDpsContribution } from '../buffs/externalHeroDpsMult'
import { applyFeatsToProfile, type FeatCatalog } from '../abilities/featSignals'
import { applySpecializationsToProfile, type SpecializationCatalog } from '../abilities/specializationSignals'
import type { FormationSlot, ScenarioRef, Variant } from '../types'
import type { OwnedHero, UserProfileSnapshot } from '../user-profile/types'
import { beamSearch } from './beamSearchRanking'
import { buildCandidatePool, type CandidateMode } from './candidatePool'
import { checkFormationLegality, type LegalityViolation } from './formationLegality'
import { applyComputationMode, type ComputationMode } from './computationMode'
import { findPlannerScenarioForVariant, type ResolvedPlannerScenarioModel } from './plannerModel'
import { buildPlannerExplanations } from './plannerNarrative'
import type { HeroAbilityKind, ResolvedHeroAbilityProfile } from '../abilities/abilityModel'
import {
  type PlannerCollections,
  type PlannerPlacementEntry,
  type PlannerRecommendation,
  type PlannerRecommendationBlocker,
  type PlannerResult,
} from './recommendationTypes'
import { scoreFormation, type AggregateProjection, type ScoringMode } from './steadyStateScoring'
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
    case 'lockedSlot':
      return `槽位 ${violation.slotId} 已锁定`
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
    .filter((slotId) => placements[slotId] !== undefined)
    .map((slotId) => {
      const heroId = placements[slotId]!
      const hero = heroById.get(heroId)

      return {
        slotId,
        slotLabel: slotId,
        heroId,
        heroName: hero?.name.display ?? heroId,
        seat: hero?.seat ?? null,
      }
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
   * 由调用方按玩家选择 patron 从 `global-buffs.json` 经 computeGlobalBuffMultiplier 解析后传入；
   * 默认 1（无全局加成）。patron 选择由 UI 接入。
   */
  globalBuffMultiplier?: number
  /**
   * 装备调整比：carryId → adjustment（ownedEquipMult / theoreticalLootMult）。
   * 由调用方从 `loot-catalog.json` + profileSnapshot.ownedHeroes[].lootBySlot 经 computeEquipmentAdjustmentByHero 算后传入；
   * 默认无（=1，保持 理论 loot 基线）。UI 接入（owned 装备读取）在
   */
  equipmentAdjustmentByHero?: Map<string, number>
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
    return { scenario: null, scenarioRef, blocker: 'missing-profile' }
  }

  const scenario = findPlannerScenarioForVariant(collections.plannerScenarios, selectedVariant)
  if (!scenario || !scenario.formationLayoutId || scenario.slotTopology.length === 0) {
    return { scenario: null, scenarioRef, blocker: 'missing-formation' }
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
    if (!owned || !owned.feats || owned.feats.length === 0) {
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
    if (!owned || !owned.specializations || owned.specializations.length === 0) {
      continue
    }
    heroById.set(heroId, applySpecializationsToProfile(profile, owned.specializations, specializationCatalog[heroId]))
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
  const heroById = new Map(collections.plannerHeroes.map((hero) => [hero.heroId, hero]))
  const heroSeats = Object.fromEntries(collections.plannerHeroes.map((hero) => [hero.heroId, hero.seat]))
  const ownedHeroes = profileSnapshot?.ownedHeroes ?? []
  applyActiveFeats(heroById, ownedHeroes, collections.featCatalog)
  applyActiveSpecializations(heroById, ownedHeroes, collections.specializationCatalog)
  const candidateIds = new Set(
    buildCandidatePool({
      mode: candidateMode,
      ownedHeroes,
      allChampionIds: collections.plannerHeroes.map((hero) => hero.heroId),
    }),
  )
  // heroLevels 覆盖所有已拥有英雄；放置但未拥有的英雄由下方 restrictionWarnings 标记（按 level 1 估算）。
  // 原 .filter(owned => candidateIds.has) 是死代码——owned-only 与 all-hypothetical 两模式下 candidateIds
  // 均包含全部 ownedHeroIds，filter 永不剔项。
  const heroLevels = new Map(ownedHeroes.map((owned) => [owned.heroId, owned.level]))

  const variantRules: VariantRuleResult = {
    constraints: [
      ...(scenario.forcedHeroes.length > 0 ? [{ kind: 'forceInclude' as const, heroIds: scenario.forcedHeroes }] : []),
    ],
    warnings: scenario.scenarioWarnings,
  }
  const legality = checkFormationLegality({
    placements,
    heroSeats,
    variantRules,
    lockedSlots: scenario.lockedSlots,
  })
  const legalityWarnings = legality.legal ? [] : legality.violations.map(formatLegalityViolation)

  // evaluateFormation 不做候选过滤（用户显式指定阵型），但须把 build 候选阶段的限制语义以 warning 体现，
  // 否则两入口语义不对称：build 过滤掉非白名单/未拥有英雄，evaluate 却静默接受并按 level 1 估算。
  // 强制英雄（forcedHeroes）豁免——其未拥有/不在白名单是 force_use_heroes 的设计预期。
  const forcedHeroSet = new Set(scenario.forcedHeroes)
  const allowedHeroSet = new Set(scenario.allowedHeroes)
  const allowedTagSet = new Set(scenario.allowedTags)
  const hasAllowedRestriction = allowedHeroSet.size > 0 || allowedTagSet.size > 0
  const restrictionWarnings: string[] = []
  for (const heroId of Object.values(placements)) {
    if (forcedHeroSet.has(heroId)) {
      continue
    }
    if (!candidateIds.has(heroId)) {
      restrictionWarnings.push(`${heroId} 不在账号快照中，按 level 1 估算`)
    }
    if (hasAllowedRestriction) {
      const hero = heroById.get(heroId)
      const allowed = allowedHeroSet.has(heroId)
        || (hero?.tags.some((tag) => allowedTagSet.has(tag)) ?? false)
      if (!allowed) {
        restrictionWarnings.push(`${heroId} 不在当前变体的允许名单（only_allow_crusaders）内`)
      }
    }
  }

  const scoring = scoreFormation({
    placements,
    heroesById: heroById,
    scenario,
    heroLevels,
    scoringMode,
    lockedCarryHeroId: options.lockedCarryHeroId ?? undefined,
    // globalBuff/equipment 对称透传 options；默认值兜底统一在 steadyStateScoring（?? 1）。
    globalBuffMultiplier: options.globalBuffMultiplier,
    equipmentAdjustmentByHero: options.equipmentAdjustmentByHero,
    externalHeroDpsContributions: options.externalHeroDpsContributions,
    manualStackCount: options.manualStackCount,
    aggregateProjection: options.aggregateProjection,
  })

  const placementEntries = buildPlacementEntries(sortSlots(scenario), placements, heroById)
  const result: PlannerResult = {
    objectiveValue: formatGameNumber(scoring.objectiveValue),
    carryHeroId: scoring.carryHeroId,
    placements,
    placementEntries,
    explanations: buildPlannerExplanations(
      scenario,
      placementEntries,
      heroById,
      scoring.carryHeroId,
      scoring.objectiveValue,
      scoring.activeSignalKinds,
      scoringMode,
    ),
    warnings: [...new Set([...scoring.warnings, ...legalityWarnings, ...restrictionWarnings, ...scenario.scenarioWarnings])],
    areaEstimate: scoring.areaEstimate ?? null,
    breakdown: scoring.breakdown,
  }

  return {
    result,
    layoutId: scenario.formationLayoutId,
    slots: toFormationSlots(scenario),
    scenarioRef,
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

  const ownedHeroes = profileSnapshot?.ownedHeroes ?? []
  const candidateIds = new Set(
    buildCandidatePool({
      mode: candidateMode,
      ownedHeroes,
      allChampionIds: collections.plannerHeroes.map((hero) => hero.heroId),
    }),
  )
  // only_allow_crusaders 白名单（by_ids OR by_tags）；强制英雄即使未拥有也纳入候选。
  const allowedHeroSet = new Set(scenario.allowedHeroes)
  const allowedTagSet = new Set(scenario.allowedTags)
  const hasAllowedRestriction = allowedHeroSet.size > 0 || allowedTagSet.size > 0
  const userLockedSlots = options.lockedSlots ?? {}
  const userLockedSlotSet = new Set(Object.keys(userLockedSlots))
  const forcedHeroSet = new Set([
    ...scenario.forcedHeroes,
    ...(options.lockedCarryHeroId ? [options.lockedCarryHeroId] : []),
    ...Object.values(userLockedSlots),
  ])
  let heroes = collections.plannerHeroes
    .filter((hero) => {
      const isForceIncluded = forcedHeroSet.has(hero.heroId)
      if (isForceIncluded) {
        return true
      }
      if (!candidateIds.has(hero.heroId)) {
        return false
      }
      return !hasAllowedRestriction
        || allowedHeroSet.has(hero.heroId)
        || hero.tags.some((tag) => allowedTagSet.has(tag))
    })
    .sort((left, right) => left.seat - right.seat || left.heroId.localeCompare(right.heroId))

  const lockedSlotSet = new Set(scenario.lockedSlots)
  // 可用容量扣减被占格 = slotTopology.length − max(occupiedSlotCount, lockedSlots.length)。
  // lockedSlots（mechanics slot_escort 等锁的具体槽位）与 occupiedSlotCount（restrictions
  // 解析的被占格数）描述同一批被占格子，取 max 作更完整估计：restrictions 可能漏解析
  // （occupiedSlotCount=0 但 mechanics 锁了）；反之 restrictions 给完整数而 mechanics 只锁 1 格。
  // 被占格具体位置不可知（诅咒「每 15 秒换格」等动态场景），无法精确过滤 slotId，
  // 取 sortSlots 前 availableCapacity 个近似——英雄数量正确，避免多填被占格高估 carryDps。
  const availableCapacity = Math.max(
    0,
    scenario.slotTopology.length - Math.max(scenario.occupiedSlotCount, scenario.lockedSlots.length) - userLockedSlotSet.size,
  )
  const slots = sortSlots(scenario)
    .filter((slotId) => !lockedSlotSet.has(slotId) && !userLockedSlotSet.has(slotId))
    .slice(0, availableCapacity)
  if (heroes.length < slots.length) {
    return {
      result: null,
      results: [],
      layoutId: scenario.formationLayoutId,
      slots: toFormationSlots(scenario),
      scenarioRef,
      blocker: 'insufficient-owned-heroes',
    }
  }

  // 计算模式裁剪候选（默认 p50）：按席位复合收益取前比例，减少 beam search 评分次数。
  // 在 insufficient 检查之后，确保裁剪不干扰「英雄够不够组队」判断；forced 英雄无条件保留。
  heroes = applyComputationMode(heroes, computationMode, scoringMode, forcedHeroSet)

  const heroById = new Map(heroes.map((hero) => [hero.heroId, hero]))
  const heroSeats = Object.fromEntries(heroes.map((hero) => [hero.heroId, hero.seat]))
  applyActiveFeats(heroById, ownedHeroes, collections.featCatalog)
  applyActiveSpecializations(heroById, ownedHeroes, collections.specializationCatalog)
  // heroLevels 覆盖所有已拥有英雄（candidateIds 在两模式下均含全部 ownedHeroIds，原 .filter 是死代码）。
  const heroLevels = new Map(ownedHeroes.map((owned) => [owned.heroId, owned.level]))
  const scenarioVariantRules: VariantRuleResult = {
    constraints: [
      ...(scenario.forcedHeroes.length > 0 ? [{ kind: 'forceInclude' as const, heroIds: scenario.forcedHeroes }] : []),
    ],
    warnings: scenario.scenarioWarnings,
  }

  const results = beamSearch({
    heroes: heroes.map((hero) => ({ heroId: hero.heroId, seat: hero.seat })),
    slots,
    beamWidth: options.beamWidth ?? PLANNER_BEAM_WIDTH,
    lockedPlacements: userLockedSlots,
    scoreFormation: (placements) => {
      const legality = checkFormationLegality({
        placements,
        heroSeats,
        variantRules: scenarioVariantRules,
        lockedSlots: scenario.lockedSlots,
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

      return scoreFormation({
        placements,
        heroesById: heroById,
        scenario,
        heroLevels,
        scoringMode,
        lockedCarryHeroId: options.lockedCarryHeroId ?? undefined,
        // globalBuff/equipment 对称透传 options；默认值兜底统一在 steadyStateScoring（?? 1）。
        globalBuffMultiplier: options.globalBuffMultiplier,
        equipmentAdjustmentByHero: options.equipmentAdjustmentByHero,
        externalHeroDpsContributions: options.externalHeroDpsContributions,
        manualStackCount: options.manualStackCount,
        aggregateProjection: options.aggregateProjection,
      })
    },
  })

  // distinct-carry Top K。beamSearch 已按 carryDps 降序；先过滤非法（score≤0），
  // 再按 carryHeroId 去重（每个 carry 取最高分阵型），取前 PLANNER_TOP_K 作为多阵型输出。
  const legal = results.filter((result) => compareGameNumbers(result.objectiveValue, SCORE_ZERO) > 0)
  const bestByCarry = new Map<string, (typeof legal)[number]>()
  for (const result of legal) {
    const key = result.carryHeroId ?? '__none__'
    const existing = bestByCarry.get(key)
    if (!existing || compareGameNumbers(result.objectiveValue, existing.objectiveValue) > 0) {
      bestByCarry.set(key, result)
    }
  }
  const topResults = [...bestByCarry.values()]
    .sort((left, right) => compareGameNumbers(right.objectiveValue, left.objectiveValue))
    .slice(0, PLANNER_TOP_K)

  if (topResults.length === 0) {
    return {
      result: null,
      results: [],
      layoutId: scenario.formationLayoutId,
      slots: toFormationSlots(scenario),
      scenarioRef,
      blocker: 'no-legal-recommendation',
    }
  }

  const scenarioWarnings = buildPlannerWarnings(scenario, profileSnapshot)
  // placementEntries 按场景槽位拓扑顺序（row/column/slotId）排序，让 locked 与搜索结果合并后
  // 仍与棋盘格子在视觉上一一对应，而非 locked 追加末尾。
  const slotOrder = new Map(sortSlots(scenario).map((slotId, index) => [slotId, index]))
  const lockedPlacementEntries = Object.entries(userLockedSlots).map(([slotId, heroId]) => {
    const hero = heroById.get(heroId)
    return {
      slotId,
      slotLabel: slotId,
      heroId,
      heroName: hero?.name.display ?? heroId,
      seat: hero?.seat ?? null,
    }
  })
  const plannerResults: PlannerResult[] = topResults.map((top) => {
    const placementEntries = [...buildPlacementEntries(slots, top.placements, heroById), ...lockedPlacementEntries]
      .sort((left, right) => (slotOrder.get(left.slotId) ?? Infinity) - (slotOrder.get(right.slotId) ?? Infinity))
    return {
      objectiveValue: formatGameNumber(top.objectiveValue),
      carryHeroId: top.carryHeroId,
      placements: top.placements,
      placementEntries,
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
    }
  })

  return {
    result: plannerResults[0] ?? null,
    results: plannerResults,
    layoutId: scenario.formationLayoutId,
    slots: toFormationSlots(scenario),
    scenarioRef,
    blocker: null,
  }
}
