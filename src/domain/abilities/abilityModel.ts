import type { AbilityScoreKey, DataCollection, LocalizedText } from '../types'

/**
 * 英雄能力表达层（hero-agnostic）。算法-英雄握手点唯一：HeroAbilityProfile。
 * 本文件不含推荐引擎语义；推荐引擎消费此处类型。
 */

export type HeroAbilityKind =
  | 'globalDpsMultiplier'
  | 'heroDpsMultiplier'
  | 'adjacentBuff'
  | 'taggedChampionBuff'

export type HeroAbilitySource =
  | 'official-parsed'
  | 'repo-semantic-patch'
  | 'browser-local-override'
  | 'heuristic-fallback'

export type HeroPositionRelation =
  | 'any'
  | 'self'
  | 'adjacent'
  | 'adjacentOrSelf'
  | 'nonAdjacent'
  | 'withinTwoSlots'
  | 'withinTwoSlotsOrSelf'
  | 'withinThreeSlots'
  | 'withinThreeSlotsOrSelf'
  | 'sameColumn'
  | 'sameOrAheadColumns'
  | 'adjacentColumns'
  | 'aheadColumn'
  | 'allAheadColumns'
  | 'behindColumn'
  | 'aheadTwoColumns'
  | 'behindTwoColumns'
  | 'allBehindColumns'
  | 'sameOrBehindColumn'
  | 'sameOrBehindColumns'
  | 'selfAndBehindTwoColumns'
  | 'exactlyBehindOneColumn'
  | 'exactlyBehindTwoColumns'
  | 'exactlyBehindThreeColumns'
  | 'frontTwoColumns'
  | 'backTwoColumns'
  | 'rearMostColumn'
  | 'secondRearMostColumn'
  | 'thirdRearMostColumn'

export type HeroAbilityAmountFunc = 'add' | 'mult' | 'unknown'
export type HeroComparisonOperator = '>=' | '<=' | '>' | '<' | '=='
export type HeroStatKey = AbilityScoreKey | 'total_ability_score'

export interface HeroStatQualifier {
  stat: HeroStatKey
  operator: HeroComparisonOperator
  value: number
}

export type HeroPredicateAST =
  | { op: 'or'; children: HeroPredicateAST[] }
  | { op: 'and'; children: HeroPredicateAST[] }
  | { op: 'not'; child: HeroPredicateAST }
  | { op: 'tag'; tag: string }
  | { op: 'stat'; stat: HeroStatKey; operator: HeroComparisonOperator; value: number }
  | { op: 'age'; operator: HeroComparisonOperator; value: number; excludeHeroId?: string }
  | { op: 'heroId'; heroId: string; negate: boolean }
  | { op: 'attackType'; attackType: string; negate: boolean }
  | { op: 'baseAttackCooldown'; operator: HeroComparisonOperator; value: number }
  | { op: 'true' }

export interface HeroQualifier {
  predicate: HeroPredicateAST
}

export interface HeroPositionQualifier {
  relation: HeroPositionRelation
}

export type HeroAbilityUnit = 'percent' | 'flat' | 'boolean'

export interface HeroAbilitySignal {
  kind: HeroAbilityKind
  value: number
  rawEffect: string
  note?: string
  source: HeroAbilitySource
  bonusScaleOfSignal?: HeroAbilitySignal | null
  targetQualifier?: HeroQualifier | null
  formationCountQualifier?: HeroQualifier | null
  positionQualifier?: HeroPositionQualifier | null
  formationCountPositionQualifier?: HeroPositionQualifier | null
  amountFunc?: HeroAbilityAmountFunc | null
  stackFunc?: string | null
  applyManually?: boolean
  stacksMultiply?: boolean | null
  excludeSelf?: boolean
  unit?: HeroAbilityUnit
}

export interface HeroUnsupportedSignal {
  rawEffect: string
  rawValue: string
  note: string
  source: HeroAbilitySource
}

export interface HeroAbilitySourceBreakdown {
  carrySignals: HeroAbilitySource[]
  supportSignals: HeroAbilitySource[]
  unsupportedSignals: HeroAbilitySource[]
}

