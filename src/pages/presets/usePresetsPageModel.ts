import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react'
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
  errorMessageLocaleText,
  parseScenarioTags,
} from './preset-model'
import type { PresetEditorState, PresetView, PresetsPageModel, PresetsState, StatusMessage } from './types'

type PresetsStateSetter = Dispatch<SetStateAction<PresetsState>>
type StatusMessageSetter = Dispatch<SetStateAction<StatusMessage | null>>
type StringOrNullSetter = Dispatch<SetStateAction<string | null>>

async function bootstrapPresets(setState: PresetsStateSetter, isDisposed: () => boolean): Promise<void> {
  try {
    const version = await loadVersion()
    const [formationCollection, championCollection] = await Promise.all([
      loadCollectionAtVersion<FormationLayout>(version.current, 'formations'),
      loadCollectionAtVersion<Champion>(version.current, 'champions'),
    ])
    const items = await buildPresetViews(version.current, formationCollection.items, championCollection.items)

    if (isDisposed()) {
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
    if (isDisposed()) {
      return
    }

    setState({
      status: 'error',
      message: getErrorMessage(error),
    })
  }
}

async function refreshPresetListInternal(
  readyState: Extract<PresetsState, { status: 'ready' }>,
  setState: PresetsStateSetter,
  setPageStatus: StatusMessageSetter,
  successMessage?: StatusMessage,
): Promise<void> {
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

async function savePresetEditInternal(
  preset: FormationPreset,
  editor: PresetEditorState,
  setEditingPresetId: StringOrNullSetter,
  readyState: Extract<PresetsState, { status: 'ready' }> | null,
  setState: PresetsStateSetter,
  setPageStatus: StatusMessageSetter,
): Promise<void> {
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
    if (readyState) {
      await refreshPresetListInternal(
        readyState,
        setState,
        setPageStatus,
        createSuccessStatusMessage(
          { zh: `方案"${nextPreset.name}"已更新`, en: `Preset "${nextPreset.name}" updated` },
          { zh: '名称、备注、标签和优先级已写回本地方案库。', en: 'Name, notes, tags, and priority have been written back to the local preset library.' },
        ),
      )
    }
  } catch (error: unknown) {
    setPageStatus(createErrorStatusMessage(
      { zh: '更新方案失败', en: 'Failed to update preset' },
      errorMessageLocaleText(error),
    ))
  }
}

async function deletePresetInternal(
  preset: FormationPreset,
  setDeleteConfirmId: StringOrNullSetter,
  setEditingPresetId: StringOrNullSetter,
  readyState: Extract<PresetsState, { status: 'ready' }> | null,
  setState: PresetsStateSetter,
  setPageStatus: StatusMessageSetter,
): Promise<void> {
  try {
    await deleteFormationPreset(preset.id)
    setDeleteConfirmId(null)
    setEditingPresetId((current) => (current === preset.id ? null : current))
    if (readyState) {
      await refreshPresetListInternal(
        readyState,
        setState,
        setPageStatus,
        createInfoStatusMessage(
          { zh: `方案"${preset.name}"已删除`, en: `Preset "${preset.name}" deleted` },
          { zh: '这条命名方案已从当前浏览器的 IndexedDB 移除。', en: 'This named preset has been removed from this browser\'s IndexedDB.' },
        ),
      )
    }
  } catch (error: unknown) {
    setPageStatus(createErrorStatusMessage(
      { zh: '删除方案失败', en: 'Failed to delete preset' },
      errorMessageLocaleText(error),
    ))
  }
}

type PresetsHookDeps = {
  readonly setState: PresetsStateSetter
  readonly setPageStatus: StatusMessageSetter
  readonly setEditingPresetId: StringOrNullSetter
  readonly setEditor: Dispatch<SetStateAction<PresetEditorState>>
  readonly setDeleteConfirmId: StringOrNullSetter
  readonly editor: PresetEditorState
  readonly readyState: Extract<PresetsState, { status: 'ready' }> | null
}

function buildPresetHandlers(deps: PresetsHookDeps) {
  const { setState, setPageStatus, setEditingPresetId, setEditor, setDeleteConfirmId, editor, readyState } = deps

  function startEditingPreset(preset: FormationPreset) {
    setEditingPresetId(preset.id)
    setEditor(buildEditorState(preset))
    setDeleteConfirmId(null)
    setPageStatus(null)
  }

  function updateEditor<K extends keyof PresetEditorState>(key: K, value: PresetEditorState[K]) {
    setEditor((current) => ({ ...current, [key]: value }))
  }

  function savePresetEdit(preset: FormationPreset) {
    void savePresetEditInternal(preset, editor, setEditingPresetId, readyState, setState, setPageStatus)
  }

  function deletePreset(preset: FormationPreset) {
    void deletePresetInternal(preset, setDeleteConfirmId, setEditingPresetId, readyState, setState, setPageStatus)
  }

  return {
    startEditingPreset,
    updateEditor,
    savePresetEdit,
    deletePreset,
    cancelEditingPreset: () => { setEditingPresetId(null); setDeleteConfirmId(null) },
    openDeleteConfirm: (presetId: string) => { setDeleteConfirmId(presetId) },
    clearDeleteConfirm: () => { setDeleteConfirmId(null) },
  }
}

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
    void bootstrapPresets(setState, () => disposed)
    return () => { disposed = true }
  }, [])

  const readyState = state.status === 'ready' ? state : null
  const metrics = useMemo(() => buildPresetsMetrics(readyState?.items ?? []), [readyState])

  const handlers = buildPresetHandlers({
    setState, setPageStatus, setEditingPresetId, setEditor, setDeleteConfirmId, editor, readyState,
  })

  function restorePreset(view: PresetView) {
    if (view.prompt.kind !== 'restore') return
    void navigate('/formation', { state: { pendingPresetRestore: view.preset } })
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
    ...handlers,
    restorePreset,
    priorityOptions: PRESET_PRIORITY_OPTIONS,
  }
}
