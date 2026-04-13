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

export interface ChampionPortrait {
  path: string
  sourceGraphic: string
  sourceVersion: number | null
}

export type RemoteGraphicDelivery = 'wrapped-png' | 'zlib-png' | 'unknown'

export interface RemoteGraphicAsset {
  graphicId: string
  sourceGraphic: string
  sourceVersion: number | null
  remotePath: string
  remoteUrl: string
  delivery: RemoteGraphicDelivery
  uses: string[]
}

export interface ChampionVisualPortrait {
  localPath: string
  remote: RemoteGraphicAsset
}

export interface ChampionSkinVisual {
  id: string
  name: LocalizedText
  portrait: RemoteGraphicAsset | null
  base: RemoteGraphicAsset | null
  large: RemoteGraphicAsset | null
  xl: RemoteGraphicAsset | null
}

export interface ChampionVisual {
  championId: string
  seat: number
  name: LocalizedText
  portrait: ChampionVisualPortrait | null
  base: RemoteGraphicAsset | null
  skins: ChampionSkinVisual[]
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
