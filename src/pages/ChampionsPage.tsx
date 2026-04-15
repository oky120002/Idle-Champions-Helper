import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
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
  getChampionMechanicCategoryId,
  getChampionMechanicCategoryLabel,
  getChampionTagLabel,
  getChampionTagsForGroup,
} from '../domain/championTags'
import type { ChampionMechanicCategoryId } from '../domain/championTags'
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
const SEARCH_PARAM_QUERY = 'q'
const SEARCH_PARAM_SEAT = 'seat'
const SEARCH_PARAM_ROLE = 'role'
const SEARCH_PARAM_AFFILIATION = 'affiliation'
const SEARCH_PARAM_RACE = 'race'
const SEARCH_PARAM_GENDER = 'gender'
const SEARCH_PARAM_ALIGNMENT = 'alignment'
const SEARCH_PARAM_PROFESSION = 'profession'
const SEARCH_PARAM_ACQUISITION = 'acquisition'
const SEARCH_PARAM_MECHANIC = 'mechanic'
const SEARCH_PARAM_VIEW = 'view'
const RESULTS_VIEW_ALL = 'all'
const DEFAULT_SCROLL_KEY = '__default__'
const RESULTS_HEIGHT_TRANSITION_MS = 320
const RESULTS_RELOCATE_THRESHOLD = 12
const RESULTS_SCROLL_DURATION_MS = 340
const RESULTS_QUICK_NAV_THRESHOLD = 10

type AttributeFilterGroupId = 'race' | 'gender' | 'alignment' | 'profession' | 'acquisition' | 'mechanics'
type ResultsTransitionReason = 'filters' | 'visibility'