export interface HeroAbilityProfile {
  heroId: string
  name: LocalizedText
  seat: number
  roles: string[]
  tags: string[]
  baseAttackDamageTypes: string[]
  baseAttackCooldown: number | null
  age: number | null
  abilityScores: Partial<Record<AbilityScoreKey, number>>
  baseDamage: number
  /**
   * 升级 cost 曲线（来自 champion-details.costCurves，key 统一为 "1"）。
   * levelCurve(level) = rate^level 近似 DPS 增长上界（ponytail，阶段 7 BUD 精确化）。
   */
  costCurves?: Record<string, number> | null
  carrySignals: HeroAbilitySignal[]
  supportSignals: HeroAbilitySignal[]
  unsupportedSignals: HeroUnsupportedSignal[]
  sourceBreakdown: HeroAbilitySourceBreakdown
}

export interface HeroAbilityOverridePatch {
  heroId: string
  carrySignals?: Omit<HeroAbilitySignal, 'source'>[]
  supportSignals?: Omit<HeroAbilitySignal, 'source'>[]
  unsupportedSignals?: Omit<HeroUnsupportedSignal, 'source'>[]
}

export type ResolvedHeroAbilityProfile = HeroAbilityProfile

export type HeroAbilityOverrideCollection = DataCollection<HeroAbilityOverridePatch>

export type HeroAbilityDimension =
  | 'damage'
  | 'gold'
  | 'crit'
  | 'survival'
  | 'vulnerability'
  | 'speed'
  | 'cooldown'
  | 'ultimate'
  | 'utility'
  | 'global-buff'

export const DIMENSION_BY_KIND: Record<HeroAbilityKind, HeroAbilityDimension> = {
  globalDpsMultiplier: 'damage',
  heroDpsMultiplier: 'damage',
  adjacentBuff: 'damage',
  taggedChampionBuff: 'damage',
}

/**
 * 加成归属 pool：global 影响全局池（所有英雄），hero 仅作用于 carry 自身。
 * 加成聚合时同一 pool 内 additive 百分比相加、multiplicative 因子相乘；global 与 hero pool 间相乘。
 * 详见 docs/modules/planner/carry-dps-formula-spike.md 与 evolution-plan.md 阶段 2.3。
 */
export type HeroAbilityPoolScope = 'global' | 'hero'

export const POOL_SCOPE_BY_KIND: Record<HeroAbilityKind, HeroAbilityPoolScope> = {
  globalDpsMultiplier: 'global',
  heroDpsMultiplier: 'hero',
  adjacentBuff: 'hero',
  taggedChampionBuff: 'hero',
}

export function applyHeroAbilityPatch(
  hero: ResolvedHeroAbilityProfile,
  patch: HeroAbilityOverridePatch | undefined,
  source: HeroAbilitySource,
): ResolvedHeroAbilityProfile {
  if (!patch) {
    return hero
  }

  return {
    ...hero,
    carrySignals: patch.carrySignals
      ? patch.carrySignals.map((signal) => ({ ...signal, source }))
      : hero.carrySignals,
    supportSignals: patch.supportSignals
      ? patch.supportSignals.map((signal) => ({ ...signal, source }))
      : hero.supportSignals,
    unsupportedSignals: patch.unsupportedSignals
      ? patch.unsupportedSignals.map((signal) => ({ ...signal, source }))
      : hero.unsupportedSignals,
    sourceBreakdown: {
      carrySignals: patch.carrySignals
        ? patch.carrySignals.map(() => source)
        : hero.sourceBreakdown.carrySignals,
      supportSignals: patch.supportSignals
        ? patch.supportSignals.map(() => source)
        : hero.sourceBreakdown.supportSignals,
      unsupportedSignals: patch.unsupportedSignals
        ? patch.unsupportedSignals.map(() => source)
        : hero.sourceBreakdown.unsupportedSignals,
    },
  }
}

export function resolveHeroAbilityProfiles(
  officialHeroes: HeroAbilityProfile[],
  repoOverrideItems: HeroAbilityOverridePatch[],
  localOverrideItems: HeroAbilityOverridePatch[],
): ResolvedHeroAbilityProfile[] {
  const repoOverridesByHeroId = new Map(repoOverrideItems.map((item) => [item.heroId, item]))
  const localOverridesByHeroId = new Map(localOverrideItems.map((item) => [item.heroId, item]))

  return officialHeroes.map((hero) => {
    const withRepoOverrides = applyHeroAbilityPatch(
      hero,
      repoOverridesByHeroId.get(hero.heroId),
      'repo-semantic-patch',
    )

    return applyHeroAbilityPatch(
      withRepoOverrides,
      localOverridesByHeroId.get(hero.heroId),
      'browser-local-override',
    )
  })
}
