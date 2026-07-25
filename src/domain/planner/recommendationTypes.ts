import type { FormationSlot, ScenarioRef, Variant } from '../types'
import type { AreaEstimationResult } from './areaEstimation'
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
  /** 推图层数预估（阶段 15.2）；team-gold 模式或缺 carry 时为 null。绝对值未校准，仅相对比较参考。 */
  areaEstimate?: AreaEstimationResult | null
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
  /** top1 结果（= results[0]，兼容现有消费方）；无合法推荐时为 null。 */
  result: PlannerResult | null
  /** distinct-carry Top K 阵型（阶段 15.2）；result 为 null 时为空数组。 */
  results: PlannerResult[]
  layoutId: string | null
  /**
   * 棋盘槽位拓扑（id/row/column，来自 scenario.slotTopology），阶段 15.1 结果卡片复用棋盘渲染。
   * result 为 null 时仍可能返回（供 blocker 场景占位），无 scenario 时为空数组。
   */
  slots: FormationSlot[]
  scenarioRef: ScenarioRef | null
  blocker: PlannerRecommendationBlocker | null
}
