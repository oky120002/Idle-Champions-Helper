import { useEffect, useMemo, useState } from 'react'
import { useI18n } from '../app/i18n'
import { SurfaceCard } from '../components/SurfaceCard'
import { loadCollection } from '../data/client'
import {
  getLocalizedTextPair,
  getPrimaryLocalizedText,
  getRoleLabel,
  getSecondaryLocalizedText,
} from '../domain/localizedText'
import type { Champion, FormationLayout } from '../domain/types'
import { findSeatConflicts } from '../rules/seat'

type FormationState =
  | { status: 'loading' }
  | {
      status: 'ready'
      formations: FormationLayout[]
      champions: Champion[]
    }
  | {
      status: 'error'
      message: string
    }

export function FormationPage() {
  const { locale, t } = useI18n()
  const [state, setState] = useState<FormationState>({ status: 'loading' })
  const [selectedLayoutId, setSelectedLayoutId] = useState<string>('')
  const [placements, setPlacements] = useState<Record<string, string>>({})

  useEffect(() => {
    let disposed = false

    Promise.all([loadCollection<FormationLayout>('formations'), loadCollection<Champion>('champions')])
      .then(([formationCollection, championCollection]) => {
        if (disposed) {
          return
        }

        setState({
          status: 'ready',
          formations: formationCollection.items,
          champions: championCollection.items,
        })

        setSelectedLayoutId((current) => current || formationCollection.items[0]?.id || '')
      })
      .catch((error: unknown) => {
        if (disposed) {
          return
        }

        setState({
          status: 'error',
          message: error instanceof Error ? error.message : '',
        })
      })

    return () => {
      disposed = true
    }
  }, [])

  const selectedLayout =
    state.status === 'ready'
      ? state.formations.find((layout) => layout.id === selectedLayoutId) ?? state.formations[0] ?? null
      : null

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

  const selectedChampions = useMemo(() => {
    if (state.status !== 'ready') {
      return []
    }

    return Object.entries(placements)
      .map(([slotId, championId]) => ({
        slotId,
        champion: state.champions.find((item) => item.id === championId) ?? null,
      }))
      .filter((item): item is { slotId: string; champion: Champion } => item.champion !== null)
  }, [placements, state])

  const conflictingSeats = useMemo(
    () => findSeatConflicts(selectedChampions.map((item) => item.champion.seat)),
    [selectedChampions],
  )

  function getChampionOptionLabel(champion: Champion): string {
    const seatLabel = locale === 'zh-CN' ? `${champion.seat} 号位` : `Seat ${champion.seat}`

    return `${seatLabel} · ${getLocalizedTextPair(champion.name, locale)}`
  }

  function handleSelectLayout(layoutId: string) {
    setSelectedLayoutId(layoutId)
    setPlacements({})
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
  }

  function handleClear() {
    setPlacements({})
  }

  return (
    <div className="page-stack">
      <SurfaceCard
        eyebrow={t({ zh: '阵型编辑', en: 'Formation editor' })}
        title={t({
          zh: '先把手工布局和 seat 冲突校验接上页面',
          en: 'Wire manual layouts and seat-conflict checks into the page',
        })}
        description={t({
          zh: '官方 definitions 当前没有直接给出可用的槽位坐标，这一页先接手工维护的 MVP 布局，并用真实英雄数据验证基础交互。',
          en: 'Official definitions do not expose usable slot coordinates yet, so this page starts from manually maintained MVP layouts and validates the interaction with real champion data.',
        })}
      >
        {state.status === 'loading' ? (
          <div className="status-banner status-banner--info">
            {t({ zh: '正在读取阵型布局和英雄数据…', en: 'Loading layouts and champion data…' })}
          </div>
        ) : null}

        {state.status === 'error' ? (
          <div className="status-banner status-banner--error">
            {t({ zh: '阵型数据读取失败', en: 'Formation data failed to load' })}：
            {state.message || t({ zh: '未知错误', en: 'Unknown error' })}
          </div>
        ) : null}

        {state.status === 'ready' ? (
          <>
            <div className="filter-group">
              <span className="field-label">{t({ zh: '布局选择', en: 'Layout' })}</span>
              <div className="filter-chip-grid">
                {state.formations.map((layout) => (
                  <button
                    key={layout.id}
                    type="button"
                    className={
                      selectedLayout?.id === layout.id ? 'filter-chip filter-chip--active' : 'filter-chip'
                    }
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
                    <span className="metric-card__label">{t({ zh: '当前布局', en: 'Current layout' })}</span>
                    <strong className="metric-card__value">{selectedLayout.name}</strong>
                  </article>
                  <article className="metric-card">
                    <span className="metric-card__label">{t({ zh: '槽位数', en: 'Slots' })}</span>
                    <strong className="metric-card__value">{selectedLayout.slots.length}</strong>
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

                {selectedLayout.notes ? (
                  <div className="status-banner status-banner--info">{selectedLayout.notes}</div>
                ) : null}

                {conflictingSeats.length > 0 ? (
                  <div className="status-banner status-banner--error">
                    {t({
                      zh: `当前阵型里出现 seat 冲突：${conflictingSeats.join(', ')}。同一 seat 只能放一名英雄。`,
                      en: `Seat conflicts found in this formation: ${conflictingSeats.join(', ')}. Only one champion may occupy each seat.`,
                    })}
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
                          <span className="formation-slot__label">
                            {locale === 'zh-CN' ? `槽位 ${index + 1}` : `Slot ${index + 1}`}
                          </span>
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
                          <span className="formation-slot__hint">
                            {champion
                              ? t({
                                  zh: `当前：${getLocalizedTextPair(champion.name, locale)}`,
                                  en: `Current: ${getLocalizedTextPair(champion.name, locale)}`,
                                })
                              : t({
                                  zh: `坐标 ${slot.row}-${slot.column}`,
                                  en: `Position ${slot.row}-${slot.column}`,
                                })}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="button-row">
                  <button type="button" className="action-button action-button--ghost" onClick={handleClear}>
                    {t({ zh: '清空当前阵型', en: 'Clear this formation' })}
                  </button>
                </div>
              </>
            ) : (
              <div className="status-banner status-banner--info">
                {t({
                  zh: '当前还没有可用布局，请先补 `scripts/data/manual-overrides.json`。',
                  en: 'No layouts are available yet. Add one to `scripts/data/manual-overrides.json` first.',
                })}
              </div>
            )}
          </>
        ) : null}
      </SurfaceCard>

      <SurfaceCard
        eyebrow={t({ zh: '阵型摘要', en: 'Formation summary' })}
        title={t({
          zh: '先让页面能消费真实英雄和手工布局',
          en: 'Make the page consume real champions and manual layouts cleanly',
        })}
        description={t({
          zh: '后续这里再逐步接冒险/变体绑定、拖拽交互和更细的可放置规则。',
          en: 'Later this section can grow into adventure bindings, drag interactions, and more detailed placement rules.',
        })}
      >
        {selectedChampions.length === 0 ? (
          <p className="supporting-text">
            {t({
              zh: '当前还没有放置英雄。先选一个布局，再逐格选择英雄，页面就会实时提示 seat 冲突。',
              en: 'No champions are placed yet. Pick a layout, fill slots one by one, and the page will flag seat conflicts immediately.',
            })}
          </p>
        ) : (
          <div className="results-grid">
            {selectedChampions.map(({ slotId, champion }) => {
              const primaryName = getPrimaryLocalizedText(champion.name, locale)
              const secondaryName = getSecondaryLocalizedText(champion.name, locale)

              return (
                <article key={`${slotId}-${champion.id}`} className="result-card">
                  <div className="result-card__header">
                    <span className="result-card__eyebrow">{slotId}</span>
                    <h3 className="result-card__title">{primaryName}</h3>
                  </div>
                  {secondaryName ? <p className="result-card__secondary">{secondaryName}</p> : null}
                  <p className="supporting-text">
                    {locale === 'zh-CN' ? `${champion.seat} 号位` : `Seat ${champion.seat}`}
                  </p>
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
