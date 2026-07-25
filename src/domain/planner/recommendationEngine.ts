import Decimal from 'break_eternity.js'

import { formatGameNumber } from '../simulator/gameNumber'
import type { GameNumberValue } from '../simulator/gameNumber'
import { compareGameNumbers } from '../simulator/gameNumberArithmetic'
import type { FormationSlot, Variant } from '../types'
import type { UserProfileSnapshot } from '../user-profile/types'
import { beamSearch } from './beamSearchRanking'
import { buildCandidatePool, type CandidateMode } from './candidatePool'
import { checkFormationLegality, type LegalityViolation } from './formationLegality'
import { findPlannerScenarioForVariant, type ResolvedPlannerScenarioModel } from './plannerModel'
import type { HeroAbilityKind, ResolvedHeroAbilityProfile } from '../abilities/abilityModel'
import {
  type PlannerCollections,
  type PlannerNarrativeLine,
  type PlannerPlacementEntry,
  type PlannerRecommendation,
  type PlannerResult,
} from './recommendationTypes'
import { scoreFormation, type ScoringMode } from './steadyStateScoring'
import type { VariantRuleResult } from './variantConstraints'

const PLANNER_TOP_K = 3
const SCORE_ZERO: GameNumberValue = new Decimal(0)

function sortSlots(scenario: ResolvedPlannerScenarioModel): string[] {
  return [...scenario.slotTopology]
    .sort((left, right) => left.row - right.row || left.column - right.column || left.slotId.localeCompare(right.slotId))
    .map((slot) => slot.slotId)
}

/** scenario.slotTopology → FormationSlot[]（阶段 15.1 棋盘渲染需要的 id/row/column）。 */
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
    case 'bannedChampion':
      return `${violation.heroId} 被当前规则禁用`
    case 'missingForced':
      return `缺少强制英雄：${violation.heroIds.join(', ')}`
    case 'lockedSlot':
      return `槽位 ${violation.slotId} 已锁定`
  }
}

