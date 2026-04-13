import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useI18n } from '../app/i18n'
import { SurfaceCard } from '../components/SurfaceCard'
import { loadCollection } from '../data/client'
import {
  getLocalizedTextPair,
  getPrimaryLocalizedText,
  getRoleLabel,
  getSecondaryLocalizedText,
} from '../domain/localizedText'
import type { Champion, LocalizedText } from '../domain/types'
import { filterChampions, toggleFilterValue } from '../rules/championFilter'

interface StringEnumGroup {
  id: string
  values: string[]
}

interface LocalizedEnumGroup {
  id: string
  values: LocalizedText[]
}

const seatOptions = Array.from({ length: 12 }, (_, index) => index + 1)
const MAX_VISIBLE_RESULTS = 48
const RESULTS_HEIGHT_TRANSITION_MS = 320
const RESULTS_RELOCATE_THRESHOLD = 12
const RESULTS_SCROLL_DURATION_MS = 340

type ChampionState =
  | { status: 'loading' }
  | {
      status: 'ready'
      champions: Champion[]
      roles: string[]
      affiliations: LocalizedText[]
    }
  | {
      status: 'error'
      message: string
    }

function isLocalizedText(value: unknown): value is LocalizedText {
  return (
    typeof value === 'object' &&
    value !== null &&
    'original' in value &&
    typeof value.original === 'string' &&
    'display' in value &&
    typeof value.display === 'string'
  )
}

