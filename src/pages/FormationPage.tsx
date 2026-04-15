import { type CSSProperties, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useI18n } from '../app/i18n'
import { FieldGroup } from '../components/FieldGroup'
import { ChampionAvatar } from '../components/ChampionAvatar'
import { ChampionIdentity } from '../components/ChampionIdentity'
import { ChampionPill } from '../components/ChampionPill'
import { StatusBanner, type StatusTone } from '../components/StatusBanner'
import { SurfaceCard } from '../components/SurfaceCard'
import { loadCollectionAtVersion, loadVersion } from '../data/client'
import {
  buildFormationSnapshotPrompt,
  buildRestoreStatusDetail,
  type FormationSnapshotPrompt,
  type FormationSnapshotPreview,
} from '../data/formationPersistence'
import {
  deleteRecentFormationDraft,
  readRecentFormationDraft,
  saveRecentFormationDraft,
} from '../data/formationDraftStore'
import { saveFormationPreset } from '../data/formationPresetStore'
import {
  formatSeatLabel,
  getLocalizedTextPair,
  getPrimaryLocalizedText,
  getRoleLabel,
  matchesLocalizedText,
} from '../domain/localizedText'
import {
  getFormationBoardMetrics,
  getFormationLayoutContextSummary,
  getFormationLayoutLabel,
} from '../domain/formationLayout'
import { buildOrderedChampionsFromPlacements } from '../domain/championPlacement'
import type {
  Champion,
  FormationDraft,
  FormationLayout,
  FormationPreset,
  PresetPriority,
  ScenarioRef,
} from '../domain/types'
import { findSeatConflicts } from '../rules/seat'

const DRAFT_SCHEMA_VERSION = 1
const PRESET_SCHEMA_VERSION = 1
const DRAFT_SAVE_DELAY_MS = 600

const PRESET_PRIORITY_OPTIONS: PresetPriority[] = ['medium', 'high', 'low']
const LAYOUT_FILTER_OPTIONS = ['all', 'campaign', 'adventure', 'variant'] as const

type LayoutFilterKind = (typeof LAYOUT_FILTER_OPTIONS)[number]

type FormationState =
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

interface StatusMessage {
  tone: StatusTone
  title: string
  detail: string
}

interface PresetFormState {
  name: string
  description: string
  scenarioTagsInput: string
  priority: PresetPriority
}

interface FormationPageLocationState {
  pendingPresetRestore?: FormationPreset
}

type DraftPrompt = FormationSnapshotPrompt<FormationDraft>

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '未知错误'
}

function formatDateTime(value: string): string {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString('zh-CN', {
    hour12: false,
  })
}

function parseScenarioTags(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(/[，,\n]/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  )
}