function buildPlannerWarnings(scenario: ResolvedPlannerScenarioModel, snapshot: UserProfileSnapshot): string[] {
  return [...new Set([...snapshot.warnings, ...scenario.scenarioWarnings])]
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

function buildPlannerExplanations(
  scenario: ResolvedPlannerScenarioModel,
  placementEntries: PlannerPlacementEntry[],
  heroById: Map<string, ResolvedHeroAbilityProfile>,
  carryHeroId: string | null,
  carryDps: GameNumberValue,
  activeSignalKinds: Set<HeroAbilityKind>,
): PlannerNarrativeLine[] {
  const leadChampion = carryHeroId
    ? heroById.get(carryHeroId) ?? null
    : null
  const supportChampions = placementEntries
    .map((entry) => heroById.get(entry.heroId))
    .filter((hero): hero is ResolvedHeroAbilityProfile => Boolean(hero) && hero!.heroId !== carryHeroId)
    .slice(0, 4)
    .map((hero) => hero.name.display)

  const hasAdjacentSignal = activeSignalKinds.has('adjacentBuff')
  const hasHeroSignal = activeSignalKinds.has('heroDpsMultiplier')
  const hasTagSignal = activeSignalKinds.has('taggedChampionBuff')

  const explanations: PlannerNarrativeLine[] = [
    {
      zh: `当前结果先填满 ${placementEntries.length} 个槽位，并确保每个 seat 只使用一名已拥有英雄。`,
      en: `This result fills ${placementEntries.length} slots first and keeps each seat assigned to only one owned champion.`,
    },
  ]

  if (leadChampion) {
    const supportSummaryZh = supportChampions.length > 0 ? supportChampions.join('、') : '其余已拥有英雄'
    const supportSummaryEn = supportChampions.length > 0 ? supportChampions.join(', ') : 'the remaining owned champions'

    explanations.push({
      zh: `核心输出位 ${leadChampion.name.display}（Seat ${leadChampion.seat}）的 carryDps 约 ${formatGameNumber(carryDps)}，再用 ${supportSummaryZh} 提供加成。`,
      en: `Carry ${leadChampion.name.display} (Seat ${leadChampion.seat}) reaches ~${formatGameNumber(carryDps)} carryDps, with ${supportSummaryEn} providing buffs.`,
    })
  }

  if (hasAdjacentSignal || hasHeroSignal) {
    explanations.push({
      zh: '这条推荐已经计入相邻增益与英雄自带倍率，carryDps 由 baseDamage × levelCurve × 加成聚合得出。',
      en: 'This recommendation accounts for adjacency buffs and hero-specific multipliers; carryDps = baseDamage × levelCurve × aggregated buffs.',
    })
  } else if (hasTagSignal) {
    explanations.push({
      zh: '这条推荐已经开始区分部分 carry 目标标签，但标签语义仍依赖补丁或后续解析补全。',
      en: 'This recommendation now distinguishes some carry target tags, though that tag semantics still depend on overrides or later parsing work.',
    })
  } else {
    explanations.push({
      zh: `当前版本按 carryDps 排序候选；${scenario.scenarioWarnings.length > 0 ? '场景限制仍需你手动复核。' : '后续再逐步补进技能联动和场景机制。'}`,
      en: `This version ranks candidates by carryDps; ${scenario.scenarioWarnings.length > 0 ? 'scenario restrictions still need manual review.' : 'skill synergies and scenario mechanics will be layered in later.'}`,
    })
  }

  return explanations
}

export interface PlannerRecommendationOptions {
  scoringMode?: ScoringMode
  /**
   * 候选范围（阶段 15.3）；默认 owned-only。
   * owned-only = 仅本地已拥有英雄；all-hypothetical = 所有英雄（未拥有走 hypotheticalBaseline 假设）。
   * hypothetical 候选的装备精确化由 equipmentAdjustmentByHero（13.4）负责。
   */
  candidateMode?: CandidateMode
  /** 阶段 15.4：强制指定核心输出位英雄（结果 carryHeroId 与之一致）。 */
  lockedCarryHeroId?: string | null
  /** 阶段 15.4：用户锁定槽位（slotId→heroId，预填且不被搜索替换）。 */
  lockedSlots?: Record<string, string>
  /**
   * 全局 buff pool 乘数（阶段 11.4：patron-perk）。
   * 由调用方按玩家选择 patron 从 `global-buffs.json` 经 computeGlobalBuffMultiplier 解析后传入；
   * 默认 1（无全局加成）。UI 接入（patron 选择）在阶段 15。
   */
  globalBuffMultiplier?: number
  /**
   * 装备调整比（阶段 13.4）：carryId → adjustment（ownedEquipMult / theoreticalLootMult）。
   * 由调用方从 `loot-catalog.json` + owned loot 经 computeEquipmentAdjustment 解析后传入；
   * 默认无（=1，保持 M1 理论 loot 基线）。UI 接入（owned 装备读取）在阶段 15。
   */
  equipmentAdjustmentByHero?: Map<string, number>
}

export function buildPlannerRecommendation(
  selectedVariant: Variant | null,
  collections: PlannerCollections,
  profileSnapshot: UserProfileSnapshot | null,
  options: PlannerRecommendationOptions = {},
): PlannerRecommendation {
  const scoringMode = options.scoringMode ?? 'carry-dps'

  if (!selectedVariant || collections.plannerHeroes.length === 0) {
    return { result: null, results: [], layoutId: null, slots: [], scenarioRef: null, blocker: null }
  }

  if (!profileSnapshot) {
    return {
      result: null,
      results: [],
      layoutId: null,
      slots: [],
      scenarioRef: { kind: 'variant', id: selectedVariant.id },
      blocker: 'missing-profile',
    }
  }

  const scenario = findPlannerScenarioForVariant(collections.plannerScenarios, selectedVariant)
  if (!scenario || !scenario.formationLayoutId || scenario.slotTopology.length === 0) {
    return {
      result: null,
      results: [],
      layoutId: null,
      slots: [],
      scenarioRef: { kind: 'variant', id: selectedVariant.id },
      blocker: 'missing-formation',
    }
  }

  const candidateIds = new Set(
    buildCandidatePool({
      mode: options.candidateMode ?? 'owned-only',
      ownedHeroes: profileSnapshot.ownedHeroes,
      allChampionIds: collections.plannerHeroes.map((hero) => hero.heroId),
    }),
  )
  // 阶段 9.2：only_allow_crusaders 白名单（by_ids OR by_tags）；强制英雄即使未拥有也纳入候选。
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
  const heroes = collections.plannerHeroes
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
      scenarioRef: { kind: 'variant', id: selectedVariant.id },
      blocker: 'insufficient-owned-heroes',
    }
  }

  const heroById = new Map(heroes.map((hero) => [hero.heroId, hero]))
  const heroSeats = Object.fromEntries(heroes.map((hero) => [hero.heroId, hero.seat]))
  const heroLevels = new Map(
    profileSnapshot.ownedHeroes
      .filter((owned) => candidateIds.has(owned.heroId))
      .map((owned) => [owned.heroId, owned.level]),
  )
  const scenarioVariantRules: VariantRuleResult = {
    constraints: [
      ...(scenario.bannedHeroes.length > 0 ? [{ kind: 'banList' as const, heroIds: scenario.bannedHeroes }] : []),
      ...(scenario.forcedHeroes.length > 0 ? [{ kind: 'forceInclude' as const, heroIds: scenario.forcedHeroes }] : []),
    ],
    warnings: scenario.scenarioWarnings,
  }

  const results = beamSearch({
    heroes: heroes.map((hero) => ({ heroId: hero.heroId, seat: hero.seat })),
    slots,
    beamWidth: 8,
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
          score: SCORE_ZERO,
          warnings: legality.violations.map(formatLegalityViolation),
          explanations: ['非法阵型已被过滤。'],
          carryHeroId: null,
          objective: { value: SCORE_ZERO, breakdown: [] },
          activeSignalKinds: new Set<HeroAbilityKind>(),
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
      })
    },
  })

  // 阶段 15.2：distinct-carry Top K。beamSearch 已按 carryDps 降序；先过滤非法（score≤0），
  // 再按 carryHeroId 去重（每个 carry 取最高分阵型），取前 PLANNER_TOP_K 作为多阵型输出。
  const legal = results.filter((result) => compareGameNumbers(result.score, SCORE_ZERO) > 0)
  const bestByCarry = new Map<string, (typeof legal)[number]>()
  for (const result of legal) {
    const key = result.carryHeroId ?? '__none__'
    const existing = bestByCarry.get(key)
    if (!existing || compareGameNumbers(result.score, existing.score) > 0) {
      bestByCarry.set(key, result)
    }
  }
  const topResults = [...bestByCarry.values()]
    .sort((left, right) => compareGameNumbers(right.score, left.score))
    .slice(0, PLANNER_TOP_K)

  if (topResults.length === 0) {
    return {
      result: null,
      results: [],
      layoutId: scenario.formationLayoutId,
      slots: toFormationSlots(scenario),
      scenarioRef: { kind: 'variant', id: selectedVariant.id },
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
      score: formatGameNumber(top.score),
      carryHeroId: top.carryHeroId,
      placements: top.placements,
      placementEntries,
      explanations: buildPlannerExplanations(
        scenario,
        placementEntries,
        heroById,
        top.carryHeroId,
        top.score,
        top.activeSignalKinds,
      ),
      warnings: [...new Set([...top.warnings, ...scenarioWarnings])],
      areaEstimate: top.areaEstimate ?? null,
    }
  })

  return {
    result: plannerResults[0] ?? null,
    results: plannerResults,
    layoutId: scenario.formationLayoutId,
    slots: toFormationSlots(scenario),
    scenarioRef: { kind: 'variant', id: selectedVariant.id },
    blocker: null,
  }
}
