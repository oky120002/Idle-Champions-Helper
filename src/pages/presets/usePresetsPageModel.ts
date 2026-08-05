import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useI18n } from '../../app/i18n'
import {
  createErrorStatusMessage,
  createInfoStatusMessage,
  createSuccessStatusMessage,
} from '../../components/statusMessage'
import { loadCollectionAtVersion, loadVersion } from '../../data/client'
import { deleteFormationPreset, saveFormationPreset } from '../../data/formationPresetStore'
import type { Champion, FormationLayout, FormationPreset } from '../../domain/types'
import { EMPTY_PRESET_EDITOR, PRESET_PRIORITY_OPTIONS } from './constants'
import {
  buildEditorState,
  buildPresetViews,
  buildPresetsMetrics,
  getErrorMessage,
  errorMessageLocaleText,  parseScenarioTags,
} from './preset-model'
import type { PresetEditorState, PresetView, PresetsPageModel, PresetsState, StatusMessage } from './types'

export function usePresetsPageModel(): PresetsPageModel {
  const { locale, t } = useI18n()
  const navigate = useNavigate()

  const [state, setState] = useState<PresetsState>({ status: 'loading' })
  const [pageStatus, setPageStatus] = useState<StatusMessage | null>(null)
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null)
  const [editor, setEditor] = useState<PresetEditorState>(EMPTY_PRESET_EDITOR)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  useEffect(() => {
    let disposed = false

    async function bootstrap() {
      try {
        const version = await loadVersion()
        const [formationCollection, championCollection] = await Promise.all([
          loadCollectionAtVersion<FormationLayout>(version.current, 'formations'),
          loadCollectionAtVersion<Champion>(version.current, 'champions'),
        ])
        const items = await buildPresetViews(version.current, formationCollection.items, championCollection.items)

        if (disposed) {
          return
        }

        setState({
          status: 'ready',
          dataVersion: version.current,
          formations: formationCollection.items,
          champions: championCollection.items,
          items,
        })
      } catch (error: unknown) {
        if (disposed) {
          return
        }

        setState({
          status: 'error',
          message: getErrorMessage(error),
        })
      }
    }

    void bootstrap()

    return () => {
      disposed = true
    }
  }, [])

  const readyState = state.status === 'ready' ? state : null
  const metrics = useMemo(() => buildPresetsMetrics(readyState?.items ?? []), [readyState])

  async function refreshPresetList(successMessage?: StatusMessage) {
    if (!readyState) {
      return
    }

    try {
      const items = await buildPresetViews(readyState.dataVersion, readyState.formations, readyState.champions)
      setState((current) => (current.status === 'ready' ? { ...current, items } : current))

      if (successMessage) {
        setPageStatus(successMessage)
      }
    } catch (error: unknown) {
      setPageStatus(createErrorStatusMessage(
        { zh: '刷新方案列表失败', en: 'Failed to refresh preset list' },
        errorMessageLocaleText(error),
      ))
    }
  }

  function startEditingPreset(preset: FormationPreset) {
    setEditingPresetId(preset.id)
    setEditor(buildEditorState(preset))
    setDeleteConfirmId(null)
    setPageStatus(null)
  }

  function cancelEditingPreset() {
    setEditingPresetId(null)
    setDeleteConfirmId(null)
  }

  function updateEditor<K extends keyof PresetEditorState>(key: K, value: PresetEditorState[K]) {
    setEditor((current) => ({
      ...current,
      [key]: value,
    }))
  }

  function restorePreset(view: PresetView) {
    if (view.prompt.kind !== 'restore') {
      return
    }

    void navigate('/formation', {
      state: {
        pendingPresetRestore: view.preset,
      },
    })
  }

  function savePresetEdit(preset: FormationPreset) {
    const saveEdit = async () => {
      try {
        const nextPreset: FormationPreset = {
          ...preset,
          name: editor.name.trim(),
          description: editor.description.trim(),
          scenarioTags: parseScenarioTags(editor.scenarioTagsInput),
          priority: editor.priority,
          updatedAt: new Date().toISOString(),
        }

        await saveFormationPreset(nextPreset)
        setEditingPresetId(null)
        await refreshPresetList(
          createSuccessStatusMessage(
            { zh: `方案“${nextPreset.name}”已更新`, en: `Preset "${nextPreset.name}" updated` },
            { zh: '名称、备注、标签和优先级已写回本地方案库。', en: 'Name, notes, tags, and priority have been written back to the local preset library.' },
          ),
        )
      } catch (error: unknown) {
        setPageStatus(createErrorStatusMessage(
          { zh: '更新方案失败', en: 'Failed to update preset' },
          errorMessageLocaleText(error),
        ))
      }
    }

    void saveEdit()
  }

  function deletePreset(preset: FormationPreset) {
    const deleteItem = async () => {
      try {
        await deleteFormationPreset(preset.id)
        setDeleteConfirmId(null)
        setEditingPresetId((current) => (current === preset.id ? null : current))
        await refreshPresetList(
          createInfoStatusMessage(
            { zh: `方案“${preset.name}”已删除`, en: `Preset "${preset.name}" deleted` },
            { zh: '这条命名方案已从当前浏览器的 IndexedDB 移除。', en: 'This named preset has been removed from this browser\'s IndexedDB.' },
          ),
        )
      } catch (error: unknown) {
        setPageStatus(createErrorStatusMessage(
          { zh: '删除方案失败', en: 'Failed to delete preset' },
          errorMessageLocaleText(error),
        ))
      }
    }

    void deleteItem()
  }

  return {
    locale,
    t,
    state,
    pageStatus,
    metrics,
    editingPresetId,
    editor,
    deleteConfirmId,
    startEditingPreset,
    cancelEditingPreset,
    updateEditor,
    restorePreset,
    savePresetEdit,
    deletePreset,
    priorityOptions: PRESET_PRIORITY_OPTIONS,
    openDeleteConfirm: (presetId: string) => setDeleteConfirmId(presetId),
    clearDeleteConfirm: () => setDeleteConfirmId(null),
  }
}
