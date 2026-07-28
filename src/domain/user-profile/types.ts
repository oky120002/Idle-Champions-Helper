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

export interface UserProfileSnapshot {
  schemaVersion: 1
  ownedHeroes: OwnedHero[]
  importedFormationSaves: ImportedFormationSave[]
  /** 各战役 favor/blessings（normalize 从 campaignDetails 保留；旧 snapshot 无此字段，消费侧 `?? []` 兼容）。 */
  campaigns?: CampaignFavorBlessings[]
  updatedAt: string
  warnings: string[]
  legendaryLevelCap: number
}
