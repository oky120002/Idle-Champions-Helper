import { useEffect, useMemo, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { useI18n } from '../../app/i18n'
import { collectAttributeFilterOptions, groupMechanicOptions, seatOptions } from '../../features/champion-filters/options'
import { filterChampions } from '../../rules/championFilter'
import { getMechanicCategoryHint } from '../../features/champion-filters/mechanicHints'
import { buildChampionFilterActions } from './champion-filter-actions'
import { buildActiveFilterChips, buildChampionsTransitionKey } from './champion-filter-model'
import { MAX_VISIBLE_RESULTS } from './constants'
import { buildFilterSearchParams, readInitialFilterExpansion, readInitialFilterState, saveChampionListScroll } from './query-state'
import { useChampionCollectionState } from './useChampionCollectionState'
import { useChampionResultsMotion } from './useChampionResultsMotion'
import type { ChampionsFilterState, ChampionsPageModel } from './types'

export function useChampionsPageModel(): ChampionsPageModel {
  const location = useLocation()
  const [, setSearchParams] = useSearchParams()
  const { locale, t } = useI18n()
  const initialFilters = useMemo(() => readInitialFilterState(location.search), [location.search])
  const initialExpansion = useMemo(() => readInitialFilterExpansion(location.search), [location.search])
  const state = useChampionCollectionState()

  const [search, setSearch] = useState(initialFilters.search)
  const [selectedSeats, setSelectedSeats] = useState(initialFilters.selectedSeats)
  const [selectedRoles, setSelectedRoles] = useState(initialFilters.selectedRoles)
  const [selectedAffiliations, setSelectedAffiliations] = useState(initialFilters.selectedAffiliations)
  const [selectedRaces, setSelectedRaces] = useState(initialFilters.selectedRaces)
  const [selectedGenders, setSelectedGenders] = useState(initialFilters.selectedGenders)
  const [selectedAlignments, setSelectedAlignments] = useState(initialFilters.selectedAlignments)
  const [selectedProfessions, setSelectedProfessions] = useState(initialFilters.selectedProfessions)
  const [selectedAcquisitions, setSelectedAcquisitions] = useState(initialFilters.selectedAcquisitions)
  const [selectedMechanics, setSelectedMechanics] = useState(initialFilters.selectedMechanics)
  const [isIdentityFiltersExpanded, setIdentityFiltersExpanded] = useState(initialExpansion.identity)
  const [isMetaFiltersExpanded, setMetaFiltersExpanded] = useState(initialExpansion.meta)
  const [showAllResults, setShowAllResults] = useState(initialFilters.showAllResults)
  const [selectedChampionId, setSelectedChampionId] = useState<string | null>(null)

  const filters = useMemo<ChampionsFilterState>(
    () => ({
      search,
      selectedSeats,
      selectedRoles,
      selectedAffiliations,
      selectedRaces,
      selectedGenders,
      selectedAlignments,
      selectedProfessions,
      selectedAcquisitions,
      selectedMechanics,
      showAllResults,
    }),
    [
      search,
      selectedSeats,
      selectedRoles,
      selectedAffiliations,
      selectedRaces,
      selectedGenders,
      selectedAlignments,
      selectedProfessions,
      selectedAcquisitions,
      selectedMechanics,
      showAllResults,
    ],
  )
  const transitionKey = useMemo(() => buildChampionsTransitionKey(filters), [filters])

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
    selectedSeats,
    selectedRoles,
    selectedAffiliations,
    selectedRaces,
    selectedGenders,
    selectedAlignments,
    selectedProfessions,
    selectedAcquisitions,
    selectedMechanics,
    state,
  ])

  const visibleChampions = showAllResults ? filteredChampions : filteredChampions.slice(0, MAX_VISIBLE_RESULTS)
  const selectedChampion =
    selectedChampionId !== null ? visibleChampions.find((champion) => champion.id === selectedChampionId) ?? null : null
  const selectedChampionVisual =
    state.status === 'ready' && selectedChampion
      ? state.visuals.find((visual) => visual.championId === selectedChampion.id) ?? null
      : null
  const matchedSeats = useMemo(
    () => new Set(filteredChampions.map((champion) => champion.seat)).size,
    [filteredChampions],
  )

  const motion = useChampionResultsMotion({
    locationSearch: location.search,
    stateStatus: state.status,
    filteredCount: filteredChampions.length,
    visibleCount: visibleChampions.length,
    showAllResults,
    transitionKey,
  })

  useEffect(() => {
    const nextSearchParams = buildFilterSearchParams(filters)
    const nextSearch = nextSearchParams.toString()
    const currentSearch = new URLSearchParams(location.search).toString()

    if (nextSearch !== currentSearch) {
      setSearchParams(nextSearchParams, { replace: true })
    }
  }, [filters, location.search, setSearchParams])

  const roles = state.status === 'ready' ? state.roles : []
  const affiliations = state.status === 'ready' ? state.affiliations : []
  const raceOptions = state.status === 'ready' ? collectAttributeFilterOptions(state.champions, 'race', locale) : []
  const genderOptions = state.status === 'ready' ? collectAttributeFilterOptions(state.champions, 'gender', locale) : []
  const alignmentOptions =
    state.status === 'ready' ? collectAttributeFilterOptions(state.champions, 'alignment', locale) : []
  const professionOptions =
    state.status === 'ready' ? collectAttributeFilterOptions(state.champions, 'profession', locale) : []
  const acquisitionOptions =
    state.status === 'ready' ? collectAttributeFilterOptions(state.champions, 'acquisition', locale) : []
  const mechanicOptions =
    state.status === 'ready' ? collectAttributeFilterOptions(state.champions, 'mechanics', locale) : []
  const orderedSelectedSeats = seatOptions.filter((seat) => selectedSeats.includes(seat))
  const orderedSelectedRoles = roles.filter((role) => selectedRoles.includes(role))
  const orderedSelectedAffiliations = affiliations.filter((affiliation) =>
    selectedAffiliations.includes(affiliation.original),
  )
  const orderedSelectedRaces = raceOptions.filter((race) => selectedRaces.includes(race))
  const orderedSelectedGenders = genderOptions.filter((gender) => selectedGenders.includes(gender))
  const orderedSelectedAlignments = alignmentOptions.filter((alignment) => selectedAlignments.includes(alignment))
  const orderedSelectedProfessions = professionOptions.filter((profession) => selectedProfessions.includes(profession))
  const orderedSelectedAcquisitions = acquisitionOptions.filter((acquisition) =>
    selectedAcquisitions.includes(acquisition),
  )
  const orderedSelectedMechanics = mechanicOptions.filter((mechanic) => selectedMechanics.includes(mechanic))
  const activeFilterChips = buildActiveFilterChips({
    locale,
    t,
    filters,
    orderedSelectedSeats,
    orderedSelectedRoles,
    orderedSelectedAffiliations,
    orderedSelectedRaces,
    orderedSelectedGenders,
    orderedSelectedAlignments,
    orderedSelectedProfessions,
    orderedSelectedAcquisitions,
    orderedSelectedMechanics,
  })
  const activeFilters = activeFilterChips.map((chip) => chip.label)
  const hasActiveFilters =
    search.trim().length > 0 ||
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
  const showResultsQuickNavTop =
    motion.resultsQuickNavigation.isVisible && motion.resultsQuickNavigation.canScrollTop
  const showResultsQuickNavBottom =
    motion.resultsQuickNavigation.isVisible && motion.resultsQuickNavigation.canScrollBottom
  const mechanicOptionGroups = groupMechanicOptions(mechanicOptions)
  const identityFiltersSelectedCount = selectedRaces.length + selectedGenders.length + selectedAlignments.length
  const metaFiltersSelectedCount =
    selectedProfessions.length + selectedAcquisitions.length + selectedMechanics.length

  function runFilterMutation(mutation: () => void) {
    motion.prepareResultsViewportTransition('filters')
    setShowAllResults(false)
    mutation()
  }

  const filterActions = buildChampionFilterActions({
    runFilterMutation,
    setSearch,
    setSelectedSeats,
    setSelectedRoles,
    setSelectedAffiliations,
    setSelectedRaces,
    setSelectedGenders,
    setSelectedAlignments,
    setSelectedProfessions,
    setSelectedAcquisitions,
    setSelectedMechanics,
  })

  return {
    locale,
    t,
    state,
    search,
    selectedSeats,
    selectedRoles,
    selectedAffiliations,
    selectedRaces,
    selectedGenders,
    selectedAlignments,
    selectedProfessions,
    selectedAcquisitions,
    selectedMechanics,
    isIdentityFiltersExpanded,
    isMetaFiltersExpanded,
    activeFilterChips,
    activeFilters,
    hasActiveFilters,
    filteredChampions,
    visibleChampions,
    selectedChampion,
    selectedChampionVisual,
    matchedSeats,
    canToggleResultVisibility,
    showAllResults,
    showResultsQuickNavTop,
    showResultsQuickNavBottom,
    resultsShellHeight: motion.resultsShellHeight,
    championsWorkspaceStyle: motion.championsWorkspaceStyle,
    resultsShellRef: motion.resultsShellRef,
    resultsContentRef: motion.resultsContentRef,
    roles,
    affiliations,
    raceOptions,
    genderOptions,
    alignmentOptions,
    professionOptions,
    acquisitionOptions,
    mechanicOptions,
    mechanicOptionGroups,
    identityFiltersSelectedCount,
    metaFiltersSelectedCount,
    setIdentityFiltersExpanded,
    setMetaFiltersExpanded,
    ...filterActions,
    toggleResultVisibility: () => {
      motion.prepareResultsViewportTransition('visibility')
      setShowAllResults((current) => !current)
    },
    toggleChampionVisual: (championId) => {
      setSelectedChampionId((current) => (current === championId ? null : championId))
    },
    clearSelectedChampion: () => {
      setSelectedChampionId(null)
    },
    scrollResultsToBoundary: motion.scrollResultsToBoundary,
    getMechanicCategoryHint: (groupId) => getMechanicCategoryHint(groupId, t),
    saveListScroll: () => {
      saveChampionListScroll(location.search)
    },
    locationSearch: location.search,
  }
}
