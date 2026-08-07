import { useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useI18n } from '../../app/i18n'
import type { FormationPreset } from '../../domain/types'
import { buildFormationBoardActions } from './formation-board-actions'
import { buildFormationDraftPromptActions } from './formation-draft-prompt-actions'
import { buildFormationPresetActions } from './formation-preset-actions'
import { useFormationBootstrap } from './useFormationBootstrap'
import { useFormationDraftPersistence } from './useFormationDraftPersistence'
import { useFormationPageDerived } from './useFormationPageDerived'
import { useFormationPageState } from './useFormationPageState'
import { useFormationFilterState } from './useFormationFilterState'
import type { FormationPageLocationState, FormationPageModel } from './types'

export function useFormationPageModel(): FormationPageModel {
  const { locale, t } = useI18n()
  const navigate = useNavigate()
  const location = useLocation()
  const routeState = location.state as FormationPageLocationState | null
  const pendingPresetRestoreRef = useRef<FormationPreset | null>(routeState?.pendingPresetRestore ?? null)
  const pageState = useFormationPageState()
  const filter = useFormationFilterState(pendingPresetRestoreRef.current?.filterSnapshot ?? null)

  useFormationBootstrap({
    navigate,
    pendingPresetRestoreRef,
    setState: pageState.setState,
    setSelectedLayoutId: pageState.setSelectedLayoutId,
    setPlacements: pageState.setPlacements,
    setScenarioRef: pageState.setScenarioRef,
    setDraftPrompt: pageState.setDraftPrompt,
    setDraftStatus: pageState.setDraftStatus,
    setIsDraftPersistenceArmed: pageState.setIsDraftPersistenceArmed,
    setActiveMobileSlotId: pageState.setActiveMobileSlotId,
  })

  useFormationDraftPersistence({
    editRevision: pageState.editRevision,
    isDraftPersistenceArmed: pageState.isDraftPersistenceArmed,
    setDraftStatus: pageState.setDraftStatus,
    state: pageState.state,
    placements: pageState.placements,
    scenarioRef: pageState.scenarioRef,
    selectedLayoutId: pageState.selectedLayoutId,
    locale,
  })

  const derived = useFormationPageDerived({
    layoutSearch: pageState.layoutSearch,
    selectedContextKind: pageState.selectedContextKind,
    activeMobileSlotId: pageState.activeMobileSlotId,
    isSavingPreset: pageState.isSavingPreset,
    presetForm: pageState.presetForm,
    state: pageState.state,
    selectedLayoutId: pageState.selectedLayoutId,
    placements: pageState.placements,
    draftPrompt: pageState.draftPrompt,
    locale,
    t,
    filterState: filter.filterState,
  })

  const boardActions = buildFormationBoardActions({
    state: pageState.state,
    setSelectedLayoutId: pageState.setSelectedLayoutId,
    setActiveMobileSlotId: pageState.setActiveMobileSlotId,
    setPlacements: pageState.setPlacements,
    setScenarioRef: pageState.setScenarioRef,
    setDraftStatus: pageState.setDraftStatus,
    setPresetStatus: pageState.setPresetStatus,
    bumpEditRevision: pageState.bumpEditRevision,
  })
  const draftPromptActions = buildFormationDraftPromptActions({
    draftPrompt: pageState.draftPrompt,
    setState: pageState.setState,
    setSelectedLayoutId: pageState.setSelectedLayoutId,
    setPlacements: pageState.setPlacements,
    setActiveMobileSlotId: pageState.setActiveMobileSlotId,
    setScenarioRef: pageState.setScenarioRef,
    setDraftPrompt: pageState.setDraftPrompt,
    setIsDraftPersistenceArmed: pageState.setIsDraftPersistenceArmed,
    setDraftStatus: pageState.setDraftStatus,
    bumpEditRevision: pageState.bumpEditRevision,
  })
  const presetActions = buildFormationPresetActions({
    navigate,
    state: pageState.state,
    selectedLayout: derived.selectedLayout,
    canSavePreset: derived.canSavePreset,
    presetForm: pageState.presetForm,
    placements: pageState.placements,
    scenarioRef: pageState.scenarioRef,
    filterState: filter.filterState,
    hasActiveFilter: filter.hasActiveFilter,
    setIsSavingPreset: pageState.setIsSavingPreset,
    setPresetForm: pageState.setPresetForm,
    setPresetStatus: pageState.setPresetStatus,
    updatePresetForm: pageState.updatePresetForm,
  })

  return assembleFormationPageModel({
    locale, t, pageState, derived, boardActions, draftPromptActions, presetActions, filter,
  })
}

