import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SurfaceCard } from '../components/SurfaceCard'
import { loadCollectionAtVersion, loadVersion } from '../data/client'
import {
  buildFormationSnapshotPrompt,
  buildRestoreStatusDetail,
  type FormationSnapshotPrompt,
} from '../data/formationPersistence'
import { deleteFormationPreset, listFormationPresets, saveFormationPreset } from '../data/formationPresetStore'
import type {
  Champion,
  FormationLayout,
  FormationPreset,
  PresetPriority,
} from '../domain/types'

const PRESET_SCHEMA_VERSION = 1

const PRESET_PRIORITY_OPTIONS: Array<{ value: PresetPriority; label: string }> = [
  { value: 'high', label: '高优先' },
  { value: 'medium', label: '常用' },
  { value: 'low', label: '备用' },
]

type StatusTone = 'info' | 'success' | 'error'

interface StatusMessage {
  tone: StatusTone
  title: string
  detail: string
}

type PresetsState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
      status: 'ready'
      dataVersion: string
      formations: FormationLayout[]
      champions: Champion[]
      items: PresetView[]
    }

interface PresetView {
  preset: FormationPreset
  prompt: FormationSnapshotPrompt<FormationPreset>
}

interface PresetEditorState {
  name: string
  description: string
  scenarioTagsInput: string
  priority: PresetPriority
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

function buildPriorityLabel(priority: PresetPriority): string {
  const option = PRESET_PRIORITY_OPTIONS.find((item) => item.value === priority)
  return option?.label ?? priority
}

function buildEditorState(preset: FormationPreset): PresetEditorState {
  return {
    name: preset.name,
    description: preset.description,
    scenarioTagsInput: preset.scenarioTags.join('，'),
    priority: preset.priority,
  }
}

function buildChampionSummary(view: PresetView): string[] {
  if (view.prompt.kind !== 'restore') {
    return []
  }

  const championsById = new Map(view.prompt.preview.champions.map((champion) => [champion.id, champion]))

  return Object.values(view.prompt.preview.placements)
    .map((championId) => championsById.get(championId) ?? null)
    .filter((champion): champion is Champion => champion !== null)
    .sort((left, right) => left.seat - right.seat || left.name.localeCompare(right.name))
    .map((champion) => `Seat ${champion.seat} · ${champion.name}`)
}

async function buildPresetViews(
  dataVersion: string,
  formations: FormationLayout[],
  champions: Champion[],
): Promise<PresetView[]> {
  const presets = await listFormationPresets()

  return Promise.all(
    presets.map(async (preset) => ({
      preset,
      prompt: await buildFormationSnapshotPrompt(
        preset,
        dataVersion,
        formations,
        champions,
        '方案',
        PRESET_SCHEMA_VERSION,
      ),
    })),
  )
}

export function PresetsPage() {
  const navigate = useNavigate()

  const [state, setState] = useState<PresetsState>({ status: 'loading' })
  const [pageStatus, setPageStatus] = useState<StatusMessage | null>(null)
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null)
  const [editor, setEditor] = useState<PresetEditorState>({
    name: '',
    description: '',
    scenarioTagsInput: '',
    priority: 'medium',
  })
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

  const metrics = useMemo(() => {
    if (state.status !== 'ready') {
      return {
        total: 0,
        recoverable: 0,
        risky: 0,
      }
    }

    const recoverable = state.items.filter((item) => item.prompt.kind === 'restore').length
    const risky = state.items.filter(
      (item) =>
        item.prompt.kind === 'invalid' ||
        item.prompt.preview.restoreMode === 'compatible' ||
        item.prompt.preview.invalidChampionIds.length > 0 ||
        item.prompt.preview.invalidSlotIds.length > 0,
    ).length

    return {
      total: state.items.length,
      recoverable,
      risky,
    }
  }, [state])

  async function refreshPresetList(successMessage?: StatusMessage) {
    if (state.status !== 'ready') {
      return
    }

    try {
      const items = await buildPresetViews(state.dataVersion, state.formations, state.champions)
      setState({
        ...state,
        items,
      })

      if (successMessage) {
        setPageStatus(successMessage)
      }
    } catch (error: unknown) {
      setPageStatus({
        tone: 'error',
        title: '刷新方案列表失败',
        detail: getErrorMessage(error),
      })
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

  function handleRestorePreset(view: PresetView) {
    if (view.prompt.kind !== 'restore') {
      return
    }

    navigate('/formation', {
      state: {
        pendingPresetRestore: view.preset,
      },
    })
  }

  function handleSavePresetEdit(preset: FormationPreset) {
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
        await refreshPresetList({
          tone: 'success',
          title: `方案“${nextPreset.name}”已更新`,
          detail: '名称、备注、标签和优先级已写回本地方案库。',
        })
      } catch (error: unknown) {
        setPageStatus({
          tone: 'error',
          title: '更新方案失败',
          detail: getErrorMessage(error),
        })
      }
    }

    void saveEdit()
  }