function isLocalizedEnumGroup(value: unknown): value is LocalizedEnumGroup {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'values' in value &&
    Array.isArray(value.values) &&
    value.values.every((item) => isLocalizedText(item))
  )
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
  const { locale, t } = useI18n()
  const [state, setState] = useState<ChampionState>({ status: 'loading' })
  const [search, setSearch] = useState('')
  const [selectedSeats, setSelectedSeats] = useState<number[]>([])
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [selectedAffiliations, setSelectedAffiliations] = useState<string[]>([])
  const [resultsShellHeight, setResultsShellHeight] = useState<number | null>(null)
  const [stickyTop, setStickyTop] = useState(160)
  const resultsShellRef = useRef<HTMLElement | null>(null)
  const resultsContentRef = useRef<HTMLDivElement | null>(null)
  const pendingResultsTransitionRef = useRef<{
    previousCount: number
    shouldRelocate: boolean
    targetTop: number
  } | null>(null)
  const releaseResultsHeightTimeoutRef = useRef<number | null>(null)
  const scrollAnimationFrameRef = useRef<number | null>(null)

  useEffect(() => {
    let disposed = false

    Promise.all([loadCollection<Champion>('champions'), loadCollection<unknown>('enums')])
      .then(([championCollection, enumCollection]) => {
        if (disposed) {
          return
        }

        const stringGroups = enumCollection.items.filter(isStringEnumGroup)
        const localizedGroups = enumCollection.items.filter(isLocalizedEnumGroup)
        const roles = stringGroups.find((group) => group.id === 'roles')?.values ?? []
        const affiliations = localizedGroups.find((group) => group.id === 'affiliations')?.values ?? []

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
          message: error instanceof Error ? error.message : '',
        })
      })

    return () => {
      disposed = true
    }
  }, [])

  useEffect(() => {
    return () => {
      if (releaseResultsHeightTimeoutRef.current !== null) {
        window.clearTimeout(releaseResultsHeightTimeoutRef.current)
      }

      if (scrollAnimationFrameRef.current !== null) {
        window.cancelAnimationFrame(scrollAnimationFrameRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const siteHeader = document.querySelector('.site-header')

    if (!(siteHeader instanceof HTMLElement)) {
      return
    }

    const updateStickyTop = () => {
      setStickyTop(Math.ceil(siteHeader.getBoundingClientRect().height) + 16)
    }

    updateStickyTop()

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateStickyTop)

      return () => {
        window.removeEventListener('resize', updateStickyTop)
      }
    }

    const resizeObserver = new ResizeObserver(() => {
      updateStickyTop()
    })

    resizeObserver.observe(siteHeader)
    window.addEventListener('resize', updateStickyTop)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', updateStickyTop)
    }
  }, [])

  const filteredChampions = useMemo(() => {
    if (state.status !== 'ready') {
      return []
    }

    return filterChampions(state.champions, {
      search,
      seats: selectedSeats,
      roles: selectedRoles,
      affiliations: selectedAffiliations,
    })
  }, [search, selectedAffiliations, selectedRoles, selectedSeats, state])

  const visibleChampions = filteredChampions.slice(0, MAX_VISIBLE_RESULTS)
  const matchedSeats = new Set(filteredChampions.map((champion) => champion.seat)).size
  const orderedSelectedSeats = seatOptions.filter((seat) => selectedSeats.includes(seat))
  const orderedSelectedRoles =
    state.status === 'ready' ? state.roles.filter((role) => selectedRoles.includes(role)) : []
  const orderedSelectedAffiliations =
    state.status === 'ready'
      ? state.affiliations.filter((affiliation) => selectedAffiliations.includes(affiliation.original))
      : []
  const activeFilters = [
    search.trim()
      ? t({
          zh: `关键词：${search.trim()}`,
          en: `Keyword: ${search.trim()}`,
        })
      : null,
    orderedSelectedSeats.length > 0
      ? t({
          zh: `座位：${orderedSelectedSeats.map((seat) => `${seat} 号位`).join('、')}`,
          en: `Seats: ${orderedSelectedSeats.join(', ')}`,
        })
      : null,
    orderedSelectedRoles.length > 0
      ? t({
          zh: `定位：${orderedSelectedRoles.map((role) => getRoleLabel(role, locale)).join('、')}`,
          en: `Roles: ${orderedSelectedRoles.map((role) => getRoleLabel(role, locale)).join(', ')}`,
        })
      : null,
    orderedSelectedAffiliations.length > 0
      ? t({
          zh: `联动队伍：${orderedSelectedAffiliations.map((affiliation) => getLocalizedTextPair(affiliation, locale)).join('、')}`,
          en: `Affiliations: ${orderedSelectedAffiliations.map((affiliation) => getLocalizedTextPair(affiliation, locale)).join(', ')}`,
        })
      : null,
  ].filter((item): item is string => Boolean(item))

  function getResultsTargetTop(shell: HTMLElement): number {
    const siteHeader = document.querySelector('.site-header')
    const headerHeight = siteHeader instanceof HTMLElement ? siteHeader.getBoundingClientRect().height : 0

    return Math.max(Math.round(shell.getBoundingClientRect().top + window.scrollY - headerHeight - 16), 0)
  }

  function scrollWindowTo(targetTop: number) {
    if (scrollAnimationFrameRef.current !== null) {
      window.cancelAnimationFrame(scrollAnimationFrameRef.current)
      scrollAnimationFrameRef.current = null
    }

    if (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      window.scrollTo({
        top: targetTop,
        behavior: 'auto',
      })
      return
    }

    const startTop = window.scrollY
    const distance = targetTop - startTop

    if (Math.abs(distance) < 2) {
      return
    }

    const startTime = performance.now()
    const easeOutQuart = (progress: number) => 1 - (1 - progress) ** 4

    const step = (now: number) => {
      const progress = Math.min((now - startTime) / RESULTS_SCROLL_DURATION_MS, 1)

      window.scrollTo({
        top: startTop + distance * easeOutQuart(progress),
        behavior: 'auto',
      })

      if (progress < 1) {
        scrollAnimationFrameRef.current = window.requestAnimationFrame(step)
      } else {
        scrollAnimationFrameRef.current = null
      }
    }

    scrollAnimationFrameRef.current = window.requestAnimationFrame(step)
  }

  function prepareResultsViewportTransition() {
    const shell = resultsShellRef.current

    if (!shell) {
      return
    }

    const targetTop = getResultsTargetTop(shell)
    const shouldRelocate = window.scrollY > targetTop + 48

    if (!shouldRelocate) {
      pendingResultsTransitionRef.current = null
      return
    }

    if (releaseResultsHeightTimeoutRef.current !== null) {
      window.clearTimeout(releaseResultsHeightTimeoutRef.current)
      releaseResultsHeightTimeoutRef.current = null
    }

    pendingResultsTransitionRef.current = {
      previousCount: filteredChampions.length,
      shouldRelocate,
      targetTop,
    }

    setResultsShellHeight(Math.ceil(shell.getBoundingClientRect().height))
  }

  useLayoutEffect(() => {
    const pendingTransition = pendingResultsTransitionRef.current
    const content = resultsContentRef.current

    if (!pendingTransition || !content || resultsShellHeight === null) {
      return
    }

    pendingResultsTransitionRef.current = null

    const nextHeight = Math.ceil(content.getBoundingClientRect().height)
    const shouldRelocate =
      pendingTransition.shouldRelocate &&
      filteredChampions.length < pendingTransition.previousCount &&
      filteredChampions.length <= RESULTS_RELOCATE_THRESHOLD

    const animationFrameId = window.requestAnimationFrame(() => {
      setResultsShellHeight(nextHeight)

      if (shouldRelocate) {
        scrollWindowTo(pendingTransition.targetTop)
      }

      releaseResultsHeightTimeoutRef.current = window.setTimeout(() => {
        setResultsShellHeight(null)
        releaseResultsHeightTimeoutRef.current = null
      }, RESULTS_HEIGHT_TRANSITION_MS)
    })

    return () => {
      window.cancelAnimationFrame(animationFrameId)
    }
  }, [filteredChampions.length, resultsShellHeight, search, selectedAffiliations, selectedRoles, selectedSeats])

  const championsWorkspaceStyle = {
    '--champions-sticky-top': `${stickyTop}px`,
  } as CSSProperties

  return (
    <div className="page-stack">
      <SurfaceCard
        eyebrow={t({ zh: '英雄筛选', en: 'Champion filters' })}
        title={t({ zh: '先用真实公共数据把查询入口跑起来', en: 'Make the real-data entry point feel instant' })}
        description={t({
          zh: '当前版本先接官方 definitions 归一化后的英雄数据，并保留官方原文与 `language_id=7` 中文展示名，优先把座位、定位、联动队伍和标签过滤闭环做通。',
          en: 'This pass uses normalized official definitions, keeps both official source names and `language_id=7` Chinese labels, and focuses on closing the loop on seat, role, affiliation, and tag filtering.',
        })}
      >
        {state.status === 'loading' ? (
          <div className="status-banner status-banner--info">
            {t({ zh: '正在读取英雄数据…', en: 'Loading champion data…' })}
          </div>
        ) : null}

        {state.status === 'error' ? (
          <div className="status-banner status-banner--error">
            {t({ zh: '英雄数据读取失败', en: 'Champion data failed to load' })}：
            {state.message || t({ zh: '未知错误', en: 'Unknown error' })}
          </div>
        ) : null}

        {state.status === 'ready' ? (
          <>
            <div className="metric-grid">
              <article className="metric-card">
                <span className="metric-card__label">{t({ zh: '英雄总数', en: 'Champions' })}</span>
                <strong className="metric-card__value">{state.champions.length}</strong>
              </article>
              <article className="metric-card">
                <span className="metric-card__label">{t({ zh: '当前匹配', en: 'Matches' })}</span>
                <strong className="metric-card__value">{filteredChampions.length}</strong>
              </article>
              <article className="metric-card">
                <span className="metric-card__label">{t({ zh: '覆盖座位', en: 'Seats covered' })}</span>
                <strong className="metric-card__value">{matchedSeats}</strong>
              </article>
              <article className="metric-card">
                <span className="metric-card__label">{t({ zh: '联动队伍标签', en: 'Affiliations' })}</span>
                <strong className="metric-card__value">{state.affiliations.length}</strong>
              </article>
            </div>

            <div className="champions-workspace" style={championsWorkspaceStyle}>
              <aside className="champions-sidebar">
                <div className="champions-sidebar__sticky">
                  <div className="champions-sidebar__surface">
                    <div className="champions-sidebar__header">
                      <div>
                        <h3 className="section-heading champions-sidebar__title">
                          {t({ zh: '筛选条件', en: 'Filter controls' })}
                        </h3>
                        <p className="champions-sidebar__hint">
                          {t({
                            zh: '往下浏览卡片时，筛选区会稳稳留在视线附近。',
                            en: 'The filters stay close while you keep browsing deeper results.',
                          })}
                        </p>
                      </div>
                      <span className="champions-sidebar__badge">
                        {activeFilters.length > 0
                          ? t({
                              zh: `${activeFilters.length} 项已启用`,
                              en: `${activeFilters.length} active`,
                            })
                          : t({ zh: '未启用', en: 'Idle' })}
                      </span>
                    </div>

                    <div className="filter-panel filter-panel--sidebar">
                      <label className="form-field">
                        <span className="field-label">{t({ zh: '关键词', en: 'Keyword' })}</span>
                        <input
                          className="text-input"
                          type="text"
                          placeholder={t({
                            zh: '搜英雄名、标签、联动队伍',
                            en: 'Search names, tags, or affiliations',
                          })}
                          value={search}
                          onChange={(event) => {
                            prepareResultsViewportTransition()
                            setSearch(event.target.value)
                          }}
                        />
                        <span className="field-hint">
                          {t({
                            zh: '支持中英混搜；切换界面语言时，当前关键词和筛选不会被清空。',
                            en: 'Chinese and English queries both work here, and switching UI language keeps the current filters.',
                          })}
                        </span>
                      </label>

                      <div className="filter-group">
                        <span className="field-label">{t({ zh: '座位', en: 'Seat' })}</span>
                        <div className="filter-chip-grid">
                          <button
                            type="button"
                            className={selectedSeats.length === 0 ? 'filter-chip filter-chip--active' : 'filter-chip'}
                            aria-pressed={selectedSeats.length === 0}
                            onClick={() => {
                              prepareResultsViewportTransition()
                              setSelectedSeats([])
                            }}
                          >
                            {t({ zh: '全部', en: 'All' })}
                          </button>
                          {seatOptions.map((seat) => (
                            <button
                              key={seat}
                              type="button"
                              className={selectedSeats.includes(seat) ? 'filter-chip filter-chip--active' : 'filter-chip'}
                              aria-pressed={selectedSeats.includes(seat)}
                              onClick={() => {
                                prepareResultsViewportTransition()
                                setSelectedSeats((current) => toggleFilterValue(current, seat))
                              }}
                            >
                              {locale === 'zh-CN' ? `${seat} 号位` : `Seat ${seat}`}
                            </button>
                          ))}
                        </div>
                        <span className="field-hint">
                          {t({
                            zh: '支持多选；同一维度按“或”命中。',
                            en: 'Multi-select is supported, and matches within this group use OR.',
                          })}
                        </span>
                      </div>

                      <div className="filter-group">
                        <span className="field-label">{t({ zh: '定位', en: 'Role' })}</span>
                        <div className="filter-chip-grid">
                          <button
                            type="button"
                            className={selectedRoles.length === 0 ? 'filter-chip filter-chip--active' : 'filter-chip'}
                            aria-pressed={selectedRoles.length === 0}
                            onClick={() => {
                              prepareResultsViewportTransition()
                              setSelectedRoles([])
                            }}
                          >
                            {t({ zh: '全部', en: 'All' })}
                          </button>
                          {state.roles.map((role) => (
                            <button
                              key={role}
                              type="button"
                              className={selectedRoles.includes(role) ? 'filter-chip filter-chip--active' : 'filter-chip'}
                              aria-pressed={selectedRoles.includes(role)}
                              onClick={() => {
                                prepareResultsViewportTransition()
                                setSelectedRoles((current) => toggleFilterValue(current, role))
                              }}
                            >
                              {getRoleLabel(role, locale)}
                            </button>
                          ))}
                        </div>
                        <span className="field-hint">
                          {t({
                            zh: '支持多选；会匹配任一已选定位。',
                            en: 'Multi-select is supported, and champions can match any selected role.',
                          })}
                        </span>
                      </div>

                      <div className="filter-group">
                        <span className="field-label">{t({ zh: '联动队伍', en: 'Affiliation' })}</span>
                        <div className="filter-chip-grid">
                          <button
                            type="button"
                            className={
                              selectedAffiliations.length === 0 ? 'filter-chip filter-chip--active' : 'filter-chip'
                            }
                            aria-pressed={selectedAffiliations.length === 0}
                            onClick={() => {
                              prepareResultsViewportTransition()
                              setSelectedAffiliations([])
                            }}
                          >
                            {t({ zh: '全部', en: 'All' })}
                          </button>
                          {state.affiliations.map((affiliation) => (
                            <button
                              key={affiliation.original}
                              type="button"
                              className={
                                selectedAffiliations.includes(affiliation.original)
                                  ? 'filter-chip filter-chip--active'
                                  : 'filter-chip'
                              }
                              aria-pressed={selectedAffiliations.includes(affiliation.original)}
                              onClick={() => {
                                prepareResultsViewportTransition()
                                setSelectedAffiliations((current) => toggleFilterValue(current, affiliation.original))
                              }}
                            >
                              {getPrimaryLocalizedText(affiliation, locale)}
                            </button>
                          ))}
                        </div>
                        <span className="field-hint">
                          {t({
                            zh: '支持多选；适合同时看多个联动队伍候选。',
                            en: 'Multi-select is supported for comparing multiple affiliations at once.',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </aside>

              <section className="champions-results">
                <section
                  ref={resultsShellRef}
                  className="results-panel-shell"
                  aria-label={t({ zh: '英雄筛选结果', en: 'Champion filter results' })}
                  style={resultsShellHeight !== null ? { height: `${resultsShellHeight}px` } : undefined}
                >
                  <div ref={resultsContentRef} className="results-panel">
                    <div className="results-panel__meta">
                      <p
                        className={
                          activeFilters.length > 0
                            ? 'supporting-text'
                            : 'supporting-text supporting-text--placeholder'
                        }
                        aria-hidden={activeFilters.length === 0}
                      >
                        {activeFilters.length > 0
                          ? `${t({ zh: '当前筛选：', en: 'Active filters: ' })}${activeFilters.join(' · ')}`
                          : t({ zh: '当前筛选：', en: 'Active filters: ' })}
                      </p>

                      <p className="supporting-text">
                        {filteredChampions.length > 0
                          ? t({
                              zh: `当前展示 ${visibleChampions.length} / ${filteredChampions.length} 名英雄。如果结果过多，优先加关键词、座位、定位或联动队伍缩小范围。`,
                              en: `Showing ${visibleChampions.length} / ${filteredChampions.length} champions. Narrow things down with a keyword, seat, role, or affiliation if the list feels too broad.`,
                            })
                          : t({
                              zh: '当前筛选条件下没有匹配英雄，可以先清空座位、定位或联动队伍过滤。',
                              en: 'No champions match this filter set yet. Try clearing seat, role, or affiliation filters first.',
                            })}
                      </p>
                    </div>

                    {filteredChampions.length > 0 ? (
                      <div className="results-grid results-grid--stable">
                        {visibleChampions.map((champion) => {
                          const primaryName = getPrimaryLocalizedText(champion.name, locale)
                          const secondaryName = getSecondaryLocalizedText(champion.name, locale)

                          return (
                            <article key={champion.id} className="result-card">
                              <div className="result-card__header">
                                <span className="result-card__eyebrow">
                                  {locale === 'zh-CN' ? `${champion.seat} 号位` : `Seat ${champion.seat}`}
                                </span>
                                <h3 className="result-card__title">{primaryName}</h3>
                              </div>

                              {secondaryName ? <p className="result-card__secondary">{secondaryName}</p> : null}

                              <div className="tag-row">
                                {champion.roles.map((role) => (
                                  <span key={role} className="tag-pill">
                                    {getRoleLabel(role, locale)}
                                  </span>
                                ))}
                              </div>

                              <p className="supporting-text">
                                {t({ zh: '联动队伍', en: 'Affiliation' })}：
                                {champion.affiliations.length > 0
                                  ? champion.affiliations
                                      .map((affiliation) => getLocalizedTextPair(affiliation, locale))
                                      .join(' / ')
                                  : t({ zh: '暂无', en: 'None yet' })}
                              </p>

                              <div className="tag-row">
                                {champion.tags.slice(0, 6).map((tag) => (
                                  <span key={tag} className="tag-pill tag-pill--muted">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </article>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="status-banner status-banner--info results-panel__empty">
                        {t({
                          zh: '暂时没有可展示的英雄结果。先放宽一个过滤维度，再继续缩小范围会更顺手。',
                          en: 'There are no champions to show right now. Loosen one filter group first, then narrow it back down.',
                        })}
                      </div>
                    )}
                  </div>
                </section>
              </section>
            </div>
          </>
        ) : null}
      </SurfaceCard>
    </div>
  )
}
