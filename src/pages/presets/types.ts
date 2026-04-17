import type { AppLocale, LocaleText } from '../../app/i18n'
import type { FormationSnapshotPrompt } from '../../data/formationPersistence'
import type { FormationPreset, PresetPriority } from '../../domain/types'
import type { StatusTone } from '../../components/StatusBanner'
import type { Champion, FormationLayout } from '../../domain/types'

export type PresetsPageTranslator = (text: LocaleText) => string

export type StatusMessage = {
  tone: StatusTone
  title: string
  detail: string
}

export type PresetView = {
  preset: FormationPreset
  prompt: FormationSnapshotPrompt<FormationPreset>
}

export type PresetsState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
      status: 'ready'
      dataVersion: string
      formations: FormationLayout[]
      champions: Champion[]
      items: PresetView[]
    }

export type PresetEditorState = {
  name: string
  description: string
  scenarioTagsInput: string
  priority: PresetPriority
}

export type PresetsMetrics = {
  total: number
  recoverable: number
  risky: number
}

export type PresetsPageModel = {
  locale: AppLocale
  t: PresetsPageTranslator
  state: PresetsState
  pageStatus: StatusMessage | null
  metrics: PresetsMetrics
  editingPresetId: string | null
  editor: PresetEditorState
  deleteConfirmId: string | null
  priorityOptions: PresetPriority[]
  startEditingPreset: (preset: FormationPreset) => void
  cancelEditingPreset: () => void
  updateEditor: <K extends keyof PresetEditorState>(key: K, value: PresetEditorState[K]) => void
  openDeleteConfirm: (presetId: string) => void
  clearDeleteConfirm: () => void
  restorePreset: (view: PresetView) => void
  savePresetEdit: (preset: FormationPreset) => void
  deletePreset: (preset: FormationPreset) => void
}
