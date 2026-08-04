/* eslint-disable max-lines -- planner 推荐引擎主入口：evaluateFormation + buildPlannerRecommendation 两入口 + 9 个紧密协作的子函数（已全部 ≤50 行/max-lines-per-function 已清）。拆到多个文件会让推荐流程修改需同时打开多个单元，破坏 AI-first 一跳命中率（CLAUDE.md 根目标）。 */
import { Decimal } from 'decimal.js'

import { compareGameNumbers, formatGameNumber, type GameNumberValue } from '../simulator/gameNumber'
import type { HeroDpsContribution } from '../buffs/externalHeroDpsMult'
import { applyFeatsToProfile, type FeatCatalog } from '../abilities/featSignals'
import { applySpecializationsToProfile, type SpecializationCatalog } from '../abilities/specializationSignals'
import { applyEquipmentBuffsToProfile } from '../abilities/equipmentBuffSignals'
import type { EquipmentBuff } from '../buffs/equipmentMult'
import type { FormationSlot, ScenarioRef, Variant } from '../types'
import type { OwnedHero, UserProfileSnapshot } from '../user-profile/types'
import type { HeroAbilityKind, ResolvedHeroAbilityProfile } from '../abilities/abilityModel'
import { beamSearch } from './beamSearchRanking'
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
import { scoreFormation, type AggregateProjection, type ScoringMode, type ScoringResult } from './steadyStateScoring'
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
    .sort((left, right) => {
      // 行号差为 0 时进列号比较；列号同则按 slotId 字典序。row/column 是 JSON 解析的有限数，无 NaN 风险。
      const rowDiff = left.row - right.row
      if (rowDiff !== 0) return rowDiff
      const colDiff = left.column - right.column
      if (colDiff !== 0) return colDiff
      return left.slotId.localeCompare(right.slotId)
    })
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
      return `seat ${String(violation.seat)} 冲突：${violation.heroes.join(', ')}`
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
      if (heroId === undefined) {
        return []
      }
      const hero = heroById.get(heroId)

      return [{
        slotId,
        heroId,
        slotLabel: slotId,
        heroName: hero?.name.display ?? heroId,
        seat: hero?.seat ?? null,
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
  // eslint-disable-next-line @typescript-eslint/prefer-optional-chain -- scenario == null 前置守卫已类型收窄（后续 scenario.xxx 安全），改 optional chain 反成冗余（scenario == null || scenario?.formationLayoutId）。
  if (scenario == null || scenario.formationLayoutId == null || scenario.formationLayoutId === '' || scenario.slotTopology.length === 0) {
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
    // owned.feats 类型恒为 string[]（非可选），无需运行时 truthy 检查；只判空数组
    if (owned == null || owned.feats.length === 0) {
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
    // owned.specializations 类型恒为 string[]（非可选），无需运行时 truthy 检查；只判空数组
    if (owned == null || owned.specializations.length === 0) {
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

/**
 * evaluateFormation 专用：按 build 候选阶段的限制语义检查 placements 里的英雄是否合规，
 * 不合规项以 warning 体现（两入口语义对称：build 过滤掉非白名单/未拥有英雄，evaluate 须显式提示）。
 * 强制英雄（forcedHeroes）豁免——其未拥有/不在白名单是 force_use_heroes 的设计预期。
 * 提取自 evaluateFormation 以降主函数复杂度；语义零改变。
 */
function collectEvaluationRestrictionWarnings(
  placements: Record<string, string>,
  heroById: Map<string, ResolvedHeroAbilityProfile>,
  candidateIds: Set<string>,
  scenario: ResolvedPlannerScenarioModel,
): string[] {
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
  return restrictionWarnings
}

/**
 * evaluateFormation 尾段：scorePlannerFormation 求值 → 组装 PlannerResult + FormationEvaluation 返回。
 * 提取自 evaluateFormation 以降主函数复杂度；语义零改变（变量传递完全对称）。
 */
function buildEvaluationFormationResult(
  placements: Record<string, string>,
  heroById: Map<string, ResolvedHeroAbilityProfile>,
  scenario: ResolvedPlannerScenarioModel,
  heroLevels: Map<string, number>,
  scoringMode: ScoringMode,
  options: PlannerRecommendationOptions,
  scenarioRef: ScenarioRef,
  legalityWarnings: string[],
  restrictionWarnings: string[],
): FormationEvaluation {
  const scoring = scorePlannerFormation(placements, heroById, scenario, heroLevels, scoringMode, options)
  const placementEntries = buildPlacementEntries(sortSlots(scenario), placements, heroById)
  const result: PlannerResult = {
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
    warnings: [...new Set([...scoring.warnings, ...legalityWarnings, ...restrictionWarnings, ...scenario.scenarioWarnings])],
    areaEstimate: scoring.areaEstimate ?? null,
    breakdown: scoring.breakdown,
    placements,
    placementEntries,
  }
  return {
    result,
    scenarioRef,
    layoutId: scenario.formationLayoutId,
    slots: toFormationSlots(scenario),
    blocker: null,
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
  if (scenario == null || scenarioRef == null || blocker != null) {
    return { result: null, layoutId: null, slots: [], scenarioRef: scenarioRef ?? null, blocker }
  }

  // evaluateFormation 不做候选过滤——用户已显式指定阵型，heroById 用全量英雄保证放置的英雄都能解析。
  const heroById = new Map(collections.plannerHeroes.map((hero) => [hero.heroId, hero]))
  const heroSeats = Object.fromEntries(collections.plannerHeroes.map((hero) => [hero.heroId, hero.seat]))
  const ownedHeroes = profileSnapshot?.ownedHeroes ?? []
  applyActiveFeats(heroById, ownedHeroes, collections.featCatalog)
  applyActiveSpecializations(heroById, ownedHeroes, collections.specializationCatalog)
  applyEquipmentBuffs(heroById, options.equipmentBuffsByHero)
  attachOwnedSaveContext(heroById, ownedHeroes, profileSnapshot?.activeContext?.patronId ?? null)
  const candidateIds = new Set(
    buildCandidatePool({
      mode: candidateMode,
      allChampionIds: collections.plannerHeroes.map((hero) => hero.heroId),
      ownedHeroes,
    }),
  )
  // heroLevels 覆盖所有已拥有英雄；放置但未拥有的英雄由 restrictionWarnings 标记（按 level 1 估算）。
  const heroLevels = new Map(ownedHeroes.map((owned) => [owned.heroId, owned.level]))

  const variantRules: VariantRuleResult = {
    constraints: [
      ...(scenario.forcedHeroes.length > 0 ? [{ kind: 'forceInclude' as const, heroIds: scenario.forcedHeroes }] : []),
    ],
    warnings: scenario.scenarioWarnings,
  }
  const legality = checkFormationLegality({ placements, heroSeats, variantRules })
  const legalityWarnings = legality.legal ? [] : legality.violations.map(formatLegalityViolation)
  const restrictionWarnings = collectEvaluationRestrictionWarnings(placements, heroById, candidateIds, scenario)

  return buildEvaluationFormationResult(placements, heroById, scenario, heroLevels, scoringMode, options, scenarioRef, legalityWarnings, restrictionWarnings)
}

/**
 * buildPlannerRecommendation 专用：按 forced/candidate/allowed 过滤候选英雄并按 seat+heroId 排序。
 * 强制英雄无条件纳入（即使未拥有/不在白名单）；only_allow_crusaders 白名单 by_ids OR by_tags。
 * 提取自 buildPlannerRecommendation 以降主函数复杂度；语义零改变。
 */
function filterAndSortCandidateHeroes(
  plannerHeroes: readonly ResolvedHeroAbilityProfile[],
  forcedHeroSet: Set<string>,
  candidateIds: Set<string>,
  hasAllowedRestriction: boolean,
  allowedHeroSet: Set<string>,
  allowedTagSet: Set<string>,
): ResolvedHeroAbilityProfile[] {
  return plannerHeroes
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
    .sort((left, right) => {
      // seat 为有限数（JSON 解析），无 NaN 风险；差 0 时按 heroId 字典序
      const seatDiff = left.seat - right.seat
      if (seatDiff !== 0) return seatDiff
      return left.heroId.localeCompare(right.heroId)
    })
}

/**
 * buildPlannerRecommendation 专用：从 collections + scenario + options 解析候选英雄与可用槽位。
 * 含 only_allow_crusaders 白名单、强制英雄注入、被占格扣减。返回候选英雄列表、槽位、forcedHeroSet、
 * 用户锁槽、ownedHeroes。提取自 buildPlannerRecommendation；语义零改变。
 */
function resolveCandidateSlots(
  collections: PlannerCollections,
  profileSnapshot: UserProfileSnapshot | null,
  options: PlannerRecommendationOptions,
  scenario: ResolvedPlannerScenarioModel,
  candidateMode: CandidateMode,
): {
  heroes: ResolvedHeroAbilityProfile[]
  slots: string[]
  forcedHeroSet: Set<string>
  userLockedSlots: Record<string, string>
  ownedHeroes: readonly OwnedHero[]
} {
  const ownedHeroes = profileSnapshot?.ownedHeroes ?? []
  const candidateIds = new Set(
    buildCandidatePool({
      mode: candidateMode,
      allChampionIds: collections.plannerHeroes.map((hero) => hero.heroId),
      ownedHeroes,
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
    ...(options.lockedCarryHeroId != null && options.lockedCarryHeroId !== '' ? [options.lockedCarryHeroId] : []),
    ...Object.values(userLockedSlots),
  ])
  const heroes = filterAndSortCandidateHeroes(collections.plannerHeroes, forcedHeroSet, candidateIds, hasAllowedRestriction, allowedHeroSet, allowedTagSet)
  // 可用容量扣减被占格 = slotTopology.length − occupiedSlotCount − 用户锁槽数。
  // occupiedSlotCount 来自 restrictions 文本解析（小鸡/小鬼等非英雄实体占格数）；
  // 取 sortSlots 前 availableCapacity 个近似——英雄数量正确，避免多填被占格高估 carryDps。
  const availableCapacity = Math.max(0, scenario.slotTopology.length - scenario.occupiedSlotCount - userLockedSlotSet.size)
  const slots = sortSlots(scenario).filter((slotId) => !userLockedSlotSet.has(slotId)).slice(0, availableCapacity)
  return { heroes, slots, forcedHeroSet, userLockedSlots, ownedHeroes }
}

/**
 * buildPlannerRecommendation 专用：对裁剪后的英雄列表应用 feat/专精/装备 buff/saveContext，
 * 构建 heroById/heroSeats/heroLevels/scenarioVariantRules。提取自 buildPlannerRecommendation；语义零改变。
 */
function applyAugmentsAndBuildRules(
  heroes: readonly ResolvedHeroAbilityProfile[],
  ownedHeroes: readonly OwnedHero[],
  collections: PlannerCollections,
  options: PlannerRecommendationOptions,
  profileSnapshot: UserProfileSnapshot | null,
  scenario: ResolvedPlannerScenarioModel,
): {
  heroById: Map<string, ResolvedHeroAbilityProfile>
  heroSeats: Record<string, number>
  heroLevels: Map<string, number>
  scenarioVariantRules: VariantRuleResult
} {
  const heroById = new Map(heroes.map((hero) => [hero.heroId, hero]))
  const heroSeats = Object.fromEntries(heroes.map((hero) => [hero.heroId, hero.seat]))
  applyActiveFeats(heroById, ownedHeroes, collections.featCatalog)
  applyActiveSpecializations(heroById, ownedHeroes, collections.specializationCatalog)
  applyEquipmentBuffs(heroById, options.equipmentBuffsByHero)
  attachOwnedSaveContext(heroById, ownedHeroes, profileSnapshot?.activeContext?.patronId ?? null)
  const heroLevels = new Map(ownedHeroes.map((owned) => [owned.heroId, owned.level]))
  const scenarioVariantRules: VariantRuleResult = {
    constraints: [
      ...(scenario.forcedHeroes.length > 0 ? [{ kind: 'forceInclude' as const, heroIds: scenario.forcedHeroes }] : []),
    ],
    warnings: scenario.scenarioWarnings,
  }
  return { heroById, heroSeats, heroLevels, scenarioVariantRules }
}

/**
 * beamSearch 的 scoreFormation callback：先做合法性检查（非法返回 SCORE_ZERO + warning），
 * 合法则调 scorePlannerFormation 求值。提取自 buildPlannerRecommendation 内联 callback；语义零改变。
 */
function scorePlannerFormationWithLegality(
  placements: Record<string, string>,
  variantRules: VariantRuleResult,
  heroSeats: Record<string, number>,
  heroById: Map<string, ResolvedHeroAbilityProfile>,
  scenario: ResolvedPlannerScenarioModel,
  heroLevels: Map<string, number>,
  scoringMode: ScoringMode,
  options: PlannerRecommendationOptions,
) {
  const legality = checkFormationLegality({ variantRules, placements, heroSeats })
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
}

/**
 * distinct-carry Top K：beamSearch 结果先过滤非法（score≤0），按 carryHeroId 去重（每个 carry 取最高分），
 * 再按 objectiveValue 降序取前 PLANNER_TOP_K。提取自 buildPlannerRecommendation；语义零改变。
 */
function selectTopKByCarry<T extends { objectiveValue: GameNumberValue; carryHeroId: string | null }>(
  results: readonly T[],
): T[] {
  const legal = results.filter((result) => compareGameNumbers(result.objectiveValue, SCORE_ZERO) > 0)
  const bestByCarry = new Map<string, T>()
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

/**
 * buildPlannerRecommendation 尾段：把 Top K 搜索结果组装成 PlannerResult[]（含 placementEntries 排序、
 * warnings 合并、explanations 构建）。提取自 buildPlannerRecommendation；语义零改变。
 */
function buildRecommendationResults(
  topResults: ReadonlyArray<ScoringResult & { placements: Record<string, string> }>,
  scenario: ResolvedPlannerScenarioModel,
  heroById: Map<string, ResolvedHeroAbilityProfile>,
  scoringMode: ScoringMode,
  slots: string[],
  userLockedSlots: Record<string, string>,
  scenarioWarnings: string[],
): PlannerResult[] {
  // placementEntries 按场景槽位拓扑顺序（row/column/slotId）排序，让 locked 与搜索结果合并后
  // 仍与棋盘格子在视觉上一一对应，而非 locked 追加末尾。
  const slotOrder = new Map(sortSlots(scenario).map((slotId, index) => [slotId, index]))
  const lockedPlacementEntries = Object.entries(userLockedSlots).map(([slotId, heroId]) => {
    const hero = heroById.get(heroId)
    return {
      slotLabel: slotId,
      heroName: hero?.name.display ?? heroId,
      seat: hero?.seat ?? null,
      slotId,
      heroId,
    }
  })
  return topResults.map((top) => {
    const placementEntries = [...buildPlacementEntries(slots, top.placements, heroById), ...lockedPlacementEntries]
      .sort((left, right) => (slotOrder.get(left.slotId) ?? Infinity) - (slotOrder.get(right.slotId) ?? Infinity))
    return {
      objectiveValue: formatGameNumber(top.objectiveValue),
      carryHeroId: top.carryHeroId,
      placements: top.placements,
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
  if (scenario == null || scenarioRef == null || blocker != null) {
    return { result: null, results: [], layoutId: null, slots: [], scenarioRef: scenarioRef ?? null, blocker }
  }

  const { heroes: candidateHeroes, slots, forcedHeroSet, userLockedSlots, ownedHeroes } = resolveCandidateSlots(collections, profileSnapshot, options, scenario, candidateMode)

  if (candidateHeroes.length < slots.length) {
    return { result: null, results: [], layoutId: scenario.formationLayoutId, slots: toFormationSlots(scenario), blocker: 'insufficient-owned-heroes', scenarioRef }
  }

  // 计算模式裁剪候选（默认 p50）：在 insufficient 检查之后，确保裁剪不干扰「英雄够不够组队」判断；forced 无条件保留。
  const heroes = applyComputationMode(candidateHeroes, computationMode, scoringMode, forcedHeroSet)
  const { heroById, heroSeats, heroLevels, scenarioVariantRules } = applyAugmentsAndBuildRules(heroes, ownedHeroes, collections, options, profileSnapshot, scenario)

  const results = beamSearch({
    slots,
    heroes: heroes.map((hero) => ({ heroId: hero.heroId, seat: hero.seat })),
    beamWidth: options.beamWidth ?? PLANNER_BEAM_WIDTH,
    lockedPlacements: userLockedSlots,
    scoreFormation: (placements) => scorePlannerFormationWithLegality(placements, scenarioVariantRules, heroSeats, heroById, scenario, heroLevels, scoringMode, options),
  })

  // distinct-carry Top K（selectTopKByCarry 内部去重 + 取前 PLANNER_TOP_K）。
  const topResults = selectTopKByCarry(results)

  if (topResults.length === 0) {
    return { result: null, results: [], layoutId: scenario.formationLayoutId, slots: toFormationSlots(scenario), blocker: 'no-legal-recommendation', scenarioRef }
  }

  const scenarioWarnings = buildPlannerWarnings(scenario, profileSnapshot)
  const plannerResults = buildRecommendationResults(topResults, scenario, heroById, scoringMode, slots, userLockedSlots, scenarioWarnings)

  return {
    result: plannerResults[0] ?? null,
    results: plannerResults,
    layoutId: scenario.formationLayoutId,
    slots: toFormationSlots(scenario),
    blocker: null,
    scenarioRef,
  }
}