interface ActiveFilterChip {
  id:
    | 'search'
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

interface PendingResultsTransition {
  previousFilteredCount: number
  previousVisibleCount: number
  shouldRelocate: boolean
  targetTop: number
  reason: ResultsTransitionReason
}

interface ResultsQuickNavigationState {
  isVisible: boolean
  canScrollTop: boolean
  canScrollBottom: boolean
}

interface MechanicOptionGroup {
  id: ChampionMechanicCategoryId
  options: string[]
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

function readShowAllResults(searchParams: URLSearchParams): boolean {
  return searchParams.get(SEARCH_PARAM_VIEW) === RESULTS_VIEW_ALL
}

function appendSortedStringValues(searchParams: URLSearchParams, key: string, values: string[]): void {
  values
    .slice()
    .sort((left, right) => left.localeCompare(right))
    .forEach((value) => searchParams.append(key, value))
}

function buildFilterSearchParams(filters: {
  search: string
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
    searchParams.set(SEARCH_PARAM_VIEW, RESULTS_VIEW_ALL)
  }

  return searchParams
}

function buildScrollRestoreKey(search: string): string {
  return `champions-page-scroll:${search || DEFAULT_SCROLL_KEY}`
}

function saveChampionListScroll(search: string): void {
  if (typeof window === 'undefined') {
    return
  }

  window.sessionStorage.setItem(buildScrollRestoreKey(search), String(window.scrollY))
}

function ResultsQuickNavIcon({ direction }: { direction: 'up' | 'down' }) {
  const path =
    direction === 'up'
      ? 'M12 5.75l5.25 6.25h-3.25v6h-4v-6H6.75L12 5.75z'
      : 'M10 6h4v6h3.25L12 18.25 6.75 12H10V6z'

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M4.75 12h14.5" strokeLinecap="round" strokeOpacity="0.18" />
      <path d={path} fill="currentColor" stroke="none" />
    </svg>
  )
}

function FilterDisclosureChevronIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M3.5 6.25 8 10.5l4.5-4.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function FilterDisclosureSection(props: {
  title: string
  summary: string
  status: string
  isExpanded: boolean
  onToggle: () => void
  children: ReactNode
}) {
  const { title, summary, status, isExpanded, onToggle, children } = props

  return (
    <section className={isExpanded ? 'filter-disclosure filter-disclosure--expanded' : 'filter-disclosure'}>
      <button type="button" className="filter-disclosure__toggle" onClick={onToggle} aria-expanded={isExpanded}>
        <div className="filter-disclosure__copy">
          <div className="filter-disclosure__title-row">
            <strong className="filter-disclosure__title">{title}</strong>
            <span className="filter-disclosure__status">{status}</span>
          </div>
          <span className="filter-disclosure__summary">{summary}</span>
        </div>
        <span className="filter-disclosure__chevron" aria-hidden="true">
          <FilterDisclosureChevronIcon />
        </span>
      </button>
      <div className="filter-disclosure__panel" aria-hidden={!isExpanded}>
        <div className="filter-disclosure__content">{children}</div>
      </div>
    </section>
  )
}

export function ChampionsPage() {
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
  const [state, setState] = useState<ChampionState>({ status: 'loading' })
  const [search, setSearch] = useState(() => readSearchValue(initialSearchParams))
  const [selectedSeats, setSelectedSeats] = useState<number[]>(() => readSeatValues(initialSearchParams))
  const [selectedRoles, setSelectedRoles] = useState<string[]>(() =>
    readStringValues(initialSearchParams, SEARCH_PARAM_ROLE),
  )
  const [selectedAffiliations, setSelectedAffiliations] = useState<string[]>(() =>
    readStringValues(initialSearchParams, SEARCH_PARAM_AFFILIATION),
  )
  const [selectedRaces, setSelectedRaces] = useState<string[]>(() =>
    readStringValues(initialSearchParams, SEARCH_PARAM_RACE),
  )
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
  const [selectedChampionId, setSelectedChampionId] = useState<string | null>(null)
  const [resultsShellHeight, setResultsShellHeight] = useState<number | null>(null)
  const [stickyTop, setStickyTop] = useState(160)
  const [resultsQuickNavigation, setResultsQuickNavigation] = useState<ResultsQuickNavigationState>({
    isVisible: false,
    canScrollTop: false,
    canScrollBottom: false,
  })
  const resultsShellRef = useRef<HTMLElement | null>(null)
  const resultsContentRef = useRef<HTMLDivElement | null>(null)
  const pendingResultsTransitionRef = useRef<PendingResultsTransition | null>(null)
  const releaseResultsHeightTimeoutRef = useRef<number | null>(null)
  const scrollAnimationFrameRef = useRef<number | null>(null)
  const hasAttemptedScrollRestoreRef = useRef(false)

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

  useEffect(() => {
    const nextSearchParams = buildFilterSearchParams({
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
  ])

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

  const visibleChampions = showAllResults ? filteredChampions : filteredChampions.slice(0, MAX_VISIBLE_RESULTS)
  const selectedChampion =
    selectedChampionId !== null ? visibleChampions.find((champion) => champion.id === selectedChampionId) ?? null : null
  const selectedChampionVisual =
    state.status === 'ready' && selectedChampion
      ? state.visuals.find((visual) => visual.championId === selectedChampion.id) ?? null
      : null
  const matchedSeats = new Set(filteredChampions.map((champion) => champion.seat)).size
  const trimmedSearch = search.trim()
  const hasActiveFilters =
    trimmedSearch.length > 0 ||
    selectedSeats.length > 0 ||
    selectedRoles.length > 0 ||
    selectedAffiliations.length > 0 ||
    selectedRaces.length > 0 ||
    selectedGenders.length > 0 ||
    selectedAlignments.length > 0 ||
    selectedProfessions.length > 0 ||
    selectedAcquisitions.length > 0 ||
    selectedMechanics.length > 0
  const canToggleResultVisibility = filteredChampions.length > MAX_VISIBLE_RESULTS
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
  const identityFiltersSelectedCount = selectedRaces.length + selectedGenders.length + selectedAlignments.length
  const metaFiltersSelectedCount = selectedProfessions.length + selectedAcquisitions.length + selectedMechanics.length

  function getResultsTargetTop(shell: HTMLElement): number {
    const siteHeader = document.querySelector('.site-header')
    const headerHeight = siteHeader instanceof HTMLElement ? siteHeader.getBoundingClientRect().height : 0

    return Math.max(Math.round(shell.getBoundingClientRect().top + window.scrollY - headerHeight - 16), 0)
  }

  function getResultsTargetBottom(shell: HTMLElement): number {
    const maxScrollTop = Math.max(document.documentElement.scrollHeight - window.innerHeight, 0)
    const shellBottom = shell.getBoundingClientRect().bottom + window.scrollY
    const targetTop = Math.round(shellBottom - window.innerHeight + 24)

    return Math.min(Math.max(targetTop, 0), maxScrollTop)
  }

  function scrollWindowTo(targetTop: number, onComplete?: () => void) {
    if (scrollAnimationFrameRef.current !== null) {
      window.cancelAnimationFrame(scrollAnimationFrameRef.current)
      scrollAnimationFrameRef.current = null
    }

    if (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      window.scrollTo({
        top: targetTop,
        behavior: 'auto',
      })
      window.dispatchEvent(new Event('scroll'))
      onComplete?.()
      return
    }

    const startTop = window.scrollY
    const distance = targetTop - startTop

    if (Math.abs(distance) < 2) {
      window.dispatchEvent(new Event('scroll'))
      onComplete?.()
      return
    }

    let startTime: number | null = null
    const easeOutQuart = (progress: number) => 1 - (1 - progress) ** 4

    const step = (now: number) => {
      if (startTime === null) {
        startTime = now
      }

      const progress = Math.min((now - startTime) / RESULTS_SCROLL_DURATION_MS, 1)

      window.scrollTo({
        top: startTop + distance * easeOutQuart(progress),
        behavior: 'auto',
      })

      if (progress < 1) {
        scrollAnimationFrameRef.current = window.requestAnimationFrame(step)
      } else {
        scrollAnimationFrameRef.current = null
        window.dispatchEvent(new Event('scroll'))
        onComplete?.()
      }
    }

    scrollAnimationFrameRef.current = window.requestAnimationFrame(step)
  }

  function scrollResultsToBoundary(direction: 'top' | 'bottom') {
    const shell = resultsShellRef.current

    if (!shell) {
      return
    }

    scrollWindowTo(direction === 'top' ? getResultsTargetTop(shell) : getResultsTargetBottom(shell), () => {
      setResultsQuickNavigation({
        isVisible: true,
        canScrollTop: direction === 'bottom',
        canScrollBottom: direction === 'top',
      })
    })
  }

  function prepareResultsViewportTransition(reason: ResultsTransitionReason = 'filters') {
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
      previousFilteredCount: filteredChampions.length,
      previousVisibleCount: visibleChampions.length,
      shouldRelocate,
      targetTop,
      reason,
    }

    setResultsShellHeight(Math.ceil(shell.getBoundingClientRect().height))
  }

  function runFilterMutation(mutation: () => void) {
    prepareResultsViewportTransition('filters')
    setShowAllResults(false)
    mutation()
  }

  function clearAllFilters() {
    runFilterMutation(() => {
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
    })
  }

  function clearActiveFilterChip(id: ActiveFilterChip['id']) {
    switch (id) {
      case 'search':
        runFilterMutation(() => setSearch(''))
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

  const activeFilterChips = [
    trimmedSearch
      ? {
          id: 'search',
          label: t({
            zh: `关键词：${trimmedSearch}`,
            en: `Keyword: ${trimmedSearch}`,
          }),
          clearLabel: t({
            zh: `清空关键词：${trimmedSearch}`,
            en: `Clear keyword: ${trimmedSearch}`,
          }),
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
        }
      : null,
    orderedSelectedAcquisitions.length > 0
      ? {
          id: 'acquisitions',
          label: t({
            zh: `获取方式：${orderedSelectedAcquisitions.map((acquisition) => getChampionTagLabel(acquisition, locale)).join('、')}`,
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
        }
      : null,
    orderedSelectedMechanics.length > 0
      ? {
          id: 'mechanics',
          label: t({
            zh: `特殊机制：${orderedSelectedMechanics.map((mechanic) => getChampionTagLabel(mechanic, locale)).join('、')}`,
            en: `Special mechanics: ${orderedSelectedMechanics
              .map((mechanic) => getChampionTagLabel(mechanic, locale))
              .join(', ')}`,
          }),
          clearLabel: t({
            zh: `清空特殊机制：${orderedSelectedMechanics.map((mechanic) => getChampionTagLabel(mechanic, locale)).join('、')}`,
            en: `Clear special mechanics: ${orderedSelectedMechanics
              .map((mechanic) => getChampionTagLabel(mechanic, locale))
              .join(', ')}`,
          }),
        }
      : null,
  ].filter((item): item is ActiveFilterChip => Boolean(item))

  const activeFilters = activeFilterChips.map((chip) => chip.label)
  const showResultsQuickNavTop = resultsQuickNavigation.isVisible && resultsQuickNavigation.canScrollTop
  const showResultsQuickNavBottom = resultsQuickNavigation.isVisible && resultsQuickNavigation.canScrollBottom
  const mechanicOptionGroups = groupMechanicOptions(mechanicOptions)

  useEffect(() => {
    if (state.status !== 'ready' || hasAttemptedScrollRestoreRef.current || typeof window === 'undefined') {
      return
    }

    hasAttemptedScrollRestoreRef.current = true
    const stored = window.sessionStorage.getItem(buildScrollRestoreKey(location.search))

    if (!stored) {
      return
    }

    window.sessionStorage.removeItem(buildScrollRestoreKey(location.search))
    const scrollY = Number.parseFloat(stored)

    if (!Number.isFinite(scrollY)) {
      return
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.scrollTo({ top: scrollY, left: 0, behavior: 'auto' })
      })
    })
  }, [location.search, showAllResults, state.status, visibleChampions.length])

  useLayoutEffect(() => {
    const pendingTransition = pendingResultsTransitionRef.current
    const content = resultsContentRef.current

    if (!pendingTransition || !content || resultsShellHeight === null) {
      return
    }

    pendingResultsTransitionRef.current = null

    const nextHeight = Math.ceil(content.getBoundingClientRect().height)
    const filteredCollapsedToFew =
      filteredChampions.length < pendingTransition.previousFilteredCount &&
      filteredChampions.length <= RESULTS_RELOCATE_THRESHOLD
    const visibleCollapsed = visibleChampions.length < pendingTransition.previousVisibleCount
    const collapsedBackToDefaultWindow =
      pendingTransition.previousVisibleCount > MAX_VISIBLE_RESULTS &&
      visibleChampions.length <= MAX_VISIBLE_RESULTS &&
      visibleCollapsed
    const shouldRelocate =
      pendingTransition.shouldRelocate &&
      (pendingTransition.reason === 'filters'
        ? filteredCollapsedToFew || collapsedBackToDefaultWindow
        : visibleCollapsed)

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
  }, [
    filteredChampions.length,
    resultsShellHeight,
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
    showAllResults,
    visibleChampions.length,
  ])

  useEffect(() => {
    const updateResultsQuickNavigation = () => {
      const shell = resultsShellRef.current

      if (!shell || visibleChampions.length < RESULTS_QUICK_NAV_THRESHOLD) {
        setResultsQuickNavigation((current) => {
          if (!current.isVisible && !current.canScrollTop && !current.canScrollBottom) {
            return current
          }

          return {
            isVisible: false,
            canScrollTop: false,
            canScrollBottom: false,
          }
        })
        return
      }

      const topTarget = getResultsTargetTop(shell)
      const bottomTarget = getResultsTargetBottom(shell)
      const scrollableRange = Math.max(bottomTarget - topTarget, 1)
      const scrollProgress = Math.min(Math.max((window.scrollY - topTarget) / scrollableRange, 0), 1)
      const visibilityThreshold = Math.max(topTarget - 240, 220)
      const canScrollTop = scrollProgress > 0.18
      const canScrollBottom = scrollProgress < 0.88
      const isVisible =
        bottomTarget - topTarget > 160 && window.scrollY >= visibilityThreshold && (canScrollTop || canScrollBottom)

      setResultsQuickNavigation((current) => {
        if (
          current.isVisible === isVisible &&
          current.canScrollTop === canScrollTop &&
          current.canScrollBottom === canScrollBottom
        ) {
          return current
        }

        return {
          isVisible,
          canScrollTop,
          canScrollBottom,
        }
      })
    }

    updateResultsQuickNavigation()
    window.addEventListener('scroll', updateResultsQuickNavigation, { passive: true })
    window.addEventListener('resize', updateResultsQuickNavigation)

    return () => {
      window.removeEventListener('scroll', updateResultsQuickNavigation)
      window.removeEventListener('resize', updateResultsQuickNavigation)
    }
  }, [
    filteredChampions.length,
    resultsShellHeight,
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
    showAllResults,
    visibleChampions.length,
  ])

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
                            zh: '往下浏览卡片时，筛选区会稳稳留在视线附近；所有回退动作都收束到一个入口，减少反复找按钮。',
                            en: 'The filters stay close while you browse deeper results, with one clear reset entry instead of scattered actions.',
                          })}
                        </p>
                      </div>
                      <div
                        className="champions-sidebar__status"
                        role="group"
                        aria-label={t({ zh: '筛选状态操作', en: 'Filter status actions' })}
                      >
                        <span className="champions-sidebar__badge">
                          {activeFilterChips.length > 0
                            ? t({
                                zh: `${activeFilterChips.length} 项已启用`,
                                en: `${activeFilterChips.length} active`,
                              })
                            : t({ zh: '未启用', en: 'Idle' })}
                        </span>
                        {hasActiveFilters ? (
                          <button
                            type="button"
                            className="action-button action-button--secondary action-button--compact"
                            onClick={clearAllFilters}
                          >
                            {t({ zh: '清空全部', en: 'Clear all' })}
                          </button>
                        ) : null}
                      </div>
                    </div>

