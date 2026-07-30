import type { ScenarioRef } from '../types/formation'

export interface OwnedHeroLootSlot {
  slotId: string
  rarity: number
  gild: number
  enchant: number
  pigment: number
  found: Record<string, number>
}

export interface OwnedHeroLegendarySlot {
  slotId: string
  level: number
  effectId: string | null
  effectIds: string[]
  resetCurrencyId: string | null
  upgradeCost: number
}

export interface OwnedHero {
  heroId: string
  level: number
  equipment: Record<string, number>
  feats: string[]
  legendaryEffects: string[]
  unlockedFeats: string[]
  activeFeats: string[]
  featSlots: number
  isOwned: boolean
  gildableSlotId: string | null
  lootBySlot: Record<string, OwnedHeroLootSlot>
  legendaryBySlot: Record<string, OwnedHeroLegendarySlot>
  /**
   * 玩家已选专精 upgrade id（来自 userDetails details.heroes[].specialization_choices）。
   * 专精是互斥选项（一个专精层选一个），id 对应 specialization-catalog 的 upgradeId；
   * 运行时只注入这些 id 的 signal，而非全 active（ADR 0017）。
   */
  specializations: string[]
}

export interface ImportedFormationSave {
  formationId: string
  layoutId: string
  scenarioRef: ScenarioRef
  placements: Record<string, string>
  specializations: Record<string, string>
  feats: Record<string, string[]>
  familiars: Record<string, string>
  isFavorite: boolean
}

/** 每个战役的 favor 与 blessings（账号级累积；global blessing 聚合进 globalBuffMultiplier 用，消费侧 phased）。 */
export interface CampaignFavorBlessings {
  campaignId: string
  favor: string
  blessings: Record<string, number>
}

/**
 * blessing（reset_upgrade）定义条目。
 * type 1=地图（仅 currencyId 匹配的 campaign/deity 生效）/ 2=全局（跨 campaign）。
 */
export interface BlessingCatalogEntry {
  id: string
  type: number
  /** reset_currency_id（地图 blessing 的生效 campaign/deity）。 */
  currencyId: number
  effects: ReadonlyArray<{ effectString: string; perLevel: number }>
}

export interface UserProfileSnapshot {
  schemaVersion: 1
  ownedHeroes: OwnedHero[]
  importedFormationSaves: ImportedFormationSave[]
  /** 各战役 favor/blessings（normalize 从 campaignDetails 保留；旧 snapshot 无此字段，消费侧 `?? []` 兼容）。 */
  campaigns?: CampaignFavorBlessings[]
  /** patron perk 已购等级（perk_id → level，来自 userdetails.patron_perks）；旧 snapshot 无此字段，消费侧 `?? {}` 兼容。 */
  patronPerks?: Record<string, number>
  /**
   * blessing 定义 + 已购等级（reset_upgrade；定义来自 userDetails.defines.reset_upgrade_defines，
   * actual 来自 userDetails.details.reset_upgrade_levels——两者同源于私有 payload，故都进 snapshot 而非 public json）。
   * 旧 snapshot 无此字段，消费侧 `?` 兼容。
   */
  blessings?: {
    catalog: BlessingCatalogEntry[]
    levels: Record<string, number>
  }
  /**
   * active instance 的赞助者/战役上下文（multi-instance 解码，来自 active_game_instance_id 对应的 game_instance）。
   * - patronId：active instance 的 current_patron_id（0=无 patron 自由玩）；patron type1 本地增益仅此 patron 生效。
   * - deity：active instance 当前战役的 reset_currency_id；地图 blessing type1 仅此 deity 生效。
   * 旧 snapshot 无此字段，消费侧 `?` 兼容。
   */
  activeContext?: {
    patronId: number
    deity: number | null
  }
  updatedAt: string
  warnings: string[]
  legendaryLevelCap: number
}
