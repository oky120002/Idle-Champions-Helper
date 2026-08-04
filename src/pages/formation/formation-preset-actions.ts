import type { Dispatch, SetStateAction } from 'react'
import type { NavigateFunction } from 'react-router-dom'
import { createErrorStatusMessage, createSuccessStatusMessage } from '../../components/statusMessage'
import { saveFormationPreset } from '../../data/formationPresetStore'
import type { FormationLayout, PresetPriority, ScenarioRef } from '../../domain/types'
import { buildPresetId, errorMessageLocaleText, parseScenarioTags } from './formation-model-helpers'
import {
  DEFAULT_PRESET_FORM_STATE,
  PRESET_SCHEMA_VERSION,
  type FormationState,
  type PresetFormState,
  type StatusMessage,
} from './types'

type BuildFormationPresetActionsOptions = {
  navigate: NavigateFunction
  state: FormationState
  selectedLayout: FormationLayout | null
  canSavePreset: boolean
  presetForm: PresetFormState
  placements: Record<string, string>
  scenarioRef: ScenarioRef | null
  setIsSavingPreset: Dispatch<SetStateAction<boolean>>
  setPresetForm: Dispatch<SetStateAction<PresetFormState>>
  setPresetStatus: Dispatch<SetStateAction<StatusMessage | null>>
  updatePresetForm: <K extends keyof PresetFormState>(key: K, value: PresetFormState[K]) => void
}

export function buildFormationPresetActions(options: BuildFormationPresetActionsOptions) {
  return {
    handlePriorityChange: (priority: PresetPriority) => { options.updatePresetForm('priority', priority) },
    handleOpenPresetsPage: () => { void options.navigate('/presets') },
    handleSavePreset: () => { savePresetWithOptions(options) },
  }
}

function savePresetWithOptions(options: BuildFormationPresetActionsOptions) {
  const { state, selectedLayout, canSavePreset } = options
  if (state.status !== 'ready' || selectedLayout === null || !canSavePreset) return

  const run = async () => {
    const { setIsSavingPreset, setPresetForm, setPresetStatus, presetForm, placements, scenarioRef } = options
    setIsSavingPreset(true)

    try {
      const timestamp = new Date().toISOString()
      const preset = {
        id: buildPresetId(),
        schemaVersion: PRESET_SCHEMA_VERSION,
        dataVersion: state.dataVersion,
        name: presetForm.name.trim(),
        description: presetForm.description.trim(),
        layoutId: selectedLayout.id,
        scenarioTags: parseScenarioTags(presetForm.scenarioTagsInput),
        priority: presetForm.priority,
        createdAt: timestamp,
        updatedAt: timestamp,
        placements,
        scenarioRef,
      } as const

      await saveFormationPreset(preset)
      setPresetForm({ ...DEFAULT_PRESET_FORM_STATE })
      setPresetStatus(
        createSuccessStatusMessage(
          { zh: `方案”${preset.name}”已保存`, en: `Preset “${preset.name}” saved` },
          { zh: '现在可以去”方案存档”页继续编辑、删除，或重新恢复回阵型页。', en: 'Open the Preset Library page to edit, delete, or restore it back to the formation page.' },
        ),
      )
    } catch (error: unknown) {
      setPresetStatus(createErrorStatusMessage(
        { zh: '保存方案失败', en: 'Failed to save preset' },
        errorMessageLocaleText(error),
      ))
    } finally {
      setIsSavingPreset(false)
    }
  }

  void run()
}
