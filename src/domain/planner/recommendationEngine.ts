import { formatGameNumber, parseGameNumber } from '../simulator/gameNumber'
import type { Variant } from '../types'
import type { UserProfileSnapshot } from '../user-profile/types'
import { beamSearch } from './beamSearchRanking'
import { buildCandidatePool } from './candidatePool'
import { checkFormationLegality, type LegalityViolation } from './formationLegality'
import {
  findPlannerScenarioForVariant,
  type ResolvedPlannerHeroModel,
  type ResolvedPlannerScenarioModel,
} from './plannerModel'
import {
  type PlannerCollections,
  type PlannerNarrativeLine,
  type PlannerPlacementEntry,
  type PlannerRecommendation,
} from './recommendationTypes'
import { scoreFormation, type ScoringEffect } from './steadyStateScoring'
import type { VariantRuleResult } from './variantRuleProjection'

const ROLE_PRIORITY = ['dps', 'support', 'tanking', 'healing', 'gold'] as const
const ROLE_LABELS: Record<string, PlannerNarrativeLine> = {
  dps: { zh: '输出', en: 'damage' },
  support: { zh: '辅助', en: 'support' },
  tanking: { zh: '前排', en: 'frontline' },
  healing: { zh: '治疗', en: 'healing' },
  gold: { zh: '金币增益', en: 'gold gain' },
}

function sortSlots(scenario: ResolvedPlannerScenarioModel): string[] {
  return [...scenario.slotTopology]
    .sort((left, right) => left.row - right.row || left.column - right.column || left.slotId.localeCompare(right.slotId))
    .map((slot) => slot.slotId)
}

function buildAdjacency(scenario: ResolvedPlannerScenarioModel): Record<string, string[]> {
  return Object.fromEntries(scenario.slotTopology.map((slot) => [slot.slotId, slot.adjacentSlotIds]))
}

function createRoleEffects(heroes: ResolvedPlannerHeroModel[]): ScoringEffect[] {
  return heroes.map((hero) => ({
    heroId: hero.heroId,
    kind: 'globalDpsMultiplier',
    value: hero.heuristicRoleMultiplier,
    note: `planner-model:${hero.sourceBreakdown.heuristicRoleMultiplier}`,
  }))
}

function getRolePriorityScore(hero: ResolvedPlannerHeroModel): number {
  const roles = new Set(hero.roles.map((role) => role.toLowerCase()))

  if (roles.has('dps')) return 5
  if (roles.has('support')) return 4
  if (roles.has('tanking')) return 3
  if (roles.has('healing')) return 2
  if (roles.has('gold')) return 1
  return 0
}

function getChampionRoleSummary(hero: ResolvedPlannerHeroModel): PlannerNarrativeLine {
  const normalizedRoles = [...new Set(hero.roles.map((role) => role.toLowerCase()))]
    .sort((left, right) => ROLE_PRIORITY.indexOf(left as typeof ROLE_PRIORITY[number]) - ROLE_PRIORITY.indexOf(right as typeof ROLE_PRIORITY[number]))
    .slice(0, 2)
  const labels = normalizedRoles.map((role) => ROLE_LABELS[role] ?? { zh: role, en: role })

  if (labels.length === 0) {
    return { zh: '通用位', en: 'general role' }
  }

  return {
    zh: labels.map((label) => label.zh).join(' / '),
    en: labels.map((label) => label.en).join(' / '),
  }
}