interface AssembleFormationPageModelOptions {
  locale: 'zh-CN' | 'en-US'
  t: ReturnType<typeof useI18n>['t']
  pageState: ReturnType<typeof useFormationPageState>
  derived: ReturnType<typeof useFormationPageDerived>
  boardActions: ReturnType<typeof buildFormationBoardActions>
  draftPromptActions: ReturnType<typeof buildFormationDraftPromptActions>
  presetActions: ReturnType<typeof buildFormationPresetActions>
  filter: ReturnType<typeof useFormationFilterState>
}

function assembleFormationPageModel({
  locale, t, pageState, derived, boardActions, draftPromptActions, presetActions, filter,
}: AssembleFormationPageModelOptions): FormationPageModel {
  return {
    locale,
    t,
    state: pageState.state,
    draftPrompt: pageState.draftPrompt,
    draftStatus: pageState.draftStatus,
    presetStatus: pageState.presetStatus,
    layoutSearch: pageState.layoutSearch,
    selectedContextKind: pageState.selectedContextKind,
    selectedLayout: derived.selectedLayout,
    selectedLayoutLabel: derived.selectedLayoutLabel,
    selectedLayoutContextSummary: derived.selectedLayoutContextSummary,
    filteredLayouts: derived.filteredLayouts,
    isSelectedLayoutVisible: derived.isSelectedLayoutVisible,
    formationBoardStyle: derived.formationBoardStyle,
    championOptions: derived.championOptions,
    getAvailableChampionsForSlot: derived.getAvailableChampionsForSlot,
    championById: derived.championById,
    selectedChampions: derived.selectedChampions,
    activeMobileSlot: derived.activeMobileSlot,
    activeMobileChampionId: derived.activeMobileChampionId,
    activeMobileChampion: derived.activeMobileChampion,
    conflictingSeats: derived.conflictingSeats,
    draftPromptChampions: derived.draftPromptChampions,
    canSavePreset: derived.canSavePreset,
    isSavingPreset: pageState.isSavingPreset,
    presetForm: pageState.presetForm,
    scenarioRef: pageState.scenarioRef,
    filterState: filter.filterState,
    hasActiveFilter: filter.hasActiveFilter,
    clearFormationFilter: filter.clearFilters,
    setLayoutSearch: pageState.setLayoutSearch,
    setSelectedContextKind: pageState.setSelectedContextKind,
    setActiveMobileSlotId: pageState.setActiveMobileSlotId,
    getChampionOptionLabel: derived.getChampionOptionLabel,
    getPresetPriorityLabel: derived.getPresetPriorityLabel,
    getLayoutFilterLabel: derived.getLayoutFilterLabel,
    updatePresetForm: pageState.updatePresetForm,
    handleSelectLayout: boardActions.handleSelectLayout,
    handleAssignChampion: boardActions.handleAssignChampion,
    handleClear: boardActions.handleClear,
    handleRestoreRecentDraft: draftPromptActions.handleRestoreRecentDraft,
    handleKeepDraftWithoutRestore: draftPromptActions.handleKeepDraftWithoutRestore,
    handleDiscardRecentDraft: draftPromptActions.handleDiscardRecentDraft,
    handlePriorityChange: presetActions.handlePriorityChange,
    handleOpenPresetsPage: presetActions.handleOpenPresetsPage,
    handleSavePreset: presetActions.handleSavePreset,
  }
}
