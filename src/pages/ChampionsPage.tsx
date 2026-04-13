import { useEffect, useMemo, useState } from 'react'
import { SurfaceCard } from '../components/SurfaceCard'
import { loadCollection } from '../data/client'
import type { Champion } from '../domain/types'

interface StringEnumGroup {
  id: string
  values: string[]
}

const seatOptions = Array.from({ length: 12 }, (_, index) => index + 1)
const MAX_VISIBLE_RESULTS = 48

type ChampionState =
  | { status: 'loading' }
  | {
      status: 'ready'
      champions: Champion[]
      roles: string[]
      affiliations: string[]
    }
  | {
      status: 'error'
      message: string
    }

function isStringEnumGroup(value: unknown): value is StringEnumGroup {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'values' in value &&
    Array.isArray(value.values) &&
    value.values.every((item) => typeof item === 'string')
  )
}

export function ChampionsPage() {
  const [state, setState] = useState<ChampionState>({ status: 'loading' })
  const [search, setSearch] = useState('')
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null)
  const [selectedRole, setSelectedRole] = useState<string>('全部')
  const [selectedAffiliation, setSelectedAffiliation] = useState<string>('全部')

  useEffect(() => {
    let disposed = false

    Promise.all([loadCollection<Champion>('champions'), loadCollection<unknown>('enums')])
      .then(([championCollection, enumCollection]) => {
        if (disposed) {
          return
        }

        const groups = enumCollection.items.filter(isStringEnumGroup)
        const roles = groups.find((group) => group.id === 'roles')?.values ?? []
        const affiliations = groups.find((group) => group.id === 'affiliations')?.values ?? []

        setState({
          status: 'ready',
          champions: championCollection.items,
          roles,
          affiliations,
        })
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

  const filteredChampions = useMemo(() => {
    if (state.status !== 'ready') {
      return []
    }

    const query = search.trim().toLowerCase()

    return state.champions.filter((champion) => {
      const matchesSearch =
        !query ||
        champion.name.toLowerCase().includes(query) ||
        champion.tags.some((tag) => tag.toLowerCase().includes(query)) ||
        champion.affiliations.some((affiliation) => affiliation.toLowerCase().includes(query))

      const matchesSeat = selectedSeat === null || champion.seat === selectedSeat
      const matchesRole = selectedRole === '全部' || champion.roles.includes(selectedRole)
      const matchesAffiliation =
        selectedAffiliation === '全部' || champion.affiliations.includes(selectedAffiliation)

      return matchesSearch && matchesSeat && matchesRole && matchesAffiliation
    })
  }, [search, selectedAffiliation, selectedRole, selectedSeat, state])

  const visibleChampions = filteredChampions.slice(0, MAX_VISIBLE_RESULTS)
  const matchedSeats = new Set(filteredChampions.map((champion) => champion.seat)).size

  return (
    <div className="page-stack">
      <SurfaceCard
        eyebrow="英雄筛选"
        title="先用真实公共数据把查询入口跑起来"
        description="当前版本先接官方 definitions 归一化后的英雄数据，优先把座位、定位、联动队伍和标签过滤闭环做通。"
      >
        {state.status === 'loading' ? (
          <div className="status-banner status-banner--info">正在读取英雄数据…</div>
        ) : null}

        {state.status === 'error' ? (
          <div className="status-banner status-banner--error">英雄数据读取失败：{state.message}</div>
        ) : null}

        {state.status === 'ready' ? (
          <>
            <div className="metric-grid">
              <article className="metric-card">
                <span className="metric-card__label">英雄总数</span>
                <strong className="metric-card__value">{state.champions.length}</strong>
              </article>
              <article className="metric-card">
                <span className="metric-card__label">当前匹配</span>
                <strong className="metric-card__value">{filteredChampions.length}</strong>
              </article>
              <article className="metric-card">
                <span className="metric-card__label">覆盖座位</span>
                <strong className="metric-card__value">{matchedSeats}</strong>
              </article>
              <article className="metric-card">
                <span className="metric-card__label">联动队伍标签</span>
                <strong className="metric-card__value">{state.affiliations.length}</strong>
              </article>
            </div>

            <div className="filter-panel">
              <label className="form-field">
                <span className="field-label">关键词</span>
                <input
                  className="text-input"
                  type="text"
                  placeholder="搜英雄名、标签、联动队伍"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>

              <div className="filter-group">
                <span className="field-label">座位</span>
                <div className="filter-chip-grid">
                  <button
                    type="button"
                    className={selectedSeat === null ? 'filter-chip filter-chip--active' : 'filter-chip'}
                    onClick={() => setSelectedSeat(null)}
                  >
                    全部
                  </button>
                  {seatOptions.map((seat) => (
                    <button
                      key={seat}
                      type="button"
                      className={selectedSeat === seat ? 'filter-chip filter-chip--active' : 'filter-chip'}
                      onClick={() => setSelectedSeat(seat)}
                    >
                      Seat {seat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="filter-group">
                <span className="field-label">定位</span>
                <div className="filter-chip-grid">
                  <button
                    type="button"
                    className={selectedRole === '全部' ? 'filter-chip filter-chip--active' : 'filter-chip'}
                    onClick={() => setSelectedRole('全部')}
                  >
                    全部
                  </button>
                  {state.roles.map((role) => (
                    <button
                      key={role}
                      type="button"
                      className={selectedRole === role ? 'filter-chip filter-chip--active' : 'filter-chip'}
                      onClick={() => setSelectedRole(role)}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>

              <div className="filter-group">
                <span className="field-label">联动队伍</span>
                <div className="filter-chip-grid">
                  <button
                    type="button"
                    className={
                      selectedAffiliation === '全部' ? 'filter-chip filter-chip--active' : 'filter-chip'
                    }
                    onClick={() => setSelectedAffiliation('全部')}
                  >
                    全部
                  </button>
                  {state.affiliations.map((affiliation) => (
                    <button
                      key={affiliation}
                      type="button"
                      className={
                        selectedAffiliation === affiliation
                          ? 'filter-chip filter-chip--active'
                          : 'filter-chip'
                      }
                      onClick={() => setSelectedAffiliation(affiliation)}
                    >
                      {affiliation}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {filteredChampions.length === 0 ? (
              <div className="status-banner status-banner--info">
                当前筛选条件下没有匹配英雄，可以先清空座位、定位或联动队伍过滤。
              </div>
            ) : null}

            {filteredChampions.length > 0 ? (
              <>
                <p className="supporting-text">
                  当前展示 {visibleChampions.length} / {filteredChampions.length} 名英雄。
                  如果结果过多，优先加关键词、座位或定位缩小范围。
                </p>

                <div className="results-grid">
                  {visibleChampions.map((champion) => (
                    <article key={champion.id} className="result-card">
                      <div className="result-card__header">
                        <span className="result-card__eyebrow">Seat {champion.seat}</span>
                        <h3 className="result-card__title">{champion.name}</h3>
                      </div>

                      <div className="tag-row">
                        {champion.roles.map((role) => (
                          <span key={role} className="tag-pill">
                            {role}
                          </span>
                        ))}
                      </div>

                      <p className="supporting-text">
                        联动队伍：
                        {champion.affiliations.length > 0 ? champion.affiliations.join(' / ') : '暂无'}
                      </p>

                      <div className="tag-row">
                        {champion.tags.slice(0, 6).map((tag) => (
                          <span key={tag} className="tag-pill tag-pill--muted">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              </>
            ) : null}
          </>
        ) : null}
      </SurfaceCard>
    </div>
  )
}
