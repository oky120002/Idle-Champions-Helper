import { useEffect, useMemo, useState } from 'react'
import { SurfaceCard } from '../components/SurfaceCard'
import { loadCollectionAtVersion, loadVersion } from '../data/client'
import {
  deleteRecentFormationDraft,
  readRecentFormationDraft,
  saveRecentFormationDraft,
} from '../data/formationDraftStore'
import type { Champion, FormationDraft, FormationLayout, ScenarioRef } from '../domain/types'
import { findSeatConflicts } from '../rules/seat'

const DRAFT_SCHEMA_VERSION = 1
const DRAFT_SAVE_DELAY_MS = 600

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

type DraftRestoreMode = 'exact' | 'compatible'

type DraftStatusTone = 'info' | 'success' | 'error'

interface DraftStatusMessage {
  tone: DraftStatusTone
  title: string
  detail: string
}

interface DraftRestorePreview {
  draft: FormationDraft
  layoutName: string
  dataVersion: string
  restoreMode: DraftRestoreMode
  formations: FormationLayout[]
  champions: Champion[]
  placements: Record<string, string>
  invalidSlotIds: string[]
  invalidChampionIds: string[]
}

type DraftPrompt =
  | {
      kind: 'restore'
      preview: DraftRestorePreview
    }
  | {
      kind: 'invalid'
      draft: FormationDraft
      title: string
      detail: string
    }

interface ValidatedDraftPlacements {
  layout: FormationLayout
  placements: Record<string, string>
  invalidSlotIds: string[]
  invalidChampionIds: string[]
}

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

function validateDraftPlacements(
  draft: FormationDraft,
  formations: FormationLayout[],
  champions: Champion[],
): ValidatedDraftPlacements | null {
  const layout = formations.find((item) => item.id === draft.layoutId)

  if (!layout) {
    return null
  }

  const validSlotIds = new Set(layout.slots.map((slot) => slot.id))
  const validChampionIds = new Set(champions.map((champion) => champion.id))
  const placements: Record<string, string> = {}
  const invalidSlotIds: string[] = []
  const invalidChampionIds: string[] = []

  Object.entries(draft.placements).forEach(([slotId, championId]) => {
    if (!validSlotIds.has(slotId)) {
      invalidSlotIds.push(slotId)
      return
    }

    if (!validChampionIds.has(championId)) {
      invalidChampionIds.push(championId)
      return
    }

    placements[slotId] = championId
  })

  return {
    layout,
    placements,
    invalidSlotIds,
    invalidChampionIds,
  }
}

function buildDroppedReferenceDetail(invalidSlotIds: string[], invalidChampionIds: string[]): string {
  const parts: string[] = []

  if (invalidSlotIds.length > 0) {
    parts.push(`${invalidSlotIds.length} 个槽位引用已失效`)
  }

  if (invalidChampionIds.length > 0) {
    parts.push(`${invalidChampionIds.length} 个英雄引用已失效`)
  }

  return parts.join('；')
}

async function buildDraftPrompt(
  draft: FormationDraft,
  currentDataVersion: string,
  currentFormations: FormationLayout[],
  currentChampions: Champion[],
): Promise<DraftPrompt> {
  if (draft.schemaVersion !== DRAFT_SCHEMA_VERSION) {
    return {
      kind: 'invalid',
      draft,
      title: '最近草稿版本过旧，当前不能直接恢复',
      detail: `当前只识别 schemaVersion=${DRAFT_SCHEMA_VERSION} 的草稿；检测到旧草稿版本为 ${draft.schemaVersion}。`,
    }
  }

  let restoreMode: DraftRestoreMode = 'exact'
  let dataVersion = draft.dataVersion
  let formations = currentFormations
  let champions = currentChampions

  if (draft.dataVersion !== currentDataVersion) {
    try {
      const [formationCollection, championCollection] = await Promise.all([
        loadCollectionAtVersion<FormationLayout>(draft.dataVersion, 'formations'),
        loadCollectionAtVersion<Champion>(draft.dataVersion, 'champions'),
      ])

      formations = formationCollection.items
      champions = championCollection.items
    } catch {
      restoreMode = 'compatible'
      dataVersion = currentDataVersion
    }
  }

  const validated = validateDraftPlacements(draft, formations, champions)

  if (!validated) {
    return {
      kind: 'invalid',
      draft,
      title: '最近草稿引用的布局已不存在，当前不能安全恢复',
      detail:
        restoreMode === 'compatible'
          ? `保存时的数据版本 ${draft.dataVersion} 已不可读，且当前版本 ${currentDataVersion} 中也找不到布局 ${draft.layoutId}。`
          : `保存版本 ${draft.dataVersion} 中已找不到布局 ${draft.layoutId}。`,
    }
  }

  const originalPlacementCount = Object.keys(draft.placements).length
  const validPlacementCount = Object.keys(validated.placements).length

  if (originalPlacementCount === 0 || validPlacementCount === 0) {
    const droppedDetail = buildDroppedReferenceDetail(validated.invalidSlotIds, validated.invalidChampionIds)

    return {
      kind: 'invalid',
      draft,
      title: '最近草稿没有可恢复的有效放置结果',
      detail: droppedDetail || '草稿中没有任何可用的槽位与英雄映射。',
    }
  }

  return {
    kind: 'restore',
    preview: {
      draft,
      layoutName: validated.layout.name,
      dataVersion,
      restoreMode,
      formations,
      champions,
      placements: validated.placements,
      invalidSlotIds: validated.invalidSlotIds,
      invalidChampionIds: validated.invalidChampionIds,
    },
  }
}

