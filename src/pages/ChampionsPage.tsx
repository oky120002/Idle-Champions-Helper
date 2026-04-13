import { useEffect, useMemo, useState } from 'react'
import { useI18n } from '../app/i18n'
import { ChampionIdentity } from '../components/ChampionIdentity'
import { SurfaceCard } from '../components/SurfaceCard'
import { loadCollection } from '../data/client'
import {
  getLocalizedTextPair,
  getPrimaryLocalizedText,
  getRoleLabel,
  matchesLocalizedText,
} from '../domain/localizedText'
import type { Champion, LocalizedText } from '../domain/types'

interface StringEnumGroup {
  id: string
  values: string[]
}

interface LocalizedEnumGroup {
  id: string
  values: LocalizedText[]
}

const ALL_FILTER = '__all__'
const seatOptions = Array.from({ length: 12 }, (_, index) => index + 1)
const MAX_VISIBLE_RESULTS = 48

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
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null)
  const [selectedRole, setSelectedRole] = useState<string>(ALL_FILTER)
  const [selectedAffiliation, setSelectedAffiliation] = useState<string>(ALL_FILTER)

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

  const filteredChampions = useMemo(() => {
    if (state.status !== 'ready') {
      return []
    }

    const query = search.trim().toLowerCase()

    return state.champions.filter((champion) => {
      const matchesSearch =
        !query ||
        matchesLocalizedText(champion.name, query) ||
        champion.tags.some((tag) => tag.toLowerCase().includes(query)) ||
        champion.affiliations.some((affiliation) => matchesLocalizedText(affiliation, query))

      const matchesSeat = selectedSeat === null || champion.seat === selectedSeat
      const matchesRole = selectedRole === ALL_FILTER || champion.roles.includes(selectedRole)
      const matchesAffiliation =
        selectedAffiliation === ALL_FILTER ||
        champion.affiliations.some((affiliation) => affiliation.original === selectedAffiliation)

      return matchesSearch && matchesSeat && matchesRole && matchesAffiliation
    })
  }, [search, selectedAffiliation, selectedRole, selectedSeat, state])

  const visibleChampions = filteredChampions.slice(0, MAX_VISIBLE_RESULTS)
  const matchedSeats = new Set(filteredChampions.map((champion) => champion.seat)).size
  const selectedAffiliationLabel =
    state.status === 'ready'
      ? state.affiliations.find((affiliation) => affiliation.original === selectedAffiliation) ?? null
      : null
  const activeFilters = [
    search.trim()
      ? t({
          zh: `关键词：${search.trim()}`,
          en: `Keyword: ${search.trim()}`,
        })
      : null,
    selectedSeat !== null ? (locale === 'zh-CN' ? `${selectedSeat} 号位` : `Seat ${selectedSeat}`) : null,
    selectedRole !== ALL_FILTER
      ? t({
          zh: `定位：${getRoleLabel(selectedRole, locale)}`,
          en: `Role: ${getRoleLabel(selectedRole, locale)}`,
        })
      : null,
    selectedAffiliationLabel
      ? t({
          zh: `联动队伍：${getLocalizedTextPair(selectedAffiliationLabel, locale)}`,
          en: `Affiliation: ${getLocalizedTextPair(selectedAffiliationLabel, locale)}`,
        })
      : null,
  ].filter((item): item is string => Boolean(item))

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

            <div className="filter-panel">
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
                  onChange={(event) => setSearch(event.target.value)}
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
                    className={selectedSeat === null ? 'filter-chip filter-chip--active' : 'filter-chip'}
                    onClick={() => setSelectedSeat(null)}
                  >
                    {t({ zh: '全部', en: 'All' })}
                  </button>
                  {seatOptions.map((seat) => (
                    <button
                      key={seat}
                      type="button"
                      className={selectedSeat === seat ? 'filter-chip filter-chip--active' : 'filter-chip'}
                      onClick={() => setSelectedSeat(seat)}
                    >
                      {locale === 'zh-CN' ? `${seat} 号位` : `Seat ${seat}`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="filter-group">
                <span className="field-label">{t({ zh: '定位', en: 'Role' })}</span>
                <div className="filter-chip-grid">
                  <button
                    type="button"
                    className={selectedRole === ALL_FILTER ? 'filter-chip filter-chip--active' : 'filter-chip'}
                    onClick={() => setSelectedRole(ALL_FILTER)}
                  >
                    {t({ zh: '全部', en: 'All' })}
                  </button>
                  {state.roles.map((role) => (
                    <button
                      key={role}
                      type="button"
                      className={selectedRole === role ? 'filter-chip filter-chip--active' : 'filter-chip'}
                      onClick={() => setSelectedRole(role)}
                    >
                      {getRoleLabel(role, locale)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="filter-group">
                <span className="field-label">{t({ zh: '联动队伍', en: 'Affiliation' })}</span>
                <div className="filter-chip-grid">
                  <button
                    type="button"
                    className={
                      selectedAffiliation === ALL_FILTER ? 'filter-chip filter-chip--active' : 'filter-chip'
                    }
                    onClick={() => setSelectedAffiliation(ALL_FILTER)}
                  >
                    {t({ zh: '全部', en: 'All' })}
                  </button>
                  {state.affiliations.map((affiliation) => (
                    <button
                      key={affiliation.original}
                      type="button"
                      className={
                        selectedAffiliation === affiliation.original
                          ? 'filter-chip filter-chip--active'
                          : 'filter-chip'
                      }
                      onClick={() => setSelectedAffiliation(affiliation.original)}
                    >
                      {getPrimaryLocalizedText(affiliation, locale)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {filteredChampions.length === 0 ? (
              <div className="status-banner status-banner--info">
                {t({
                  zh: '当前筛选条件下没有匹配英雄，可以先清空座位、定位或联动队伍过滤。',
                  en: 'No champions match this filter set yet. Try clearing seat, role, or affiliation filters first.',
                })}
              </div>
            ) : null}

            {filteredChampions.length > 0 ? (
              <>
                {activeFilters.length > 0 ? (
                  <p className="supporting-text">
                    {t({ zh: '当前筛选：', en: 'Active filters: ' })}
                    {activeFilters.join(' · ')}
                  </p>
                ) : null}

                <p className="supporting-text">
                  {t({
                    zh: `当前展示 ${visibleChampions.length} / ${filteredChampions.length} 名英雄。如果结果过多，优先加关键词、座位或定位缩小范围。`,
                    en: `Showing ${visibleChampions.length} / ${filteredChampions.length} champions. Narrow things down with a keyword, seat, or role if the list feels too broad.`,
                  })}
                </p>

                <div className="results-grid">
                  {visibleChampions.map((champion) => {
                    return (
                      <article key={champion.id} className="result-card">
                        <ChampionIdentity
                          champion={champion}
                          locale={locale}
                          eyebrow={locale === 'zh-CN' ? `${champion.seat} 号位` : `Seat ${champion.seat}`}
                        />

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
              </>
            ) : null}
          </>
        ) : null}
      </SurfaceCard>
    </div>
  )
}
