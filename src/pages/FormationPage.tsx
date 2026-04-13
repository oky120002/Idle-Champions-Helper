import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
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

const PRESET_PRIORITY_OPTIONS: Array<{ value: PresetPriority; label: string }> = [
  { value: 'medium', label: '常用' },
  { value: 'high', label: '高优先' },
  { value: 'low', label: '备用' },
]

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

type StatusTone = 'info' | 'success' | 'error'

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

function getStatusBannerClassName(tone: StatusTone): string {
  if (tone === 'success') {
    return 'status-banner status-banner--success'
  }

  if (tone === 'error') {
    return 'status-banner status-banner--error'
  }

  return 'status-banner status-banner--info'
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

export function FormationPage() {
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

  const championOptions = useMemo(() => {
    if (state.status !== 'ready') {
      return []
    }

    return [...state.champions].sort((left, right) => left.seat - right.seat || left.name.localeCompare(right.name))
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

        const champion = state.champions.find((item) => item.id === championId) ?? null

        if (!champion) {
          return null
        }

        return {
          slotId: slot.id,
          champion,
        }
      })
      .filter((item): item is { slotId: string; champion: Champion } => item !== null)
  }, [placements, selectedLayout, state])

  const conflictingSeats = useMemo(
    () => findSeatConflicts(selectedChampions.map((item) => item.champion.seat)),
    [selectedChampions],
  )

  const canSavePreset = selectedChampions.length > 0 && presetForm.name.trim().length > 0 && !isSavingPreset

  function bumpEditRevision() {
    setEditRevision((current) => current + 1)
  }

  function handleSelectLayout(layoutId: string) {
    setSelectedLayoutId(layoutId)
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
        eyebrow="阵型编辑"
        title="把最近草稿保存 / 恢复接回阵型页闭环"
        description="当前继续使用手工维护的 MVP 布局；最近草稿会自动写入当前浏览器的 IndexedDB，不上传到外部。"
      >
        {state.status === 'loading' ? (
          <div className="status-banner status-banner--info">正在读取阵型布局和英雄数据…</div>
        ) : null}

        {state.status === 'error' ? (
          <div className="status-banner status-banner--error">阵型数据读取失败：{state.message}</div>
        ) : null}

        {state.status === 'ready' ? (
          <>
            {draftPrompt ? (
              <div
                className={
                  draftPrompt.kind === 'restore' ? 'status-banner status-banner--info' : 'status-banner status-banner--error'
                }
              >
                <div className="status-banner__content">
                  <strong className="status-banner__title">
                    {draftPrompt.kind === 'restore' ? '检测到最近草稿，是否恢复？' : draftPrompt.title}
                  </strong>
                  <p className="status-banner__detail">
                    {draftPrompt.kind === 'restore'
                      ? `${formatDateTime(draftPrompt.preview.snapshot.updatedAt)} · ${Object.keys(draftPrompt.preview.placements).length} 名英雄 · ${draftPrompt.preview.layoutName}`
                      : draftPrompt.detail}
                  </p>
                  {draftPrompt.kind === 'restore' ? (
                    <>
                      <p className="status-banner__detail">{buildRestoreStatusDetail(draftPrompt.preview)}</p>
                      <div className="tag-row status-banner__meta">
                        <span className="tag-pill tag-pill--muted">保存版本：{draftPrompt.preview.snapshot.dataVersion}</span>
                        <span className="tag-pill tag-pill--muted">恢复版本：{draftPrompt.preview.dataVersion}</span>
                        <span className="tag-pill tag-pill--muted">
                          {draftPrompt.preview.restoreMode === 'compatible' ? '兼容恢复' : '原样恢复'}
                        </span>
                      </div>
                    </>
                  ) : null}
                </div>
                <div className="status-banner__actions">
                  {draftPrompt.kind === 'restore' ? (
                    <button
                      type="button"
                      className="action-button action-button--secondary"
                      onClick={handleRestoreRecentDraft}
                    >
                      恢复最近草稿
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="action-button action-button--ghost"
                    onClick={handleKeepDraftWithoutRestore}
                  >
                    先保留不恢复
                  </button>
                  <button
                    type="button"
                    className="action-button action-button--ghost"
                    onClick={handleDiscardRecentDraft}
                  >
                    丢弃旧草稿
                  </button>
                </div>
              </div>
            ) : draftStatus ? (
              <div className={getStatusBannerClassName(draftStatus.tone)}>
                <div className="status-banner__content">
                  <strong className="status-banner__title">{draftStatus.title}</strong>
                  <p className="status-banner__detail">{draftStatus.detail}</p>
                </div>
              </div>
            ) : null}

            <div className="filter-group">
              <span className="field-label">布局选择</span>
              <div className="filter-chip-grid">
                {state.formations.map((layout) => (
                  <button
                    key={layout.id}
                    type="button"
                    className={selectedLayout?.id === layout.id ? 'filter-chip filter-chip--active' : 'filter-chip'}
                    onClick={() => handleSelectLayout(layout.id)}
                  >
                    {layout.name}
                  </button>
                ))}
              </div>
            </div>

            {selectedLayout ? (
              <>
                <div className="metric-grid">
                  <article className="metric-card">
                    <span className="metric-card__label">当前布局</span>
                    <strong className="metric-card__value">{selectedLayout.name}</strong>
                  </article>
                  <article className="metric-card">
                    <span className="metric-card__label">槽位数</span>
                    <strong className="metric-card__value">{selectedLayout.slots.length}</strong>
                  </article>
                  <article className="metric-card">
                    <span className="metric-card__label">数据版本</span>
                    <strong className="metric-card__value">{state.dataVersion}</strong>
                  </article>
                  <article className="metric-card">
                    <span className="metric-card__label">已放置英雄</span>
                    <strong className="metric-card__value">{selectedChampions.length}</strong>
                  </article>
                  <article className="metric-card">
                    <span className="metric-card__label">seat 冲突</span>
                    <strong className="metric-card__value">
                      {conflictingSeats.length > 0 ? conflictingSeats.join(', ') : '无'}
                    </strong>
                  </article>
                </div>

                {selectedLayout.notes ? (
                  <div className="status-banner status-banner--info">{selectedLayout.notes}</div>
                ) : null}

                {conflictingSeats.length > 0 ? (
                  <div className="status-banner status-banner--error">
                    当前阵型里出现 seat 冲突：{conflictingSeats.join(', ')}。同一 seat 只能放一名英雄。
                  </div>
                ) : null}

                <div className="formation-board-wrap">
                  <div className="formation-board">
                    {selectedLayout.slots.map((slot, index) => {
                      const championId = placements[slot.id] ?? ''
                      const champion = championOptions.find((item) => item.id === championId) ?? null
                      const hasConflict = champion ? conflictingSeats.includes(champion.seat) : false

                      return (
                        <div
                          key={slot.id}
                          className={hasConflict ? 'formation-slot formation-slot--conflict' : 'formation-slot'}
                          style={{ gridColumn: slot.column, gridRow: slot.row }}
                        >
                          <span className="formation-slot__label">槽位 {index + 1}</span>
                          <select
                            className="slot-select"
                            value={championId}
                            onChange={(event) => handleAssignChampion(slot.id, event.target.value)}
                          >
                            <option value="">未放置</option>
                            {championOptions.map((item) => (
                              <option key={item.id} value={item.id}>
                                {`Seat ${item.seat} · ${item.name}`}
                              </option>
                            ))}
                          </select>
                          <span className="formation-slot__hint">
                            {champion ? `当前：${champion.name}` : `坐标 ${slot.row}-${slot.column}`}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="button-row">
                  <button type="button" className="action-button action-button--ghost" onClick={handleClear}>
                    清空当前阵型
                  </button>
                </div>
              </>
            ) : (
              <div className="status-banner status-banner--info">
                当前还没有可用布局，请先补 `scripts/data/manual-overrides.json`。
              </div>
            )}
          </>
        ) : null}
      </SurfaceCard>

      <SurfaceCard
        eyebrow="阵型摘要"
        title="把工作草稿保存成命名方案，再交给方案存档页管理"
        description="最近草稿继续留在阵型页自动保存；命名方案会进入方案存档页，后续可编辑、删除并恢复回阵型页。"
      >
        <div className="split-grid">
          <div className="form-stack">
            <div className="form-field">
              <label className="field-label" htmlFor="preset-name">
                方案名称
              </label>
              <input
                id="preset-name"
                className="text-input"
                type="text"
                value={presetForm.name}
                onChange={(event) => updatePresetForm('name', event.target.value)}
                placeholder="例如：速刷常用 10 槽波形"
              />
            </div>

            <div className="form-field">
              <label className="field-label" htmlFor="preset-description">
                方案备注
              </label>
              <textarea
                id="preset-description"
                className="text-area"
                rows={4}
                value={presetForm.description}
                onChange={(event) => updatePresetForm('description', event.target.value)}
                placeholder="记录这套阵容适合什么目标、还有哪些待补位。"
              />
            </div>

            <div className="form-field">
              <label className="field-label" htmlFor="preset-tags">
                场景标签
              </label>
              <input
                id="preset-tags"
                className="text-input"
                type="text"
                value={presetForm.scenarioTagsInput}
                onChange={(event) => updatePresetForm('scenarioTagsInput', event.target.value)}
                placeholder="例如：推图，速刷，Time Gate"
              />
              <span className="field-hint">仅作用户可读标签，不作为恢复主键；可用中英文逗号分隔。</span>
            </div>

            <div className="form-field">
              <span className="field-label">优先级</span>
              <div className="segmented-control">
                {PRESET_PRIORITY_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={
                      presetForm.priority === option.value
                        ? 'segmented-control__button segmented-control__button--active'
                        : 'segmented-control__button'
                    }
                    onClick={() => handlePriorityChange(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="button-row">
              <button
                type="button"
                className="action-button action-button--secondary"
                onClick={handleSavePreset}
                disabled={!canSavePreset}
              >
                {isSavingPreset ? '保存中…' : '保存为方案'}
              </button>
              <button type="button" className="action-button action-button--ghost" onClick={handleOpenPresetsPage}>
                查看方案存档
              </button>
            </div>

            {presetStatus ? (
              <div className={getStatusBannerClassName(presetStatus.tone)}>
                <div className="status-banner__content">
                  <strong className="status-banner__title">{presetStatus.title}</strong>
                  <p className="status-banner__detail">{presetStatus.detail}</p>
                </div>
              </div>
            ) : null}
          </div>

          <div className="preview-grid">
            <article className="preview-card">
              <span className="preview-card__label">当前布局</span>
              <strong className="preview-card__value">{selectedLayout?.name ?? '未选择'}</strong>
            </article>
            <article className="preview-card">
              <span className="preview-card__label">可保存英雄数</span>
              <strong className="preview-card__value">{selectedChampions.length}</strong>
            </article>
            <article className="preview-card">
              <span className="preview-card__label">seat 冲突</span>
              <strong className="preview-card__value">
                {conflictingSeats.length > 0 ? conflictingSeats.join(', ') : '无'}
              </strong>
            </article>
            <article className="preview-card">
              <span className="preview-card__label">场景上下文</span>
              <strong className="preview-card__value">{scenarioRef ? `${scenarioRef.kind}:${scenarioRef.id}` : '当前未绑定'}</strong>
            </article>
          </div>
        </div>

        {selectedChampions.length === 0 ? (
          <p className="supporting-text">
            当前还没有放置英雄。先选一个布局，再逐格选择英雄，页面会自动保存最近草稿；至少放置 1 名英雄后才可保存为命名方案。
          </p>
        ) : (
          <div className="results-grid">
            {selectedChampions.map(({ slotId, champion }) => (
              <article key={`${slotId}-${champion.id}`} className="result-card">
                <div className="result-card__header">
                  <span className="result-card__eyebrow">{slotId}</span>
                  <h3 className="result-card__title">{champion.name}</h3>
                </div>
                <p className="supporting-text">Seat {champion.seat}</p>
                <div className="tag-row">
                  {champion.roles.map((role) => (
                    <span key={role} className="tag-pill">
                      {role}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </SurfaceCard>
    </div>
  )
}
