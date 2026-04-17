import type { Champion, FormationLayout, LocalizedText, ScenarioRef } from '../../domain/types'

export interface FormationSnapshotLike {
  schemaVersion: number
  dataVersion: string
  layoutId: string
  scenarioRef: ScenarioRef | null
  placements: Record<string, string>
  updatedAt: string
}

export type FormationRestoreMode = 'exact' | 'compatible'

export interface ValidatedFormationPlacements {
  layout: FormationLayout
  placements: Record<string, string>
  invalidSlotIds: string[]
  invalidChampionIds: string[]
}

export interface FormationSnapshotPreview<T extends FormationSnapshotLike> {
  snapshot: T
  layoutName: LocalizedText
  dataVersion: string
  restoreMode: FormationRestoreMode
  formations: FormationLayout[]
  champions: Champion[]
  placements: Record<string, string>
  invalidSlotIds: string[]
  invalidChampionIds: string[]
}

export type FormationSnapshotPrompt<T extends FormationSnapshotLike> =
  | {
      kind: 'restore'
      preview: FormationSnapshotPreview<T>
    }
  | {
      kind: 'invalid'
      snapshot: T
      title: string
      detail: string
    }
