import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useI18n, type LocaleText } from '../app/i18n'
import { SurfaceCard } from '../components/SurfaceCard'
import { loadCollectionAtVersion, loadVersion } from '../data/client'
import {
  buildFormationSnapshotPrompt,
  buildRestoreStatusDetail,
  type FormationSnapshotPrompt,
} from '../data/formationPersistence'
import { listFormationPresets } from '../data/formationPresetStore'
import {
  getLocalizedTextPair,
  getPrimaryLocalizedText,
} from '../domain/localizedText'
import type { Champion, FormationLayout, FormationPreset, PresetPriority } from '../domain/types'

const PRESET_SCHEMA_VERSION = 1

const PRESET_PRIORITY_OPTIONS: Array<{ value: PresetPriority; label: LocaleText }> = [
  { value: 'high', label: { zh: '高优先', en: 'High' } },
  { value: 'medium', label: { zh: '常用', en: 'Standard' } },
  { value: 'low', label: { zh: '备用', en: 'Backup' } },
]

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

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '未知错误'
}

function formatDateTime(value: string, locale: 'zh-CN' | 'en-US'): string {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString(locale, {
    hour12: false,
  })
}

function buildPriorityLabel(priority: PresetPriority, locale: 'zh-CN' | 'en-US'): string {
  const option = PRESET_PRIORITY_OPTIONS.find((item) => item.value === priority)

  if (!option) {
    return priority
  }

  return locale === 'zh-CN' ? option.label.zh : option.label.en
}

function buildChampionSummary(view: PresetView, locale: 'zh-CN' | 'en-US'): string[] {
  if (view.prompt.kind !== 'restore') {
    return []
  }

  const championsById = new Map(view.prompt.preview.champions.map((champion) => [champion.id, champion]))

  return Object.values(view.prompt.preview.placements)
    .map((championId) => championsById.get(championId) ?? null)
    .filter((champion): champion is Champion => champion !== null)
    .sort((left, right) =>
      left.seat - right.seat ||
      getPrimaryLocalizedText(left.name, locale).localeCompare(getPrimaryLocalizedText(right.name, locale)) ||
      left.name.original.localeCompare(right.name.original),
    )
    .map((champion) => {
      const seatLabel = locale === 'zh-CN' ? `${champion.seat} 号位` : `Seat ${champion.seat}`
      return `${seatLabel} · ${getLocalizedTextPair(champion.name, locale)}`
    })
}

async function buildPresetViews(
  dataVersion: string,
  formations: FormationLayout[],
  champions: Champion[],
  sourceLabel: string,
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
        sourceLabel,
        PRESET_SCHEMA_VERSION,
      ),
    })),
  )
}

