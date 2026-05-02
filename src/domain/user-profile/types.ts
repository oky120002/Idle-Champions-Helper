import type { ScenarioRef } from '../types/formation'

export interface OwnedHero {
  heroId: string
  level: number
  equipment: Record<string, number>
  feats: string[]
  legendaryEffects: string[]
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

export interface UserProfileSnapshot {
  schemaVersion: 1
  ownedHeroes: OwnedHero[]
  importedFormationSaves: ImportedFormationSave[]
  updatedAt: string
  warnings: string[]
}
