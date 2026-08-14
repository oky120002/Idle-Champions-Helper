/**
 * planner 推算引擎模型入口。
 * 通用英雄能力类型与 signal semantics 已下沉到 src/domain/abilities/；引擎直接引用 Hero* 名。
 * 此处只保留推算引擎专属的场景（scenario）类型与 resolver。
 */
import type { AttributeRequirement, LocalizedText, MessageRef, ScenarioRef, TagExpression, Variant } from '../types'
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
  /** 命中型段数（如 "20 hits-based HP" → 20）。null = 无命中型。同护甲吞吐量模式。 */
  hitsBased: SegmentConfig | null
  /** 全局伤害修正乘数（0.01 = 减 99%；null = 无修正）。乘进 BUD → 抬高 DPS 墙。 */
  damageModifier: number | null
  /** 敌人伤害倍率（3 = 3x；null = 无修正）。乘进 monsterDpsAt → 降低 survivableArea。 */
  enemyDamageMult: number | null
  /** 每秒持续掉血占比（0.025 = 2.5%/s；null = 无持续掉血）。降低 carry 有效生命 → 降低 survivableArea。 */
  healthDrainRate: number | null
}

/** 空 viabilityContext（普通变体）。 */
export const EMPTY_VIABILITY_CONTEXT: ViabilityContext = {
  armor: null,
  hitsBased: null,
  damageModifier: null,
  enemyDamageMult: null,
  healthDrainRate: null,
}

/**
 * 伤害来源位置限制模式（restrictions 文本解析）。
 * carry 不在可造伤害位置 → DPS 归零（SCORE_ZERO）。支援位不受影响（formation abilities are active）。
 * 模式依赖参考英雄位置，在评分时按 placements 动态求值。
 */
export interface DamageSourcePattern {
  /**
   * 'same-column'：carry 须与参考英雄同列。
   * 'adjacent'：carry 须在参考英雄的相邻槽位（含参考英雄自身槽位）。
   * 'not-adjacent'：carry 须不在相邻槽位（含参考英雄自身槽位）。
   * 'front-columns'：carry 须在参考英雄及其前方 N 列（column ≤ refCol，下界 refCol−span）。
   * 'behind-columns'：carry 须在参考英雄及其后方 N 列（column ≥ refCol，上界 refCol+span）。
   */
  kind: 'same-column' | 'adjacent' | 'not-adjacent' | 'front-columns' | 'behind-columns'
  /** 参考英雄 ID（restrictions 中具名、在 champion 名表中解析到的 forced hero）。 */
  referenceHeroId: string
  /** front/behind-columns 的列跨度（默认 2 / 1）；大值（如 100）表示不限列数。 */
  columnSpan?: number
}

export interface OfficialPlannerScenarioModel {
  variantId: string
  scenarioRef: ScenarioRef
  name: LocalizedText
  formationLayoutId: string | null
  objectiveArea: number | null
  slotTopology: PlannerScenarioSlot[]
  forcedHeroes: string[]
  scenarioWarnings: MessageRef[]
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
  /** 伤害来源位置限制（restrictions 解析；null = 无位置限制）。carry 在无效位置 → DPS 归零。 */
  damageSourcePattern: DamageSourcePattern | null
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
