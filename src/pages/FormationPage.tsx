import { useEffect, useMemo, useState } from 'react'
import { SurfaceCard } from '../components/SurfaceCard'
import { loadCollection } from '../data/client'
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
          message: error instanceof Error ? error.message : '未知错误',
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

    return [...state.champions].sort((left, right) => left.seat - right.seat || left.name.localeCompare(right.name))
  }, [state])

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
        eyebrow="阵型编辑"
        title="先把手工布局和 seat 冲突校验接上页面"
        description="官方 definitions 当前没有直接给出可用的槽位坐标，这一页先接手工维护的 MVP 布局，并用真实英雄数据验证基础交互。"
      >
        {state.status === 'loading' ? (
          <div className="status-banner status-banner--info">正在读取阵型布局和英雄数据…</div>
        ) : null}

        {state.status === 'error' ? (
          <div className="status-banner status-banner--error">阵型数据读取失败：{state.message}</div>
        ) : null}

        {state.status === 'ready' ? (
          <>
            <div className="filter-group">
              <span className="field-label">布局选择</span>
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
                    <span className="metric-card__label">当前布局</span>
                    <strong className="metric-card__value">{selectedLayout.name}</strong>
                  </article>
                  <article className="metric-card">
                    <span className="metric-card__label">槽位数</span>
                    <strong className="metric-card__value">{selectedLayout.slots.length}</strong>
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
        title="先让页面能消费真实英雄和手工布局"
        description="后续这里再逐步接冒险/变体绑定、拖拽交互和更细的可放置规则。"
      >
        {selectedChampions.length === 0 ? (
          <p className="supporting-text">当前还没有放置英雄。先选一个布局，再逐格选择英雄，页面就会实时提示 seat 冲突。</p>
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
