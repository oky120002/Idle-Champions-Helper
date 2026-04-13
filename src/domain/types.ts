export interface DataVersion {
  current: string
  updatedAt: string
  notes: string[]
}

export interface DataCollection<T> {
  items: T[]
  updatedAt: string
}

export interface LocalizedText {
  original: string
  display: string
}

export interface LocalizedOption extends LocalizedText {
  id: string
}

export type JsonPrimitive = string | number | boolean | null

export interface JsonObject {
  [key: string]: JsonValue
}

export type JsonValue = JsonPrimitive | JsonObject | JsonValue[]

export interface ChampionPortrait {
  path: string
  sourceGraphic: string
  sourceVersion: number | null
}

export interface Champion {
  id: string
  name: LocalizedText
  seat: number
  roles: string[]
  affiliations: LocalizedText[]
  tags: string[]
  portrait?: ChampionPortrait | null
}

export type AbilityScoreKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'

export interface ChampionAvailability {
  availableInNextEvent: boolean
  availableInShop: boolean
  availableInTimeGate: boolean
  isAvailable: boolean
  nextEventTimestamp: number | null
}

export interface ChampionCharacterSheet {
  fullName: LocalizedText | null
  class: LocalizedText | null
  race: LocalizedText | null
  age: number | null
  alignment: LocalizedText | null
  abilityScores: Partial<Record<AbilityScoreKey, number>>
  backstory: LocalizedText | null
}

export interface ChampionRawSnapshotPair {
  original: JsonValue
  display: JsonValue
}

export interface ChampionRawEntry {
  id: string
  snapshots: ChampionRawSnapshotPair
}

export interface ChampionAttackDetail {
  id: string
  name: LocalizedText
  description: LocalizedText | null
  longDescription: LocalizedText | null
  cooldown: number | null
  numTargets: number | null
  aoeRadius: number | null
  damageModifier: string | null
  target: string | null
  damageTypes: string[]
  tags: string[]
  graphicId: string | null
  animations: JsonValue
}

export interface ChampionEventUpgradeDetail {
  upgradeId: string
  name: LocalizedText
  description: LocalizedText | null
  graphicId: string | null
}

export interface ChampionUpgradeDetail {
  id: string
  requiredLevel: number | null
  requiredUpgradeId: string | null
  name: LocalizedText | null
  upgradeType: string | null
  effectReference: string | null
  effectDefinition: ChampionRawEntry | null
  staticDpsMult: string | null
  defaultEnabled: boolean
  specializationName: LocalizedText | null
  specializationDescription: LocalizedText | null
  specializationGraphicId: string | null
  tipText: LocalizedText | null
}

export interface ChampionFeatDetail {
  id: string
  order: number | null
  name: LocalizedText
  description: LocalizedText | null
  rarity: string | null
  graphicId: string | null
  effects: JsonValue
  sources: JsonValue
  properties: JsonValue
  collectionsSource: JsonValue
}

export interface ChampionSkinDetail {
  id: string
  name: LocalizedText
  cost: JsonValue
  details: JsonValue
  rarity: string | null
  properties: JsonValue
  collectionsSource: JsonValue
  availabilities: JsonValue | null
}

export interface ChampionDetailRaw {
  hero: ChampionRawSnapshotPair
  attacks: ChampionRawEntry[]
  upgrades: ChampionRawEntry[]
  feats: ChampionRawEntry[]
  skins: ChampionRawEntry[]
}

export interface ChampionDetail {
  updatedAt: string
  summary: Champion
  englishName: string
  eventName: LocalizedText | null
  dateAvailable: string | null
  lastReworkDate: string | null
  popularity: number | null
  baseCost: string | null
  baseDamage: string | null
  baseHealth: string | null
  graphicId: string | null
  portraitGraphicId: string | null
  availability: ChampionAvailability
  adventureIds: string[]
  defaultFeatSlotUnlocks: number[]
  costCurves: JsonValue
  healthCurves: JsonValue
  properties: JsonValue
  characterSheet: ChampionCharacterSheet | null
  attacks: {
    base: ChampionAttackDetail | null
    ultimate: ChampionAttackDetail | null
    eventUpgrades: ChampionEventUpgradeDetail[]
  }
  upgrades: ChampionUpgradeDetail[]
  feats: ChampionFeatDetail[]
  skins: ChampionSkinDetail[]
  raw: ChampionDetailRaw
}

export interface Variant {
  id: string
  name: LocalizedText
  campaign: LocalizedOption
  restrictions: LocalizedText[]
  rewards: LocalizedText[]
}

export interface ScenarioRef {
  kind: 'campaign' | 'adventure' | 'variant' | 'trial' | 'timeGate'
  id: string
}

export interface FormationSlot {
  id: string
  row: number
  column: number
}

export interface FormationLayout {
  id: string
  name: string
  notes?: string
  slots: FormationSlot[]
  applicableContexts?: ScenarioRef[]
  laneHints?: {
    front?: string[]
    middle?: string[]
    back?: string[]
  }
}

export interface FormationDraft {
  schemaVersion: 1
  dataVersion: string
  layoutId: string
  scenarioRef: ScenarioRef | null
  placements: Record<string, string>
  updatedAt: string
}

export type PresetPriority = 'low' | 'medium' | 'high'

export interface FormationPreset {
  id: string
  schemaVersion: 1
  dataVersion: string
  name: string
  description: string
  layoutId: string
  placements: Record<string, string>
  scenarioRef: ScenarioRef | null
  scenarioTags: string[]
  priority: PresetPriority
  createdAt: string
  updatedAt: string
}

export type UserImportMethod = 'supportUrl' | 'manual' | 'webRequestLog'

export interface UserCredentials {
  userId: string
  hash: string
}

export interface MaskedUserCredentials {
  userId: string
  hash: string
}

export type UserImportParseResult =
  | {
      ok: true
      value: UserCredentials
    }
  | {
      ok: false
      error: string
    }