export function PresetsPage() {
  const { locale, t } = useI18n()
  const navigate = useNavigate()

  const [state, setState] = useState<PresetsState>({ status: 'loading' })

  useEffect(() => {
    let disposed = false

    async function bootstrap() {
      try {
        const version = await loadVersion()
        const [formationCollection, championCollection] = await Promise.all([
          loadCollectionAtVersion<FormationLayout>(version.current, 'formations'),
          loadCollectionAtVersion<Champion>(version.current, 'champions'),
        ])
        const items = await buildPresetViews(version.current, formationCollection.items, championCollection.items, '方案')

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
  }, [t])

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

  return (
    <div className="page-stack">
      <SurfaceCard
        eyebrow={t({ zh: '方案存档', en: 'Presets' })}
        title={t({
          zh: '命名方案已落到浏览器本地 IndexedDB',
          en: 'Named presets now live in browser-local IndexedDB',
        })}
        description={t({
          zh: '这一页会承接用户保存的阵容、常用筛选和阶段性目标。当前 MVP 先专注在命名阵型方案的恢复闭环。',
          en: 'This page will hold saved formations, favorite filters, and milestone targets. The current MVP focuses on named formation presets and restore flows.',
        })}
      >
        {state.status === 'loading' ? (
          <div className="status-banner status-banner--info">
            {t({ zh: '正在读取本地方案存档…', en: 'Loading local presets…' })}
          </div>
        ) : null}

        {state.status === 'error' ? (
          <div className="status-banner status-banner--error">
            {t({ zh: '方案列表读取失败', en: 'Failed to load presets' })}：
            {state.message}
          </div>
        ) : null}

        {state.status === 'ready' ? (
          <>
            <div className="metric-grid">
              <article className="metric-card">
                <span className="metric-card__label">{t({ zh: '命名方案总数', en: 'Total presets' })}</span>
                <strong className="metric-card__value">{metrics.total}</strong>
              </article>
              <article className="metric-card">
                <span className="metric-card__label">{t({ zh: '可恢复方案', en: 'Recoverable presets' })}</span>
                <strong className="metric-card__value">{metrics.recoverable}</strong>
              </article>
              <article className="metric-card">
                <span className="metric-card__label">{t({ zh: '需注意方案', en: 'Risky presets' })}</span>
                <strong className="metric-card__value">{metrics.risky}</strong>
              </article>
            </div>

            <div className="split-grid">
              <div>
                <h3 className="section-heading">{t({ zh: '当前范围', en: 'Current scope' })}</h3>
                <ul className="bullet-list">
                  <li>{t({ zh: '查看命名方案列表', en: 'Review named presets' })}</li>
                  <li>{t({ zh: '按保存版本校验恢复可行性', en: 'Validate restore viability against the saved data version' })}</li>
                  <li>{t({ zh: '把方案恢复回阵型页继续编辑', en: 'Restore a preset back into the formation page' })}</li>
                </ul>
              </div>
              <div>
                <h3 className="section-heading">{t({ zh: '当前边界', en: 'Current boundary' })}</h3>
                <p className="supporting-text">
                  {t({
                    zh: '最近草稿继续留在阵型页自动保存；这里管理的是已命名方案。若要新增方案，请回到阵型页点击“保存为方案”。',
                    en: 'Recent drafts remain on the formation page. This page manages named presets only; create new ones from the formation page.',
                  })}
                </p>
              </div>
            </div>
          </>
        ) : null}
      </SurfaceCard>

      <SurfaceCard
        eyebrow={t({ zh: '已保存方案', en: 'Saved presets' })}
        title={t({ zh: '按最近编辑排序管理你的本地阵型方案', en: 'Manage local formation presets by recent edits' })}
        description={t({
          zh: '恢复时会优先按保存时的数据版本校验；如果只能做兼容恢复，页面会明确提示。',
          en: 'Restore prefers the saved data version first, and the page will clearly flag compatibility fallbacks.',
        })}
      >
        {state.status === 'ready' && state.items.length === 0 ? (
          <div className="status-banner status-banner--info">
            {t({ zh: '这里还没有命名方案。先去阵型页摆出一套阵容，再点击“保存为方案”。', en: 'No named presets yet. Build one on the formation page and save it first.' })}
          </div>
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
                        zh: '当前还没有备注，可在阵型页保存时补充这套阵容适合的目标和限制。',
                        en: 'No note yet. Add one from the formation page when saving the preset.',
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
                      <strong>{view.prompt.title}</strong>
                      <p className="supporting-text">{view.prompt.detail}</p>
                    </div>
                  ) : null}

                  {view.prompt.kind === 'restore' && (isCompatibleRestore || hasDroppedReferences) ? (
                    <div className="status-banner status-banner--info">
                      <strong>{t({ zh: '恢复时会带兼容处理', en: 'Restore includes compatibility handling' })}</strong>
                      <p className="supporting-text">{buildRestoreStatusDetail(view.prompt.preview)}</p>
                    </div>
                  ) : null}

                  <div className="button-row">
                    <button
                      type="button"
                      className="action-button action-button--secondary"
                      disabled={view.prompt.kind !== 'restore'}
                      onClick={() => handleRestorePreset(view)}
                    >
                      {t({ zh: '恢复到阵型页', en: 'Restore to formation page' })}
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        ) : null}
      </SurfaceCard>
    </div>
  )
}
