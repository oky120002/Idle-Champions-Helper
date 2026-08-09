/**
 * planner 推荐引擎模型入口。
 * 通用英雄能力类型与 signal semantics 已下沉到 src/domain/abilities/；引擎直接引用 Hero* 名。
 * 此处只保留推荐引擎专属的场景（scenario）类型与 resolver。
 */
import type { AttributeRequirement, LocalizedText, ScenarioRef, TagExpression, Variant } from '../types'
import type {
  HeroAbilityOverridePatch,
  HeroAbilityProfile,
  ResolvedHeroAbilityProfile,
} from '../abilities/abilityModel'
import { resolveHeroAbilityProfiles } from '../abilities/abilityModel'

export interface PlannerScenarioSlot {
  slotId: string
  row: number
  column: number
  x?: number
  y?: number
  adjacentSlotIds: string[]
}

/** 护甲/命中型段数配置（可含层数递增）。 */
export interface SegmentConfig {
  segments: number
  scaling?: { additional: number; everyAreas: number }
}

/** 变体可行性上下文（restrictions 解析；全 null = 普通变体，不施加额外约束）。 */
export interface ViabilityContext {
  /** 护甲段数（如 "50 armored HP" → 50）。null = 无护甲。吞吐量等效门槛 = monsterHealthAt(area) × segmentsAt(area)。 */
  armor: SegmentConfig | null
  /** 命中型段数（如 "20 hits-based HP" → 20）。null = 无命中型。 */
  hitsBased: SegmentConfig | null
  /** 全局伤害修正乘数（0.01 = 减 99%；null = 无修正）。乘进 BUD → 抬高 DPS 墙。 */
  damageModifier: number | null
  /** 敌人伤害倍率（3 = 3x；null = 无修正）。乘进 monsterDpsAt → 降低 survivableArea。 */
  enemyDamageMult: number | null
}

/** 空 viabilityContext（普通变体）。 */
export const EMPTY_VIABILITY_CONTEXT: ViabilityContext = {
  armor: null,
  hitsBased: null,
  damageModifier: null,
  enemyDamageMult: null,
}

export interface OfficialPlannerScenarioModel {
  variantId: string
  scenarioRef: ScenarioRef
  name: LocalizedText
  formationLayoutId: string | null
  objectiveArea: number | null
  slotTopology: PlannerScenarioSlot[]
  forcedHeroes: string[]
  scenarioWarnings: string[]
  /** 场景怪物类型（来自 variant.enemyTypes），供 vulnerability 条件性匹配。 */
  enemyTypes: string[]
  /** 白名单英雄 id（game_change only_allow_crusaders.by_ids；空=不限）。 */
  allowedHeroes: string[]
  /** 白名单英雄 tag 表达式（DNF：OR of ANDs；空=不限）。 */
  allowedTagExpression: TagExpression
  /** 属性门槛（restriction 文本解析：CON/INT/CHA/STR/DEX/WIS score of N or higher/lower；空=不限）。 */
  attributeRequirements: AttributeRequirement[]
  /**
   * 被非英雄实体（小鸡/小鬼等）占据的格数（restrictions 文本解析）。
   * formation 搜索可用容量 = slotTopology.length − occupiedSlotCount（见 recommendationEngine）。
   */
  occupiedSlotCount: number
  /** 变体可行性上下文（restrictions 解析；全 null = 普通变体）。 */
  viabilityContext: ViabilityContext
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
