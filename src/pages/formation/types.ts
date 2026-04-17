import type { CSSProperties } from 'react'
import type { AppLocale, LocaleText } from '../../app/i18n'
import type { StatusTone } from '../../components/StatusBanner'
import type { FormationSnapshotPrompt } from '../../data/formationPersistence'
import type {
  Champion,
  FormationDraft,
  FormationLayout,
  FormationPreset,
  FormationSlot,
  PresetPriority,
  ScenarioRef,
} from '../../domain/types'

export const DRAFT_SCHEMA_VERSION = 1
export const PRESET_SCHEMA_VERSION = 1
export const DRAFT_SAVE_DELAY_MS = 600

export const PRESET_PRIORITY_OPTIONS: PresetPriority[] = ['medium', 'high', 'low']
export const LAYOUT_FILTER_OPTIONS = ['all', 'campaign', 'adventure', 'variant'] as const

export type LayoutFilterKind = (typeof LAYOUT_FILTER_OPTIONS)[number]

export type FormationState =
  | { status: 'loading' }
  | {
      status: 'ready'
      dataVersion: string
      formations: FormationLayout[]
      champions: Champion[]
    }
  | {
      status: 'error'
      message: string
    }

export type ReadyFormationState = Extract<FormationState, { status: 'ready' }>

export interface StatusMessage {
  tone: StatusTone
  title: string
  detail: string
}

export interface PresetFormState {
  name: string
  description: string
  scenarioTagsInput: string
  priority: PresetPriority
}

export interface FormationPageLocationState {
  pendingPresetRestore?: FormationPreset
}

export interface SelectedChampionPlacement {
  slotId: string
  champion: Champion
}

export interface FormationPageTranslator {
  (text: LocaleText): string
}

export type DraftPrompt = FormationSnapshotPrompt<FormationDraft>

export interface FormationPageModel {
  locale: AppLocale
  t: FormationPageTranslator
  state: FormationState
  draftPrompt: DraftPrompt | null
  draftStatus: StatusMessage | null
  presetStatus: StatusMessage | null
  layoutSearch: string
  selectedContextKind: LayoutFilterKind
  selectedLayout: FormationLayout | null
  selectedLayoutLabel: string | null
  selectedLayoutContextSummary: string | null
  filteredLayouts: FormationLayout[]
  isSelectedLayoutVisible: boolean
  formationBoardStyle: CSSProperties | undefined
  championOptions: Champion[]
  championById: Map<string, Champion>
  selectedChampions: SelectedChampionPlacement[]
  activeMobileSlot: FormationSlot | null
  activeMobileChampionId: string
  activeMobileChampion: Champion | null
  conflictingSeats: number[]
  draftPromptChampions: Champion[]
  canSavePreset: boolean
  isSavingPreset: boolean
  presetForm: PresetFormState
  scenarioRef: ScenarioRef | null
  setLayoutSearch: (value: string) => void
  setSelectedContextKind: (kind: LayoutFilterKind) => void
  setActiveMobileSlotId: (slotId: string) => void
  getChampionOptionLabel: (champion: Champion) => string
  getPresetPriorityLabel: (priority: PresetPriority) => string
  getLayoutFilterLabel: (kind: LayoutFilterKind) => string
  updatePresetForm: <K extends keyof PresetFormState>(
    key: K,
    value: PresetFormState[K],
  ) => void
  handleSelectLayout: (layoutId: string) => void
  handleAssignChampion: (slotId: string, championId: string) => void
  handleClear: () => void
  handleRestoreRecentDraft: () => void
  handleKeepDraftWithoutRestore: () => void
  handleDiscardRecentDraft: () => void
  handlePriorityChange: (priority: PresetPriority) => void
  handleOpenPresetsPage: () => void
  handleSavePreset: () => void
}
