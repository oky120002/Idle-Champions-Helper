/* eslint-disable max-lines -- planner 推算引擎主入口：evaluateFormation + buildPlannerRecommendation 两入口 + 9 个紧密协作的子函数。拆到多个文件会让推荐流程修改需同时打开多个单元，破坏 AI-first 一跳命中率（CLAUDE.md 根目标）。 */
import { toGameNumber, parseGameNumber, compareGameNumbers, formatGameNumber, type GameNumberValue } from '../gameNumber'

import type { HeroDpsContribution } from '../buffs/externalHeroDpsMult'
import type { LegendaryContribution } from '../buffs/legendaryEffects'
import { applyFeatsToProfile, type FeatCatalog } from '../abilities/featSignals'
import { applySpecializationsToProfile, type SpecializationCatalog } from '../abilities/specializationSignals'
import { applyEquipmentBuffsToProfile } from '../abilities/equipmentBuffSignals'
import type { EquipmentBuff } from '../buffs/equipmentMult'
import type { AbilityScoreKey, AttributeRequirement, FormationSlot, LocalizedUiText, ScenarioRef, TagExpression, Variant } from '../types'
import { asLocalizedUiText, uniqueLocalizedUiText } from '../localizedUiText'
import type { OwnedHero, UserProfileSnapshot } from '../user-profile/types'
import type { HeroAbilityKind, ResolvedHeroAbilityProfile } from '../abilities/abilityModel'
import type { AreaEstimationResult } from '../simulator/areaEstimation'
import { applyEquipmentBuffsToSpeedEffects, computeHeroSpeedGain } from './speedScoring'
import { beamSearch } from './beamSearchRanking'
import { buildCandidatePool, type CandidateMode } from './candidatePool'
import { checkFormationLegality, type LegalityViolation } from './formationLegality'
import { applyComputationMode, type ComputationMode } from './computationMode'
import { findPlannerScenarioForVariant, type ResolvedPlannerScenarioModel } from './plannerModel'
import { buildPlannerExplanations } from './plannerNarrative'
import {
  type ConstraintKind,
  type PlannerCollections,
  type PlannerPlacementEntry,
  type PlannerRecommendation,
  type PlannerRecommendationBlocker,
  type PlannerResult,
  type ViabilityAssessment,
} from './recommendationTypes'
import { scoreFormation, type AggregateProjection, type ScoringMode, type ScoringResult } from './steadyStateScoring'
import type { VariantRuleResult } from './variantConstraints'

const PLANNER_TOP_K = 3
/**
 * beam search 默认宽度（每轮保留的候选阵型数）。越大越精确越慢；越小越快越可能漏最优。
 * 实测（benchmark beamWidth 扫描）：width=8 安全；width=4 多数 variant 无损但偶发质量塌方；
 * width≤3 在候选多的 variant 上 objectiveValue 崩溃（log10 比 -4）。故默认保守留 8——
 * 真正可靠的加速走 computationMode 候选裁剪（少求值次数，非降搜索质量）。
 * 调用方可经 PlannerRecommendationOptions.beamWidth 覆盖（CLI/测试/调优）。
 */
const PLANNER_BEAM_WIDTH = 8
const SCORE_ZERO: GameNumberValue = toGameNumber(0)

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

function formatLegalityViolation(violation: LegalityViolation): LocalizedUiText {
  switch (violation.kind) {
    case 'seatConflict':
      return { zh: `seat ${String(violation.seat)} 冲突：${violation.heroes.join(', ')}`, en: `seat ${String(violation.seat)} conflict: ${violation.heroes.join(', ')}` }
    case 'missingForced':
      return { zh: `缺少强制英雄：${violation.heroIds.join(', ')}`, en: `missing forced champion: ${violation.heroIds.join(', ')}` }
  }
}

