import type { Dispatch, SetStateAction } from 'react'
import type { NavigateFunction } from 'react-router-dom'
import { saveFormationPreset } from '../../data/formationPresetStore'
import type { FormationLayout, PresetPriority, ScenarioRef } from '../../domain/types'
import { buildPresetId, getErrorMessage, parseScenarioTags } from './formation-model-helpers'
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

export function buildFormationPresetActions({
  navigate,
  state,
  selectedLayout,
  canSavePreset,
  presetForm,
  placements,
  scenarioRef,
  setIsSavingPreset,
  setPresetForm,
  setPresetStatus,
  updatePresetForm,
}: BuildFormationPresetActionsOptions) {
  function handlePriorityChange(priority: PresetPriority) {
    updatePresetForm('priority', priority)
  }

  function handleOpenPresetsPage() {
    void navigate('/presets')
  }

  function handleSavePreset() {
    if (state.status !== 'ready' || !selectedLayout || !canSavePreset) {
      return
    }

    const savePreset = async () => {
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
          placements,
          scenarioRef,
          scenarioTags: parseScenarioTags(presetForm.scenarioTagsInput),
          priority: presetForm.priority,
          createdAt: timestamp,
          updatedAt: timestamp,
        } as const

        await saveFormationPreset(preset)
        setPresetForm({ ...DEFAULT_PRESET_FORM_STATE })
        setPresetStatus({
          tone: 'success',
          title: `方案“${preset.name}”已保存`,
          detail: '现在可以去“方案存档”页继续编辑、删除，或重新恢复回阵型页。',
        })
      } catch (error: unknown) {
        setPresetStatus({
          tone: 'error',
          title: '保存方案失败',
          detail: getErrorMessage(error),
        })
      } finally {
        setIsSavingPreset(false)
      }
    }

    void savePreset()
  }

  return {
    handlePriorityChange,
    handleOpenPresetsPage,
    handleSavePreset,
  }
}
