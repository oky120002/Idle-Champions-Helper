import { useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useI18n } from '../../app/i18n'
import { buildRestoreStatusDetail } from '../../data/formationPersistence'
import { deleteRecentFormationDraft, saveRecentFormationDraft } from '../../data/formationDraftStore'
import { saveFormationPreset } from '../../data/formationPresetStore'
import type { FormationPreset, PresetPriority, ScenarioRef } from '../../domain/types'
import {
  buildPresetId,
  buildRestoredDraftFromPreview,
  getErrorMessage,
  parseScenarioTags,
  pickPreferredSlotId,
} from './formation-model-helpers'
import { useFormationBootstrap } from './useFormationBootstrap'
import { useFormationDraftPersistence } from './useFormationDraftPersistence'
import { useFormationPageDerived } from './useFormationPageDerived'
import {
  PRESET_SCHEMA_VERSION,
  type DraftPrompt,
  type FormationPageLocationState,
  type FormationPageModel,
  type FormationState,
  type LayoutFilterKind,
  type PresetFormState,
  type StatusMessage,
} from './types'

export function useFormationPageModel(): FormationPageModel {
  const { locale, t } = useI18n()
  const navigate = useNavigate()
  const location = useLocation()
  const routeState = location.state as FormationPageLocationState | null
  const pendingPresetRestoreRef = useRef<FormationPreset | null>(routeState?.pendingPresetRestore ?? null)

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
  const [presetForm, setPresetForm] = useState<PresetFormState>({
    name: '',
    description: '',
    scenarioTagsInput: '',
    priority: 'medium',
  })

  useFormationBootstrap({
    navigate,
    pendingPresetRestoreRef,
    setState,
    setSelectedLayoutId,
    setPlacements,
    setScenarioRef,
    setDraftPrompt,
    setDraftStatus,
    setIsDraftPersistenceArmed,
    setActiveMobileSlotId,
  })

  useFormationDraftPersistence({
    state,
    editRevision,
    isDraftPersistenceArmed,
    placements,
    scenarioRef,
    selectedLayoutId,
    locale,
    setDraftStatus,
  })

  const derived = useFormationPageDerived({
    state,
    selectedLayoutId,
    placements,
    draftPrompt,
    locale,
    t,
    layoutSearch,
    selectedContextKind,
    activeMobileSlotId,
    isSavingPreset,
    presetForm,
  })

  function bumpEditRevision() {
    setEditRevision((current) => current + 1)
  }

  function updatePresetForm<K extends keyof PresetFormState>(key: K, value: PresetFormState[K]) {
    setPresetForm((current) => ({
      ...current,
      [key]: value,
    }))
  }

  function handleSelectLayout(layoutId: string) {
    const nextLayout =
      state.status === 'ready' ? state.formations.find((layout) => layout.id === layoutId) ?? null : null

    setSelectedLayoutId(layoutId)
    setActiveMobileSlotId(pickPreferredSlotId(nextLayout))
    setPlacements({})
    setScenarioRef(null)
    setDraftStatus({
      tone: 'info',
      title: '已切换布局',
      detail: '当前布局变化后会重新生成最近草稿；旧的场景上下文不会被沿用。',
    })
    setPresetStatus(null)
    bumpEditRevision()
  }

  function handleAssignChampion(slotId: string, championId: string) {
    setPlacements((current) => {
      if (!championId) {
        const next = { ...current }
        delete next[slotId]
        return next
      }

      return {
        ...current,
        [slotId]: championId,
      }
    })
    setPresetStatus(null)
    bumpEditRevision()
  }

  function handleClear() {
    setPlacements({})
    setDraftStatus({
      tone: 'info',
      title: '当前阵型已清空',
      detail: '如果保持为空，最近草稿会从浏览器本地一起清理。',
    })
    setPresetStatus(null)
    bumpEditRevision()
  }

  function handleRestoreRecentDraft() {
    if (draftPrompt?.kind !== 'restore') {
      return
    }

    const restoredDraft = buildRestoredDraftFromPreview(draftPrompt.preview)

    setState({
      status: 'ready',
      dataVersion: draftPrompt.preview.dataVersion,
      formations: draftPrompt.preview.formations,
      champions: draftPrompt.preview.champions,
    })
    setSelectedLayoutId(restoredDraft.layoutId)
    setPlacements(restoredDraft.placements)
    setActiveMobileSlotId(
      pickPreferredSlotId(
        draftPrompt.preview.formations.find((layout) => layout.id === restoredDraft.layoutId) ?? null,
        restoredDraft.placements,
      ),
    )
    setScenarioRef(restoredDraft.scenarioRef)
    setDraftPrompt(null)
    setIsDraftPersistenceArmed(true)
    setDraftStatus({
      tone: 'success',
      title: '最近草稿已恢复',
      detail: buildRestoreStatusDetail(draftPrompt.preview),
    })
    void saveRecentFormationDraft(restoredDraft)
    bumpEditRevision()
  }

  function handleKeepDraftWithoutRestore() {
    const detail =
      draftPrompt?.kind === 'restore'
        ? '本次不恢复旧草稿；你后续开始编辑后，新内容会覆盖这条最近草稿。'
        : '本次先保留旧草稿；等你开始编辑当前阵型后，新内容才会覆盖它。'

    setDraftPrompt(null)
    setIsDraftPersistenceArmed(true)
    setDraftStatus({
      tone: 'info',
      title: '已保留最近草稿，但本次不恢复',
      detail,
    })
  }

  function handleDiscardRecentDraft() {
    const discardDraft = async () => {
      try {
        await deleteRecentFormationDraft()
        setDraftPrompt(null)
        setIsDraftPersistenceArmed(true)
        setDraftStatus({
          tone: 'info',
          title: '最近草稿已丢弃',
          detail: '当前页面不会再提示恢复这条旧草稿。',
        })
      } catch (error: unknown) {
        setDraftStatus({
          tone: 'error',
          title: '最近草稿删除失败',
          detail: getErrorMessage(error),
        })
      }
    }

    void discardDraft()
  }

  function handlePriorityChange(priority: PresetPriority) {
    updatePresetForm('priority', priority)
  }

  function handleOpenPresetsPage() {
    void navigate('/presets')
  }

  function handleSavePreset() {
    if (state.status !== 'ready' || !derived.selectedLayout || !derived.canSavePreset) {
      return
    }

    const selectedLayout = derived.selectedLayout

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
        setPresetForm({
          name: '',
          description: '',
          scenarioTagsInput: '',
          priority: 'medium',
        })
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
    locale,
    t,
    state,
    draftPrompt,
    draftStatus,
    presetStatus,
    layoutSearch,
    selectedContextKind,
    selectedLayout: derived.selectedLayout,
    selectedLayoutLabel: derived.selectedLayoutLabel,
    selectedLayoutContextSummary: derived.selectedLayoutContextSummary,
    filteredLayouts: derived.filteredLayouts,
    isSelectedLayoutVisible: derived.isSelectedLayoutVisible,
    formationBoardStyle: derived.formationBoardStyle,
    championOptions: derived.championOptions,
    championById: derived.championById,
    selectedChampions: derived.selectedChampions,
    activeMobileSlot: derived.activeMobileSlot,
    activeMobileChampionId: derived.activeMobileChampionId,
    activeMobileChampion: derived.activeMobileChampion,
    conflictingSeats: derived.conflictingSeats,
    draftPromptChampions: derived.draftPromptChampions,
    canSavePreset: derived.canSavePreset,
    isSavingPreset,
    presetForm,
    scenarioRef,
    setLayoutSearch,
    setSelectedContextKind,
    setActiveMobileSlotId,
    getChampionOptionLabel: derived.getChampionOptionLabel,
    getPresetPriorityLabel: derived.getPresetPriorityLabel,
    getLayoutFilterLabel: derived.getLayoutFilterLabel,
    updatePresetForm,
    handleSelectLayout,
    handleAssignChampion,
    handleClear,
    handleRestoreRecentDraft,
    handleKeepDraftWithoutRestore,
    handleDiscardRecentDraft,
    handlePriorityChange,
    handleOpenPresetsPage,
    handleSavePreset,
  }
}