function buildPlannerWarnings(scenario: ResolvedPlannerScenarioModel, snapshot: UserProfileSnapshot | null): LocalizedUiText[] {
  return uniqueLocalizedUiText([
    ...(snapshot?.warnings ?? []).map(asLocalizedUiText),
    ...scenario.scenarioWarnings.map(asLocalizedUiText),
  ])
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
  /** 传奇装备贡献（per_crusader global_dps + 条件 hero_dps），placement-aware + count-aware。 */
  legendaryContributions?: readonly LegendaryContribution[]
  /** 动态层数假设（dynamic-stack-multiply 机制，如蔚出言不逊）；透传 scoreFormation→evaluatePlacementFit。 */
  manualStackCount?: number
  /**
   * 全局金币预算（游戏记数法字符串，如 `"1.50e92"`）。评估链路暂不消费，预留扩展。
   * 等级模式时由调用方反算（computeMaxGoldForLevel）后传入。
   */
  goldBudget?: string | undefined
  /**
   * 外部算好的 per-hero 等级覆盖（如金币预算换算结果）。覆盖 ownedHeroes 的等级，
   * 同时影响专精等级门控。未覆盖的英雄保持 ownedHeroes 等级。
   */
  heroLevelOverride?: Map<string, number> | undefined
  /**
   * 投影模式（约束②）；默认 'absolute-dps'。透传 scoreFormation。
   * 'formation-buff' = 只阵型内聚合，不乘 baseDamage/levelCurve/外部加成（见 architecture.md「投影模式」）。
   */
  aggregateProjection?: AggregateProjection
  /**
   * 生存约束阈值：survivableArea 低于此值的阵型被淘汰（SCORE_ZERO）。
   * 未设 = 仅报告不过滤（现有行为不变）。由 viability 模型驱动（docs/plans/2026-08-planner-viability-model.md 阶段 A）。
   */
  minSurvivableArea?: number
  /**
   * 用户手动标记的不可造伤害槽位（UI 层 2，默认全部可打）。
   * carry 落在这些槽位 → SCORE_ZERO；与系统解析的 damageSourcePattern 叠加。
   */
  userDamageDisabledSlots?: readonly string[]
  /**
   * 动态速度英雄假设值覆盖：heroId → 等效跳过百分比（areaSkip value）。
   * 无覆盖的英雄使用 DYNAMIC_SPEED_DEFAULTS。透传 scoreFormation → scoreTeamSpeed。
   * 取值口径：UI 面板值（默认或用户手调），用户数据仅通过 UI 按钮替换面板值。
   */
  dynamicSpeedOverrides?: ReadonlyMap<string, number>
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
  heroLevels: Map<string, number>,
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
    const level = heroLevels.get(heroId) ?? owned.level
    heroById.set(heroId, applySpecializationsToProfile(profile, owned.specializations, specializationCatalog[heroId], level))
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
    const withSignals = applyEquipmentBuffsToProfile(profile, buffs)
    // 装备 buff_upgrade 同时缩放速度效果（三层缩放之「装备等级」层）
    if (withSignals.speedProfile) {
      const scaledEffects = applyEquipmentBuffsToSpeedEffects(withSignals.speedProfile.effects, buffs)
      heroById.set(heroId, {
        ...withSignals,
        speedProfile: {
          ...withSignals.speedProfile,
          effects: scaledEffects,
          speedGain: computeHeroSpeedGain(scaledEffects),
        },
      })
    } else {
      heroById.set(heroId, withSignals)
    }
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
 * evaluate/recommend 两入口共用 scoreFormation 调用：placements + 评估上下文 + options 对称透传。
 * 抽成单一来源，结构性锁定两入口透传一致——否则新增透传字段（如 aggregateProjection）漏改一处，
 * evaluate 与 recommend 会对同一阵型算出不同 DPS 且无诊断。
 */
function parseGoldBudget(value: string | undefined): GameNumberValue | undefined {
  if (value === undefined || value.length === 0) return undefined
  const result = parseGameNumber(value)
  return result.ok ? result.value : undefined
}

function scorePlannerFormation(
  placements: Record<string, string>,
  heroesById: Map<string, ResolvedHeroAbilityProfile>,
  scenario: ResolvedPlannerScenarioModel,
  heroLevels: Map<string, number>,
  scoringMode: ScoringMode,
  options: PlannerRecommendationOptions,
) {
  const scoring = scoreFormation({
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
    legendaryContributions: options.legendaryContributions,
    manualStackCount: options.manualStackCount,
    aggregateProjection: options.aggregateProjection,
    goldBudget: parseGoldBudget(options.goldBudget),
    dynamicSpeedOverrides: options.dynamicSpeedOverrides,
  })
  // 伤害来源位置限制：carry 在不可造伤害位置 → DPS 归零（事实约束，非用户过滤）。
  // 在 scorePlannerFormation 而非 scorePlannerFormationWithLegality 生效，使 evaluateFormation 也反映。
  if (scoring.carryHeroId != null) {
    const carrySlotId = Object.entries(placements).find(([, id]) => id === scoring.carryHeroId)?.[0]
    // 层 2：用户手动标记。
    if (carrySlotId != null && (options.userDamageDisabledSlots?.includes(carrySlotId) ?? false)) {
      return {
        ...scoring,
        objectiveValue: SCORE_ZERO,
        warnings: [...scoring.warnings, { zh: '核心英雄在用户标记的不可造伤害位置。', en: 'The carry champion is on a slot you marked as damage-disabled.' }],
      }
    }
    // 层 1：系统解析的位置限制模式。
    if (!isCarryInDamageValidSlot(placements, scenario, scoring.carryHeroId)) {
      return {
        ...scoring,
        objectiveValue: SCORE_ZERO,
        warnings: [...scoring.warnings, { zh: '核心英雄不在可造伤害的位置。', en: 'The carry champion is not on a slot that can deal damage.' }],
      }
    }
  }
  return scoring
}

/**
 * evaluateFormation 专用：按 build 候选阶段的限制语义检查 placements 里的英雄是否合规，
 * 不合规项以 warning 体现（两入口语义对称：build 过滤掉非白名单/未拥有英雄，evaluate 须显式提示）。
 * 强制英雄（forcedHeroes）豁免——其未拥有/不在白名单是 force_use_heroes 的设计预期。
 * 提取自 evaluateFormation 以降主函数复杂度；语义零改变。
 */
// eslint-disable-next-line sonarjs/cognitive-complexity -- 三条独立限制检查在同一循环，拆开反增打开文件数
function collectEvaluationRestrictionWarnings(
  placements: Record<string, string>,
  heroById: Map<string, ResolvedHeroAbilityProfile>,
  candidateIds: Set<string>,
  scenario: ResolvedPlannerScenarioModel,
): LocalizedUiText[] {
  const forcedHeroSet = new Set(scenario.forcedHeroes)
  const allowedHeroSet = new Set(scenario.allowedHeroes)
  const allowedTagExpression = scenario.allowedTagExpression
  const hasAllowedRestriction = allowedHeroSet.size > 0 || allowedTagExpression.length > 0
  const attributeRequirements = scenario.attributeRequirements
  const restrictionWarnings: LocalizedUiText[] = []
  for (const heroId of Object.values(placements)) {
    if (forcedHeroSet.has(heroId)) {
      continue
    }
    if (!candidateIds.has(heroId)) {
      restrictionWarnings.push({ zh: `${heroId} 不在账号快照中，按 level 1 估算`, en: `${heroId} is not in the account snapshot; estimated at level 1.` })
    }
    if (hasAllowedRestriction) {
      const hero = heroById.get(heroId)
      const allowed = allowedHeroSet.has(heroId)
        || (hero != null && matchesTagExpression(hero.tags, allowedTagExpression))
      if (!allowed) {
        restrictionWarnings.push({ zh: `${heroId} 不在当前变体的允许名单（only_allow_crusaders）内`, en: `${heroId} is not in the current variant's allowlist (only_allow_crusaders).` })
      }
    }
    if (attributeRequirements.length > 0) {
      const hero = heroById.get(heroId)
      if (hero != null && !meetsAttributeRequirements(hero.abilityScores, attributeRequirements)) {
        restrictionWarnings.push({ zh: `${heroId} 不满足当前变体的属性门槛`, en: `${heroId} does not meet the current variant's attribute threshold.` })
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
  legalityWarnings: LocalizedUiText[],
  restrictionWarnings: LocalizedUiText[],
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
    warnings: uniqueLocalizedUiText([...scoring.warnings, ...legalityWarnings, ...restrictionWarnings, ...scenario.scenarioWarnings.map(asLocalizedUiText)]),
    areaEstimate: scoring.areaEstimate ?? null,
    viability: buildViabilityAssessment(scenario, scoring.areaEstimate ?? null),
    breakdown: scoring.breakdown,
    speedBreakdown: scoring.speedBreakdown ?? null,
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
  // heroLevels 在专精注入前构建（含 override），使等级门控用覆盖后的等级
  const heroLevels = new Map(ownedHeroes.map((owned) => [owned.heroId, owned.level]))
  if (options.heroLevelOverride) {
    for (const [heroId, level] of options.heroLevelOverride) {
      heroLevels.set(heroId, level)
    }
  }
  applyActiveFeats(heroById, ownedHeroes, collections.featCatalog)
  applyActiveSpecializations(heroById, ownedHeroes, collections.specializationCatalog, heroLevels)
  applyEquipmentBuffs(heroById, options.equipmentBuffsByHero)
  attachOwnedSaveContext(heroById, ownedHeroes, profileSnapshot?.activeContext?.patronId ?? null)
  const candidateIds = new Set(
    buildCandidatePool({
      mode: candidateMode,
      allChampionIds: collections.plannerHeroes.map((hero) => hero.heroId),
      ownedHeroes,
    }),
  )

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
 * 评估英雄是否满足 tag 表达式（DNF: OR of ANDs）。
 * 任一 clause 通过即合格：clause 内 required 须全有、forbidden 须全无。
 * 空表达式返回 false（无子句 = 无 tag 匹配）——调用方用 hasAllowedRestriction 先行判断。
 */
function matchesTagExpression(heroTags: readonly string[], expression: TagExpression): boolean {
  if (expression.length === 0) return false
  const tagSet = new Set(heroTags)
  return expression.some((clause) =>
    clause.required.every((tag) => tagSet.has(tag))
    && clause.forbidden.every((tag) => !tagSet.has(tag)),
  )
}

/**
 * 评估英雄是否满足全部属性门槛。每条门槛独立判定（AND 语义——须全部满足）。
 * 英雄 abilityScores 可能缺失某属性 → 视为不满足该门槛（保守淘汰）。
 */
function meetsAttributeRequirements(
  abilityScores: Partial<Record<AbilityScoreKey, number>>,
  requirements: readonly AttributeRequirement[],
): boolean {
  return requirements.every((req) => {
    const score = abilityScores[req.stat]
    if (score === undefined) return false
    return req.operator === '>=' ? score >= req.value : score <= req.value
  })
}

/**
 * buildPlannerRecommendation 专用：按 forced/candidate/allowed 过滤候选英雄并按 seat+heroId 排序。
 * 强制英雄无条件纳入（即使未拥有/不在白名单）；only_allow_crusaders 白名单 by_ids OR by_tags 表达式。
 */
function filterAndSortCandidateHeroes(
  plannerHeroes: readonly ResolvedHeroAbilityProfile[],
  forcedHeroSet: Set<string>,
  candidateIds: Set<string>,
  hasAllowedRestriction: boolean,
  allowedHeroSet: Set<string>,
  allowedTagExpression: TagExpression,
  attributeRequirements: readonly AttributeRequirement[],
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
      if (!meetsAttributeRequirements(hero.abilityScores, attributeRequirements)) {
        return false
      }
      return !hasAllowedRestriction
        || allowedHeroSet.has(hero.heroId)
        || matchesTagExpression(hero.tags, allowedTagExpression)
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
  // only_allow_crusaders 白名单（by_ids OR by_tags 表达式）；强制英雄即使未拥有也纳入候选。
  const allowedHeroSet = new Set(scenario.allowedHeroes)
  const allowedTagExpression = scenario.allowedTagExpression
  const hasAllowedRestriction = allowedHeroSet.size > 0 || allowedTagExpression.length > 0
  const userLockedSlots = options.lockedSlots ?? {}
  const userLockedSlotSet = new Set(Object.keys(userLockedSlots))
  const forcedHeroSet = new Set([
    ...scenario.forcedHeroes,
    ...(options.lockedCarryHeroId != null && options.lockedCarryHeroId !== '' ? [options.lockedCarryHeroId] : []),
    ...Object.values(userLockedSlots),
  ])
  const heroes = filterAndSortCandidateHeroes(collections.plannerHeroes, forcedHeroSet, candidateIds, hasAllowedRestriction, allowedHeroSet, allowedTagExpression, scenario.attributeRequirements)
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
  // heroLevels 在专精注入前构建（含 override），使等级门控用覆盖后的等级
  const heroLevels = new Map(ownedHeroes.map((owned) => [owned.heroId, owned.level]))
  if (options.heroLevelOverride) {
    for (const [heroId, level] of options.heroLevelOverride) {
      heroLevels.set(heroId, level)
    }
  }
  applyActiveFeats(heroById, ownedHeroes, collections.featCatalog)
  applyActiveSpecializations(heroById, ownedHeroes, collections.specializationCatalog, heroLevels)
  applyEquipmentBuffs(heroById, options.equipmentBuffsByHero)
  attachOwnedSaveContext(heroById, ownedHeroes, profileSnapshot?.activeContext?.patronId ?? null)
  const scenarioVariantRules: VariantRuleResult = {
    constraints: [
      ...(scenario.forcedHeroes.length > 0 ? [{ kind: 'forceInclude' as const, heroIds: scenario.forcedHeroes }] : []),
    ],
    warnings: scenario.scenarioWarnings,
  }
  return { heroById, heroSeats, heroLevels, scenarioVariantRules }
}

/**
 * 检查 carry 是否在可造伤害位置（系统解析的位置限制模式）。
 * 模式依赖参考英雄的 placement，动态求值。参考英雄/carry 未放置时返回 true（跳过检查）。
 */
function isCarryInDamageValidSlot(
  placements: Record<string, string>,
  scenario: ResolvedPlannerScenarioModel,
  carryHeroId: string,
): boolean {
  const pattern = scenario.damageSourcePattern
  if (!pattern) return true
  const slotByHero = new Map(Object.entries(placements).map(([slot, id]) => [id, slot]))
  const carrySlotId = slotByHero.get(carryHeroId)
  if (carrySlotId === undefined) return true
  const refSlotId = slotByHero.get(pattern.referenceHeroId)
  if (refSlotId === undefined) return true
  const topology = scenario.slotTopology
  const carrySlot = topology.find((s) => s.slotId === carrySlotId)
  const refSlot = topology.find((s) => s.slotId === refSlotId)
  if (!carrySlot || !refSlot) return true

  switch (pattern.kind) {
    case 'same-column':
      return carrySlot.column === refSlot.column
    case 'adjacent':
      return carrySlotId === refSlotId || refSlot.adjacentSlotIds.includes(carrySlotId)
    case 'not-adjacent':
      return carrySlotId === refSlotId || !refSlot.adjacentSlotIds.includes(carrySlotId)
    case 'front-columns': {
      const span = pattern.columnSpan ?? 2
      return carrySlot.column >= Math.max(1, refSlot.column - span) && carrySlot.column <= refSlot.column
    }
    case 'behind-columns': {
      const span = pattern.columnSpan ?? 1
      return carrySlot.column >= refSlot.column && carrySlot.column <= refSlot.column + span
    }
  }
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
  const scoring = scorePlannerFormation(placements, heroById, scenario, heroLevels, scoringMode, options)
  // 可行性过滤：area = min(killableArea, survivableArea) 已综合所有约束
  //（护甲/命中型吞吐量、damageModifier 击杀削减、survival 生存）。
  // 统一检查 area 替代原先分离的 survivableArea + armor/hitsBased killableArea 检查——
  // 后者遗漏 damageModifier 变体（高生存但伤害削减致 killableArea 远低于阈值仍通过过滤）。
  const minSurvivableArea = options.minSurvivableArea
  if (typeof minSurvivableArea === 'number' && scoring.areaEstimate != null
    && scoring.areaEstimate.area < minSurvivableArea) {
    return {
      ...scoring,
      objectiveValue: SCORE_ZERO,
      warnings: [...scoring.warnings, { zh: `预估推进层数 ${String(scoring.areaEstimate.area)} 不足，要求 ≥ ${String(minSurvivableArea)} 层`, en: `Estimated progression of ${String(scoring.areaEstimate.area)} areas is insufficient; requires ≥ ${String(minSurvivableArea)} areas.` }],
    }
  }
  return scoring
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
 * 从 scenario.viabilityContext + areaEstimate 构建 ViabilityAssessment。
 * activeConstraints = 非 null 字段标识；boundBy 来自 areaEstimate。
 */
function buildViabilityAssessment(
  scenario: ResolvedPlannerScenarioModel,
  areaEstimate: AreaEstimationResult | null,
): ViabilityAssessment {
  const vc = scenario.viabilityContext
  const active: ConstraintKind[] = []
  if (vc.armor) active.push('armor')
  if (vc.hitsBased) active.push('hits-based')
  if (vc.damageModifier != null) active.push('damage-reduction')
  if (vc.enemyDamageMult != null) active.push('enemy-buff')
  if (vc.healthDrainRate != null) active.push('health-drain')
  return { activeConstraints: active, boundBy: areaEstimate?.boundBy ?? null }
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
  scenarioWarnings: LocalizedUiText[],
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
      warnings: uniqueLocalizedUiText([...top.warnings, ...scenarioWarnings]),
      areaEstimate: top.areaEstimate ?? null,
      viability: buildViabilityAssessment(scenario, top.areaEstimate ?? null),
      breakdown: top.breakdown,
      speedBreakdown: top.speedBreakdown ?? null,
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