  function handleDeletePreset(preset: FormationPreset) {
    const deletePreset = async () => {
      try {
        await deleteFormationPreset(preset.id)
        setDeleteConfirmId(null)
        setEditingPresetId((current) => (current === preset.id ? null : current))
        await refreshPresetList({
          tone: 'info',
          title: `方案“${preset.name}”已删除`,
          detail: '这条命名方案已从当前浏览器的 IndexedDB 移除。',
        })
      } catch (error: unknown) {
        setPageStatus({
          tone: 'error',
          title: '删除方案失败',
          detail: getErrorMessage(error),
        })
      }
    }

    void deletePreset()
  }

  return (
    <div className="page-stack">
      <SurfaceCard
        eyebrow="方案存档"
        title="把命名方案留在本地，再从这里恢复回阵型页"
        description="命名方案与最近草稿分层管理；这里的所有内容都只保存在当前浏览器，不上传到外部服务。"
      >
        {state.status === 'loading' ? (
          <div className="status-banner status-banner--info">正在读取本地方案存档…</div>
        ) : null}

        {state.status === 'error' ? (
          <div className="status-banner status-banner--error">方案列表读取失败：{state.message}</div>
        ) : null}

        {state.status === 'ready' ? (
          <>
            {pageStatus ? (
              <div className={getStatusBannerClassName(pageStatus.tone)}>
                <div className="status-banner__content">
                  <strong className="status-banner__title">{pageStatus.title}</strong>
                  <p className="status-banner__detail">{pageStatus.detail}</p>
                </div>
              </div>
            ) : null}

            <div className="metric-grid">
              <article className="metric-card">
                <span className="metric-card__label">命名方案总数</span>
                <strong className="metric-card__value">{metrics.total}</strong>
              </article>
              <article className="metric-card">
                <span className="metric-card__label">可恢复方案</span>
                <strong className="metric-card__value">{metrics.recoverable}</strong>
              </article>
              <article className="metric-card">
                <span className="metric-card__label">需注意方案</span>
                <strong className="metric-card__value">{metrics.risky}</strong>
              </article>
            </div>

            <div className="split-grid">
              <div>
                <h3 className="section-heading">当前范围</h3>
                <ul className="bullet-list">
                  <li>查看命名方案列表</li>
                  <li>编辑方案名、备注、标签与优先级</li>
                  <li>删除不再需要的方案</li>
                  <li>把方案恢复回阵型页继续编辑</li>
                </ul>
              </div>
              <div>
                <h3 className="section-heading">当前边界</h3>
                <p className="supporting-text">
                  最近草稿继续留在阵型页自动保存；这里管理的是已命名方案。若要新增方案，请回到阵型页点击“保存为方案”。
                </p>
              </div>
            </div>
          </>
        ) : null}
      </SurfaceCard>

      <SurfaceCard
        eyebrow="已保存方案"
        title="按最近编辑排序管理你的本地阵型方案"
        description="恢复时会优先按保存时的数据版本校验；如果只能做兼容恢复，页面会明确提示。"
      >
        {state.status === 'ready' && state.items.length === 0 ? (
          <div className="status-banner status-banner--info">
            这里还没有命名方案。先去阵型页摆出一套阵容，再点击“保存为方案”。
          </div>
        ) : null}

        {state.status === 'ready' && state.items.length > 0 ? (
          <div className="results-grid">
            {state.items.map((view) => {
              const championSummary = buildChampionSummary(view)
              const hasDroppedReferences =
                view.prompt.kind === 'restore' &&
                (view.prompt.preview.invalidSlotIds.length > 0 || view.prompt.preview.invalidChampionIds.length > 0)
              const isCompatibleRestore =
                view.prompt.kind === 'restore' && view.prompt.preview.restoreMode === 'compatible'

              return (
                <article key={view.preset.id} className="result-card">
                  <div className="result-card__header">
                    <span className="result-card__eyebrow">{buildPriorityLabel(view.preset.priority)}</span>
                    <h3 className="result-card__title">{view.preset.name}</h3>
                  </div>

                  <p className="supporting-text">
                    {view.preset.description || '当前还没有备注，可在这里补充这套阵容适合的目标和限制。'}
                  </p>

                  <div className="tag-row">
                    <span className="tag-pill tag-pill--muted">
                      {view.prompt.kind === 'restore' ? view.prompt.preview.layoutName : view.preset.layoutId}
                    </span>
                    <span className="tag-pill tag-pill--muted">保存版本：{view.preset.dataVersion}</span>
                    <span className="tag-pill tag-pill--muted">更新于：{formatDateTime(view.preset.updatedAt)}</span>
                    <span className="tag-pill tag-pill--muted">
                      {view.preset.scenarioRef
                        ? `${view.preset.scenarioRef.kind}:${view.preset.scenarioRef.id}`
                        : '未绑定正式场景'}
                    </span>
                  </div>

                  {view.preset.scenarioTags.length > 0 ? (
                    <div className="tag-row result-card__section">
                      {view.preset.scenarioTags.map((tag) => (
                        <span key={tag} className="tag-pill">
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {championSummary.length > 0 ? (
                    <div className="tag-row result-card__section">
                      {championSummary.map((item) => (
                        <span key={item} className="tag-pill tag-pill--muted">
                          {item}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {view.prompt.kind === 'invalid' ? (
                    <div className="status-banner status-banner--error">
                      <div className="status-banner__content">
                        <strong className="status-banner__title">{view.prompt.title}</strong>
                        <p className="status-banner__detail">{view.prompt.detail}</p>
                      </div>
                    </div>
                  ) : null}

                  {view.prompt.kind === 'restore' && (isCompatibleRestore || hasDroppedReferences) ? (
                    <div className="status-banner status-banner--info">
                      <div className="status-banner__content">
                        <strong className="status-banner__title">恢复时会带兼容处理</strong>
                        <p className="status-banner__detail">{buildRestoreStatusDetail(view.prompt.preview)}</p>
                      </div>
                    </div>
                  ) : null}

                  <div className="button-row result-card__section">
                    <button
                      type="button"
                      className="action-button action-button--secondary"
                      disabled={view.prompt.kind !== 'restore'}
                      onClick={() => handleRestorePreset(view)}
                    >
                      恢复到阵型页
                    </button>
                    <button type="button" className="action-button action-button--ghost" onClick={() => startEditingPreset(view.preset)}>
                      编辑
                    </button>
                    {deleteConfirmId === view.preset.id ? (
                      <>
                        <button
                          type="button"
                          className="action-button"
                          onClick={() => handleDeletePreset(view.preset)}
                        >
                          确认删除
                        </button>
                        <button
                          type="button"
                          className="action-button action-button--ghost"
                          onClick={() => setDeleteConfirmId(null)}
                        >
                          取消
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="action-button action-button--ghost"
                        onClick={() => setDeleteConfirmId(view.preset.id)}
                      >
                        删除
                      </button>
                    )}
                  </div>

                  {editingPresetId === view.preset.id ? (
                    <div className="form-stack result-card__section">
                      <div className="form-field">
                        <label className="field-label" htmlFor={`preset-name-${view.preset.id}`}>
                          方案名称
                        </label>
                        <input
                          id={`preset-name-${view.preset.id}`}
                          className="text-input"
                          type="text"
                          value={editor.name}
                          onChange={(event) => updateEditor('name', event.target.value)}
                        />
                      </div>

                      <div className="form-field">
                        <label className="field-label" htmlFor={`preset-description-${view.preset.id}`}>
                          方案备注
                        </label>
                        <textarea
                          id={`preset-description-${view.preset.id}`}
                          className="text-area"
                          rows={4}
                          value={editor.description}
                          onChange={(event) => updateEditor('description', event.target.value)}
                        />
                      </div>

                      <div className="form-field">
                        <label className="field-label" htmlFor={`preset-tags-${view.preset.id}`}>
                          场景标签
                        </label>
                        <input
                          id={`preset-tags-${view.preset.id}`}
                          className="text-input"
                          type="text"
                          value={editor.scenarioTagsInput}
                          onChange={(event) => updateEditor('scenarioTagsInput', event.target.value)}
                        />
                      </div>

                      <div className="form-field">
                        <span className="field-label">优先级</span>
                        <div className="segmented-control">
                          {PRESET_PRIORITY_OPTIONS.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              className={
                                editor.priority === option.value
                                  ? 'segmented-control__button segmented-control__button--active'
                                  : 'segmented-control__button'
                              }
                              onClick={() => updateEditor('priority', option.value)}
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
                          disabled={editor.name.trim().length === 0}
                          onClick={() => handleSavePresetEdit(view.preset)}
                        >
                          保存修改
                        </button>
                        <button type="button" className="action-button action-button--ghost" onClick={cancelEditingPreset}>
                          取消编辑
                        </button>
                      </div>
                    </div>
                  ) : null}
                </article>
              )
            })}
          </div>
        ) : null}
      </SurfaceCard>
    </div>
  )
}
