import { beamSearch } from '../../domain/planner/beamSearchRanking'
import { buildCandidatePool } from '../../domain/planner/candidatePool'
import { checkFormationLegality, type LegalityViolation } from '../../domain/planner/formationLegality'
import { scoreFormation, type ScoringEffect } from '../../domain/planner/steadyStateScoring'
import type { VariantRuleResult } from '../../domain/planner/variantRuleProjection'
import { formatGameNumber, parseGameNumber } from '../../domain/simulator/gameNumber'
import type { Champion, FormationLayout, ScenarioRef, Variant } from '../../domain/types'
import type { UserProfileSnapshot } from '../../domain/user-profile/types'
import type { PlannerResultCardProps } from './PlannerResultCard'

export interface PlannerCollections {
  variants: Variant[]
  champions: Champion[]
  formations: FormationLayout[]
}

export type PlannerRecommendationBlocker =
  | 'missing-profile'
  | 'missing-formation'
  | 'insufficient-owned-heroes'
  | 'no-legal-recommendation'

export interface PlannerRecommendation {
  result: PlannerResultCardProps | null
  layoutId: string | null
  scenarioRef: ScenarioRef | null
  blocker: PlannerRecommendationBlocker | null
}

const EMPTY_VARIANT_RULES: VariantRuleResult = { constraints: [], warnings: [] }

function sortSlots(layout: FormationLayout): string[] {
  return [...layout.slots]
    .sort((left, right) => left.row - right.row || left.column - right.column || left.id.localeCompare(right.id))
    .map((slot) => slot.id)
}

function buildAdjacency(layout: FormationLayout): Record<string, string[]> {
  return Object.fromEntries(layout.slots.map((slot) => [slot.id, slot.adjacentSlotIds ?? []]))
}

function contextMatchesVariant(context: ScenarioRef, variant: Variant): boolean {
  if (context.kind === 'variant') {
    return context.id === variant.id
  }

  if (context.kind === 'adventure') {
    return context.id === variant.adventureId
  }

  if (context.kind === 'campaign') {
    return context.id === variant.campaign.id
  }

  return false
}

export function findFormationForVariant(formations: FormationLayout[], variant: Variant): FormationLayout | null {
  return formations.find((formation) => {
    const contexts = [
      ...(formation.applicableContexts ?? []),
      ...(formation.sourceContexts ?? []),
    ]

    return contexts.some((context) => contextMatchesVariant(context, variant))
  }) ?? formations[0] ?? null
}

function createRoleEffects(champions: Champion[]): ScoringEffect[] {
  return champions.map((champion) => {
    const roles = new Set(champion.roles.map((role) => role.toLowerCase()))
    const multiplier = roles.has('dps')
      ? 4
      : roles.has('support')
        ? 2.5
        : roles.has('tanking')
          ? 1.5
          : roles.has('healing')
            ? 1.3
            : roles.has('gold')
              ? 1.2
              : 1.05

    return {
      heroId: champion.id,
      kind: 'globalDpsMultiplier',
      value: multiplier,
    }
  })
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

function buildPlannerWarnings(variant: Variant, snapshot: UserProfileSnapshot): string[] {
  const warnings = [...snapshot.warnings]

  if (variant.restrictions.length > 0 || variant.mechanics.length > 0) {
    warnings.push('当前推荐尚未解析场景限制与机制，只按已拥有英雄、seat 合法性和阵型槽位计算。')
  }

  return [...new Set(warnings)]
}

export function buildPlannerRecommendation(
  selectedVariant: Variant | null,
  collections: PlannerCollections,
  profileSnapshot: UserProfileSnapshot | null,
): PlannerRecommendation {
  if (!selectedVariant || collections.champions.length === 0) {
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

  const formation = findFormationForVariant(collections.formations, selectedVariant)
  if (!formation) {
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
    allChampionIds: collections.champions.map((champion) => champion.id),
  })
  const candidateIds = new Set(candidatePool.candidates.map((candidate) => candidate.heroId))
  const champions = collections.champions
    .filter((champion) => candidateIds.has(champion.id))
    .sort((left, right) => left.seat - right.seat || left.id.localeCompare(right.id))

  const slots = sortSlots(formation)
  if (champions.length < slots.length) {
    return {
      result: null,
      layoutId: formation.id,
      scenarioRef: { kind: 'variant', id: selectedVariant.id },
      blocker: 'insufficient-owned-heroes',
    }
  }

  const adjacency = buildAdjacency(formation)
  const championById = new Map(champions.map((champion) => [champion.id, champion]))
  const heroSeats = Object.fromEntries(champions.map((champion) => [champion.id, champion.seat]))
  const effectsByHeroId = new Map(createRoleEffects(champions).map((effect) => [effect.heroId, effect]))

  const results = beamSearch({
    heroes: champions.map((champion) => ({ heroId: champion.id, seat: champion.seat })),
    slots,
    adjacency,
    beamWidth: 8,
    scoreFormation: (placements) => {
      const legality = checkFormationLegality({
        placements,
        heroSeats,
        variantRules: EMPTY_VARIANT_RULES,
      })

      if (!legality.legal) {
        return {
          score: 0,
          warnings: legality.violations.map(formatLegalityViolation),
          explanations: ['非法阵型已被过滤。'],
        }
      }

      const activeEffects = Object.values(placements)
        .map((heroId) => effectsByHeroId.get(heroId))
        .filter((effect): effect is ScoringEffect => Boolean(effect))

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
      variantRules: EMPTY_VARIANT_RULES,
    }).legal
  })

  if (!top) {
    return {
      result: null,
      layoutId: formation.id,
      scenarioRef: { kind: 'variant', id: selectedVariant.id },
      blocker: 'no-legal-recommendation',
    }
  }

  return {
    result: {
      score: formatScore(top.score),
      placements: top.placements,
      explanations: top.explanations.length > 0
        ? top.explanations
        : Object.values(top.placements).map((heroId) => `${championById.get(heroId)?.name.display ?? heroId} 参与基线评分`),
      warnings: [...new Set([...top.warnings, ...buildPlannerWarnings(selectedVariant, profileSnapshot)])],
    },
    layoutId: formation.id,
    scenarioRef: { kind: 'variant', id: selectedVariant.id },
    blocker: null,
  }
}