function formatScore(score: number): string {
  const parsed = parseGameNumber(score)
  return parsed.ok ? formatGameNumber(parsed.value) : score.toString()
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
  heroById: Map<string, ResolvedPlannerHeroModel>,
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
  heroById: Map<string, ResolvedPlannerHeroModel>,
  rawExplanations: string[],
): PlannerNarrativeLine[] {
  const sortedChampions = placementEntries
    .map((entry) => heroById.get(entry.heroId))
    .filter((hero): hero is ResolvedPlannerHeroModel => Boolean(hero))
    .sort((left, right) => (
      getRolePriorityScore(right) - getRolePriorityScore(left)
      || left.seat - right.seat
      || left.heroId.localeCompare(right.heroId)
    ))

  const leadChampion = sortedChampions[0] ?? null
  const supportChampions = sortedChampions
    .slice(1, 4)
    .map((hero) => hero.name.display)

  const hasAdjacentSignal = rawExplanations.some((line) => line.includes('adjacent buff'))
  const hasHeroSignal = rawExplanations.some((line) => line.includes('hero DPS'))

  const explanations: PlannerNarrativeLine[] = [
    {
      zh: `当前结果先填满 ${placementEntries.length} 个槽位，并确保每个 seat 只使用一名已拥有英雄。`,
      en: `This result fills ${placementEntries.length} slots first and keeps each seat assigned to only one owned champion.`,
    },
  ]

  if (leadChampion) {
    const roleSummary = getChampionRoleSummary(leadChampion)
    const supportSummaryZh = supportChampions.length > 0 ? supportChampions.join('、') : '其余已拥有英雄'
    const supportSummaryEn = supportChampions.length > 0 ? supportChampions.join(', ') : 'the remaining owned champions'

    explanations.push({
      zh: `核心位优先保留 ${leadChampion.name.display}（Seat ${leadChampion.seat}，${roleSummary.zh}），再用 ${supportSummaryZh} 维持基线增益。`,
      en: `The lineup anchors on ${leadChampion.name.display} (Seat ${leadChampion.seat}, ${roleSummary.en}), then uses ${supportSummaryEn} to keep the baseline buffs stable.`,
    })
  }

  if (hasAdjacentSignal || hasHeroSignal) {
    explanations.push({
      zh: '这条推荐已经开始计入相邻增益或英雄自带倍率，不再只是简单按职业标签排队。',
      en: 'This recommendation already accounts for adjacency buffs or hero-specific multipliers instead of only sorting by broad role tags.',
    })
  } else {
    explanations.push({
      zh: `当前版本更偏向稳定的职业权重组合；${scenario.scenarioWarnings.length > 0 ? '场景限制仍需你手动复核。' : '后续再逐步补进技能联动和场景机制。'}`,
      en: `This version still prefers stable role-weight combinations; ${scenario.scenarioWarnings.length > 0 ? 'scenario restrictions still need manual review.' : 'skill synergies and scenario mechanics will be layered in later.'}`,
    })
  }

  return explanations
}

export function buildPlannerRecommendation(
  selectedVariant: Variant | null,
  collections: PlannerCollections,
  profileSnapshot: UserProfileSnapshot | null,
): PlannerRecommendation {
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
  const heroes = collections.plannerHeroes
    .filter((hero) => candidateIds.has(hero.heroId))
    .sort((left, right) => left.seat - right.seat || left.heroId.localeCompare(right.heroId))

  const slots = sortSlots(scenario)
  if (heroes.length < slots.length) {
    return {
      result: null,
      layoutId: scenario.formationLayoutId,
      scenarioRef: { kind: 'variant', id: selectedVariant.id },
      blocker: 'insufficient-owned-heroes',
    }
  }

  const adjacency = buildAdjacency(scenario)
  const heroById = new Map(heroes.map((hero) => [hero.heroId, hero]))
  const heroSeats = Object.fromEntries(heroes.map((hero) => [hero.heroId, hero.seat]))
  const effectsByHeroId = new Map(createRoleEffects(heroes).map((effect) => [effect.heroId, [effect]]))
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
    adjacency,
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
          score: 0,
          warnings: legality.violations.map(formatLegalityViolation),
          explanations: ['非法阵型已被过滤。'],
        }
      }

      const activeEffects = Object.values(placements)
        .flatMap((heroId) => effectsByHeroId.get(heroId) ?? [])

      return scoreFormation({ placements, effects: activeEffects, adjacency })
    },
  })

  const top = results.find((result) => {
    if (result.score <= 0) {
      return false
    }

    return checkFormationLegality({
      placements: result.placements,
      heroSeats,
      variantRules: scenarioVariantRules,
      lockedSlots: scenario.lockedSlots,
    }).legal
  })

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
      score: formatScore(top.score),
      placements: top.placements,
      placementEntries,
      explanations: buildPlannerExplanations(
        scenario,
        placementEntries,
        heroById,
        top.explanations,
      ),
      warnings: [...new Set([...top.warnings, ...buildPlannerWarnings(scenario, profileSnapshot)])],
    },
    layoutId: scenario.formationLayoutId,
    scenarioRef: { kind: 'variant', id: selectedVariant.id },
    blocker: null,
  }
}
