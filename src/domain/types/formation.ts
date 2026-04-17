import type { LocalizedOption, LocalizedText } from './common'

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
