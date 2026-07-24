import Decimal from 'break_eternity.js'

import { formatGameNumber } from '../simulator/gameNumber'
import type { GameNumberValue } from '../simulator/gameNumber'
import { compareGameNumbers } from '../simulator/gameNumberArithmetic'
import type { Variant } from '../types'
import type { UserProfileSnapshot } from '../user-profile/types'
import { beamSearch } from './beamSearchRanking'
import { buildCandidatePool } from './candidatePool'
import { checkFormationLegality, type LegalityViolation } from './formationLegality'
import { findPlannerScenarioForVariant, type ResolvedPlannerScenarioModel } from './plannerModel'
import type { HeroAbilityKind, ResolvedHeroAbilityProfile } from '../abilities/abilityModel'
import {
  type PlannerCollections,
  type PlannerNarrativeLine,
  type PlannerPlacementEntry,
  type PlannerRecommendation,
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
    .map((slotId, index) => {
      const heroId = placements[slotId]!
      const hero = heroById.get(heroId)

      return {
        slotId,
        slotLabel: String(index + 1),
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
   * 全局 buff pool 乘数（阶段 11.4：patron-perk）。
   * 由调用方按玩家选择 patron 从 `global-buffs.json` 经 computeGlobalBuffMultiplier 解析后传入；
   * 默认 1（无全局加成）。UI 接入（patron 选择）在阶段 15。
   */
  globalBuffMultiplier?: number
}

export function buildPlannerRecommendation(
  selectedVariant: Variant | null,
  collections: PlannerCollections,
  profileSnapshot: UserProfileSnapshot | null,
  options: PlannerRecommendationOptions = {},
): PlannerRecommendation {
  const scoringMode = options.scoringMode ?? 'carry-dps'
  const globalBuffMultiplier = options.globalBuffMultiplier ?? 1

  if (!selectedVariant || collections.plannerHeroes.length === 0) {
    return { result: null, layoutId: null, scenarioRef: null, blocker: null }
  }

  if (!profileSnapshot) {
    return {
      result: null,
      layoutId: null,
      scenarioRef: { kind: 'variant', id: selectedVariant.id },
      blocker: 'missing-profile',
    }
  }

  const scenario = findPlannerScenarioForVariant(collections.plannerScenarios, selectedVariant)
  if (!scenario || !scenario.formationLayoutId || scenario.slotTopology.length === 0) {
    return {
      result: null,
      layoutId: null,
      scenarioRef: { kind: 'variant', id: selectedVariant.id },
      blocker: 'missing-formation',
    }
  }

  const candidatePool = buildCandidatePool({
    mode: 'owned-only',
    ownedHeroes: profileSnapshot.ownedHeroes,
    allChampionIds: collections.plannerHeroes.map((hero) => hero.heroId),
  })
  const candidateIds = new Set(candidatePool.candidates.map((candidate) => candidate.heroId))
  // 阶段 9.2：only_allow_crusaders 白名单（by_ids OR by_tags）；强制英雄即使未拥有也纳入候选。
  const allowedHeroSet = new Set(scenario.allowedHeroes)
  const allowedTagSet = new Set(scenario.allowedTags)
  const hasAllowedRestriction = allowedHeroSet.size > 0 || allowedTagSet.size > 0
  const forcedHeroSet = new Set(scenario.forcedHeroes)
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
  const slots = sortSlots(scenario).filter((slotId) => !lockedSlotSet.has(slotId))
  if (heroes.length < slots.length) {
    return {
      result: null,
      layoutId: scenario.formationLayoutId,
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

      return scoreFormation({ placements, heroesById: heroById, scenario, heroLevels, scoringMode, globalBuffMultiplier })
    },
  })

  // results 已按 carryDps 降序；scoreFormation 回调已把非法阵型置零，
  // 故首个 score>0 即最高分合法阵型。slice(PLANNER_TOP_K) 为 M4 15.2 多阵型输出预留。
  const top = results
    .slice(0, PLANNER_TOP_K)
    .find((result) => compareGameNumbers(result.score, SCORE_ZERO) > 0)

  if (!top) {
    return {
      result: null,
      layoutId: scenario.formationLayoutId,
      scenarioRef: { kind: 'variant', id: selectedVariant.id },
      blocker: 'no-legal-recommendation',
    }
  }

  const placementEntries = buildPlacementEntries(slots, top.placements, heroById)

  return {
    result: {
      score: formatGameNumber(top.score),
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
      warnings: [...new Set([...top.warnings, ...buildPlannerWarnings(scenario, profileSnapshot)])],
    },
    layoutId: scenario.formationLayoutId,
    scenarioRef: { kind: 'variant', id: selectedVariant.id },
    blocker: null,
  }
}
