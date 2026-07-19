import type { ScenarioRef, Variant } from '../types'
import type { ResolvedPlannerScenarioModel } from './plannerModel'
import type { ResolvedHeroAbilityProfile } from '../abilities/abilityModel'

export interface PlannerNarrativeLine {
  zh: string
  en: string
}

export interface PlannerPlacementEntry {
  slotId: string
  slotLabel: string
  heroId: string
  heroName: string
  seat: number | null
}

export interface PlannerResult {
  score: string
  placements: Record<string, string>
  placementEntries?: PlannerPlacementEntry[]
  explanations: PlannerNarrativeLine[]
  warnings: string[]
}

export interface PlannerCollections {
  variants: Variant[]
  plannerHeroes: ResolvedHeroAbilityProfile[]
  plannerScenarios: ResolvedPlannerScenarioModel[]
}

export type PlannerRecommendationBlocker =
  | 'missing-profile'
  | 'missing-formation'
  | 'insufficient-owned-heroes'
  | 'no-legal-recommendation'

export interface PlannerRecommendation {
  result: PlannerResult | null
  layoutId: string | null
  scenarioRef: ScenarioRef | null
  blocker: PlannerRecommendationBlocker | null
}
