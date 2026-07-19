/**
 * planner 推荐引擎模型入口（shim）。
 * 通用英雄能力类型与 signal semantics 已下沉到 src/domain/abilities/；
 * 此处在旧 Planner 前缀名下 re-export，保持推荐引擎与数据层调用方稳定。
 * 场景类型（scenario）是推荐引擎专属，留在此处。
 */
import type { LocalizedText, ScenarioRef, Variant } from '../types'
import type {
  HeroAbilityOverridePatch,
  HeroAbilityProfile,
  ResolvedHeroAbilityProfile,
} from '../abilities/abilityModel'
import { resolveHeroAbilityProfiles } from '../abilities/abilityModel'

export type {
  HeroAbilityKind as PlannerSignalKind,
  HeroAbilitySource as PlannerSignalSource,
  HeroAbilityMatchMode as PlannerTargetMatchMode,
  HeroPositionRelation as PlannerPositionRelation,
  HeroAbilityAmountFunc as PlannerSignalAmountFunc,
  HeroComparisonOperator as PlannerComparisonOperator,
  HeroStatKey as PlannerStatKey,
  HeroStatQualifier as PlannerStatQualifier,
  HeroQualifier as PlannerHeroQualifier,
  HeroPositionQualifier as PlannerPositionQualifier,
  HeroAbilityUnit as PlannerSignalUnit,
  HeroAbilitySignal as PlannerEffectSignal,
  HeroUnsupportedSignal as PlannerUnsupportedSignal,
  HeroAbilitySourceBreakdown as PlannerSourceBreakdown,
  HeroAbilityProfile as OfficialPlannerHeroModel,
  HeroAbilityOverridePatch as PlannerHeroOverridePatch,
  ResolvedHeroAbilityProfile as ResolvedPlannerHeroModel,
  HeroAbilityOverrideCollection as PlannerHeroOverrideCollection,
  HeroAbilityDimension,
  DIMENSION_BY_KIND,
} from '../abilities/abilityModel'

export { applyHeroAbilityPatch as applyPlannerHeroPatch } from '../abilities/abilityModel'

export {
  matchesHeroQualifier as matchesPlannerHeroQualifier,
  attachSignalSemantics as attachPlannerSignalSemantics,
  normalizeSignalAmountFunc as normalizePlannerSignalAmountFunc,
  normalizeExplicitTargeting as normalizePlannerExplicitTargeting,
  normalizeTargetQualifier as normalizePlannerTargetQualifier,
  normalizeStatQualifiers as normalizePlannerStatQualifiers,
  parsePerHeroExpr as parsePlannerPerHeroExpr,
} from '../abilities/signalSemantics.js'

export interface PlannerScenarioSlot {
  slotId: string
  row: number
  column: number
  x?: number
  y?: number
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

export type ResolvedPlannerScenarioModel = OfficialPlannerScenarioModel

export interface ResolvedPlannerModel {
  heroes: ResolvedHeroAbilityProfile[]
  scenarios: ResolvedPlannerScenarioModel[]
}

export function resolvePlannerModel(
  officialHeroes: HeroAbilityProfile[],
  officialScenarios: OfficialPlannerScenarioModel[],
  repoOverrideItems: HeroAbilityOverridePatch[],
  localOverrideItems: HeroAbilityOverridePatch[],
): ResolvedPlannerModel {
  return {
    heroes: resolveHeroAbilityProfiles(officialHeroes, repoOverrideItems, localOverrideItems),
    scenarios: officialScenarios,
  }
}

export function findPlannerScenarioForVariant(
  scenarios: ResolvedPlannerScenarioModel[],
  variant: Variant,
): ResolvedPlannerScenarioModel | null {
  return scenarios.find((scenario) => scenario.variantId === variant.id) ?? null
}