function buildRestoreStatusDetail(preview: DraftRestorePreview): string {
  const parts = [
    preview.restoreMode === 'compatible'
      ? `保存版本 ${preview.draft.dataVersion} 已不可读，当前按 ${preview.dataVersion} 兼容恢复。`
      : `已按数据版本 ${preview.dataVersion} 恢复。`,
  ]

  const droppedDetail = buildDroppedReferenceDetail(preview.invalidSlotIds, preview.invalidChampionIds)

  if (droppedDetail) {
    parts.push(droppedDetail)
  }

  return parts.join(' ')
}

function getStatusBannerClassName(tone: DraftStatusTone): string {
  if (tone === 'success') {
    return 'status-banner status-banner--success'
  }

  if (tone === 'error') {
    return 'status-banner status-banner--error'
  }

  return 'status-banner status-banner--info'
}

export function FormationPage() {
  const [state, setState] = useState<FormationState>({ status: 'loading' })
  const [selectedLayoutId, setSelectedLayoutId] = useState<string>('')
  const [placements, setPlacements] = useState<Record<string, string>>({})
  const [scenarioRef, setScenarioRef] = useState<ScenarioRef | null>(null)
  const [draftPrompt, setDraftPrompt] = useState<DraftPrompt | null>(null)
  const [draftStatus, setDraftStatus] = useState<DraftStatusMessage | null>(null)
  const [isDraftPersistenceArmed, setIsDraftPersistenceArmed] = useState(false)
  const [editRevision, setEditRevision] = useState(0)

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

        setState({
          status: 'ready',
          dataVersion: version.current,
          formations: formationCollection.items,
          champions: championCollection.items,
        })
        setSelectedLayoutId(formationCollection.items[0]?.id ?? '')
        setDraftStatus({
          tone: 'info',
          title: '最近草稿会自动保存在当前浏览器',
          detail: '介质为 IndexedDB；只保存在本地，不上传到外部服务。',
        })

        try {
          const storedDraft = await readRecentFormationDraft()

          if (disposed) {
            return
          }

          if (!storedDraft) {
            setIsDraftPersistenceArmed(true)
            return
          }

          const prompt = await buildDraftPrompt(
            storedDraft,
            version.current,
            formationCollection.items,
            championCollection.items,
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
  }, [])

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
    bumpEditRevision()
  }

  function handleClear() {
    setPlacements({})
    setDraftStatus({
      tone: 'info',
      title: '当前阵型已清空',
      detail: '如果保持为空，最近草稿会从浏览器本地一起清理。',
    })
    bumpEditRevision()
  }

  function handleRestoreRecentDraft() {
    if (draftPrompt?.kind !== 'restore') {
      return
    }

    const { preview } = draftPrompt

    setState({
      status: 'ready',
      dataVersion: preview.dataVersion,
      formations: preview.formations,
      champions: preview.champions,
    })
    setSelectedLayoutId(preview.draft.layoutId)
    setPlacements(preview.placements)
    setScenarioRef(preview.draft.scenarioRef)
    setDraftPrompt(null)
    setIsDraftPersistenceArmed(true)
    setDraftStatus({
      tone: 'success',
      title: '最近草稿已恢复',
      detail: buildRestoreStatusDetail(preview),
    })
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
              <div className={draftPrompt.kind === 'restore' ? 'status-banner status-banner--info' : 'status-banner status-banner--error'}>
                <div className="status-banner__content">
                  <strong className="status-banner__title">
                    {draftPrompt.kind === 'restore' ? '检测到最近草稿，是否恢复？' : draftPrompt.title}
                  </strong>
                  <p className="status-banner__detail">
                    {draftPrompt.kind === 'restore'
                      ? `${formatDateTime(draftPrompt.preview.draft.updatedAt)} · ${Object.keys(draftPrompt.preview.placements).length} 名英雄 · ${draftPrompt.preview.layoutName}`
                      : draftPrompt.detail}
                  </p>
                  {draftPrompt.kind === 'restore' ? (
                    <>
                      <p className="status-banner__detail">{buildRestoreStatusDetail(draftPrompt.preview)}</p>
                      <div className="tag-row status-banner__meta">
                        <span className="tag-pill tag-pill--muted">保存版本：{draftPrompt.preview.draft.dataVersion}</span>
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
                  <button type="button" className="action-button action-button--ghost" onClick={handleKeepDraftWithoutRestore}>
                    先保留不恢复
                  </button>
                  <button type="button" className="action-button action-button--ghost" onClick={handleDiscardRecentDraft}>
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
        title="先把当前工作草稿看清楚，再考虑命名方案"
        description="这一页只承接正在编辑的最近草稿；后续“保存为方案”会继续交给方案存档页。"
      >
        {selectedChampions.length === 0 ? (
          <p className="supporting-text">当前还没有放置英雄。先选一个布局，再逐格选择英雄，页面会自动保存最近草稿并实时提示 seat 冲突。</p>
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