function buildPresetId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `preset-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function convertPresetToDraft(preset: FormationPreset): FormationDraft {
  return {
    schemaVersion: DRAFT_SCHEMA_VERSION,
    dataVersion: preset.dataVersion,
    layoutId: preset.layoutId,
    scenarioRef: preset.scenarioRef,
    placements: preset.placements,
    updatedAt: preset.updatedAt,
  }
}

function buildRestoredDraftFromPreview(preview: FormationSnapshotPreview<FormationDraft>): FormationDraft {
  return {
    schemaVersion: DRAFT_SCHEMA_VERSION,
    dataVersion: preview.dataVersion,
    layoutId: preview.snapshot.layoutId,
    scenarioRef: preview.snapshot.scenarioRef,
    placements: preview.placements,
    updatedAt: new Date().toISOString(),
  }
}

function matchesLayoutSearch(layout: FormationLayout, query: string): boolean {
  if (!query.trim()) {
    return true
  }

  return (
    matchesLocalizedText(layout.name, query) ||
    (layout.notes ? matchesLocalizedText(layout.notes, query) : false) ||
    (layout.sourceContexts ?? []).some((context) => matchesLocalizedText(context.name, query))
  )
}

function matchesLayoutContextKind(layout: FormationLayout, selectedKind: LayoutFilterKind): boolean {
  if (selectedKind === 'all') {
    return true
  }

  return (layout.sourceContexts ?? []).some((context) => context.kind === selectedKind)
}

function pickPreferredSlotId(layout: FormationLayout | null, placements: Record<string, string> = {}): string {
  if (!layout) {
    return ''
  }

  return layout.slots.find((slot) => Boolean(placements[slot.id]))?.id ?? layout.slots[0]?.id ?? ''
}

export function FormationPage() {
  const { locale, t } = useI18n()
  const navigate = useNavigate()
  const location = useLocation()
  const routeState = location.state as FormationPageLocationState | null
  const pendingPresetRestoreRef = useRef<FormationPreset | null>(routeState?.pendingPresetRestore ?? null)

  const [state, setState] = useState<FormationState>({ status: 'loading' })
  const [selectedLayoutId, setSelectedLayoutId] = useState<string>('')
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

  useEffect(() => {
    let disposed = false

    async function bootstrap() {
      try {
        const version = await loadVersion()
        const [formationCollection, championCollection] = await Promise.all([
          loadCollectionAtVersion<FormationLayout>(version.current, 'formations'),
          loadCollectionAtVersion<Champion>(version.current, 'champions'),
        ])

        if (disposed) {
          return
        }

        const baseState: Extract<FormationState, { status: 'ready' }> = {
          status: 'ready',
          dataVersion: version.current,
          formations: formationCollection.items,
          champions: championCollection.items,
        }

        setState(baseState)
        setSelectedLayoutId(formationCollection.items[0]?.id ?? '')
        setActiveMobileSlotId(pickPreferredSlotId(formationCollection.items[0] ?? null))
        setDraftStatus({
          tone: 'info',
          title: '最近草稿会自动保存在当前浏览器',
          detail: '介质为 IndexedDB；只保存在本地，不上传到外部服务。',
        })

        if (pendingPresetRestoreRef.current) {
          navigate('/formation', { replace: true, state: null })

          const pendingPresetRestore = pendingPresetRestoreRef.current
          const pendingDraft = convertPresetToDraft(pendingPresetRestore)
          const pendingPrompt = await buildFormationSnapshotPrompt(
            pendingDraft,
            version.current,
            formationCollection.items,
            championCollection.items,
            '方案',
            PRESET_SCHEMA_VERSION,
          )

          if (disposed) {
            return
          }

          if (pendingPrompt.kind === 'restore') {
            const restoredDraft = buildRestoredDraftFromPreview(pendingPrompt.preview)

            try {
              await saveRecentFormationDraft(restoredDraft)
            } catch (error: unknown) {
              if (disposed) {
                return
              }

              setIsDraftPersistenceArmed(true)
              setDraftStatus({
                tone: 'error',
                title: '方案已恢复，但最近草稿回写失败',
                detail: getErrorMessage(error),
              })
            }

            if (disposed) {
              return
            }

            setState({
              status: 'ready',
              dataVersion: pendingPrompt.preview.dataVersion,
              formations: pendingPrompt.preview.formations,
              champions: pendingPrompt.preview.champions,
            })
            setSelectedLayoutId(restoredDraft.layoutId)
            setPlacements(restoredDraft.placements)
            setActiveMobileSlotId(
              pickPreferredSlotId(
                pendingPrompt.preview.formations.find((layout) => layout.id === restoredDraft.layoutId) ?? null,
                restoredDraft.placements,
              ),
            )
            setScenarioRef(restoredDraft.scenarioRef)
            setIsDraftPersistenceArmed(true)
            setDraftStatus({
              tone: 'success',
              title: `已从方案“${pendingPresetRestore.name}”恢复到阵型页`,
              detail: buildRestoreStatusDetail(pendingPrompt.preview),
            })
            return
          }

          setIsDraftPersistenceArmed(true)
          setDraftStatus({
            tone: 'error',
            title: `方案“${pendingPresetRestore.name}”当前不能恢复`,
            detail: pendingPrompt.detail,
          })
          return
        }

        try {
          const storedDraft = await readRecentFormationDraft()

          if (disposed) {
            return
          }

          if (!storedDraft) {
            setIsDraftPersistenceArmed(true)
            return
          }

          const prompt = await buildFormationSnapshotPrompt(
            storedDraft,
            version.current,
            formationCollection.items,
            championCollection.items,
            '最近草稿',
            DRAFT_SCHEMA_VERSION,
          )

          if (disposed) {
            return
          }

          setDraftPrompt(prompt)
        } catch (error: unknown) {
          if (disposed) {
            return
          }

          setIsDraftPersistenceArmed(true)
          setDraftStatus({
            tone: 'error',
            title: '最近草稿读取失败',
            detail: `${getErrorMessage(error)} 当前仍可继续编辑，但不会自动恢复旧草稿。`,
          })
        }
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
  }, [navigate])

  useEffect(() => {
    if (state.status !== 'ready' || !isDraftPersistenceArmed || editRevision === 0 || !selectedLayoutId) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      const persistDraft = async () => {
        try {
          if (Object.keys(placements).length === 0) {
            await deleteRecentFormationDraft()
            setDraftStatus({
              tone: 'info',
              title: '最近草稿已清理',
              detail: '当前阵型为空，浏览器本地不会继续保留最近草稿。',
            })
            return
          }

          const nextDraft: FormationDraft = {
            schemaVersion: DRAFT_SCHEMA_VERSION,
            dataVersion: state.dataVersion,
            layoutId: selectedLayoutId,
            scenarioRef,
            placements,
            updatedAt: new Date().toISOString(),
          }

          await saveRecentFormationDraft(nextDraft)
          setDraftStatus({
            tone: 'success',
            title: '最近草稿已自动保存',
            detail: `${formatDateTime(nextDraft.updatedAt)} · 保存在当前浏览器的 IndexedDB。`,
          })
        } catch (error: unknown) {
          setDraftStatus({
            tone: 'error',
            title: '最近草稿保存失败',
            detail: getErrorMessage(error),
          })
        }
      }

      void persistDraft()
    }, DRAFT_SAVE_DELAY_MS)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [editRevision, isDraftPersistenceArmed, placements, scenarioRef, selectedLayoutId, state])

  const selectedLayout =
    state.status === 'ready'
      ? state.formations.find((layout) => layout.id === selectedLayoutId) ?? state.formations[0] ?? null
      : null
  const selectedLayoutLabel = selectedLayout ? getFormationLayoutLabel(selectedLayout, locale) : null
  const selectedLayoutContextSummary = selectedLayout
    ? getFormationLayoutContextSummary(selectedLayout, locale)
    : null
  const formationBoardStyle = useMemo<CSSProperties | undefined>(() => {
    if (!selectedLayout) {
      return undefined
    }

    const metrics = getFormationBoardMetrics(selectedLayout)

    return {
      gridTemplateColumns: `repeat(${metrics.columnCount}, minmax(0, 1fr))`,
      width: `${metrics.widthPx}px`,
      minWidth: `${metrics.minWidthPx}px`,
    }
  }, [selectedLayout])
  const filteredLayouts = useMemo(() => {
    if (state.status !== 'ready') {
      return []
    }

    return state.formations.filter(
      (layout) => matchesLayoutContextKind(layout, selectedContextKind) && matchesLayoutSearch(layout, layoutSearch),
    )
  }, [layoutSearch, selectedContextKind, state])
  const isSelectedLayoutVisible = selectedLayout
    ? filteredLayouts.some((layout) => layout.id === selectedLayout.id)
    : false

  const championOptions = useMemo(() => {
    if (state.status !== 'ready') {
      return []
    }

    return [...state.champions].sort(
      (left, right) =>
        left.seat - right.seat ||
        getPrimaryLocalizedText(left.name, locale).localeCompare(getPrimaryLocalizedText(right.name, locale)) ||
        left.name.original.localeCompare(right.name.original),
    )
  }, [locale, state])

  const championById = useMemo(() => {
    if (state.status !== 'ready') {
      return new Map<string, Champion>()
    }

    return new Map(state.champions.map((champion) => [champion.id, champion]))
  }, [state])

  const selectedChampions = useMemo(() => {
    if (state.status !== 'ready' || !selectedLayout) {
      return []
    }

    return selectedLayout.slots
      .map((slot) => {
        const championId = placements[slot.id]

        if (!championId) {
          return null
        }

        const champion = championById.get(championId) ?? null

        if (!champion) {
          return null
        }

        return {
          slotId: slot.id,
          champion,
        }
      })
      .filter((item): item is { slotId: string; champion: Champion } => item !== null)
  }, [championById, placements, selectedLayout, state])

  const activeMobileSlot =
    selectedLayout?.slots.find((slot) => slot.id === activeMobileSlotId) ?? selectedLayout?.slots[0] ?? null
  const activeMobileChampionId = activeMobileSlot ? placements[activeMobileSlot.id] ?? '' : ''
  const activeMobileChampion = activeMobileChampionId ? championById.get(activeMobileChampionId) ?? null : null

  const conflictingSeats = useMemo(
    () => findSeatConflicts(selectedChampions.map((item) => item.champion.seat)),
    [selectedChampions],
  )
  const draftPromptChampions = useMemo(() => {
    if (!draftPrompt || draftPrompt.kind !== 'restore') {
      return []
    }

    return buildOrderedChampionsFromPlacements(draftPrompt.preview.placements, draftPrompt.preview.champions)
  }, [draftPrompt])

  const canSavePreset = selectedChampions.length > 0 && presetForm.name.trim().length > 0 && !isSavingPreset

  function bumpEditRevision() {
    setEditRevision((current) => current + 1)
  }

  function getChampionOptionLabel(champion: Champion): string {
    return `${formatSeatLabel(champion.seat, locale)} · ${getLocalizedTextPair(champion.name, locale)}`
  }

  function getPresetPriorityLabel(priority: PresetPriority): string {
    if (priority === 'high') {
      return t({ zh: '高优先', en: 'High' })
    }

    if (priority === 'low') {
      return t({ zh: '备用', en: 'Fallback' })
    }

    return t({ zh: '常用', en: 'Regular' })
  }

  function getLayoutFilterLabel(kind: LayoutFilterKind): string {
    if (kind === 'campaign') {
      return t({ zh: '战役', en: 'Campaign' })
    }

    if (kind === 'adventure') {
      return t({ zh: '冒险', en: 'Adventure' })
    }

    if (kind === 'variant') {
      return t({ zh: '变体', en: 'Variant' })
    }

    return t({ zh: '全部', en: 'All' })
  }

  function handleSelectLayout(layoutId: string) {
    const nextLayout = state.status === 'ready' ? state.formations.find((layout) => layout.id === layoutId) ?? null : null

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

  function updatePresetForm<K extends keyof PresetFormState>(key: K, value: PresetFormState[K]) {
    setPresetForm((current) => ({
      ...current,
      [key]: value,
    }))
  }

  function handlePriorityChange(priority: PresetPriority) {
    updatePresetForm('priority', priority)
  }

  function handleOpenPresetsPage() {
    navigate('/presets')
  }

  function handleSavePreset() {
    if (state.status !== 'ready' || !selectedLayout || !canSavePreset) {
      return
    }

    const savePreset = async () => {
      setIsSavingPreset(true)

      try {
        const timestamp = new Date().toISOString()
        const preset: FormationPreset = {
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
        }

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

  return (
    <div className="page-stack">
      <SurfaceCard
        eyebrow={t({ zh: '阵型编辑', en: 'Formation editor' })}
        title={t({
          zh: '把最近草稿保存 / 恢复接回阵型页闭环',
          en: 'Close the loop on recent-draft save and restore',
        })}
        description={t({
          zh: '当前布局库已改为官方 definitions 自动提取；最近草稿会自动写入当前浏览器的 IndexedDB，不上传到外部。',
          en: 'The layout library now comes from official definitions, and recent drafts are still auto-saved to IndexedDB in the current browser only.',
        })}
      >
        {state.status === 'loading' ? (
          <StatusBanner tone="info">
            {t({ zh: '正在读取阵型布局和英雄数据…', en: 'Loading layouts and champion data…' })}
          </StatusBanner>
        ) : null}

        {state.status === 'error' ? (
          <StatusBanner
            tone="error"
            title={t({ zh: '阵型数据读取失败', en: 'Formation data failed to load' })}
            detail={state.message}
          />
        ) : null}

        {state.status === 'ready' ? (
          <>
            {draftPrompt ? (
              <StatusBanner
                tone={draftPrompt.kind === 'restore' ? 'info' : 'error'}
                title={
                  draftPrompt.kind === 'restore'
                    ? t({ zh: '检测到最近草稿，是否恢复？', en: 'Recent draft detected. Restore it?' })
                    : draftPrompt.title
                }
                detail={
                  draftPrompt.kind === 'restore'
                    ? `${formatDateTime(draftPrompt.preview.snapshot.updatedAt)} · ${
                        locale === 'zh-CN'
                          ? `${Object.keys(draftPrompt.preview.placements).length} 名英雄`
                          : `${Object.keys(draftPrompt.preview.placements).length} champions`
                      } · ${getLocalizedTextPair(draftPrompt.preview.layoutName, locale)}`
                    : draftPrompt.detail
                }
                actions={
                  <>
                    {draftPrompt.kind === 'restore' ? (
                      <button
                        type="button"
                        className="action-button action-button--secondary"
                        onClick={handleRestoreRecentDraft}
                      >
                        {t({ zh: '恢复最近草稿', en: 'Restore draft' })}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="action-button action-button--ghost"
                      onClick={handleKeepDraftWithoutRestore}
                    >
                      {t({ zh: '先保留不恢复', en: 'Keep for now' })}
                    </button>
                    <button
                      type="button"
                      className="action-button action-button--ghost"
                      onClick={handleDiscardRecentDraft}
                    >
                      {t({ zh: '丢弃旧草稿', en: 'Discard draft' })}
                    </button>
                  </>
                }
              >
                {draftPrompt.kind === 'restore' ? (
                  <>
                    <p className="status-banner__detail">{buildRestoreStatusDetail(draftPrompt.preview)}</p>
                    <div className="tag-row">
                      <span className="tag-pill tag-pill--muted">
                        {t({ zh: '保存版本', en: 'Saved version' })}：{draftPrompt.preview.snapshot.dataVersion}
                      </span>
                      <span className="tag-pill tag-pill--muted">
                        {t({ zh: '恢复版本', en: 'Restore version' })}：{draftPrompt.preview.dataVersion}
                      </span>
                      <span className="tag-pill tag-pill--muted">
                        {draftPrompt.preview.restoreMode === 'compatible'
                          ? t({ zh: '兼容恢复', en: 'Compatible restore' })
                          : t({ zh: '原样恢复', en: 'Exact restore' })}
                      </span>
                    </div>
                    {draftPromptChampions.length > 0 ? (
                      <div className="tag-row">
                        {draftPromptChampions.map((champion, index) => (
                          <ChampionPill key={`${champion.id}-${index}`} champion={champion} locale={locale} />
                        ))}
                      </div>
                    ) : null}
                  </>
                ) : null}
              </StatusBanner>
            ) : draftStatus ? (
              <StatusBanner tone={draftStatus.tone} title={draftStatus.title} detail={draftStatus.detail} />
            ) : null}

            <FieldGroup label={t({ zh: '布局筛选', en: 'Layout filters' })} className="filter-group">
              <div className="filter-panel filter-panel--compact">
                <FieldGroup
                  label={t({ zh: '关键词', en: 'Keyword' })}
                  hint={t({
                    zh: '支持搜索布局名、布局备注和来源场景名称，保留中英混搜。',
                    en: 'Search layout names, notes, and source context names with mixed Chinese and English.',
                  })}
                  labelFor="formation-layout-search"
                  className="filter-group"
                >
                  <input
                    id="formation-layout-search"
                    className="text-input"
                    type="text"
                    value={layoutSearch}
                    onChange={(event) => setLayoutSearch(event.target.value)}
                    placeholder={t({
                      zh: '搜布局名、来源战役、冒险或变体',
                      en: 'Search layouts, campaigns, adventures, or variants',
                    })}
                  />
                </FieldGroup>

                <FieldGroup
                  label={t({ zh: '场景类型', en: 'Scenario type' })}
                  hint={t({
                    zh: '筛选只影响上方布局选择区，不会自动清空正在编辑的布局。',
                    en: 'Filters only affect the layout picker and never clear the layout you are editing.',
                  })}
                  className="filter-group"
                >
                  <div className="filter-chip-grid">
                    {LAYOUT_FILTER_OPTIONS.map((kind) => (
                      <button
                        key={kind}
                        type="button"
                        className={
                          selectedContextKind === kind ? 'filter-chip filter-chip--active' : 'filter-chip'
                        }
                        onClick={() => setSelectedContextKind(kind)}
                      >
                        {getLayoutFilterLabel(kind)}
                      </button>
                    ))}
                  </div>
                </FieldGroup>
              </div>
            </FieldGroup>

            <FieldGroup label={t({ zh: '布局选择', en: 'Layout' })} className="filter-group">
              {filteredLayouts.length > 0 ? (
                <div className="filter-chip-grid">
                  {filteredLayouts.map((layout) => (
                    <button
                      key={layout.id}
                      type="button"
                      className={selectedLayout?.id === layout.id ? 'filter-chip filter-chip--active' : 'filter-chip'}
                      onClick={() => handleSelectLayout(layout.id)}
                    >
                      {getFormationLayoutLabel(layout, locale)}
                    </button>
                  ))}
                </div>
              ) : null}
            </FieldGroup>

            {selectedLayout ? (
              <>
                <div className="metric-grid">
                  <article className="metric-card">
                    <span className="metric-card__label">{t({ zh: '当前布局', en: 'Current layout' })}</span>
                    <strong className="metric-card__value">{selectedLayoutLabel}</strong>
                  </article>
                  <article className="metric-card">
                    <span className="metric-card__label">{t({ zh: '槽位数', en: 'Slots' })}</span>
                    <strong className="metric-card__value">{selectedLayout.slots.length}</strong>
                  </article>
                  <article className="metric-card">
                    <span className="metric-card__label">{t({ zh: '数据版本', en: 'Data version' })}</span>
                    <strong className="metric-card__value">{state.dataVersion}</strong>
                  </article>
                  <article className="metric-card">
                    <span className="metric-card__label">{t({ zh: '布局库', en: 'Layout library' })}</span>
                    <strong className="metric-card__value">{state.formations.length}</strong>
                  </article>
                  <article className="metric-card">
                    <span className="metric-card__label">{t({ zh: '当前匹配布局', en: 'Matching layouts' })}</span>
                    <strong className="metric-card__value">{filteredLayouts.length}</strong>
                  </article>
                  <article className="metric-card">
                    <span className="metric-card__label">{t({ zh: '已放置英雄', en: 'Placed champions' })}</span>
                    <strong className="metric-card__value">{selectedChampions.length}</strong>
                  </article>
                  <article className="metric-card">
                    <span className="metric-card__label">{t({ zh: 'seat 冲突', en: 'Seat conflicts' })}</span>
                    <strong className="metric-card__value">
                      {conflictingSeats.length > 0 ? conflictingSeats.join(', ') : t({ zh: '无', en: 'None' })}
                    </strong>
                  </article>
                </div>

                {!isSelectedLayoutVisible ? (
                  <StatusBanner
                    tone="info"
                    title={t({
                      zh: '当前正在编辑的布局不在筛选结果中',
                      en: 'The layout you are editing is outside the current filter results',
                    })}
                    detail={t({
                      zh: '筛选只影响上方布局选择区；当前布局和已放置英雄会继续保留，放宽条件后可再次看到它。',
                      en: 'Filters only affect the layout picker. Your current layout and placed champions stay intact and will appear again once you broaden the filters.',
                    })}
                  />
                ) : null}

                {filteredLayouts.length === 0 ? (
                  <StatusBanner tone="info">
                    {t({
                      zh: '当前筛选条件下没有匹配布局，可以先放宽关键词或场景类型。',
                      en: 'No layouts match these filters yet. Try broadening the keyword or scenario type.',
                    })}
                  </StatusBanner>
                ) : null}

                {selectedLayoutContextSummary ? (
                  <StatusBanner tone="info">{selectedLayoutContextSummary}</StatusBanner>
                ) : selectedLayout.notes ? (
                  <StatusBanner tone="info">{getLocalizedTextPair(selectedLayout.notes, locale)}</StatusBanner>
                ) : null}

                {conflictingSeats.length > 0 ? (
                  <StatusBanner tone="error">
                    {t({
                      zh: `当前阵型里出现 seat 冲突：${conflictingSeats.join(', ')}。同一 seat 只能放一名英雄。`,
                      en: `Seat conflicts found in this formation: ${conflictingSeats.join(', ')}. Only one champion may occupy each seat.`,
                    })}
                  </StatusBanner>
                ) : null}

                <div className="formation-board-wrap">
                  <div className="formation-board" data-testid="formation-board" style={formationBoardStyle}>
                    {selectedLayout.slots.map((slot, index) => {
                      const championId = placements[slot.id] ?? ''
                      const champion = championById.get(championId) ?? null
                      const hasConflict = champion ? conflictingSeats.includes(champion.seat) : false
                      const isMobileSlotActive = activeMobileSlot?.id === slot.id
                      const slotAriaLabel = champion
                        ? t({
                            zh: `编辑槽位 ${index + 1}，当前为 ${getPrimaryLocalizedText(champion.name, locale)}`,
                            en: `Edit slot ${index + 1}, current champion ${getPrimaryLocalizedText(champion.name, locale)}`,
                          })
                        : t({
                            zh: `编辑槽位 ${index + 1}，当前未放置`,
                            en: `Edit slot ${index + 1}, currently empty`,
                          })

                      return (
                        <div
                          key={slot.id}
                          className={[
                            'formation-slot',
                            hasConflict ? 'formation-slot--conflict' : '',
                            isMobileSlotActive ? 'formation-slot--active' : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                          style={{ gridColumn: slot.column, gridRow: slot.row }}
                        >
                          <button
                            type="button"
                            className="formation-slot__tap-target"
                            data-testid={`formation-mobile-slot-${slot.id}`}
                            aria-label={slotAriaLabel}
                            aria-pressed={isMobileSlotActive}
                            onClick={() => setActiveMobileSlotId(slot.id)}
                          />
                          <span className="formation-slot__label">
                            {locale === 'zh-CN' ? `槽位 ${index + 1}` : `Slot ${index + 1}`}
                          </span>
                          <div className="formation-slot__summary" aria-hidden="true">
                            {champion ? (
                              <div className="formation-slot__summary-badge">
                                <ChampionAvatar champion={champion} locale={locale} className="champion-avatar--slot-mini" />
                                <span className="formation-slot__summary-seat">{champion.seat}</span>
                              </div>
                            ) : (
                              <span className="formation-slot__summary-empty">+</span>
                            )}
                          </div>
                          <div className="formation-slot__controls">
                            <select
                              className="slot-select"
                              value={championId}
                              onChange={(event) => handleAssignChampion(slot.id, event.target.value)}
                            >
                              <option value="">{t({ zh: '未放置', en: 'Empty' })}</option>
                              {championOptions.map((item) => (
                                <option key={item.id} value={item.id}>
                                  {getChampionOptionLabel(item)}
                                </option>
                              ))}
                            </select>
                            {champion ? (
                              <div className="formation-slot__current">
                                <ChampionAvatar
                                  champion={champion}
                                  locale={locale}
                                  className="champion-avatar--slot"
                                />
                                <span className="formation-slot__hint">
                                  {t({
                                    zh: `当前：${getLocalizedTextPair(champion.name, locale)}`,
                                    en: `Current: ${getLocalizedTextPair(champion.name, locale)}`,
                                  })}
                                </span>
                              </div>
                            ) : (
                              <span className="formation-slot__hint">
                                {t({
                                  zh: `坐标 ${slot.row}-${slot.column}`,
                                  en: `Position ${slot.row}-${slot.column}`,
                                })}
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {activeMobileSlot ? (
                  <div className="formation-mobile-editor" data-testid="formation-mobile-editor">
                    <div className="formation-mobile-editor__header">
                      <div>
                        <p className="formation-mobile-editor__eyebrow">
                          {t({ zh: '当前编辑槽位', en: 'Editing slot' })}
                        </p>
                        <h3 className="formation-mobile-editor__title" data-testid="formation-mobile-editor-slot">
                          {locale === 'zh-CN'
                            ? `槽位 ${selectedLayout.slots.findIndex((slot) => slot.id === activeMobileSlot.id) + 1}`
                            : `Slot ${selectedLayout.slots.findIndex((slot) => slot.id === activeMobileSlot.id) + 1}`}
                        </h3>
                        <p className="formation-mobile-editor__description">
                          {activeMobileChampion
                            ? t({
                                zh: `当前为 ${getLocalizedTextPair(activeMobileChampion.name, locale)}，点击下方可更换英雄。`,
                                en: `Currently ${getLocalizedTextPair(activeMobileChampion.name, locale)}. Use the picker below to swap champions.`,
                              })
                            : t({
                                zh: '当前未放置英雄，先从下方列表里选择一名候选。',
                                en: 'This slot is empty. Pick a champion below to place one here.',
                              })}
                        </p>
                      </div>
                      {activeMobileChampion ? (
                        <button
                          type="button"
                          className="action-button action-button--ghost formation-mobile-editor__clear"
                          onClick={() => handleAssignChampion(activeMobileSlot.id, '')}
                        >
                          {t({ zh: '清空槽位', en: 'Clear slot' })}
                        </button>
                      ) : null}
                    </div>

                    <select
                      data-testid="formation-mobile-slot-select"
                      className="slot-select"
                      value={activeMobileChampionId}
                      onChange={(event) => handleAssignChampion(activeMobileSlot.id, event.target.value)}
                    >
                      <option value="">{t({ zh: '未放置', en: 'Empty' })}</option>
                      {championOptions.map((item) => (
                        <option key={item.id} value={item.id}>
                          {getChampionOptionLabel(item)}
                        </option>
                      ))}
                    </select>

                    {activeMobileChampion ? (
                      <div className="formation-mobile-editor__current">
                        <ChampionAvatar
                          champion={activeMobileChampion}
                          locale={locale}
                          className="champion-avatar--slot"
                        />
                        <div className="formation-mobile-editor__current-copy">
                          <strong
                            className="formation-mobile-editor__current-name"
                            data-testid="formation-mobile-current-name"
                          >
                            {getLocalizedTextPair(activeMobileChampion.name, locale)}
                          </strong>
                          <span className="formation-mobile-editor__current-meta">
                            {formatSeatLabel(activeMobileChampion.seat, locale)} ·{' '}
                            {activeMobileChampion.roles.map((role) => getRoleLabel(role, locale)).join(' / ')}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p
                        className="formation-mobile-editor__empty"
                        data-testid="formation-mobile-current-name"
                      >
                        {t({ zh: '当前未放置英雄', en: 'No champion placed yet' })}
                      </p>
                    )}
                  </div>
                ) : null}

                <div className="button-row">
                  <button type="button" className="action-button action-button--ghost" onClick={handleClear}>
                    {t({ zh: '清空当前阵型', en: 'Clear this formation' })}
                  </button>
                </div>
              </>
            ) : (
              <StatusBanner tone="info">
                {t({
                  zh: '当前还没有可用布局，请先运行官方数据构建脚本。',
                  en: 'No layouts are available yet. Run the official data build pipeline first.',
                })}
              </StatusBanner>
            )}
          </>
        ) : null}
      </SurfaceCard>

      <SurfaceCard
        eyebrow={t({ zh: '阵型摘要', en: 'Formation summary' })}
        title={t({
          zh: '把工作草稿保存成命名方案，再交给方案存档页管理',
          en: 'Turn the working draft into a named preset',
        })}
        description={t({
          zh: '最近草稿继续留在阵型页自动保存；命名方案会进入方案存档页，后续可编辑、删除并恢复回阵型页。',
          en: 'Recent drafts stay on this page for auto-save, while named presets move into the preset library for later edit, delete, and restore.',
        })}
      >
        <div className="split-grid">
          <div className="form-stack">
            <FieldGroup label={t({ zh: '方案名称', en: 'Preset name' })} labelFor="preset-name">
              <input
                id="preset-name"
                className="text-input"
                type="text"
                value={presetForm.name}
                onChange={(event) => updatePresetForm('name', event.target.value)}
                placeholder={t({
                  zh: '例如：速刷常用 10 槽波形',
                  en: 'Example: Speed farm core wave 10',
                })}
              />
            </FieldGroup>

            <FieldGroup label={t({ zh: '方案备注', en: 'Preset notes' })} labelFor="preset-description">
              <textarea
                id="preset-description"
                className="text-area"
                rows={4}
                value={presetForm.description}
                onChange={(event) => updatePresetForm('description', event.target.value)}
                placeholder={t({
                  zh: '记录这套阵容适合什么目标、还有哪些待补位。',
                  en: 'Describe what this formation is for and what still needs tuning.',
                })}
              />
            </FieldGroup>

            <FieldGroup
              label={t({ zh: '场景标签', en: 'Scenario tags' })}
              labelFor="preset-tags"
              hint={t({
                zh: '仅作用户可读标签，不作为恢复主键；可用中英文逗号分隔。',
                en: 'These are reader-friendly tags only, not restore keys. Use commas to separate them.',
              })}
            >
              <input
                id="preset-tags"
                className="text-input"
                type="text"
                value={presetForm.scenarioTagsInput}
                onChange={(event) => updatePresetForm('scenarioTagsInput', event.target.value)}
                placeholder={t({
                  zh: '例如：推图，速刷，Time Gate',
                  en: 'Example: Push, speed, Time Gate',
                })}
              />
            </FieldGroup>

            <FieldGroup label={t({ zh: '优先级', en: 'Priority' })}>
              <div className="segmented-control">
                {PRESET_PRIORITY_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={
                      presetForm.priority === option
                        ? 'segmented-control__button segmented-control__button--active'
                        : 'segmented-control__button'
                    }
                    onClick={() => handlePriorityChange(option)}
                  >
                    {getPresetPriorityLabel(option)}
                  </button>
                ))}
              </div>
            </FieldGroup>

            <div className="button-row">
              <button
                type="button"
                className="action-button action-button--secondary"
                onClick={handleSavePreset}
                disabled={!canSavePreset}
              >
                {isSavingPreset
                  ? t({ zh: '保存中…', en: 'Saving…' })
                  : t({ zh: '保存为方案', en: 'Save as preset' })}
              </button>
              <button type="button" className="action-button action-button--ghost" onClick={handleOpenPresetsPage}>
                {t({ zh: '查看方案存档', en: 'Open preset library' })}
              </button>
            </div>

            {presetStatus ? (
              <StatusBanner tone={presetStatus.tone} title={presetStatus.title} detail={presetStatus.detail} />
            ) : null}
          </div>

          <div className="preview-grid">
            <article className="preview-card">
              <span className="preview-card__label">{t({ zh: '当前布局', en: 'Current layout' })}</span>
              <strong className="preview-card__value">
                {selectedLayout ? getFormationLayoutLabel(selectedLayout, locale) : t({ zh: '未选择', en: 'Not selected' })}
              </strong>
            </article>
            <article className="preview-card">
              <span className="preview-card__label">{t({ zh: '可保存英雄数', en: 'Savable champions' })}</span>
              <strong className="preview-card__value">{selectedChampions.length}</strong>
            </article>
            <article className="preview-card">
              <span className="preview-card__label">{t({ zh: 'seat 冲突', en: 'Seat conflicts' })}</span>
              <strong className="preview-card__value">
                {conflictingSeats.length > 0 ? conflictingSeats.join(', ') : t({ zh: '无', en: 'None' })}
              </strong>
            </article>
            <article className="preview-card">
              <span className="preview-card__label">{t({ zh: '场景上下文', en: 'Scenario context' })}</span>
              <strong className="preview-card__value">
                {scenarioRef
                  ? `${scenarioRef.kind}:${scenarioRef.id}`
                  : t({ zh: '当前未绑定', en: 'Not linked yet' })}
              </strong>
            </article>
          </div>
        </div>

        {selectedChampions.length === 0 ? (
          <p className="supporting-text">
            {t({
              zh: '当前还没有放置英雄。先选一个布局，再逐格选择英雄，页面会自动保存最近草稿；至少放置 1 名英雄后才可保存为命名方案。',
              en: 'No champions are placed yet. Pick a layout, fill the slots, and the page will auto-save a recent draft. Place at least one champion before saving a named preset.',
            })}
          </p>
        ) : (
          <div className="results-grid">
            {selectedChampions.map(({ slotId, champion }) => {
              return (
                <article key={`${slotId}-${champion.id}`} className="result-card">
                  <ChampionIdentity champion={champion} locale={locale} eyebrow={slotId} />
                  <p className="supporting-text">{formatSeatLabel(champion.seat, locale)}</p>
                  {champion.affiliations.length > 0 ? (
                    <p className="supporting-text">
                      {t({ zh: '联动队伍', en: 'Affiliation' })}：
                      {champion.affiliations.map((affiliation) => getLocalizedTextPair(affiliation, locale)).join(' / ')}
                    </p>
                  ) : null}
                  <div className="tag-row">
                    {champion.roles.map((role) => (
                      <span key={role} className="tag-pill">
                        {getRoleLabel(role, locale)}
                      </span>
                    ))}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </SurfaceCard>
    </div>
  )
}
