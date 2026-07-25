import type { FormationSlot, ScenarioRef, Variant } from '../types'
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
  /**
   * 核心输出位英雄 id（阶段 15.1）。
   * 结果卡片据此反查槽位高亮 carry 标记；team-gold 模式下可能为 null。
   */
  carryHeroId: string | null
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
  /**
   * 棋盘槽位拓扑（id/row/column，来自 scenario.slotTopology），阶段 15.1 结果卡片复用棋盘渲染。
   * result 为 null 时仍可能返回（供 blocker 场景占位），无 scenario 时为空数组。
   */
  slots: FormationSlot[]
  scenarioRef: ScenarioRef | null
  blocker: PlannerRecommendationBlocker | null
}
