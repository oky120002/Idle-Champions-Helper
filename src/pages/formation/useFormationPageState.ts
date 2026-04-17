import { useState } from 'react'
import type { ScenarioRef } from '../../domain/types'
import {
  DEFAULT_PRESET_FORM_STATE,
  type DraftPrompt,
  type FormationState,
  type LayoutFilterKind,
  type PresetFormState,
  type StatusMessage,
} from './types'

export function useFormationPageState() {
  const [state, setState] = useState<FormationState>({ status: 'loading' })
  const [selectedLayoutId, setSelectedLayoutId] = useState('')
  const [placements, setPlacements] = useState<Record<string, string>>({})
  const [scenarioRef, setScenarioRef] = useState<ScenarioRef | null>(null)
  const [draftPrompt, setDraftPrompt] = useState<DraftPrompt | null>(null)
  const [draftStatus, setDraftStatus] = useState<StatusMessage | null>(null)
  const [presetStatus, setPresetStatus] = useState<StatusMessage | null>(null)
  const [isDraftPersistenceArmed, setIsDraftPersistenceArmed] = useState(false)
  const [editRevision, setEditRevision] = useState(0)
  const [isSavingPreset, setIsSavingPreset] = useState(false)
  const [layoutSearch, setLayoutSearch] = useState('')
  const [selectedContextKind, setSelectedContextKind] = useState<LayoutFilterKind>('all')
  const [activeMobileSlotId, setActiveMobileSlotId] = useState('')
  const [presetForm, setPresetForm] = useState<PresetFormState>({ ...DEFAULT_PRESET_FORM_STATE })

  function bumpEditRevision() {
    setEditRevision((current) => current + 1)
  }

  function updatePresetForm<K extends keyof PresetFormState>(key: K, value: PresetFormState[K]) {
    setPresetForm((current) => ({
      ...current,
      [key]: value,
    }))
  }

  return {
    state,
    setState,
    selectedLayoutId,
    setSelectedLayoutId,
    placements,
    setPlacements,
    scenarioRef,
    setScenarioRef,
    draftPrompt,
    setDraftPrompt,
    draftStatus,
    setDraftStatus,
    presetStatus,
    setPresetStatus,
    isDraftPersistenceArmed,
    setIsDraftPersistenceArmed,
    editRevision,
    bumpEditRevision,
    isSavingPreset,
    setIsSavingPreset,
    layoutSearch,
    setLayoutSearch,
    selectedContextKind,
    setSelectedContextKind,
    activeMobileSlotId,
    setActiveMobileSlotId,
    presetForm,
    setPresetForm,
    updatePresetForm,
  }
}
