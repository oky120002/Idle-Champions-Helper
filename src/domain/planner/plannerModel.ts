import type { AbilityScoreKey, DataCollection, LocalizedText, ScenarioRef, Variant } from '../types'

export type PlannerSignalKind =
  | 'globalDpsMultiplier'
  | 'heroDpsMultiplier'
  | 'adjacentBuff'
  | 'taggedChampionBuff'

export type PlannerSignalSource =
  | 'official-parsed'
  | 'repo-semantic-patch'
  | 'browser-local-override'
  | 'heuristic-fallback'

export type PlannerTargetMatchMode = 'any' | 'all'
export type PlannerPositionRelation = 'any' | 'self' | 'adjacent'
export type PlannerSignalAmountFunc = 'add' | 'mult' | 'unknown'
export type PlannerComparisonOperator = '>=' | '<=' | '>' | '<' | '=='

export interface PlannerStatQualifier {
  stat: AbilityScoreKey
  operator: PlannerComparisonOperator
  value: number
}

export interface PlannerHeroQualifier {
  requiredTags?: string[]
  excludedTags?: string[]
  matchMode?: PlannerTargetMatchMode
  requiredStats?: PlannerStatQualifier[]
  requiredBaseAttackCooldown?: {
    operator: PlannerComparisonOperator
    value: number
  }
  requiredAttackDamageTypes?: string[]
  excludedAttackDamageTypes?: string[]
  minAge?: number | null
  minAgeOperator?: '>=' | '>'
  maxAge?: number | null
  maxAgeOperator?: '<=' | '<'
  excludedHeroIds?: string[]
}

export interface PlannerPositionQualifier {
  relation: PlannerPositionRelation
}

export interface PlannerEffectSignal {
  kind: PlannerSignalKind
  value: number
  rawEffect: string
  note?: string
  source: PlannerSignalSource
  targetQualifier?: PlannerHeroQualifier | null
  formationCountQualifier?: PlannerHeroQualifier | null
  positionQualifier?: PlannerPositionQualifier | null
  amountFunc?: PlannerSignalAmountFunc | null
  stackFunc?: string | null
  applyManually?: boolean
  stacksMultiply?: boolean | null
  excludeSelf?: boolean
}

export interface PlannerUnsupportedSignal {
  rawEffect: string
  rawValue: string
  note: string
  source: PlannerSignalSource
}

export interface PlannerSourceBreakdown {
  isCarryViable: PlannerSignalSource
  heuristicRoleMultiplier: PlannerSignalSource
  carrySignals: PlannerSignalSource[]
  supportSignals: PlannerSignalSource[]
  unsupportedSignals: PlannerSignalSource[]
}

export interface OfficialPlannerHeroModel {
  heroId: string
  name: LocalizedText
  seat: number
  roles: string[]
  tags: string[]
  baseAttackDamageTypes: string[]
  baseAttackCooldown: number | null
  age: number | null
  abilityScores: Partial<Record<AbilityScoreKey, number>>
  isCarryViable: boolean
  heuristicRoleMultiplier: number
  carrySignals: PlannerEffectSignal[]
  supportSignals: PlannerEffectSignal[]
  unsupportedSignals: PlannerUnsupportedSignal[]
  sourceBreakdown: PlannerSourceBreakdown
}

export interface PlannerScenarioSlot {
  slotId: string
  row: number
  column: number
  adjacentSlotIds: string[]
}

export interface OfficialPlannerScenarioModel {
  variantId: string
  scenarioRef: ScenarioRef
  name: LocalizedText
  formationLayoutId: string | null
  objectiveArea: number | null
  slotTopology: PlannerScenarioSlot[]
  forcedHeroes: string[]
  bannedHeroes: string[]
  lockedSlots: string[]
  scenarioWarnings: string[]
}

export interface PlannerHeroOverridePatch {
  heroId: string
  isCarryViable?: boolean
  carrySignals?: Omit<PlannerEffectSignal, 'source'>[]
  supportSignals?: Omit<PlannerEffectSignal, 'source'>[]
  unsupportedSignals?: Omit<PlannerUnsupportedSignal, 'source'>[]
}

export type ResolvedPlannerHeroModel = OfficialPlannerHeroModel
export type ResolvedPlannerScenarioModel = OfficialPlannerScenarioModel

export interface ResolvedPlannerModel {
  heroes: ResolvedPlannerHeroModel[]
  scenarios: ResolvedPlannerScenarioModel[]
}

export type PlannerHeroOverrideCollection = DataCollection<PlannerHeroOverridePatch>

function applyPlannerHeroPatch(
  hero: ResolvedPlannerHeroModel,
  patch: PlannerHeroOverridePatch | undefined,
  source: PlannerSignalSource,
): ResolvedPlannerHeroModel {
  if (!patch) {
    return hero
  }

  return {
    ...hero,
    isCarryViable: patch.isCarryViable ?? hero.isCarryViable,
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
      isCarryViable: patch.isCarryViable === undefined ? hero.sourceBreakdown.isCarryViable : source,
      heuristicRoleMultiplier: hero.sourceBreakdown.heuristicRoleMultiplier,
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

export function resolvePlannerModel(
  officialHeroes: OfficialPlannerHeroModel[],
  officialScenarios: OfficialPlannerScenarioModel[],
  repoOverrideItems: PlannerHeroOverridePatch[],
  localOverrideItems: PlannerHeroOverridePatch[],
): ResolvedPlannerModel {
  const repoOverridesByHeroId = new Map(repoOverrideItems.map((item) => [item.heroId, item]))
  const localOverridesByHeroId = new Map(localOverrideItems.map((item) => [item.heroId, item]))

  const heroes = officialHeroes.map((hero) => {
    const withRepoOverrides = applyPlannerHeroPatch(
      hero,
      repoOverridesByHeroId.get(hero.heroId),
      'repo-semantic-patch',
    )

    return applyPlannerHeroPatch(
      withRepoOverrides,
      localOverridesByHeroId.get(hero.heroId),
      'browser-local-override',
    )
  })

  return {
    heroes,
    scenarios: officialScenarios,
  }
}

export function findPlannerScenarioForVariant(
  scenarios: ResolvedPlannerScenarioModel[],
  variant: Variant,
): ResolvedPlannerScenarioModel | null {
  return scenarios.find((scenario) => scenario.variantId === variant.id) ?? null
}