                    <p className="champions-sidebar__microcopy">
                      {t({
                        zh: '关键词、座位、定位和联动队伍始终直接可见；低频标签型条件会分层收纳，减少大屏浏览时的视觉来回跳。',
                        en: 'Keyword, seat, role, and affiliation stay visible while lower-frequency tag filters are folded into calmer sections.',
                      })}
                    </p>

                    {activeFilterChips.length > 0 ? (
                      <div className="active-filter-bar active-filter-bar--sidebar">
                        <div className="active-filter-bar__header">
                          <div className="active-filter-bar__copy">
                            <strong className="active-filter-bar__title">
                              {t({ zh: '已选条件', en: 'Selected filters' })}
                            </strong>
                            <p className="active-filter-bar__hint">
                              {t({
                                zh: '点击任一条件即可单独清空对应维度；全量回退统一用上方的清空全部。',
                                en: 'Click any filter chip to clear that dimension only, then use the reset button above when you want a full reset.',
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

                    <div className="champions-sidebar__section-label">
                      {t({ zh: '高频条件', en: 'Frequent filters' })}
                    </div>

                    <div className="filter-panel filter-panel--sidebar">
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
                          onChange={(event) => {
                            runFilterMutation(() => {
                              setSearch(event.target.value)
                            })
                          }}
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
                            onClick={() => runFilterMutation(() => setSelectedRoles([]))}
                          >
                            {t({ zh: '全部', en: 'All' })}
                          </button>
                          {state.roles.map((role) => (
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
                          zh: '支持多选；适合同时看多个联动队伍候选。',
                          en: 'Multi-select is supported for comparing multiple affiliations at once.',
                        })}
                        className="filter-group"
                      >
                        <div className="filter-chip-grid">
                          <button
                            type="button"
                            className={
                              selectedAffiliations.length === 0 ? 'filter-chip filter-chip--active' : 'filter-chip'
                            }
                            aria-pressed={selectedAffiliations.length === 0}
                            onClick={() => runFilterMutation(() => setSelectedAffiliations([]))}
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
                                runFilterMutation(() => {
                                  setSelectedAffiliations((current) => toggleFilterValue(current, affiliation.original))
                                })
                              }
                            >
                              <LocalizedText text={affiliation} mode="primary" />
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
                        summary={t({
                          zh: '种族 / 性别 / 阵营',
                          en: 'Race / gender / alignment',
                        })}
                        status={
                          identityFiltersSelectedCount > 0
                            ? t({
                                zh: `已选 ${identityFiltersSelectedCount}`,
                                en: `${identityFiltersSelectedCount} selected`,
                              })
                            : t({ zh: '默认收起', en: 'Folded' })
                        }
                        isExpanded={isIdentityFiltersExpanded}
                        onToggle={() => setIdentityFiltersExpanded((current) => !current)}
                      >
                        <div className="filter-panel filter-panel--nested">
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
                        title={t({ zh: '来源与特殊机制', en: 'Source & special mechanics' })}
                        summary={t({
                          zh: '职业 / 获取方式 / 特殊机制',
                          en: 'Profession / availability / special mechanics',
                        })}
                        status={
                          metaFiltersSelectedCount > 0
                            ? t({
                                zh: `已选 ${metaFiltersSelectedCount}`,
                                en: `${metaFiltersSelectedCount} selected`,
                              })
                            : t({ zh: '默认收起', en: 'Folded' })
                        }
                        isExpanded={isMetaFiltersExpanded}
                        onToggle={() => setMetaFiltersExpanded((current) => !current)}
                      >
                        <div className="filter-panel filter-panel--nested">
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
                                className={
                                  selectedProfessions.length === 0 ? 'filter-chip filter-chip--active' : 'filter-chip'
                                }
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
                                    selectedProfessions.includes(profession)
                                      ? 'filter-chip filter-chip--active'
                                      : 'filter-chip'
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
                              zh: '支持多选；可以区分起始、常驻、活动或 Tales 等来源。',
                              en: 'Multi-select is supported for comparing starter, evergreen, event, or Tales availability.',
                            })}
                            className="filter-group"
                          >
                            <div className="filter-chip-grid">
                              <button
                                type="button"
                                className={
                                  selectedAcquisitions.length === 0 ? 'filter-chip filter-chip--active' : 'filter-chip'
                                }
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
                              zh: '支持多选；这里只收会直接影响阵型取舍的特殊玩法标签，不等于完整技能说明。',
                              en: 'Multi-select is supported for the combat tags that most directly affect formation building, not the full ability text.',
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
                                          selectedMechanics.includes(mechanic)
                                            ? 'filter-chip filter-chip--active'
                                            : 'filter-chip'
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
                              zh: `当前展示 ${visibleChampions.length} / ${filteredChampions.length} 名英雄。如果结果过多，优先加关键词、座位、定位、联动队伍、种族、性别、阵营、职业、获取方式或特殊机制缩小范围。`,
                              en: `Showing ${visibleChampions.length} / ${filteredChampions.length} champions. Narrow things down with a keyword, seat, role, affiliation, race, gender, alignment, profession, availability, or special mechanic if the list feels too broad.`,
                            })
                          : t({
                              zh: '当前筛选条件下没有匹配英雄。可以直接点左侧已选条件逐项回退，或用筛选头部的清空全部重新开始。',
                              en: 'No champions match this filter set yet. Peel the left-side chips back one by one, or use the reset button in the filter header to start over.',
                            })}
                      </p>

                      {filteredChampions.length > 0 ? (
                        <div className="results-panel__actions">
                          <span className="results-summary-pill">
                            {canToggleResultVisibility
                              ? showAllResults
                                ? t({
                                    zh: `已展开全部 ${filteredChampions.length} 名英雄`,
                                    en: `Showing all ${filteredChampions.length} champions`,
                                  })
                                : t({
                                    zh: `默认先展示 ${MAX_VISIBLE_RESULTS} 名英雄`,
                                    en: `Defaulting to the first ${MAX_VISIBLE_RESULTS} champions`,
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
                              onClick={() => {
                                prepareResultsViewportTransition('visibility')
                                setShowAllResults((current) => !current)
                              }}
                            >
                              {showAllResults
                                ? t({
                                    zh: `收起到默认 ${MAX_VISIBLE_RESULTS} 名`,
                                    en: `Collapse back to ${MAX_VISIBLE_RESULTS}`,
                                  })
                                : t({
                                    zh: `显示全部 ${filteredChampions.length} 名`,
                                    en: `Show all ${filteredChampions.length}`,
                                  })}
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                    </div>

                    {filteredChampions.length > 0 ? (
                      <>
                        {selectedChampion ? (
                          <ChampionVisualWorkbench
                            key={selectedChampion.id}
                            champion={selectedChampion}
                            visual={selectedChampionVisual}
                            locale={locale}
                            onClose={() => setSelectedChampionId(null)}
                          />
                        ) : null}

                        <div className="results-grid results-grid--stable">
                          {visibleChampions.map((champion) => {
                            const attributeGroups = getChampionAttributeGroups(champion.tags)
                            const isSelected = champion.id === selectedChampionId

                            return (
                              <article
                                key={champion.id}
                                className={
                                  isSelected
                                    ? 'result-card result-card--champion result-card--interactive result-card--selected'
                                    : 'result-card result-card--champion result-card--interactive'
                                }
                              >
                                <Link
                                  className="result-card--link"
                                  to={{
                                    pathname: `/champions/${champion.id}`,
                                    search: location.search,
                                  }}
                                  aria-label={t({
                                    zh: `查看详情：${getPrimaryLocalizedText(champion.name, locale)}`,
                                    en: `Open details for ${getPrimaryLocalizedText(champion.name, locale)}`,
                                  })}
                                  onClick={() => saveChampionListScroll(location.search)}
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

                                  <div className="result-card__section">
                                    <span className="result-card__link">
                                      {t({ zh: '点击卡片查看详情', en: 'Open details from the card' })}
                                    </span>
                                  </div>
                                </Link>

                                <div className="result-card__actions">
                                  <button
                                    type="button"
                                    className={
                                      isSelected
                                        ? 'action-button action-button--secondary action-button--compact action-button--toggled'
                                        : 'action-button action-button--ghost action-button--compact'
                                    }
                                    aria-label={t({
                                      zh: `查看 ${getPrimaryLocalizedText(champion.name, locale)} 视觉档案`,
                                      en: `View ${getPrimaryLocalizedText(champion.name, locale)} visual dossier`,
                                    })}
                                    aria-pressed={isSelected}
                                    onClick={() =>
                                      setSelectedChampionId((current) => (current === champion.id ? null : champion.id))
                                    }
                                  >
                                    {isSelected
                                      ? t({ zh: '收起视觉档案', en: 'Hide visual dossier' })
                                      : t({ zh: '视觉档案', en: 'Visual dossier' })}
                                  </button>
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
                              onClick={() => {
                                prepareResultsViewportTransition('visibility')
                                setShowAllResults((current) => !current)
                              }}
                            >
                              {showAllResults
                                ? t({
                                    zh: `收起到默认 ${MAX_VISIBLE_RESULTS} 名`,
                                    en: `Collapse back to ${MAX_VISIBLE_RESULTS}`,
                                  })
                                : t({
                                    zh: `继续展开剩余 ${filteredChampions.length - MAX_VISIBLE_RESULTS} 名英雄`,
                                    en: `Reveal the remaining ${filteredChampions.length - MAX_VISIBLE_RESULTS} champions`,
                                  })}
                            </button>
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <div className="results-panel__empty">
                        <StatusBanner tone="info">
                          {t({
                            zh: '暂时没有可展示的英雄结果。先放宽一个过滤维度，再继续缩小范围会更顺手。',
                            en: 'There are no champions to show right now. Loosen one filter group first, then narrow it back down.',
                          })}
                        </StatusBanner>
                      </div>
                    )}
                  </div>
                </section>

                {showResultsQuickNavTop || showResultsQuickNavBottom ? (
                  <div
                    className={
                      showResultsQuickNavTop && showResultsQuickNavBottom
                        ? 'results-quick-nav'
                        : 'results-quick-nav results-quick-nav--single'
                    }
                    role="group"
                    aria-label={t({ zh: '结果列表快捷滚动', en: 'Results quick scrolling' })}
                  >
                    {showResultsQuickNavTop ? (
                      <button
                        type="button"
                        className="results-quick-nav__button"
                        onClick={() => scrollResultsToBoundary('top')}
                        aria-label={t({ zh: '返回结果顶部', en: 'Back to results top' })}
                      >
                        <ResultsQuickNavIcon direction="up" />
                        <span>{t({ zh: '顶部', en: 'Top' })}</span>
                      </button>
                    ) : null}
                    {showResultsQuickNavBottom ? (
                      <button
                        type="button"
                        className="results-quick-nav__button results-quick-nav__button--accent"
                        onClick={() => scrollResultsToBoundary('bottom')}
                        aria-label={t({ zh: '跳到结果底部', en: 'Jump to results bottom' })}
                      >
                        <ResultsQuickNavIcon direction="down" />
                        <span>{t({ zh: '到底', en: 'End' })}</span>
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </section>
            </div>
          </>
        ) : null}
      </SurfaceCard>
    </div>
  )
}
