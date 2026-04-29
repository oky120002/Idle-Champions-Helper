import type { LocalizedOption, LocalizedText } from './common'

export interface VariantAreaHighlight {
  id: string
  kind: string
  start: number
  end: number | null
  loopAt: number | null
  repeatAt: number | null
}

export interface VariantAttackMix {
  melee: number
  ranged: number
  magic: number
  other: number
}

export interface Variant {
  id: string
  name: LocalizedText
  campaign: LocalizedOption
  adventureId: string | null
  adventure: LocalizedText | null
  objectiveArea: number | null
  locationId: string | null
  areaSetId: string | null
  scene: LocalizedOption | null
  restrictions: LocalizedText[]
  rewards: LocalizedText[]
  enemyCount: number
  enemyTypes: string[]
  enemyTypeCounts?: Record<string, number>
  attackMix: VariantAttackMix
  specialEnemyCount: number
  escortCount: number
  areaHighlights: VariantAreaHighlight[]
  areaMilestones: number[]
  mechanics: string[]
}

export interface ScenarioRef {
  kind: 'campaign' | 'adventure' | 'variant' | 'trial' | 'timeGate'
  id: string
}

export interface FormationContext extends ScenarioRef {
  name: LocalizedText
  campaignId?: string
  variantAdventureId?: string
}

export interface FormationSlot {
  id: string
  row: number
  column: number
  x?: number
  y?: number
  adjacentSlotIds?: string[]
}

export interface FormationLayout {
  id: string
  name: LocalizedText
  notes?: LocalizedText
  slots: FormationSlot[]
  applicableContexts?: ScenarioRef[]
  sourceContexts?: FormationContext[]
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
