import { useEffect, useMemo, useState } from 'react'
import { useI18n } from '../app/i18n'
import { ChampionIdentity } from '../components/ChampionIdentity'
import { ChampionVisualWorkbench } from '../components/ChampionVisualWorkbench'
import { FieldGroup } from '../components/FieldGroup'
import { LocalizedText } from '../components/LocalizedText'
import { StatusBanner } from '../components/StatusBanner'
import { SurfaceCard } from '../components/SurfaceCard'
import { loadCollection } from '../data/client'
import {
  formatSeatLabel,
  getLocalizedTextPair,
  getPrimaryLocalizedText,
  getRoleLabel,
} from '../domain/localizedText'
import {
  getChampionAttributeGroupLabel,
  getChampionAttributeGroups,
  getChampionTagsForGroup,
  getChampionTagLabel,
} from '../domain/championTags'
import type { Champion, ChampionVisual, LocalizedText as LocalizedTextValue } from '../domain/types'
import { filterChampions, toggleFilterValue } from '../rules/championFilter'

interface StringEnumGroup {
  id: string
  values: string[]
}

interface LocalizedEnumGroup {
  id: string
  values: LocalizedTextValue[]
}

const seatOptions = Array.from({ length: 12 }, (_, index) => index + 1)
const MAX_VISIBLE_RESULTS = 48

type AttributeFilterGroupId = 'race' | 'gender' | 'alignment' | 'profession' | 'acquisition' | 'mechanics'

interface ActiveFilterChip {
  id: string
  label: string
  clearLabel: string
  onClear: () => void
}

type ChampionState =
  | { status: 'loading' }
  | {
      status: 'ready'
      champions: Champion[]
      visuals: ChampionVisual[]
      roles: string[]
      affiliations: LocalizedTextValue[]
    }
  | {
      status: 'error'
      message: string
    }

