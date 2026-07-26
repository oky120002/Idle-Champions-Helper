/**
 * planner 推荐引擎模型入口。
 * 通用英雄能力类型与 signal semantics 已下沉到 src/domain/abilities/；引擎直接引用 Hero* 名。
 * 此处只保留推荐引擎专属的场景（scenario）类型与 resolver。
 */
import type { LocalizedText, ScenarioRef, Variant } from '../types'
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
  /** 场景怪物类型（来自 variant.enemyTypes），供 vulnerability 条件性匹配。 */
  enemyTypes: string[]
  /** 白名单英雄 id（game_change only_allow_crusaders.by_ids；空=不限）。 */
  allowedHeroes: string[]
  /** 白名单英雄 tag（only_allow_crusaders.by_tags，| 为 OR；空=不限）。 */
  allowedTags: string[]
  /**
   * 被非英雄实体（小鸡/小鬼/护送等）占据的格数（restrictions 文本解析）。
   * 与 mechanics lockedSlots 是两个来源描述同一批被占格子；formation 搜索可用容量 =
   * slotTopology.length − max(occupiedSlotCount, lockedSlots.length)（见 recommendationEngine）。
   */
  occupiedSlotCount: number
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
