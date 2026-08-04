import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import { useLocation } from 'react-router-dom'
import { resolveUserProfileSnapshot, type UserProfileResolution } from '../../data/user-profile-store'
import { saveWorkbenchResultsPaneScroll, useWorkbenchResultsMotion } from '../../components/workbench/useWorkbenchResultsMotion'
import { useWorkbenchShareLink } from '../../components/workbench/useWorkbenchShareLink'
import { useI18n } from '../../app/i18n'
import { getMechanicCategoryHint } from '../../features/champion-filters/mechanicHints'
import type { MechanicOptionGroup } from '../../features/champion-filters/types'
import { buildChampionFilterActions } from '../champions/champion-filter-actions'
import { useChampionCollectionState } from '../champions/useChampionCollectionState'
import { useChampionsFilterState } from '../champions/useChampionsFilterState'
import type { UserHeroesPageModel, UserHeroesRosterMetricFilterId } from './types'
import { useUserHeroesPageDerived } from './useUserHeroesPageDerived'

type FilterState = ReturnType<typeof useChampionsFilterState>
type Motion = ReturnType<typeof useWorkbenchResultsMotion>
type RosterMetricSetter = Dispatch<SetStateAction<UserHeroesRosterMetricFilterId | null>>

function buildUserHeroesFilterActions(
  filterState: FilterState,
  motion: Motion,
  setActiveRosterMetricFilterId: RosterMetricSetter,
) {
  function runFilterMutation(mutation: () => void) {
    motion.prepareResultsViewportTransition('filters')
    mutation()
  }

  const filterActions = buildChampionFilterActions({
    runFilterMutation,
    setSearch: filterState.setSearch,
    setSelectedSeats: filterState.setSelectedSeats,
    setSelectedRoles: filterState.setSelectedRoles,
    setSelectedAffiliations: filterState.setSelectedAffiliations,
    setSelectedRaces: filterState.setSelectedRaces,
    setSelectedGenders: filterState.setSelectedGenders,
    setSelectedAlignments: filterState.setSelectedAlignments,
    setSelectedProfessions: filterState.setSelectedProfessions,
    setSelectedAcquisitions: filterState.setSelectedAcquisitions,
    setSelectedMechanics: filterState.setSelectedMechanics,
    resetExtraFilters: () => { setActiveRosterMetricFilterId(null) },
    extraChipMutations: { 'roster-metric': () => { setActiveRosterMetricFilterId(null) } },
  })

  return { runFilterMutation, filterActions }
}

type UserHeroesPageModelParts = {
  readonly locale: ReturnType<typeof useI18n>['locale']
  readonly t: ReturnType<typeof useI18n>['t']
  readonly state: ReturnType<typeof useChampionCollectionState>
  readonly filterState: FilterState
  readonly profileResolution: UserProfileResolution | null
  readonly activeRosterMetricFilterId: UserHeroesRosterMetricFilterId | null
  readonly motion: Motion
  readonly shareLinkState: ReturnType<typeof useWorkbenchShareLink>['shareLinkState']
  readonly copyCurrentLink: ReturnType<typeof useWorkbenchShareLink>['copyCurrentLink']
  readonly derived: ReturnType<typeof useUserHeroesPageDerived>
  readonly toggleRosterMetricFilter: (id: UserHeroesRosterMetricFilterId) => void
  readonly filterActions: ReturnType<typeof buildChampionFilterActions>
}

function mapFilterStateToProps(filterState: FilterState) {
  return {
    search: filterState.search,
    selectedSeats: filterState.selectedSeats,
    selectedRoles: filterState.selectedRoles,
    selectedAffiliations: filterState.selectedAffiliations,
    selectedRaces: filterState.selectedRaces,
    selectedGenders: filterState.selectedGenders,
    selectedAlignments: filterState.selectedAlignments,
    selectedProfessions: filterState.selectedProfessions,
    selectedAcquisitions: filterState.selectedAcquisitions,
    selectedMechanics: filterState.selectedMechanics,
    isIdentityFiltersExpanded: filterState.isIdentityFiltersExpanded,
    isMetaFiltersExpanded: filterState.isMetaFiltersExpanded,
    setIdentityFiltersExpanded: filterState.setIdentityFiltersExpanded,
    setMetaFiltersExpanded: filterState.setMetaFiltersExpanded,
    locationSearch: filterState.locationSearch,
  }
}