function isLocalizedText(value: unknown): value is LocalizedTextValue {
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

function collectAttributeFilterOptions(
  champions: Champion[],
  groupId: AttributeFilterGroupId,
  locale: 'zh-CN' | 'en-US',
): string[] {
  return Array.from(new Set(champions.flatMap((champion) => getChampionTagsForGroup(champion.tags, groupId)))).sort(
    (left, right) => getChampionTagLabel(left, locale).localeCompare(getChampionTagLabel(right, locale)),
  )
}

export function ChampionsPage() {
  const { locale, t } = useI18n()
  const [state, setState] = useState<ChampionState>({ status: 'loading' })
  const [search, setSearch] = useState('')
  const [selectedSeats, setSelectedSeats] = useState<number[]>([])
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [selectedAffiliations, setSelectedAffiliations] = useState<string[]>([])
  const [selectedRaces, setSelectedRaces] = useState<string[]>([])
  const [selectedGenders, setSelectedGenders] = useState<string[]>([])
  const [selectedAlignments, setSelectedAlignments] = useState<string[]>([])
  const [selectedProfessions, setSelectedProfessions] = useState<string[]>([])
  const [selectedAcquisitions, setSelectedAcquisitions] = useState<string[]>([])
  const [selectedMechanics, setSelectedMechanics] = useState<string[]>([])
  const [selectedChampionId, setSelectedChampionId] = useState<string | null>(null)

  useEffect(() => {
    let disposed = false

    Promise.all([
      loadCollection<Champion>('champions'),
      loadCollection<unknown>('enums'),
      loadCollection<ChampionVisual>('champion-visuals').catch(() => ({
        updatedAt: '',
        items: [],
      })),
    ])
      .then(([championCollection, enumCollection, visualCollection]) => {
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
          visuals: visualCollection.items,
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

    return filterChampions(state.champions, {
      search,
      seats: selectedSeats,
      roles: selectedRoles,
      affiliations: selectedAffiliations,
      races: selectedRaces,
      genders: selectedGenders,
      alignments: selectedAlignments,
      professions: selectedProfessions,
      acquisitions: selectedAcquisitions,
      mechanics: selectedMechanics,
    })
  }, [
    search,
    selectedAcquisitions,
    selectedAffiliations,
    selectedAlignments,
    selectedGenders,
    selectedMechanics,
    selectedProfessions,
    selectedRaces,
    selectedRoles,
    selectedSeats,
    state,
  ])

  const visibleChampions = filteredChampions.slice(0, MAX_VISIBLE_RESULTS)
  const selectedChampion =
    selectedChampionId !== null ? visibleChampions.find((champion) => champion.id === selectedChampionId) ?? null : null
  const selectedChampionVisual =
    state.status === 'ready' && selectedChampion
      ? state.visuals.find((visual) => visual.championId === selectedChampion.id) ?? null
      : null
  const matchedSeats = new Set(filteredChampions.map((champion) => champion.seat)).size
  const orderedSelectedSeats = seatOptions.filter((seat) => selectedSeats.includes(seat))
  const orderedSelectedRoles =
    state.status === 'ready' ? state.roles.filter((role) => selectedRoles.includes(role)) : []
  const orderedSelectedAffiliations =
    state.status === 'ready'
      ? state.affiliations.filter((affiliation) => selectedAffiliations.includes(affiliation.original))
      : []
  const raceOptions =
    state.status === 'ready' ? collectAttributeFilterOptions(state.champions, 'race', locale) : []
  const genderOptions =
    state.status === 'ready' ? collectAttributeFilterOptions(state.champions, 'gender', locale) : []
  const alignmentOptions =
    state.status === 'ready' ? collectAttributeFilterOptions(state.champions, 'alignment', locale) : []
  const professionOptions =
    state.status === 'ready' ? collectAttributeFilterOptions(state.champions, 'profession', locale) : []
  const acquisitionOptions =
    state.status === 'ready' ? collectAttributeFilterOptions(state.champions, 'acquisition', locale) : []
  const mechanicOptions =
    state.status === 'ready' ? collectAttributeFilterOptions(state.champions, 'mechanics', locale) : []
  const orderedSelectedRaces = raceOptions.filter((race) => selectedRaces.includes(race))
  const orderedSelectedGenders = genderOptions.filter((gender) => selectedGenders.includes(gender))
  const orderedSelectedAlignments = alignmentOptions.filter((alignment) => selectedAlignments.includes(alignment))
  const orderedSelectedProfessions = professionOptions.filter((profession) => selectedProfessions.includes(profession))
  const orderedSelectedAcquisitions = acquisitionOptions.filter((acquisition) =>
    selectedAcquisitions.includes(acquisition),
  )
  const orderedSelectedMechanics = mechanicOptions.filter((mechanic) => selectedMechanics.includes(mechanic))

  const clearAllFilters = () => {
    setSearch('')
    setSelectedSeats([])
    setSelectedRoles([])
    setSelectedAffiliations([])
    setSelectedRaces([])
    setSelectedGenders([])
    setSelectedAlignments([])
    setSelectedProfessions([])
    setSelectedAcquisitions([])
    setSelectedMechanics([])
  }

  const activeFilterChips = [
    search.trim()
      ? {
          id: 'search',
          label: t({
            zh: `关键词：${search.trim()}`,
            en: `Keyword: ${search.trim()}`,
          }),
          clearLabel: t({
            zh: `清空关键词：${search.trim()}`,
            en: `Clear keyword: ${search.trim()}`,
          }),
          onClear: () => setSearch(''),
        }
      : null,
    orderedSelectedSeats.length > 0
      ? {
          id: 'seats',
          label: t({
            zh: `座位：${orderedSelectedSeats.map((seat) => formatSeatLabel(seat, locale)).join('、')}`,
            en: `Seats: ${orderedSelectedSeats.join(', ')}`,
          }),
          clearLabel: t({
            zh: `清空座位：${orderedSelectedSeats.map((seat) => formatSeatLabel(seat, locale)).join('、')}`,
            en: `Clear seats: ${orderedSelectedSeats.join(', ')}`,
          }),
          onClear: () => setSelectedSeats([]),
        }
      : null,
    orderedSelectedRoles.length > 0
      ? {
          id: 'roles',
          label: t({
            zh: `定位：${orderedSelectedRoles.map((role) => getRoleLabel(role, locale)).join('、')}`,
            en: `Roles: ${orderedSelectedRoles.map((role) => getRoleLabel(role, locale)).join(', ')}`,
          }),
          clearLabel: t({
            zh: `清空定位：${orderedSelectedRoles.map((role) => getRoleLabel(role, locale)).join('、')}`,
            en: `Clear roles: ${orderedSelectedRoles.map((role) => getRoleLabel(role, locale)).join(', ')}`,
          }),
          onClear: () => setSelectedRoles([]),
        }
      : null,
    orderedSelectedAffiliations.length > 0
      ? {
          id: 'affiliations',
          label: t({
            zh: `联动队伍：${orderedSelectedAffiliations.map((affiliation) => getLocalizedTextPair(affiliation, locale)).join('、')}`,
            en: `Affiliations: ${orderedSelectedAffiliations
              .map((affiliation) => getLocalizedTextPair(affiliation, locale))
              .join(', ')}`,
          }),
          clearLabel: t({
            zh: `清空联动队伍：${orderedSelectedAffiliations
              .map((affiliation) => getLocalizedTextPair(affiliation, locale))
              .join('、')}`,
            en: `Clear affiliations: ${orderedSelectedAffiliations
              .map((affiliation) => getLocalizedTextPair(affiliation, locale))
              .join(', ')}`,
          }),
          onClear: () => setSelectedAffiliations([]),
        }
      : null,
    orderedSelectedRaces.length > 0
      ? {
          id: 'races',
          label: t({
            zh: `种族：${orderedSelectedRaces.map((race) => getChampionTagLabel(race, locale)).join('、')}`,
            en: `Races: ${orderedSelectedRaces.map((race) => getChampionTagLabel(race, locale)).join(', ')}`,
          }),
          clearLabel: t({
            zh: `清空种族：${orderedSelectedRaces.map((race) => getChampionTagLabel(race, locale)).join('、')}`,
            en: `Clear races: ${orderedSelectedRaces.map((race) => getChampionTagLabel(race, locale)).join(', ')}`,
          }),
          onClear: () => setSelectedRaces([]),
        }
      : null,
    orderedSelectedGenders.length > 0
      ? {
          id: 'genders',
          label: t({
            zh: `性别：${orderedSelectedGenders.map((gender) => getChampionTagLabel(gender, locale)).join('、')}`,
            en: `Genders: ${orderedSelectedGenders.map((gender) => getChampionTagLabel(gender, locale)).join(', ')}`,
          }),
          clearLabel: t({
            zh: `清空性别：${orderedSelectedGenders.map((gender) => getChampionTagLabel(gender, locale)).join('、')}`,
            en: `Clear genders: ${orderedSelectedGenders
              .map((gender) => getChampionTagLabel(gender, locale))
              .join(', ')}`,
          }),
          onClear: () => setSelectedGenders([]),
        }
      : null,
    orderedSelectedAlignments.length > 0
      ? {
          id: 'alignments',
          label: t({
            zh: `阵营：${orderedSelectedAlignments.map((alignment) => getChampionTagLabel(alignment, locale)).join('、')}`,
            en: `Alignments: ${orderedSelectedAlignments
              .map((alignment) => getChampionTagLabel(alignment, locale))
              .join(', ')}`,
          }),
          clearLabel: t({
            zh: `清空阵营：${orderedSelectedAlignments
              .map((alignment) => getChampionTagLabel(alignment, locale))
              .join('、')}`,
            en: `Clear alignments: ${orderedSelectedAlignments
              .map((alignment) => getChampionTagLabel(alignment, locale))
              .join(', ')}`,
          }),
          onClear: () => setSelectedAlignments([]),
        }
      : null,
    orderedSelectedProfessions.length > 0
      ? {
          id: 'professions',
          label: t({
            zh: `职业：${orderedSelectedProfessions.map((profession) => getChampionTagLabel(profession, locale)).join('、')}`,
            en: `Professions: ${orderedSelectedProfessions
              .map((profession) => getChampionTagLabel(profession, locale))
              .join(', ')}`,
          }),
          clearLabel: t({
            zh: `清空职业：${orderedSelectedProfessions
              .map((profession) => getChampionTagLabel(profession, locale))
              .join('、')}`,
            en: `Clear professions: ${orderedSelectedProfessions
              .map((profession) => getChampionTagLabel(profession, locale))
              .join(', ')}`,
          }),
          onClear: () => setSelectedProfessions([]),
        }
      : null,
    orderedSelectedAcquisitions.length > 0
      ? {
          id: 'acquisitions',
          label: t({
            zh: `获取方式：${orderedSelectedAcquisitions
              .map((acquisition) => getChampionTagLabel(acquisition, locale))
              .join('、')}`,
            en: `Availability: ${orderedSelectedAcquisitions
              .map((acquisition) => getChampionTagLabel(acquisition, locale))
              .join(', ')}`,
          }),
          clearLabel: t({
            zh: `清空获取方式：${orderedSelectedAcquisitions
              .map((acquisition) => getChampionTagLabel(acquisition, locale))
              .join('、')}`,
            en: `Clear availability: ${orderedSelectedAcquisitions
              .map((acquisition) => getChampionTagLabel(acquisition, locale))
              .join(', ')}`,
          }),
          onClear: () => setSelectedAcquisitions([]),
        }
      : null,
    orderedSelectedMechanics.length > 0
      ? {
          id: 'mechanics',
          label: t({
            zh: `机制：${orderedSelectedMechanics.map((mechanic) => getChampionTagLabel(mechanic, locale)).join('、')}`,
            en: `Mechanics: ${orderedSelectedMechanics
              .map((mechanic) => getChampionTagLabel(mechanic, locale))
              .join(', ')}`,
          }),
          clearLabel: t({
            zh: `清空机制：${orderedSelectedMechanics.map((mechanic) => getChampionTagLabel(mechanic, locale)).join('、')}`,
            en: `Clear mechanics: ${orderedSelectedMechanics
              .map((mechanic) => getChampionTagLabel(mechanic, locale))
              .join(', ')}`,
          }),
          onClear: () => setSelectedMechanics([]),
        }
      : null,
  ].filter((item): item is ActiveFilterChip => Boolean(item))

  const activeFilters = activeFilterChips.map((chip) => chip.label)

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
          <StatusBanner tone="info">{t({ zh: '正在读取英雄数据…', en: 'Loading champion data…' })}</StatusBanner>
        ) : null}

        {state.status === 'error' ? (
          <StatusBanner
            tone="error"
            title={t({ zh: '英雄数据读取失败', en: 'Champion data failed to load' })}
            detail={state.message || t({ zh: '未知错误', en: 'Unknown error' })}
          />
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
              <FieldGroup
                label={t({ zh: '关键词', en: 'Keyword' })}
                hint={t({
                  zh: '支持中英混搜；切换界面语言时，当前关键词和筛选不会被清空。',
                  en: 'Chinese and English queries both work here, and switching UI language keeps the current filters.',
                })}
                as="label"
              >
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
              </FieldGroup>

              <FieldGroup
                label={t({ zh: '座位', en: 'Seat' })}
                hint={t({
                  zh: '支持多选；同一维度按“或”命中。',
                  en: 'Multi-select is supported, and matches within this group use OR.',
                })}
                className="filter-group"
              >
                <div className="filter-chip-grid">
                  <button
                    type="button"
                    className={selectedSeats.length === 0 ? 'filter-chip filter-chip--active' : 'filter-chip'}
                    aria-pressed={selectedSeats.length === 0}
                    onClick={() => setSelectedSeats([])}
                  >
                    {t({ zh: '全部', en: 'All' })}
                  </button>
                  {seatOptions.map((seat) => (
                    <button
                      key={seat}
                      type="button"
                      className={selectedSeats.includes(seat) ? 'filter-chip filter-chip--active' : 'filter-chip'}
                      aria-pressed={selectedSeats.includes(seat)}
                      onClick={() => setSelectedSeats((current) => toggleFilterValue(current, seat))}
                    >
                      {formatSeatLabel(seat, locale)}
                    </button>
                  ))}
                </div>
              </FieldGroup>

              <FieldGroup
                label={t({ zh: '定位', en: 'Role' })}
                hint={t({
                  zh: '支持多选；会匹配任一已选定位。',
                  en: 'Multi-select is supported, and champions can match any selected role.',
                })}
                className="filter-group"
              >
                <div className="filter-chip-grid">
                  <button
                    type="button"
                    className={selectedRoles.length === 0 ? 'filter-chip filter-chip--active' : 'filter-chip'}
                    aria-pressed={selectedRoles.length === 0}
                    onClick={() => setSelectedRoles([])}
                  >
                    {t({ zh: '全部', en: 'All' })}
                  </button>
                  {state.roles.map((role) => (
                    <button
                      key={role}
                      type="button"
                      className={selectedRoles.includes(role) ? 'filter-chip filter-chip--active' : 'filter-chip'}
                      aria-pressed={selectedRoles.includes(role)}
                      onClick={() => setSelectedRoles((current) => toggleFilterValue(current, role))}
                    >
                      {getRoleLabel(role, locale)}
                    </button>
                  ))}
                </div>
              </FieldGroup>

              <FieldGroup
                label={t({ zh: '联动队伍', en: 'Affiliation' })}
                hint={t({
                  zh: '支持多选；适合同时看多个联动队伍候选。',
                  en: 'Multi-select is supported for comparing multiple affiliations at once.',
                })}
                className="filter-group"
              >
                <div className="filter-chip-grid">
                  <button
                    type="button"
                    className={selectedAffiliations.length === 0 ? 'filter-chip filter-chip--active' : 'filter-chip'}
                    aria-pressed={selectedAffiliations.length === 0}
                    onClick={() => setSelectedAffiliations([])}
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
                      onClick={() =>
                        setSelectedAffiliations((current) => toggleFilterValue(current, affiliation.original))
                      }
                    >
                      <LocalizedText text={affiliation} mode="primary" />
                    </button>
                  ))}
                </div>
              </FieldGroup>

              <FieldGroup
                label={getChampionAttributeGroupLabel('race', locale)}
                hint={t({
                  zh: '支持多选；适合快速收窄到特定种族组合。',
                  en: 'Multi-select is supported for narrowing the pool to specific races.',
                })}
                className="filter-group"
              >
                <div className="filter-chip-grid">
                  <button
                    type="button"
                    className={selectedRaces.length === 0 ? 'filter-chip filter-chip--active' : 'filter-chip'}
                    aria-pressed={selectedRaces.length === 0}
                    onClick={() => setSelectedRaces([])}
                  >
                    {t({ zh: '全部', en: 'All' })}
                  </button>
                  {raceOptions.map((race) => (
                    <button
                      key={race}
                      type="button"
                      className={selectedRaces.includes(race) ? 'filter-chip filter-chip--active' : 'filter-chip'}
                      aria-pressed={selectedRaces.includes(race)}
                      onClick={() => setSelectedRaces((current) => toggleFilterValue(current, race))}
                    >
                      {getChampionTagLabel(race, locale)}
                    </button>
                  ))}
                </div>
              </FieldGroup>

              <FieldGroup
                label={getChampionAttributeGroupLabel('gender', locale)}
                hint={t({
                  zh: '支持多选；同一维度内仍按“或”命中。',
                  en: 'Multi-select is supported, and matches within this group still use OR.',
                })}
                className="filter-group"
              >
                <div className="filter-chip-grid">
                  <button
                    type="button"
                    className={selectedGenders.length === 0 ? 'filter-chip filter-chip--active' : 'filter-chip'}
                    aria-pressed={selectedGenders.length === 0}
                    onClick={() => setSelectedGenders([])}
                  >
                    {t({ zh: '全部', en: 'All' })}
                  </button>
                  {genderOptions.map((gender) => (
                    <button
                      key={gender}
                      type="button"
                      className={selectedGenders.includes(gender) ? 'filter-chip filter-chip--active' : 'filter-chip'}
                      aria-pressed={selectedGenders.includes(gender)}
                      onClick={() => setSelectedGenders((current) => toggleFilterValue(current, gender))}
                    >
                      {getChampionTagLabel(gender, locale)}
                    </button>
                  ))}
                </div>
              </FieldGroup>

              <FieldGroup
                label={getChampionAttributeGroupLabel('alignment', locale)}
                hint={t({
                  zh: '支持多选；适合先看善恶 / 秩序倾向的英雄池。',
                  en: 'Multi-select is supported for comparing alignment tendencies in one pass.',
                })}
                className="filter-group"
              >
                <div className="filter-chip-grid">
                  <button
                    type="button"
                    className={selectedAlignments.length === 0 ? 'filter-chip filter-chip--active' : 'filter-chip'}
                    aria-pressed={selectedAlignments.length === 0}
                    onClick={() => setSelectedAlignments([])}
                  >
                    {t({ zh: '全部', en: 'All' })}
                  </button>
                  {alignmentOptions.map((alignment) => (
                    <button
                      key={alignment}
                      type="button"
                      className={
                        selectedAlignments.includes(alignment) ? 'filter-chip filter-chip--active' : 'filter-chip'
                      }
                      aria-pressed={selectedAlignments.includes(alignment)}
                      onClick={() => setSelectedAlignments((current) => toggleFilterValue(current, alignment))}
                    >
                      {getChampionTagLabel(alignment, locale)}
                    </button>
                  ))}
                </div>
              </FieldGroup>

              <FieldGroup
                label={getChampionAttributeGroupLabel('profession', locale)}
                hint={t({
                  zh: '支持多选；便于按职业组合快速找候选英雄。',
                  en: 'Multi-select is supported for filtering by profession combinations.',
                })}
                className="filter-group"
              >
                <div className="filter-chip-grid">
                  <button
                    type="button"
                    className={selectedProfessions.length === 0 ? 'filter-chip filter-chip--active' : 'filter-chip'}
                    aria-pressed={selectedProfessions.length === 0}
                    onClick={() => setSelectedProfessions([])}
                  >
                    {t({ zh: '全部', en: 'All' })}
                  </button>
                  {professionOptions.map((profession) => (
                    <button
                      key={profession}
                      type="button"
                      className={
                        selectedProfessions.includes(profession) ? 'filter-chip filter-chip--active' : 'filter-chip'
                      }
                      aria-pressed={selectedProfessions.includes(profession)}
                      onClick={() => setSelectedProfessions((current) => toggleFilterValue(current, profession))}
                    >
                      {getChampionTagLabel(profession, locale)}
                    </button>
                  ))}
                </div>
              </FieldGroup>

              <FieldGroup
                label={getChampionAttributeGroupLabel('acquisition', locale)}
                hint={t({
                  zh: '支持多选；可以区分起始、常驻、活动或 Tales 等来源。',
                  en: 'Multi-select is supported for comparing starter, evergreen, event, or Tales availability.',
                })}
                className="filter-group"
              >
                <div className="filter-chip-grid">
                  <button
                    type="button"
                    className={selectedAcquisitions.length === 0 ? 'filter-chip filter-chip--active' : 'filter-chip'}
                    aria-pressed={selectedAcquisitions.length === 0}
                    onClick={() => setSelectedAcquisitions([])}
                  >
                    {t({ zh: '全部', en: 'All' })}
                  </button>
                  {acquisitionOptions.map((acquisition) => (
                    <button
                      key={acquisition}
                      type="button"
                      className={
                        selectedAcquisitions.includes(acquisition) ? 'filter-chip filter-chip--active' : 'filter-chip'
                      }
                      aria-pressed={selectedAcquisitions.includes(acquisition)}
                      onClick={() => setSelectedAcquisitions((current) => toggleFilterValue(current, acquisition))}
                    >
                      {getChampionTagLabel(acquisition, locale)}
                    </button>
                  ))}
                </div>
              </FieldGroup>

              <FieldGroup
                label={getChampionAttributeGroupLabel('mechanics', locale)}
                hint={t({
                  zh: '支持多选；适合按控制、站位联动或专精机制组合筛候选。',
                  en: 'Multi-select is supported for control, positional, or specialization-based mechanics.',
                })}
                className="filter-group"
              >
                <div className="filter-chip-grid">
                  <button
                    type="button"
                    className={selectedMechanics.length === 0 ? 'filter-chip filter-chip--active' : 'filter-chip'}
                    aria-pressed={selectedMechanics.length === 0}
                    onClick={() => setSelectedMechanics([])}
                  >
                    {t({ zh: '全部', en: 'All' })}
                  </button>
                  {mechanicOptions.map((mechanic) => (
                    <button
                      key={mechanic}
                      type="button"
                      className={
                        selectedMechanics.includes(mechanic) ? 'filter-chip filter-chip--active' : 'filter-chip'
                      }
                      aria-pressed={selectedMechanics.includes(mechanic)}
                      onClick={() => setSelectedMechanics((current) => toggleFilterValue(current, mechanic))}
                    >
                      {getChampionTagLabel(mechanic, locale)}
                    </button>
                  ))}
                </div>
              </FieldGroup>
            </div>

            {activeFilterChips.length > 0 ? (
              <div className="active-filter-bar">
                <div className="active-filter-bar__header">
                  <div className="active-filter-bar__copy">
                    <strong className="active-filter-bar__title">{t({ zh: '已选条件', en: 'Selected filters' })}</strong>
                    <p className="active-filter-bar__hint">
                      {t({
                        zh: '点击任一条件即可单独清空对应维度，也可以一键清空全部。',
                        en: 'Click any filter chip to clear that dimension only, or clear everything at once.',
                      })}
                    </p>
                  </div>
                  <button type="button" className="action-button action-button--ghost" onClick={clearAllFilters}>
                    {t({ zh: '清空全部', en: 'Clear all' })}
                  </button>
                </div>
                <div className="active-filter-bar__chips">
                  {activeFilterChips.map((chip) => (
                    <button
                      key={chip.id}
                      type="button"
                      className="active-filter-chip"
                      aria-label={chip.clearLabel}
                      onClick={chip.onClear}
                    >
                      <span>{chip.label}</span>
                      <span aria-hidden="true" className="active-filter-chip__dismiss">
                        ×
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {filteredChampions.length === 0 ? (
              <StatusBanner tone="info">
                {t({
                  zh: '当前筛选条件下没有匹配英雄，可以先清空上方已选条件，或放宽座位、定位、联动队伍、种族、性别、阵营、职业、获取方式或机制过滤。',
                  en: 'No champions match this filter set yet. Try clearing the selected chips above or widening seat, role, affiliation, race, gender, alignment, profession, availability, or mechanic filters.',
                })}
              </StatusBanner>
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
                    zh: `当前展示 ${visibleChampions.length} / ${filteredChampions.length} 名英雄。如果结果过多，优先加关键词、座位、定位、联动队伍、种族、性别、阵营、职业、获取方式或机制缩小范围。`,
                    en: `Showing ${visibleChampions.length} / ${filteredChampions.length} champions. Narrow things down with a keyword, seat, role, affiliation, race, gender, alignment, profession, availability, or mechanic if the list feels too broad.`,
                  })}
                </p>

                {selectedChampion ? (
                  <ChampionVisualWorkbench
                    key={selectedChampion.id}
                    champion={selectedChampion}
                    visual={selectedChampionVisual}
                    locale={locale}
                    onClose={() => setSelectedChampionId(null)}
                  />
                ) : null}

                <div className="results-grid">
                  {visibleChampions.map((champion) => {
                    const attributeGroups = getChampionAttributeGroups(champion.tags)
                    const isSelected = champion.id === selectedChampionId

                    return (
                      <article
                        key={champion.id}
                        className={isSelected ? 'result-card result-card--champion result-card--selected' : 'result-card result-card--champion'}
                      >
                        <ChampionIdentity
                          champion={champion}
                          locale={locale}
                          eyebrow={formatSeatLabel(champion.seat, locale)}
                          avatarClassName="champion-avatar--spotlight"
                          variant="spotlight"
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

                        <div className="result-block">
                          <strong className="result-block__title">{t({ zh: '属性概览', en: 'Attributes' })}</strong>
                          {attributeGroups.length > 0 ? (
                            <div className="result-attribute-grid">
                              {attributeGroups.map((group) => (
                                <div key={group.id} className="result-block result-block--compact">
                                  <strong className="result-block__title result-block__title--small">
                                    {getChampionAttributeGroupLabel(group.id, locale)}
                                  </strong>
                                  <div className="tag-row tag-row--tight">
                                    {group.tags.map((tag) => (
                                      <span key={tag} className="tag-pill tag-pill--muted">
                                        {getChampionTagLabel(tag, locale)}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="supporting-text">
                              {t({
                                zh: '当前数据里还没有更多属性标签。',
                                en: 'No extra attribute tags are exposed in the current dataset yet.',
                              })}
                            </p>
                          )}
                        </div>

                        <div className="result-card__actions">
                          <button
                            type="button"
                            className={isSelected ? 'action-button action-button--secondary action-button--toggled' : 'action-button action-button--ghost'}
                            aria-label={t({
                              zh: `查看 ${getPrimaryLocalizedText(champion.name, locale)} 视觉档案`,
                              en: `View ${getPrimaryLocalizedText(champion.name, locale)} visual dossier`,
                            })}
                            aria-pressed={isSelected}
                            onClick={() => setSelectedChampionId(champion.id)}
                          >
                            {isSelected ? t({ zh: '当前档案', en: 'Current dossier' }) : t({ zh: '视觉档案', en: 'Visual dossier' })}
                          </button>
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
