import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { useI18n } from '../app/i18n'
import { FieldGroup } from '../components/FieldGroup'
import { FilterDisclosureSection } from '../components/FilterDisclosureSection'
import { StatusBanner } from '../components/StatusBanner'
import { SurfaceCard } from '../components/SurfaceCard'
import { loadCollection, resolveDataUrl } from '../data/client'
import {
  formatSeatLabel,
  getPrimaryLocalizedText,
  getRoleLabel,
  getSecondaryLocalizedText,
} from '../domain/localizedText'
import {
  getChampionAttributeGroupLabel,
  getChampionMechanicCategoryId,
  getChampionMechanicCategoryLabel,
  getChampionTagLabel,
  getChampionTagsForGroup,
} from '../domain/championTags'
import type { ChampionMechanicCategoryId } from '../domain/championTags'
import type {
  Champion,
  ChampionIllustration,
  ChampionIllustrationKind,
  DataCollection,
  LocalizedText as LocalizedTextValue,
} from '../domain/types'
import { toggleFilterValue } from '../rules/championFilter'
import { filterIllustrations, type FilterableIllustration } from '../rules/illustrationFilter'

type ViewFilter = 'all' | ChampionIllustrationKind

type AttributeFilterGroupId = 'race' | 'gender' | 'alignment' | 'profession' | 'acquisition' | 'mechanics'

interface StringEnumGroup {
  id: string
  values: string[]
}

interface LocalizedEnumGroup {
  id: string
  values: LocalizedTextValue[]
}

interface MechanicOptionGroup {
  id: ChampionMechanicCategoryId
  options: string[]
}

interface ActiveFilterChip {
  id:
    | 'search'
    | 'view'
    | 'seats'
    | 'roles'
    | 'affiliations'
    | 'races'
    | 'genders'
    | 'alignments'
    | 'professions'
    | 'acquisitions'
    | 'mechanics'
  label: string
  clearLabel: string
}

type ShareLinkState = 'idle' | 'success' | 'error'

type IllustrationState =
  | { status: 'loading' }
  | {
      status: 'ready'
      illustrations: ChampionIllustration[]
      champions: Champion[]
      roles: string[]
      affiliations: LocalizedTextValue[]
    }
  | { status: 'error'; message: string }

