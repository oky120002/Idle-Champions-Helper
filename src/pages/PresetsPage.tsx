import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { type AppLocale, useI18n } from '../app/i18n'
import { FieldGroup } from '../components/FieldGroup'
import { StatusBanner, type StatusTone } from '../components/StatusBanner'
import { SurfaceCard } from '../components/SurfaceCard'
import { loadCollectionAtVersion, loadVersion } from '../data/client'
import {
  buildFormationSnapshotPrompt,
  buildRestoreStatusDetail,
  type FormationSnapshotPrompt,
} from '../data/formationPersistence'
import { deleteFormationPreset, listFormationPresets, saveFormationPreset } from '../data/formationPresetStore'
import { formatSeatLabel, getLocalizedTextPair, getPrimaryLocalizedText } from '../domain/localizedText'
import type {
  Champion,
  FormationLayout,
  FormationPreset,
  PresetPriority,
} from '../domain/types'

const PRESET_SCHEMA_VERSION = 1

const PRESET_PRIORITY_OPTIONS: PresetPriority[] = ['high', 'medium', 'low']

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

function formatDateTime(value: string, locale: AppLocale): string {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString(locale, {
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

function buildPriorityLabel(priority: PresetPriority, locale: AppLocale): string {
  if (priority === 'high') {
    return locale === 'zh-CN' ? '高优先' : 'High'
  }

  if (priority === 'low') {
    return locale === 'zh-CN' ? '备用' : 'Fallback'
  }

  return locale === 'zh-CN' ? '常用' : 'Regular'
}

function buildEditorState(preset: FormationPreset): PresetEditorState {
  return {
    name: preset.name,
    description: preset.description,
    scenarioTagsInput: preset.scenarioTags.join('，'),
    priority: preset.priority,
  }
}

function buildChampionSummary(view: PresetView, locale: AppLocale): string[] {
  if (view.prompt.kind !== 'restore') {
    return []
  }

  const championsById = new Map(view.prompt.preview.champions.map((champion) => [champion.id, champion]))

  return Object.values(view.prompt.preview.placements)
    .map((championId) => championsById.get(championId) ?? null)
    .filter((champion): champion is Champion => champion !== null)
    .sort(
      (left, right) =>
        left.seat - right.seat ||
        getPrimaryLocalizedText(left.name, locale).localeCompare(getPrimaryLocalizedText(right.name, locale)) ||
        left.name.original.localeCompare(right.name.original),
    )
    .map((champion) => `${formatSeatLabel(champion.seat, locale)} · ${getLocalizedTextPair(champion.name, locale)}`)
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
  const { locale, t } = useI18n()
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
        eyebrow={t({ zh: '方案存档', en: 'Presets' })}
        title={t({
          zh: '命名方案已落到浏览器本地 IndexedDB',
          en: 'Named presets now live in browser-local IndexedDB',
        })}
        description={t({
          zh: '命名方案与最近草稿分层管理；这里的所有内容都只保存在当前浏览器，不上传到外部服务。',
          en: 'Named presets are managed separately from recent drafts. Everything here stays in the current browser and never uploads elsewhere.',
        })}
      >
        {state.status === 'loading' ? (
          <StatusBanner tone="info">{t({ zh: '正在读取本地方案存档…', en: 'Loading local presets…' })}</StatusBanner>
        ) : null}

        {state.status === 'error' ? (
          <StatusBanner
            tone="error"
            title={t({ zh: '方案列表读取失败', en: 'Preset list failed to load' })}
            detail={state.message}
          />
        ) : null}

        {state.status === 'ready' ? (
          <>
            {pageStatus ? <StatusBanner tone={pageStatus.tone} title={pageStatus.title} detail={pageStatus.detail} /> : null}

            <div className="metric-grid">
              <article className="metric-card">
                <span className="metric-card__label">{t({ zh: '命名方案总数', en: 'Named presets' })}</span>
                <strong className="metric-card__value">{metrics.total}</strong>
              </article>
              <article className="metric-card">
                <span className="metric-card__label">{t({ zh: '可恢复方案', en: 'Restorable presets' })}</span>
                <strong className="metric-card__value">{metrics.recoverable}</strong>
              </article>
              <article className="metric-card">
                <span className="metric-card__label">{t({ zh: '需注意方案', en: 'Risky presets' })}</span>
                <strong className="metric-card__value">{metrics.risky}</strong>
              </article>
            </div>

            <div className="split-grid">
              <div>
                <h3 className="section-heading">{t({ zh: '当前范围', en: 'What works now' })}</h3>
                <ul className="bullet-list">
                  <li>{t({ zh: '查看命名方案列表', en: 'Browse named presets' })}</li>
                  <li>{t({ zh: '编辑方案名、备注、标签与优先级', en: 'Edit names, notes, tags, and priority' })}</li>
                  <li>{t({ zh: '删除不再需要的方案', en: 'Delete presets you no longer need' })}</li>
                  <li>{t({ zh: '把方案恢复回阵型页继续编辑', en: 'Restore a preset back to the formation page' })}</li>
                </ul>
              </div>
              <div>
                <h3 className="section-heading">{t({ zh: '当前边界', en: 'Current boundary' })}</h3>
                <p className="supporting-text">
                  {t({
                    zh: '最近草稿继续留在阵型页自动保存；这里管理的是已命名方案。若要新增方案，请回到阵型页点击“保存为方案”。',
                    en: 'Recent drafts remain on the formation page for auto-save; this page manages only named presets. To add one, go back to the formation page and choose “Save as preset.”',
                  })}
                </p>
              </div>
            </div>
          </>
        ) : null}
      </SurfaceCard>

      <SurfaceCard
        eyebrow={t({ zh: '已保存方案', en: 'Saved presets' })}
        title={t({
          zh: '按最近编辑排序管理你的本地阵型方案',
          en: 'Manage local formation presets sorted by latest edit',
        })}
        description={t({
          zh: '恢复时会优先按保存时的数据版本校验；如果只能做兼容恢复，页面会明确提示。',
          en: 'Restore first validates against the saved data version, and the page clearly warns when only a compatible restore is possible.',
        })}
      >
        {state.status === 'ready' && state.items.length === 0 ? (
          <StatusBanner tone="info">
            {t({
              zh: '这里还没有命名方案。先去阵型页摆出一套阵容，再点击“保存为方案”。',
              en: 'There are no named presets yet. Build a formation first, then click “Save as preset.”',
            })}
          </StatusBanner>
        ) : null}

        {state.status === 'ready' && state.items.length > 0 ? (
          <div className="results-grid">
            {state.items.map((view) => {
              const championSummary = buildChampionSummary(view, locale)
              const hasDroppedReferences =
                view.prompt.kind === 'restore' &&
                (view.prompt.preview.invalidSlotIds.length > 0 || view.prompt.preview.invalidChampionIds.length > 0)
              const isCompatibleRestore =
                view.prompt.kind === 'restore' && view.prompt.preview.restoreMode === 'compatible'

              return (
                <article key={view.preset.id} className="result-card">
                  <div className="result-card__header">
                    <span className="result-card__eyebrow">{buildPriorityLabel(view.preset.priority, locale)}</span>
                    <h3 className="result-card__title">{view.preset.name}</h3>
                  </div>

                  <p className="supporting-text">
                    {view.preset.description ||
                      t({
                        zh: '当前还没有备注，可在这里补充这套阵容适合的目标和限制。',
                        en: 'There are no notes yet. Add what this formation is for and what constraints matter.',
                      })}
                  </p>

                  <div className="tag-row">
                    <span className="tag-pill tag-pill--muted">
                      {view.prompt.kind === 'restore' ? view.prompt.preview.layoutName : view.preset.layoutId}
                    </span>
                    <span className="tag-pill tag-pill--muted">
                      {t({ zh: '保存版本', en: 'Saved version' })}：{view.preset.dataVersion}
                    </span>
                    <span className="tag-pill tag-pill--muted">
                      {t({ zh: '更新于', en: 'Updated' })}：{formatDateTime(view.preset.updatedAt, locale)}
                    </span>
                    <span className="tag-pill tag-pill--muted">
                      {view.preset.scenarioRef
                        ? `${view.preset.scenarioRef.kind}:${view.preset.scenarioRef.id}`
                        : t({ zh: '未绑定正式场景', en: 'No formal scenario linked' })}
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
                    <StatusBanner tone="error" title={view.prompt.title} detail={view.prompt.detail} />
                  ) : null}

                  {view.prompt.kind === 'restore' && (isCompatibleRestore || hasDroppedReferences) ? (
                    <StatusBanner
                      tone="info"
                      title={t({ zh: '恢复时会带兼容处理', en: 'Restore will apply compatibility handling' })}
                      detail={buildRestoreStatusDetail(view.prompt.preview)}
                    />
                  ) : null}

                  <div className="button-row result-card__section">
                    <button
                      type="button"
                      className="action-button action-button--secondary"
                      disabled={view.prompt.kind !== 'restore'}
                      onClick={() => handleRestorePreset(view)}
                    >
                      {t({ zh: '恢复到阵型页', en: 'Restore to formation' })}
                    </button>
                    <button
                      type="button"
                      className="action-button action-button--ghost"
                      onClick={() => startEditingPreset(view.preset)}
                    >
                      {t({ zh: '编辑', en: 'Edit' })}
                    </button>
                    {deleteConfirmId === view.preset.id ? (
                      <>
                        <button
                          type="button"
                          className="action-button"
                          onClick={() => handleDeletePreset(view.preset)}
                        >
                          {t({ zh: '确认删除', en: 'Confirm delete' })}
                        </button>
                        <button
                          type="button"
                          className="action-button action-button--ghost"
                          onClick={() => setDeleteConfirmId(null)}
                        >
                          {t({ zh: '取消', en: 'Cancel' })}
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="action-button action-button--ghost"
                        onClick={() => setDeleteConfirmId(view.preset.id)}
                      >
                        {t({ zh: '删除', en: 'Delete' })}
                      </button>
                    )}
                  </div>

                  {editingPresetId === view.preset.id ? (
                    <div className="form-stack result-card__section">
                      <FieldGroup
                        label={t({ zh: '方案名称', en: 'Preset name' })}
                        labelFor={`preset-name-${view.preset.id}`}
                      >
                        <input
                          id={`preset-name-${view.preset.id}`}
                          className="text-input"
                          type="text"
                          value={editor.name}
                          onChange={(event) => updateEditor('name', event.target.value)}
                        />
                      </FieldGroup>

                      <FieldGroup
                        label={t({ zh: '方案备注', en: 'Preset notes' })}
                        labelFor={`preset-description-${view.preset.id}`}
                      >
                        <textarea
                          id={`preset-description-${view.preset.id}`}
                          className="text-area"
                          rows={4}
                          value={editor.description}
                          onChange={(event) => updateEditor('description', event.target.value)}
                        />
                      </FieldGroup>

                      <FieldGroup
                        label={t({ zh: '场景标签', en: 'Scenario tags' })}
                        labelFor={`preset-tags-${view.preset.id}`}
                      >
                        <input
                          id={`preset-tags-${view.preset.id}`}
                          className="text-input"
                          type="text"
                          value={editor.scenarioTagsInput}
                          onChange={(event) => updateEditor('scenarioTagsInput', event.target.value)}
                        />
                      </FieldGroup>

                      <FieldGroup label={t({ zh: '优先级', en: 'Priority' })}>
                        <div className="segmented-control">
                          {PRESET_PRIORITY_OPTIONS.map((option) => (
                            <button
                              key={option}
                              type="button"
                              className={
                                editor.priority === option
                                  ? 'segmented-control__button segmented-control__button--active'
                                  : 'segmented-control__button'
                              }
                              onClick={() => updateEditor('priority', option)}
                            >
                              {buildPriorityLabel(option, locale)}
                            </button>
                          ))}
                        </div>
                      </FieldGroup>

                      <div className="button-row">
                        <button
                          type="button"
                          className="action-button action-button--secondary"
                          disabled={editor.name.trim().length === 0}
                          onClick={() => handleSavePresetEdit(view.preset)}
                        >
                          {t({ zh: '保存修改', en: 'Save changes' })}
                        </button>
                        <button
                          type="button"
                          className="action-button action-button--ghost"
                          onClick={cancelEditingPreset}
                        >
                          {t({ zh: '取消编辑', en: 'Cancel edit' })}
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