function mapDerivedToProps(derived: UserHeroesPageModelParts['derived']) {
  return {
    activeFilterChips: derived.activeFilterChips,
    activeFilters: derived.activeFilters,
    hasActiveFilters: derived.hasActiveFilters,
    filteredChampions: derived.filteredChampions,
    visibleChampions: derived.filteredChampions,
    heroIllustrationByChampionId: derived.heroIllustrationByChampionId,
    matchedSeats: derived.matchedSeats,
    rosterSeatColumns: derived.rosterSeatColumns,
    rosterSummary: derived.rosterSummary,
    roles: derived.roles,
    affiliations: derived.affiliations,
    raceOptions: derived.raceOptions,
    genderOptions: derived.genderOptions,
    alignmentOptions: derived.alignmentOptions,
    professionOptions: derived.professionOptions,
    acquisitionOptions: derived.acquisitionOptions,
    mechanicOptions: derived.mechanicOptions,
    mechanicOptionGroups: derived.mechanicOptionGroups,
    identityFiltersSelectedCount: derived.identityFiltersSelectedCount,
    metaFiltersSelectedCount: derived.metaFiltersSelectedCount,
  }
}

function buildUserHeroesPageModel(p: UserHeroesPageModelParts): UserHeroesPageModel {
  const { locale, t, state, filterState, profileResolution, activeRosterMetricFilterId, motion, shareLinkState, copyCurrentLink, derived, toggleRosterMetricFilter, filterActions } = p

  return {
    locale, t, state, profileResolution, activeRosterMetricFilterId,
    ...mapFilterStateToProps(filterState),
    ...mapDerivedToProps(derived),
    canToggleResultVisibility: false,
    showAllResults: true,
    hasRandomOrder: false,
    shareLinkState,
    showResultsQuickNavTop: motion.showResultsQuickNavTop,
    resultsPaneRef: motion.resultsPaneRef,
    toggleRosterMetricFilter,
    toggleResultVisibility: () => undefined,
    randomizeResultOrder: () => undefined,
    scrollResultsToTop: motion.scrollResultsToTop,
    copyCurrentLink,
    getMechanicCategoryHint: (groupId: MechanicOptionGroup['id']) => getMechanicCategoryHint(groupId, t),
    saveListScroll: () => {
      saveWorkbenchResultsPaneScroll('user-heroes', filterState.locationSearch, motion.resultsPaneRef.current?.scrollTop ?? 0)
    },
    ...filterActions,
  }
}

export function useUserHeroesPageModel(): UserHeroesPageModel {
  const { locale, t } = useI18n()
  const location = useLocation()
  const state = useChampionCollectionState()
  const filterState = useChampionsFilterState()
  const [profileResolution, setProfileResolution] = useState<UserProfileResolution | null>(null)
  const [activeRosterMetricFilterId, setActiveRosterMetricFilterId] = useState<UserHeroesRosterMetricFilterId | null>(null)

  useEffect(() => {
    let active = true
    resolveUserProfileSnapshot()
      .then((resolution) => { if (active) setProfileResolution(resolution) })
      .catch(() => { if (active) setProfileResolution(null) })
    return () => { active = false }
  }, [])

  const derived = useUserHeroesPageDerived({
    locale, t, state, activeRosterMetricFilterId,
    filters: filterState.filters,
    ownedHeroes: profileResolution?.snapshot?.ownedHeroes ?? [],
  })
  const motion = useWorkbenchResultsMotion({
    storageKey: 'user-heroes',
    locationSearch: filterState.locationSearch,
    stateStatus: state.status,
    filteredCount: derived.filteredChampions.length,
    visibleCount: state.status === 'ready' ? state.champions.length : 0,
    showAllResults: true,
    transitionKey: filterState.transitionKey,
  })
  const { shareLinkState, copyCurrentLink } = useWorkbenchShareLink(location.pathname, location.search, location.hash)
  const { runFilterMutation, filterActions } = buildUserHeroesFilterActions(filterState, motion, setActiveRosterMetricFilterId)

  function toggleRosterMetricFilter(id: UserHeroesRosterMetricFilterId) {
    runFilterMutation(() => { setActiveRosterMetricFilterId((current) => (current === id ? null : id)) })
  }

  return buildUserHeroesPageModel({
    locale, t, state, filterState, profileResolution, activeRosterMetricFilterId,
    motion, shareLinkState, copyCurrentLink, derived, toggleRosterMetricFilter, filterActions,
  })
}