const seatOptions = Array.from({ length: 12 }, (_, index) => index + 1)
const MAX_VISIBLE_ILLUSTRATIONS = 24
const SEARCH_PARAM_QUERY = 'q'
const SEARCH_PARAM_SCOPE = 'scope'
const SEARCH_PARAM_SEAT = 'seat'
const SEARCH_PARAM_ROLE = 'role'
const SEARCH_PARAM_AFFILIATION = 'affiliation'
const SEARCH_PARAM_RACE = 'race'
const SEARCH_PARAM_GENDER = 'gender'
const SEARCH_PARAM_ALIGNMENT = 'alignment'
const SEARCH_PARAM_PROFESSION = 'profession'
const SEARCH_PARAM_ACQUISITION = 'acquisition'
const SEARCH_PARAM_MECHANIC = 'mechanic'
const SEARCH_PARAM_RESULTS = 'results'
const RESULTS_VIEW_ALL = 'all'
const EMPTY_ILLUSTRATIONS: ChampionIllustration[] = []
const EMPTY_CHAMPIONS: Champion[] = []
const EMPTY_STRING_VALUES: string[] = []
const EMPTY_LOCALIZED_VALUES: LocalizedTextValue[] = []
const EMPTY_CHAMPION_COLLECTION: DataCollection<Champion> = {
  updatedAt: '',
  items: [],
}
const EMPTY_UNKNOWN_COLLECTION: DataCollection<unknown> = {
  updatedAt: '',
  items: [],
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

function groupMechanicOptions(options: string[]): MechanicOptionGroup[] {
  const orderedCategories: ChampionMechanicCategoryId[] = ['positional', 'control', 'specialization']

  return orderedCategories
    .map((id) => ({
      id,
      options: options.filter((tag) => getChampionMechanicCategoryId(tag) === id),
    }))
    .filter((group) => group.options.length > 0)
}

function readSearchValue(searchParams: URLSearchParams): string {
  return searchParams.get(SEARCH_PARAM_QUERY)?.trim() ?? ''
}

function readSeatValues(searchParams: URLSearchParams): number[] {
  return Array.from(
    new Set(
      searchParams
        .getAll(SEARCH_PARAM_SEAT)
        .map((value) => Number.parseInt(value, 10))
        .filter((value) => seatOptions.includes(value)),
    ),
  ).sort((left, right) => left - right)
}

function readStringValues(searchParams: URLSearchParams, key: string): string[] {
  return Array.from(
    new Set(
      searchParams
        .getAll(key)
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  )
}

function readScopeValue(searchParams: URLSearchParams): ViewFilter {
  const scope = searchParams.get(SEARCH_PARAM_SCOPE)

  if (scope === 'hero-base' || scope === 'skin') {
    return scope
  }

  return 'all'
}

function readShowAllResults(searchParams: URLSearchParams): boolean {
  return searchParams.get(SEARCH_PARAM_RESULTS) === RESULTS_VIEW_ALL
}

function appendSortedStringValues(searchParams: URLSearchParams, key: string, values: string[]): void {
  values
    .slice()
    .sort((left, right) => left.localeCompare(right))
    .forEach((value) => searchParams.append(key, value))
}

function buildFilterSearchParams(filters: {
  search: string
  scope: ViewFilter
  seats: number[]
  roles: string[]
  affiliations: string[]
  races: string[]
  genders: string[]
  alignments: string[]
  professions: string[]
  acquisitions: string[]
  mechanics: string[]
  showAllResults: boolean
}): URLSearchParams {
  const searchParams = new URLSearchParams()
  const normalizedSearch = filters.search.trim()

  if (normalizedSearch) {
    searchParams.set(SEARCH_PARAM_QUERY, normalizedSearch)
  }

  if (filters.scope !== 'all') {
    searchParams.set(SEARCH_PARAM_SCOPE, filters.scope)
  }

  filters.seats
    .slice()
    .sort((left, right) => left - right)
    .forEach((seat) => searchParams.append(SEARCH_PARAM_SEAT, String(seat)))
  appendSortedStringValues(searchParams, SEARCH_PARAM_ROLE, filters.roles)
  appendSortedStringValues(searchParams, SEARCH_PARAM_AFFILIATION, filters.affiliations)
  appendSortedStringValues(searchParams, SEARCH_PARAM_RACE, filters.races)
  appendSortedStringValues(searchParams, SEARCH_PARAM_GENDER, filters.genders)
  appendSortedStringValues(searchParams, SEARCH_PARAM_ALIGNMENT, filters.alignments)
  appendSortedStringValues(searchParams, SEARCH_PARAM_PROFESSION, filters.professions)
  appendSortedStringValues(searchParams, SEARCH_PARAM_ACQUISITION, filters.acquisitions)
  appendSortedStringValues(searchParams, SEARCH_PARAM_MECHANIC, filters.mechanics)

  if (filters.showAllResults) {
    searchParams.set(SEARCH_PARAM_RESULTS, RESULTS_VIEW_ALL)
  }

  return searchParams
}

function buildShareUrl(pathname: string, search: string, hash: string): string | null {
  if (typeof window === 'undefined') {
    return null
  }

  const url = new URL(window.location.href)
  url.hash = `#${pathname}${search}${hash}`

  return url.toString()
}

function buildIllustrationAlt(illustration: ChampionIllustration, locale: 'zh-CN' | 'en-US') {
  const championName = getPrimaryLocalizedText(illustration.championName, locale)
  const illustrationName = getPrimaryLocalizedText(illustration.illustrationName, locale)

  if (illustration.kind === 'hero-base') {
    return locale === 'zh-CN' ? `${championName}本体立绘` : `${championName} base illustration`
  }

  return locale === 'zh-CN'
    ? `${championName}${illustrationName}皮肤立绘`
    : `${championName} ${illustrationName} skin illustration`
}

function buildKindLabel(kind: ChampionIllustrationKind, locale: 'zh-CN' | 'en-US') {
  if (kind === 'hero-base') {
    return locale === 'zh-CN' ? '英雄本体' : 'Hero base'
  }

  return locale === 'zh-CN' ? '皮肤立绘' : 'Skin illustration'
}

function buildViewFilterLabel(view: ViewFilter, locale: 'zh-CN' | 'en-US') {
  if (view === 'all') {
    return locale === 'zh-CN' ? '全部' : 'All'
  }

  return buildKindLabel(view, locale)
}

function buildSourceSlotLabel(slot: ChampionIllustration['sourceSlot'], locale: 'zh-CN' | 'en-US') {
  if (slot === 'large') {
    return locale === 'zh-CN' ? '来源 large 槽位' : 'Source: large slot'
  }

  if (slot === 'xl') {
    return locale === 'zh-CN' ? '来源 xl 槽位' : 'Source: xl slot'
  }

  return locale === 'zh-CN' ? '来源 base 槽位' : 'Source: base slot'
}

export function IllustrationsPage() {
  const location = useLocation()
  const [, setSearchParams] = useSearchParams()
  const initialSearchParams = useMemo(() => new URLSearchParams(location.search), [location.search])
  const initialIdentityFiltersExpanded =
    readStringValues(initialSearchParams, SEARCH_PARAM_RACE).length > 0 ||
    readStringValues(initialSearchParams, SEARCH_PARAM_GENDER).length > 0 ||
    readStringValues(initialSearchParams, SEARCH_PARAM_ALIGNMENT).length > 0
  const initialMetaFiltersExpanded =
    readStringValues(initialSearchParams, SEARCH_PARAM_PROFESSION).length > 0 ||
    readStringValues(initialSearchParams, SEARCH_PARAM_ACQUISITION).length > 0 ||
    readStringValues(initialSearchParams, SEARCH_PARAM_MECHANIC).length > 0
  const { locale, t } = useI18n()
  const [state, setState] = useState<IllustrationState>({ status: 'loading' })
  const [search, setSearch] = useState(() => readSearchValue(initialSearchParams))
  const [selectedSeats, setSelectedSeats] = useState<number[]>(() => readSeatValues(initialSearchParams))
  const [viewFilter, setViewFilter] = useState<ViewFilter>(() => readScopeValue(initialSearchParams))
  const [selectedRoles, setSelectedRoles] = useState<string[]>(() => readStringValues(initialSearchParams, SEARCH_PARAM_ROLE))
  const [selectedAffiliations, setSelectedAffiliations] = useState<string[]>(() =>
    readStringValues(initialSearchParams, SEARCH_PARAM_AFFILIATION),
  )
  const [selectedRaces, setSelectedRaces] = useState<string[]>(() => readStringValues(initialSearchParams, SEARCH_PARAM_RACE))
  const [selectedGenders, setSelectedGenders] = useState<string[]>(() =>
    readStringValues(initialSearchParams, SEARCH_PARAM_GENDER),
  )
  const [selectedAlignments, setSelectedAlignments] = useState<string[]>(() =>
    readStringValues(initialSearchParams, SEARCH_PARAM_ALIGNMENT),
  )
  const [selectedProfessions, setSelectedProfessions] = useState<string[]>(() =>
    readStringValues(initialSearchParams, SEARCH_PARAM_PROFESSION),
  )
  const [selectedAcquisitions, setSelectedAcquisitions] = useState<string[]>(() =>
    readStringValues(initialSearchParams, SEARCH_PARAM_ACQUISITION),
  )
  const [selectedMechanics, setSelectedMechanics] = useState<string[]>(() =>
    readStringValues(initialSearchParams, SEARCH_PARAM_MECHANIC),
  )
  const [isIdentityFiltersExpanded, setIdentityFiltersExpanded] = useState(() => initialIdentityFiltersExpanded)
  const [isMetaFiltersExpanded, setMetaFiltersExpanded] = useState(() => initialMetaFiltersExpanded)
  const [showAllResults, setShowAllResults] = useState(() => readShowAllResults(initialSearchParams))
  const [shareLinkState, setShareLinkState] = useState<ShareLinkState>('idle')

  useEffect(() => {
    let disposed = false

    Promise.all([
      loadCollection<ChampionIllustration>('champion-illustrations'),
      loadCollection<Champion>('champions').catch(() => EMPTY_CHAMPION_COLLECTION),
      loadCollection<unknown>('enums').catch(() => EMPTY_UNKNOWN_COLLECTION),
    ])
      .then(([illustrationCollection, championCollection, enumCollection]) => {
        if (disposed) {
          return
        }

        const stringGroups = enumCollection.items.filter(isStringEnumGroup)
        const localizedGroups = enumCollection.items.filter(isLocalizedEnumGroup)
        const roles = stringGroups.find((group) => group.id === 'roles')?.values ?? []
        const affiliations = localizedGroups.find((group) => group.id === 'affiliations')?.values ?? []

        setState({
          status: 'ready',
          illustrations: illustrationCollection.items,
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
    const nextSearchParams = buildFilterSearchParams({
      search,
      scope: viewFilter,
      seats: selectedSeats,
      roles: selectedRoles,
      affiliations: selectedAffiliations,
      races: selectedRaces,
      genders: selectedGenders,
      alignments: selectedAlignments,
      professions: selectedProfessions,
      acquisitions: selectedAcquisitions,
      mechanics: selectedMechanics,
      showAllResults,
    })
    const nextSearch = nextSearchParams.toString()
    const currentSearch = new URLSearchParams(location.search).toString()

    if (nextSearch !== currentSearch) {
      setSearchParams(nextSearchParams, { replace: true })
    }
  }, [
    location.search,
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
    setSearchParams,
    showAllResults,
    viewFilter,
  ])

  useEffect(() => {
    if (shareLinkState === 'idle') {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      setShareLinkState('idle')
    }, 2200)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [shareLinkState])

  const illustrations = state.status === 'ready' ? state.illustrations : EMPTY_ILLUSTRATIONS
  const champions = state.status === 'ready' ? state.champions : EMPTY_CHAMPIONS
  const roles = state.status === 'ready' ? state.roles : EMPTY_STRING_VALUES
  const affiliations = state.status === 'ready' ? state.affiliations : EMPTY_LOCALIZED_VALUES
  const championMap = useMemo(() => new Map(champions.map((champion) => [champion.id, champion])), [champions])
  const availableChampionIds = useMemo(() => new Set(illustrations.map((illustration) => illustration.championId)), [illustrations])
  const availableChampions = useMemo(
    () => champions.filter((champion) => availableChampionIds.has(champion.id)),
    [availableChampionIds, champions],
  )
  const availableRoles = useMemo(
    () => new Set(availableChampions.flatMap((champion) => champion.roles)),
    [availableChampions],
  )
  const availableAffiliationIds = useMemo(
    () => new Set(availableChampions.flatMap((champion) => champion.affiliations.map((affiliation) => affiliation.original))),
    [availableChampions],
  )
  const illustrationEntries = useMemo<FilterableIllustration[]>(
    () =>
      illustrations.map((illustration) => ({
        illustration,
        champion: championMap.get(illustration.championId) ?? null,
      })),
    [championMap, illustrations],
  )
  const filteredIllustrationEntries = useMemo(
    () =>
      filterIllustrations(illustrationEntries, {
        search,
        seats: selectedSeats,
        kinds: viewFilter === 'all' ? [] : [viewFilter],
        roles: selectedRoles,
        affiliations: selectedAffiliations,
        races: selectedRaces,
        genders: selectedGenders,
        alignments: selectedAlignments,
        professions: selectedProfessions,
        acquisitions: selectedAcquisitions,
        mechanics: selectedMechanics,
      }),
    [
      illustrationEntries,
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
      viewFilter,
    ],
  )
  const visibleIllustrationEntries = showAllResults
    ? filteredIllustrationEntries
    : filteredIllustrationEntries.slice(0, MAX_VISIBLE_ILLUSTRATIONS)
  const roleOptions = roles.filter((role) => availableRoles.has(role))
  const affiliationOptions = affiliations.filter((affiliation) => availableAffiliationIds.has(affiliation.original))
  const raceOptions = collectAttributeFilterOptions(availableChampions, 'race', locale)
  const genderOptions = collectAttributeFilterOptions(availableChampions, 'gender', locale)
  const alignmentOptions = collectAttributeFilterOptions(availableChampions, 'alignment', locale)
  const professionOptions = collectAttributeFilterOptions(availableChampions, 'profession', locale)
  const acquisitionOptions = collectAttributeFilterOptions(availableChampions, 'acquisition', locale)
  const mechanicOptions = collectAttributeFilterOptions(availableChampions, 'mechanics', locale)
  const mechanicOptionGroups = groupMechanicOptions(mechanicOptions)
  const trimmedSearch = search.trim()
  const totalHeroCount = illustrations.filter((illustration) => illustration.kind === 'hero-base').length
  const totalSkinCount = illustrations.length - totalHeroCount
  const filteredHeroCount = filteredIllustrationEntries.filter(
    ({ illustration }) => illustration.kind === 'hero-base',
  ).length
  const filteredSkinCount = filteredIllustrationEntries.length - filteredHeroCount
  const hasActiveFilters =
    trimmedSearch.length > 0 ||
    viewFilter !== 'all' ||
    selectedSeats.length > 0 ||
    selectedRoles.length > 0 ||
    selectedAffiliations.length > 0 ||
    selectedRaces.length > 0 ||
    selectedGenders.length > 0 ||
    selectedAlignments.length > 0 ||
    selectedProfessions.length > 0 ||
    selectedAcquisitions.length > 0 ||
    selectedMechanics.length > 0
  const canToggleResultVisibility = filteredIllustrationEntries.length > MAX_VISIBLE_ILLUSTRATIONS
  const orderedSelectedSeats = seatOptions.filter((seat) => selectedSeats.includes(seat))
  const orderedSelectedRoles = roleOptions.filter((role) => selectedRoles.includes(role))
  const orderedSelectedAffiliations = affiliations.filter((affiliation) => selectedAffiliations.includes(affiliation.original))
  const orderedSelectedRaces = raceOptions.filter((race) => selectedRaces.includes(race))
  const orderedSelectedGenders = genderOptions.filter((gender) => selectedGenders.includes(gender))
  const orderedSelectedAlignments = alignmentOptions.filter((alignment) => selectedAlignments.includes(alignment))
  const orderedSelectedProfessions = professionOptions.filter((profession) => selectedProfessions.includes(profession))
  const orderedSelectedAcquisitions = acquisitionOptions.filter((acquisition) => selectedAcquisitions.includes(acquisition))
  const orderedSelectedMechanics = mechanicOptions.filter((mechanic) => selectedMechanics.includes(mechanic))
  const identityFiltersSelectedCount = selectedRaces.length + selectedGenders.length + selectedAlignments.length
  const metaFiltersSelectedCount = selectedProfessions.length + selectedAcquisitions.length + selectedMechanics.length
  const shareButtonLabel =
    shareLinkState === 'success'
      ? t({ zh: '已复制链接', en: 'Link copied' })
      : shareLinkState === 'error'
        ? t({ zh: '复制失败', en: 'Copy failed' })
        : t({ zh: '复制当前链接', en: 'Copy current link' })
  const shareStatusMessage =
    shareLinkState === 'success'
      ? t({ zh: '当前筛选链接已复制到剪贴板。', en: 'The current filter link has been copied to the clipboard.' })
      : shareLinkState === 'error'
        ? t({
            zh: '当前环境暂时不能复制链接，请稍后重试。',
            en: 'This environment cannot copy the link right now. Please try again later.',
          })
        : ''

  function runFilterMutation(mutation: () => void) {
    setShowAllResults(false)
    mutation()
  }

  function clearAllFilters() {
    runFilterMutation(() => {
      setSearch('')
      setViewFilter('all')
      setSelectedSeats([])
      setSelectedRoles([])
      setSelectedAffiliations([])
      setSelectedRaces([])
      setSelectedGenders([])
      setSelectedAlignments([])
      setSelectedProfessions([])
      setSelectedAcquisitions([])
      setSelectedMechanics([])
    })
  }

  function clearActiveFilterChip(id: ActiveFilterChip['id']) {
    switch (id) {
      case 'search':
        runFilterMutation(() => setSearch(''))
        return
      case 'view':
        runFilterMutation(() => setViewFilter('all'))
        return
      case 'seats':
        runFilterMutation(() => setSelectedSeats([]))
        return
      case 'roles':
        runFilterMutation(() => setSelectedRoles([]))
        return
      case 'affiliations':
        runFilterMutation(() => setSelectedAffiliations([]))
        return
      case 'races':
        runFilterMutation(() => setSelectedRaces([]))
        return
      case 'genders':
        runFilterMutation(() => setSelectedGenders([]))
        return
      case 'alignments':
        runFilterMutation(() => setSelectedAlignments([]))
        return
      case 'professions':
        runFilterMutation(() => setSelectedProfessions([]))
        return
      case 'acquisitions':
        runFilterMutation(() => setSelectedAcquisitions([]))
        return
      case 'mechanics':
        runFilterMutation(() => setSelectedMechanics([]))
        return
      default:
        return
    }
  }

  async function copyCurrentLink() {
    const shareUrl = buildShareUrl(location.pathname, location.search, location.hash)

    if (!shareUrl || typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      setShareLinkState('error')
      return
    }

    try {
      await navigator.clipboard.writeText(shareUrl)
      setShareLinkState('success')
    } catch {
      setShareLinkState('error')
    }
  }

  const activeFilterChips = [
    trimmedSearch
      ? {
          id: 'search',
          label: t({ zh: `关键词：${trimmedSearch}`, en: `Keyword: ${trimmedSearch}` }),
          clearLabel: t({ zh: `清空关键词：${trimmedSearch}`, en: `Clear keyword: ${trimmedSearch}` }),
        }
      : null,
    viewFilter !== 'all'
      ? {
          id: 'view',
          label: t({
            zh: `范围：${buildViewFilterLabel(viewFilter, locale)}`,
            en: `Scope: ${buildViewFilterLabel(viewFilter, locale)}`,
          }),
          clearLabel: t({
            zh: `清空范围筛选：${buildViewFilterLabel(viewFilter, locale)}`,
            en: `Clear scope filter: ${buildViewFilterLabel(viewFilter, locale)}`,
          }),
        }
      : null,
    orderedSelectedSeats.length > 0
      ? {
          id: 'seats',
          label: t({
            zh: `座位：${orderedSelectedSeats.map((seat) => formatSeatLabel(seat, locale)).join(' / ')}`,
            en: `Seat: ${orderedSelectedSeats.map((seat) => formatSeatLabel(seat, locale)).join(' / ')}`,
          }),
          clearLabel: t({ zh: '清空座位筛选', en: 'Clear seat filter' }),
        }
      : null,
    orderedSelectedRoles.length > 0
      ? {
          id: 'roles',
          label: t({
            zh: `定位：${orderedSelectedRoles.map((role) => getRoleLabel(role, locale)).join(' / ')}`,
            en: `Role: ${orderedSelectedRoles.map((role) => getRoleLabel(role, locale)).join(' / ')}`,
          }),
          clearLabel: t({ zh: '清空定位筛选', en: 'Clear role filter' }),
        }
      : null,
    orderedSelectedAffiliations.length > 0
      ? {
          id: 'affiliations',
          label: t({
            zh: `联动队伍：${orderedSelectedAffiliations
              .map((affiliation) => getPrimaryLocalizedText(affiliation, locale))
              .join(' / ')}`,
            en: `Affiliation: ${orderedSelectedAffiliations
              .map((affiliation) => getPrimaryLocalizedText(affiliation, locale))
              .join(' / ')}`,
          }),
          clearLabel: t({ zh: '清空联动队伍筛选', en: 'Clear affiliation filter' }),
        }
      : null,
    orderedSelectedRaces.length > 0
      ? {
          id: 'races',
          label: t({
            zh: `种族：${orderedSelectedRaces.map((race) => getChampionTagLabel(race, locale)).join(' / ')}`,
            en: `Race: ${orderedSelectedRaces.map((race) => getChampionTagLabel(race, locale)).join(' / ')}`,
          }),
          clearLabel: t({ zh: '清空种族筛选', en: 'Clear race filter' }),
        }
      : null,
    orderedSelectedGenders.length > 0
      ? {
          id: 'genders',
          label: t({
            zh: `性别：${orderedSelectedGenders.map((gender) => getChampionTagLabel(gender, locale)).join(' / ')}`,
            en: `Gender: ${orderedSelectedGenders.map((gender) => getChampionTagLabel(gender, locale)).join(' / ')}`,
          }),
          clearLabel: t({ zh: '清空性别筛选', en: 'Clear gender filter' }),
        }
      : null,
    orderedSelectedAlignments.length > 0
      ? {
          id: 'alignments',
          label: t({
            zh: `阵营：${orderedSelectedAlignments
              .map((alignment) => getChampionTagLabel(alignment, locale))
              .join(' / ')}`,
            en: `Alignment: ${orderedSelectedAlignments
              .map((alignment) => getChampionTagLabel(alignment, locale))
              .join(' / ')}`,
          }),
          clearLabel: t({ zh: '清空阵营筛选', en: 'Clear alignment filter' }),
        }
      : null,
    orderedSelectedProfessions.length > 0
      ? {
          id: 'professions',
          label: t({
            zh: `职业：${orderedSelectedProfessions
              .map((profession) => getChampionTagLabel(profession, locale))
              .join(' / ')}`,
            en: `Profession: ${orderedSelectedProfessions
              .map((profession) => getChampionTagLabel(profession, locale))
              .join(' / ')}`,
          }),
          clearLabel: t({ zh: '清空职业筛选', en: 'Clear profession filter' }),
        }
      : null,
    orderedSelectedAcquisitions.length > 0
      ? {
          id: 'acquisitions',
          label: t({
            zh: `获取方式：${orderedSelectedAcquisitions
              .map((acquisition) => getChampionTagLabel(acquisition, locale))
              .join(' / ')}`,
            en: `Availability: ${orderedSelectedAcquisitions
              .map((acquisition) => getChampionTagLabel(acquisition, locale))
              .join(' / ')}`,
          }),
          clearLabel: t({ zh: '清空获取方式筛选', en: 'Clear availability filter' }),
        }
      : null,
    orderedSelectedMechanics.length > 0
      ? {
          id: 'mechanics',
          label: t({
            zh: `机制：${orderedSelectedMechanics
              .map((mechanic) => getChampionTagLabel(mechanic, locale))
              .join(' / ')}`,
            en: `Mechanics: ${orderedSelectedMechanics
              .map((mechanic) => getChampionTagLabel(mechanic, locale))
              .join(' / ')}`,
          }),
          clearLabel: t({ zh: '清空机制筛选', en: 'Clear mechanics filter' }),
        }
      : null,
  ].filter((chip): chip is ActiveFilterChip => chip !== null)
  const activeFilters = activeFilterChips.map((chip) => chip.label)

  return (
    <div className="page-shell illustrations-page">
      <SurfaceCard
        eyebrow={t({ zh: '本地静态资源', en: 'Local static assets' })}
        title={t({ zh: '英雄立绘页', en: 'Champion illustrations' })}
        description={t({
          zh: '本页只消费站内版本化立绘资源，不依赖浏览器运行时跨域抓官方图片。现在会先按筛选结果展示一批卡片，再由你决定是否继续展开全部。',
          en: 'This page only consumes versioned local illustration assets, avoids runtime cross-origin image fetches, and now starts with a focused batch before you decide whether to reveal the full catalog.',
        })}
        footer={
          <div className="illustrations-page__summary">
            <span>{t({ zh: `共 ${illustrations.length} 张立绘`, en: `${illustrations.length} illustrations` })}</span>
            <span>{t({ zh: `${totalHeroCount} 张本体`, en: `${totalHeroCount} hero base` })}</span>
            <span>{t({ zh: `${totalSkinCount} 张皮肤`, en: `${totalSkinCount} skins` })}</span>
          </div>
        }
      >
        {state.status === 'loading' ? (
          <StatusBanner
            tone="info"
            title={t({ zh: '正在加载立绘目录', en: 'Loading illustration catalog' })}
            detail={t({
              zh: '正在读取本地版本化立绘清单与英雄筛选元数据。',
              en: 'Reading the local illustration manifest and champion filter metadata.',
            })}
          />
        ) : null}

        {state.status === 'error' ? (
          <StatusBanner
            tone="error"
            title={t({ zh: '立绘目录加载失败', en: 'Failed to load illustration catalog' })}
            detail={
              state.message
                ? t({
                    zh: `无法读取立绘目录数据：${state.message}`,
                    en: `Unable to read illustration catalog data: ${state.message}`,
                  })
                : t({
                    zh: '无法读取立绘目录数据。',
                    en: 'Unable to read illustration catalog data.',
                  })
            }
          />
        ) : null}

        {state.status === 'ready' ? (
          <>
            <div className="metric-grid">
              <article className="metric-card">
                <span className="metric-card__label">{t({ zh: '立绘总数', en: 'Illustrations' })}</span>
                <strong className="metric-card__value">{illustrations.length}</strong>
              </article>
              <article className="metric-card">
                <span className="metric-card__label">{t({ zh: '当前匹配', en: 'Matches' })}</span>
                <strong className="metric-card__value">{filteredIllustrationEntries.length}</strong>
              </article>
              <article className="metric-card">
                <span className="metric-card__label">{t({ zh: '英雄本体', en: 'Hero base' })}</span>
                <strong className="metric-card__value">{totalHeroCount}</strong>
              </article>
              <article className="metric-card">
                <span className="metric-card__label">{t({ zh: '皮肤立绘', en: 'Skin art' })}</span>
                <strong className="metric-card__value">{totalSkinCount}</strong>
              </article>
            </div>

            <section className="champions-sidebar__surface illustrations-page__filter-surface">
              <div className="champions-sidebar__header">
                <div>
                  <h2 className="section-heading champions-sidebar__title">
                    {t({ zh: '立绘筛选', en: 'Illustration filters' })}
                  </h2>
                  <p className="champions-sidebar__hint">
                    {t({
                      zh: '沿用英雄筛选页的主线：先用高频条件迅速缩小范围，再按需展开低频标签条件，避免一上来把整页立绘全砸出来。',
                      en: 'This follows the champion filter flow: use the frequent controls first, then open the lower-frequency tag groups only when you need them.',
                    })}
                  </p>
                </div>
                <div className="champions-sidebar__status" role="group" aria-label={t({ zh: '筛选状态操作', en: 'Filter status actions' })}>
                  <span className="champions-sidebar__badge">
                    {activeFilterChips.length > 0
                      ? t({ zh: `${activeFilterChips.length} 项已启用`, en: `${activeFilterChips.length} active` })
                      : t({ zh: '未启用', en: 'Idle' })}
                  </span>
                  <button
                    type="button"
                    className={
                      shareLinkState === 'success'
                        ? 'action-button action-button--ghost action-button--compact action-button--toggled'
                        : 'action-button action-button--ghost action-button--compact'
                    }
                    onClick={() => {
                      void copyCurrentLink()
                    }}
                  >
                    {shareButtonLabel}
                  </button>
                  {hasActiveFilters ? (
                    <button
                      type="button"
                      className="action-button action-button--secondary action-button--compact"
                      onClick={clearAllFilters}
                    >
                      {t({ zh: '清空全部', en: 'Clear all' })}
                    </button>
                  ) : null}
                  <span className="illustrations-page__share-status" role="status" aria-live="polite">
                    {shareStatusMessage}
                  </span>
                </div>
              </div>

              <p className="champions-sidebar__microcopy">
                {t({
                  zh: '默认只渲染前一批结果卡片；只要你继续点“显示全部”，剩余立绘才会进入页面并触发图片加载。',
                  en: 'Only the first batch of result cards is rendered by default; the remaining illustrations stay out of the DOM until you ask to reveal everything.',
                })}
              </p>

              {activeFilterChips.length > 0 ? (
                <div className="active-filter-bar active-filter-bar--sidebar">
                  <div className="active-filter-bar__header">
                    <div className="active-filter-bar__copy">
                      <strong className="active-filter-bar__title">{t({ zh: '已选条件', en: 'Selected filters' })}</strong>
                      <p className="active-filter-bar__hint">
                        {t({
                          zh: '点击任一条件即可单独回退对应维度；全量回退统一使用右上角的清空全部。',
                          en: 'Click any chip to clear that dimension only, then use the reset action for a full rollback.',
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="active-filter-bar__chips">
                    {activeFilterChips.map((chip) => (
                      <button
                        key={chip.id}
                        type="button"
                        className="active-filter-chip"
                        aria-label={chip.clearLabel}
                        onClick={() => clearActiveFilterChip(chip.id)}
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

              <div className="champions-sidebar__section-label">{t({ zh: '高频条件', en: 'Frequent filters' })}</div>

              <div className="filter-panel filter-panel--sidebar">
                <FieldGroup
                  label={t({ zh: '关键词', en: 'Keyword' })}
                  hint={t({
                    zh: '支持中英混搜，也会匹配皮肤名、联动队伍、角色标签和资源 graphic id。',
                    en: 'Chinese and English queries both work here, and the search also covers skin names, affiliations, tags, and graphic ids.',
                  })}
                  as="label"
                >
                  <input
                    className="text-input"
                    type="search"
                    value={search}
                    placeholder={t({
                      zh: '搜英雄名、皮肤名、标签或联动队伍',
                      en: 'Search names, skins, tags, or affiliations',
                    })}
                    onChange={(event) => {
                      runFilterMutation(() => {
                        setSearch(event.target.value)
                      })
                    }}
                  />
                </FieldGroup>

                <FieldGroup
                  label={t({ zh: '范围', en: 'Scope' })}
                  hint={t({
                    zh: '本体与皮肤可以直接切开，先缩短图片瀑布流再细筛。',
                    en: 'Split hero art from skins first when you want to shorten the image stream before filtering deeper.',
                  })}
                  className="filter-group"
                >
                  <div className="segmented-control" role="group" aria-label={t({ zh: '立绘范围', en: 'Illustration scope' })}>
                    {[
                      ['all', t({ zh: '全部', en: 'All' })],
                      ['hero-base', t({ zh: '本体', en: 'Heroes' })],
                      ['skin', t({ zh: '皮肤', en: 'Skins' })],
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        className={viewFilter === value ? 'segmented-control__button segmented-control__button--active' : 'segmented-control__button'}
                        aria-pressed={viewFilter === value}
                        onClick={() =>
                          runFilterMutation(() => {
                            setViewFilter(value as ViewFilter)
                          })
                        }
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </FieldGroup>

                <FieldGroup
                  label={t({ zh: '座位', en: 'Seat' })}
                  hint={t({
                    zh: '支持多选；同一维度内按“或”匹配。',
                    en: 'Multi-select is supported, and matches within this group use OR.',
                  })}
                  className="filter-group"
                >
                  <div className="filter-chip-grid">
                    <button
                      type="button"
                      className={selectedSeats.length === 0 ? 'filter-chip filter-chip--active' : 'filter-chip'}
                      aria-pressed={selectedSeats.length === 0}
                      onClick={() => runFilterMutation(() => setSelectedSeats([]))}
                    >
                      {t({ zh: '全部', en: 'All' })}
                    </button>
                    {seatOptions.map((seat) => (
                      <button
                        key={seat}
                        type="button"
                        className={selectedSeats.includes(seat) ? 'filter-chip filter-chip--active' : 'filter-chip'}
                        aria-pressed={selectedSeats.includes(seat)}
                        onClick={() =>
                          runFilterMutation(() => {
                            setSelectedSeats((current) => toggleFilterValue(current, seat))
                          })
                        }
                      >
                        {formatSeatLabel(seat, locale)}
                      </button>
                    ))}
                  </div>
                </FieldGroup>

                <FieldGroup
                  label={t({ zh: '定位', en: 'Role' })}
                  hint={t({
                    zh: '按所属英雄的定位过滤，适合先把立绘缩到输出、辅助或坦克线。',
                    en: 'Filter by the owning champion roles when you want to stay inside DPS, support, or tank lines first.',
                  })}
                  className="filter-group"
                >
                  <div className="filter-chip-grid">
                    <button
                      type="button"
                      className={selectedRoles.length === 0 ? 'filter-chip filter-chip--active' : 'filter-chip'}
                      aria-pressed={selectedRoles.length === 0}
                      onClick={() => runFilterMutation(() => setSelectedRoles([]))}
                    >
                      {t({ zh: '全部', en: 'All' })}
                    </button>
                    {roleOptions.map((role) => (
                      <button
                        key={role}
                        type="button"
                        className={selectedRoles.includes(role) ? 'filter-chip filter-chip--active' : 'filter-chip'}
                        aria-pressed={selectedRoles.includes(role)}
                        onClick={() =>
                          runFilterMutation(() => {
                            setSelectedRoles((current) => toggleFilterValue(current, role))
                          })
                        }
                      >
                        {getRoleLabel(role, locale)}
                      </button>
                    ))}
                  </div>
                </FieldGroup>

                <FieldGroup
                  label={t({ zh: '联动队伍', en: 'Affiliation' })}
                  hint={t({
                    zh: '仍然按英雄元数据多选过滤，方便快速切到固定队伍的皮肤资产。',
                    en: 'The affiliation filter still works off champion metadata, which is handy for browsing one team’s skins together.',
                  })}
                  className="filter-group"
                >
                  <div className="filter-chip-grid">
                    <button
                      type="button"
                      className={selectedAffiliations.length === 0 ? 'filter-chip filter-chip--active' : 'filter-chip'}
                      aria-pressed={selectedAffiliations.length === 0}
                      onClick={() => runFilterMutation(() => setSelectedAffiliations([]))}
                    >
                      {t({ zh: '全部', en: 'All' })}
                    </button>
                    {affiliationOptions.map((affiliation) => (
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
                          runFilterMutation(() => {
                            setSelectedAffiliations((current) => toggleFilterValue(current, affiliation.original))
                          })
                        }
                      >
                        {getPrimaryLocalizedText(affiliation, locale)}
                      </button>
                    ))}
                  </div>
                </FieldGroup>
              </div>

              <div className="champions-sidebar__section-label champions-sidebar__section-label--subtle">
                {t({ zh: '补充筛选', en: 'Additional filters' })}
              </div>

              <div className="filter-disclosure-stack">
                <FilterDisclosureSection
                  title={t({ zh: '身份画像', en: 'Identity' })}
                  summary={t({ zh: '种族 / 性别 / 阵营', en: 'Race / gender / alignment' })}
                  status={
                    identityFiltersSelectedCount > 0
                      ? t({ zh: `已选 ${identityFiltersSelectedCount}`, en: `${identityFiltersSelectedCount} selected` })
                      : t({ zh: '默认收起', en: 'Folded' })
                  }
                  isExpanded={isIdentityFiltersExpanded}
                  onToggle={() => setIdentityFiltersExpanded((current) => !current)}
                >
                  <div className="filter-panel filter-panel--nested">
                    <FieldGroup
                      label={getChampionAttributeGroupLabel('race', locale)}
                      hint={t({
                        zh: '支持多选；适合快速收窄到特定种族英雄的全部立绘。',
                        en: 'Multi-select is supported for quickly narrowing down to a specific race’s artwork.',
                      })}
                      className="filter-group"
                    >
                      <div className="filter-chip-grid">
                        <button
                          type="button"
                          className={selectedRaces.length === 0 ? 'filter-chip filter-chip--active' : 'filter-chip'}
                          aria-pressed={selectedRaces.length === 0}
                          onClick={() => runFilterMutation(() => setSelectedRaces([]))}
                        >
                          {t({ zh: '全部', en: 'All' })}
                        </button>
                        {raceOptions.map((race) => (
                          <button
                            key={race}
                            type="button"
                            className={selectedRaces.includes(race) ? 'filter-chip filter-chip--active' : 'filter-chip'}
                            aria-pressed={selectedRaces.includes(race)}
                            onClick={() =>
                              runFilterMutation(() => {
                                setSelectedRaces((current) => toggleFilterValue(current, race))
                              })
                            }
                          >
                            {getChampionTagLabel(race, locale)}
                          </button>
                        ))}
                      </div>
                    </FieldGroup>

                    <FieldGroup
                      label={getChampionAttributeGroupLabel('gender', locale)}
                      hint={t({
                        zh: '支持多选；用英雄元数据交叉过滤皮肤池。',
                        en: 'Multi-select is supported for intersecting the skin pool with champion metadata.',
                      })}
                      className="filter-group"
                    >
                      <div className="filter-chip-grid">
                        <button
                          type="button"
                          className={selectedGenders.length === 0 ? 'filter-chip filter-chip--active' : 'filter-chip'}
                          aria-pressed={selectedGenders.length === 0}
                          onClick={() => runFilterMutation(() => setSelectedGenders([]))}
                        >
                          {t({ zh: '全部', en: 'All' })}
                        </button>
                        {genderOptions.map((gender) => (
                          <button
                            key={gender}
                            type="button"
                            className={selectedGenders.includes(gender) ? 'filter-chip filter-chip--active' : 'filter-chip'}
                            aria-pressed={selectedGenders.includes(gender)}
                            onClick={() =>
                              runFilterMutation(() => {
                                setSelectedGenders((current) => toggleFilterValue(current, gender))
                              })
                            }
                          >
                            {getChampionTagLabel(gender, locale)}
                          </button>
                        ))}
                      </div>
                    </FieldGroup>

                    <FieldGroup
                      label={getChampionAttributeGroupLabel('alignment', locale)}
                      hint={t({
                        zh: '支持多选；适合快速抽出守序、混乱或善恶阵营相关的立绘集合。',
                        en: 'Multi-select is supported for gathering lawful, chaotic, or moral alignment slices.',
                      })}
                      className="filter-group"
                    >
                      <div className="filter-chip-grid">
                        <button
                          type="button"
                          className={selectedAlignments.length === 0 ? 'filter-chip filter-chip--active' : 'filter-chip'}
                          aria-pressed={selectedAlignments.length === 0}
                          onClick={() => runFilterMutation(() => setSelectedAlignments([]))}
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
                            onClick={() =>
                              runFilterMutation(() => {
                                setSelectedAlignments((current) => toggleFilterValue(current, alignment))
                              })
                            }
                          >
                            {getChampionTagLabel(alignment, locale)}
                          </button>
                        ))}
                      </div>
                    </FieldGroup>
                  </div>
                </FilterDisclosureSection>

                <FilterDisclosureSection
                  title={t({ zh: '玩法标签', en: 'Gameplay tags' })}
                  summary={t({ zh: '职业 / 获取方式 / 特殊机制', en: 'Profession / availability / mechanics' })}
                  status={
                    metaFiltersSelectedCount > 0
                      ? t({ zh: `已选 ${metaFiltersSelectedCount}`, en: `${metaFiltersSelectedCount} selected` })
                      : t({ zh: '默认收起', en: 'Folded' })
                  }
                  isExpanded={isMetaFiltersExpanded}
                  onToggle={() => setMetaFiltersExpanded((current) => !current)}
                >
                  <div className="filter-panel filter-panel--nested">
                    <FieldGroup
                      label={getChampionAttributeGroupLabel('profession', locale)}
                      hint={t({
                        zh: '支持多选；适合快速看同职业英雄在立绘上的风格分布。',
                        en: 'Multi-select is supported for browsing how one class spreads across the art catalog.',
                      })}
                      className="filter-group"
                    >
                      <div className="filter-chip-grid">
                        <button
                          type="button"
                          className={selectedProfessions.length === 0 ? 'filter-chip filter-chip--active' : 'filter-chip'}
                          aria-pressed={selectedProfessions.length === 0}
                          onClick={() => runFilterMutation(() => setSelectedProfessions([]))}
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
                            onClick={() =>
                              runFilterMutation(() => {
                                setSelectedProfessions((current) => toggleFilterValue(current, profession))
                              })
                            }
                          >
                            {getChampionTagLabel(profession, locale)}
                          </button>
                        ))}
                      </div>
                    </FieldGroup>

                    <FieldGroup
                      label={getChampionAttributeGroupLabel('acquisition', locale)}
                      hint={t({
                        zh: '支持多选；区分核心、常驻、活动或 Tales 等来源时会更顺手。',
                        en: 'Multi-select is supported when you want to separate core, evergreen, event, or Tales sources.',
                      })}
                      className="filter-group"
                    >
                      <div className="filter-chip-grid">
                        <button
                          type="button"
                          className={selectedAcquisitions.length === 0 ? 'filter-chip filter-chip--active' : 'filter-chip'}
                          aria-pressed={selectedAcquisitions.length === 0}
                          onClick={() => runFilterMutation(() => setSelectedAcquisitions([]))}
                        >
                          {t({ zh: '全部', en: 'All' })}
                        </button>
                        {acquisitionOptions.map((acquisition) => (
                          <button
                            key={acquisition}
                            type="button"
                            className={
                              selectedAcquisitions.includes(acquisition)
                                ? 'filter-chip filter-chip--active'
                                : 'filter-chip'
                            }
                            aria-pressed={selectedAcquisitions.includes(acquisition)}
                            onClick={() =>
                              runFilterMutation(() => {
                                setSelectedAcquisitions((current) => toggleFilterValue(current, acquisition))
                              })
                            }
                          >
                            {getChampionTagLabel(acquisition, locale)}
                          </button>
                        ))}
                      </div>
                    </FieldGroup>

                    <FieldGroup
                      label={getChampionAttributeGroupLabel('mechanics', locale)}
                      hint={t({
                        zh: '这里保留会直接影响阵型取舍的玩法标签，方便看某类特化英雄的全部形象资源。',
                        en: 'These are the mechanics that most directly affect formation choices, which makes them useful for slicing the art catalog too.',
                      })}
                      className="filter-group"
                    >
                      <div className="filter-chip-grid">
                        <button
                          type="button"
                          className={selectedMechanics.length === 0 ? 'filter-chip filter-chip--active' : 'filter-chip'}
                          aria-pressed={selectedMechanics.length === 0}
                          onClick={() => runFilterMutation(() => setSelectedMechanics([]))}
                        >
                          {t({ zh: '全部', en: 'All' })}
                        </button>
                      </div>

                      <div className="filter-subgroup-stack">
                        {mechanicOptionGroups.map((group) => (
                          <section key={group.id} className="filter-subgroup">
                            <div className="filter-subgroup__header">
                              <strong className="filter-subgroup__title">
                                {getChampionMechanicCategoryLabel(group.id, locale)}
                              </strong>
                              <p className="filter-subgroup__hint">
                                {group.id === 'positional'
                                  ? t({
                                      zh: '前后排、相邻位或固定站位会直接影响这类英雄的发挥。',
                                      en: 'These champions care about adjacency, rows, or specific formation slots.',
                                    })
                                  : group.id === 'control'
                                    ? t({
                                        zh: '会直接施加眩晕、减速、击退、定身或位移等控制效果。',
                                        en: 'These champions directly apply effects like stun, slow, knockback, root, or repositioning.',
                                      })
                                    : t({
                                        zh: '专精分支会偏向金币、速度、减益或特定敌人猎杀。',
                                        en: 'Their specialization paths lean toward gold, speed, debuffs, or hunting certain enemy types.',
                                      })}
                              </p>
                            </div>

                            <div className="filter-chip-grid">
                              {group.options.map((mechanic) => (
                                <button
                                  key={mechanic}
                                  type="button"
                                  className={
                                    selectedMechanics.includes(mechanic) ? 'filter-chip filter-chip--active' : 'filter-chip'
                                  }
                                  aria-pressed={selectedMechanics.includes(mechanic)}
                                  onClick={() =>
                                    runFilterMutation(() => {
                                      setSelectedMechanics((current) => toggleFilterValue(current, mechanic))
                                    })
                                  }
                                >
                                  {getChampionTagLabel(mechanic, locale)}
                                </button>
                              ))}
                            </div>
                          </section>
                        ))}
                      </div>
                    </FieldGroup>
                  </div>
                </FilterDisclosureSection>
              </div>
            </section>

            <section className="results-panel" aria-label={t({ zh: '立绘筛选结果', en: 'Illustration filter results' })}>
              <div className="results-panel__meta">
                <p
                  className={activeFilters.length > 0 ? 'supporting-text' : 'supporting-text supporting-text--placeholder'}
                  aria-hidden={activeFilters.length === 0}
                >
                  {activeFilters.length > 0
                    ? `${t({ zh: '当前筛选：', en: 'Active filters: ' })}${activeFilters.join(' · ')}`
                    : t({ zh: '当前筛选：', en: 'Active filters: ' })}
                </p>

                <p className="supporting-text">
                  {filteredIllustrationEntries.length > 0
                    ? t({
                        zh: `当前展示 ${visibleIllustrationEntries.length} / ${filteredIllustrationEntries.length} 张立绘（${filteredHeroCount} 张本体 / ${filteredSkinCount} 张皮肤）。若列表仍偏大，优先加关键词、范围、座位、定位、联动队伍或标签缩小范围。`,
                        en: `Showing ${visibleIllustrationEntries.length} / ${filteredIllustrationEntries.length} illustrations (${filteredHeroCount} hero base / ${filteredSkinCount} skins). If the list still feels broad, narrow it with a keyword, scope, seat, role, affiliation, or tags.`,
                      })
                    : t({
                        zh: '当前筛选条件下没有匹配立绘。可以直接点上方已选条件逐项回退，或用清空全部重新开始。',
                        en: 'No illustrations match this filter set yet. Roll chips back one by one, or reset everything to start over.',
                      })}
                </p>

                {filteredIllustrationEntries.length > 0 ? (
                  <div className="results-panel__actions">
                    <span className="results-summary-pill">
                      {canToggleResultVisibility
                        ? showAllResults
                          ? t({
                              zh: `已展开全部 ${filteredIllustrationEntries.length} 张立绘`,
                              en: `Showing all ${filteredIllustrationEntries.length} illustrations`,
                            })
                          : t({
                              zh: `默认先展示 ${MAX_VISIBLE_ILLUSTRATIONS} 张立绘`,
                              en: `Defaulting to the first ${MAX_VISIBLE_ILLUSTRATIONS} illustrations`,
                            })
                        : t({
                            zh: '当前结果已全部展开',
                            en: 'The current result set is already fully visible',
                          })}
                    </span>

                    {canToggleResultVisibility ? (
                      <button
                        type="button"
                        className="results-visibility-toggle"
                        onClick={() => setShowAllResults((current) => !current)}
                      >
                        {showAllResults
                          ? t({
                              zh: `收起到默认 ${MAX_VISIBLE_ILLUSTRATIONS} 张`,
                              en: `Collapse back to ${MAX_VISIBLE_ILLUSTRATIONS}`,
                            })
                          : t({
                              zh: `显示全部 ${filteredIllustrationEntries.length} 张`,
                              en: `Show all ${filteredIllustrationEntries.length}`,
                            })}
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>

              {filteredIllustrationEntries.length > 0 ? (
                <>
                  <div className="illustrations-grid" aria-label={t({ zh: '立绘结果', en: 'Illustration results' })}>
                    {visibleIllustrationEntries.map(({ illustration, champion }) => {
                      const championPrimaryName = getPrimaryLocalizedText(illustration.championName, locale)
                      const championSecondaryName = getSecondaryLocalizedText(illustration.championName, locale)
                      const illustrationPrimaryName = getPrimaryLocalizedText(illustration.illustrationName, locale)
                      const illustrationSecondaryName = getSecondaryLocalizedText(illustration.illustrationName, locale)

                      return (
                        <article key={illustration.id} className="illustration-card">
                          <div className="illustration-card__image-shell">
                            <img
                              className="illustration-card__image"
                              src={resolveDataUrl(illustration.image.path)}
                              alt={buildIllustrationAlt(illustration, locale)}
                              loading="lazy"
                              width={illustration.image.width}
                              height={illustration.image.height}
                            />
                          </div>

                          <div className="illustration-card__body">
                            <div className="illustration-card__meta-row">
                              <span className="illustration-card__kind">{buildKindLabel(illustration.kind, locale)}</span>
                              <span className="illustration-card__seat">{formatSeatLabel(illustration.seat, locale)}</span>
                            </div>

                            <h3 className="illustration-card__title">{illustrationPrimaryName}</h3>
                            {illustrationSecondaryName ? (
                              <p className="illustration-card__secondary">{illustrationSecondaryName}</p>
                            ) : null}

                            <p className="illustration-card__champion">
                              {t({ zh: '所属英雄', en: 'Champion' })} · {championPrimaryName}
                            </p>
                            {championSecondaryName ? (
                              <p className="illustration-card__champion illustration-card__champion--muted">
                                {championSecondaryName}
                              </p>
                            ) : null}

                            {champion?.roles.length ? (
                              <div className="tag-row tag-row--tight">
                                {champion.roles.map((role) => (
                                  <span key={role} className="tag-pill tag-pill--muted">
                                    {getRoleLabel(role, locale)}
                                  </span>
                                ))}
                              </div>
                            ) : null}

                            {champion?.affiliations.length ? (
                              <p className="illustration-card__supporting">
                                {t({ zh: '联动队伍', en: 'Affiliation' })} ·{' '}
                                {champion.affiliations
                                  .map((affiliation) => getPrimaryLocalizedText(affiliation, locale))
                                  .join(' / ')}
                              </p>
                            ) : null}

                            <div className="illustration-card__facts">
                              <span>{buildSourceSlotLabel(illustration.sourceSlot, locale)}</span>
                              <span>{`graphic #${illustration.sourceGraphicId}`}</span>
                              <span>{`${illustration.image.width} × ${illustration.image.height}`}</span>
                            </div>

                            <div className="illustration-card__actions">
                              <Link className="action-button action-button--ghost" to={`/champions/${illustration.championId}`}>
                                {t({ zh: '查看英雄详情', en: 'Open champion detail' })}
                              </Link>
                            </div>
                          </div>
                        </article>
                      )
                    })}
                  </div>

                  {canToggleResultVisibility ? (
                    <div className="results-panel__tail">
                      <button
                        type="button"
                        className="results-visibility-toggle results-visibility-toggle--tail"
                        onClick={() => setShowAllResults((current) => !current)}
                      >
                        {showAllResults
                          ? t({
                              zh: `收起到默认 ${MAX_VISIBLE_ILLUSTRATIONS} 张`,
                              en: `Collapse back to ${MAX_VISIBLE_ILLUSTRATIONS}`,
                            })
                          : t({
                              zh: `继续展开剩余 ${filteredIllustrationEntries.length - MAX_VISIBLE_ILLUSTRATIONS} 张立绘`,
                              en: `Reveal the remaining ${filteredIllustrationEntries.length - MAX_VISIBLE_ILLUSTRATIONS} illustrations`,
                            })}
                      </button>
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="results-panel__empty">
                  <StatusBanner
                    tone="info"
                    title={t({ zh: '没有匹配结果', en: 'No illustrations match' })}
                    detail={t({
                      zh: '当前筛选条件下没有可展示的立绘，试试清空一两个条件或先切回更宽的范围。',
                      en: 'No illustrations match the current filters. Try clearing one or two filters, or broaden the scope first.',
                    })}
                  />
                </div>
              )}
            </section>
          </>
        ) : null}
      </SurfaceCard>
    </div>
  )
}
