import type { FormationSlot, ScenarioRef, Variant } from '../types'
import type { AreaEstimationResult } from './areaEstimation'
import type { ResolvedPlannerScenarioModel } from './plannerModel'
import type { ResolvedHeroAbilityProfile } from '../abilities/abilityModel'
import type { FeatCatalog } from '../abilities/featSignals'
import type { SimulationBreakdown } from './steadyStateScoring'

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
  /**
   * 当前推荐模式主目标量的游戏记数法字符串（可超 Number.MAX_VALUE）。
   * carry-dps 模式 = carryDps；team-gold 模式 = teamGoldFind；UI 按 scoringMode 切换显示标签。
   * 取代旧"评分（score）"概念——值是真实优化目标量，非启发式角色权重评分。
   */
  objectiveValue: string
  /**
   * 核心输出位英雄 id。
   * 结果卡片据此反查槽位高亮 carry 标记；team-gold 模式下可能为 null。
   */
  carryHeroId: string | null
  placements: Record<string, string>
  placementEntries?: PlannerPlacementEntry[]
  explanations: PlannerNarrativeLine[]
  warnings: string[]
  /** 推图层数预估；team-gold 模式或缺 carry 时为 null。绝对值未校准，仅相对比较参考。 */
  areaEstimate?: AreaEstimationResult | null
  /**
   * 结构化加成拆解（阵型模拟 JSON 契约）：baseDps/factors/pools/contributions，
   * UI 据此渲染每位英雄加成，CLI 据此输出 JSON；team-gold 模式或缺 carry 时为 null。
   */
  breakdown: SimulationBreakdown | null
}

export interface PlannerCollections {
  variants: Variant[]
  plannerHeroes: ResolvedHeroAbilityProfile[]
  plannerScenarios: ResolvedPlannerScenarioModel[]
  /** feat 专长 catalog（heroId → FeatEntry[]），按 scoringMode 维度选 active feat signal。 */
  featCatalog?: FeatCatalog
}

export type PlannerRecommendationBlocker =
  | 'missing-profile'
  | 'missing-formation'
  | 'insufficient-owned-heroes'
  | 'no-legal-recommendation'

export interface PlannerRecommendation {
  /** top1 结果（= results[0]，兼容现有消费方）；无合法推荐时为 null。 */
  result: PlannerResult | null
  /** distinct-carry Top K 阵型；result 为 null 时为空数组。 */
  results: PlannerResult[]
  layoutId: string | null
  /**
   * 棋盘槽位拓扑（id/row/column，来自 scenario.slotTopology）结果卡片复用棋盘渲染。
   * result 为 null 时仍可能返回（供 blocker 场景占位），无 scenario 时为空数组。
   */
  slots: FormationSlot[]
  scenarioRef: ScenarioRef | null
  blocker: PlannerRecommendationBlocker | null
}
