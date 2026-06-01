import { beamSearch } from '../../domain/planner/beamSearchRanking'
import { buildCandidatePool } from '../../domain/planner/candidatePool'
import { checkFormationLegality, type LegalityViolation } from '../../domain/planner/formationLegality'
import { scoreFormation, type ScoringEffect } from '../../domain/planner/steadyStateScoring'
import type { VariantRuleResult } from '../../domain/planner/variantRuleProjection'
import { formatGameNumber, parseGameNumber } from '../../domain/simulator/gameNumber'
import type { Champion, FormationLayout, ScenarioRef, Variant } from '../../domain/types'
import type { UserProfileSnapshot } from '../../domain/user-profile/types'
import type {
  PlannerNarrativeLine,
  PlannerPlacementEntry,
  PlannerResultCardProps,
} from './PlannerResultCard'

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
const ROLE_PRIORITY = ['dps', 'support', 'tanking', 'healing', 'gold'] as const
const ROLE_LABELS: Record<string, PlannerNarrativeLine> = {
  dps: { zh: '输出', en: 'damage' },
  support: { zh: '辅助', en: 'support' },
  tanking: { zh: '前排', en: 'frontline' },
  healing: { zh: '治疗', en: 'healing' },
  gold: { zh: '金币增益', en: 'gold gain' },
}

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

function getRolePriorityScore(champion: Champion): number {
  const roles = new Set(champion.roles.map((role) => role.toLowerCase()))

  if (roles.has('dps')) return 5
  if (roles.has('support')) return 4
  if (roles.has('tanking')) return 3
  if (roles.has('healing')) return 2
  if (roles.has('gold')) return 1
  return 0
}

function getChampionRoleSummary(champion: Champion): PlannerNarrativeLine {
  const normalizedRoles = [...new Set(champion.roles.map((role) => role.toLowerCase()))]
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

function buildPlannerWarnings(variant: Variant, snapshot: UserProfileSnapshot): string[] {
  const warnings = [...snapshot.warnings]

  if (variant.restrictions.length > 0 || variant.mechanics.length > 0) {
    warnings.push('当前推荐尚未解析场景限制与机制，只按已拥有英雄、seat 合法性和阵型槽位计算。')
  }

  return [...new Set(warnings)]
}

function buildPlacementEntries(
  slots: string[],
  placements: Record<string, string>,
  championById: Map<string, Champion>,
): PlannerPlacementEntry[] {
  return slots
    .filter((slotId) => placements[slotId] !== undefined)
    .map((slotId, index) => {
      const heroId = placements[slotId]!
      const champion = championById.get(heroId)

      return {
        slotId,
        slotLabel: String(index + 1),
        heroId,
        heroName: champion?.name.display ?? heroId,
        seat: champion?.seat ?? null,
      }
    })
}

function buildPlannerExplanations(
  variant: Variant,
  placementEntries: PlannerPlacementEntry[],
  championById: Map<string, Champion>,
  rawExplanations: string[],
): PlannerNarrativeLine[] {
  const sortedChampions = placementEntries
    .map((entry) => championById.get(entry.heroId))
    .filter((champion): champion is Champion => Boolean(champion))
    .sort((left, right) => (
      getRolePriorityScore(right) - getRolePriorityScore(left)
      || left.seat - right.seat
      || left.id.localeCompare(right.id)
    ))

  const leadChampion = sortedChampions[0] ?? null
  const supportChampions = sortedChampions
    .slice(1, 4)
    .map((champion) => champion.name.display)

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
      zh: `当前版本更偏向稳定的职业权重组合；${variant.restrictions.length > 0 ? '场景限制仍需你手动复核。' : '后续再逐步补进技能联动和场景机制。'}`,
      en: `This version still prefers stable role-weight combinations; ${variant.restrictions.length > 0 ? 'scenario restrictions still need manual review.' : 'skill synergies and scenario mechanics will be layered in later.'}`,
    })
  }

  return explanations
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

  const placementEntries = buildPlacementEntries(slots, top.placements, championById)

  return {
    result: {
      score: formatScore(top.score),
      placements: top.placements,
      placementEntries,
      explanations: buildPlannerExplanations(
        selectedVariant,
        placementEntries,
        championById,
        top.explanations,
      ),
      warnings: [...new Set([...top.warnings, ...buildPlannerWarnings(selectedVariant, profileSnapshot)])],
    },
    layoutId: formation.id,
    scenarioRef: { kind: 'variant', id: selectedVariant.id },
    blocker: null,
  }
}
