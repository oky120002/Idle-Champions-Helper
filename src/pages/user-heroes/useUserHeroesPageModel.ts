import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { resolveUserProfileSnapshot, type UserProfileResolution } from '../../data/user-profile-store'
import { saveWorkbenchResultsPaneScroll, useWorkbenchResultsMotion } from '../../components/workbench/useWorkbenchResultsMotion'
import { useWorkbenchShareLink } from '../../components/workbench/useWorkbenchShareLink'
import { useI18n } from '../../app/i18n'
import { getMechanicCategoryHint } from '../../features/champion-filters/mechanicHints'
import { buildChampionFilterActions } from '../champions/champion-filter-actions'
import { useChampionCollectionState } from '../champions/useChampionCollectionState'
import { useChampionsFilterState } from '../champions/useChampionsFilterState'
import type { UserHeroesPageModel } from './types'
import { useUserHeroesPageDerived } from './useUserHeroesPageDerived'

export function useUserHeroesPageModel(): UserHeroesPageModel {
  const { locale, t } = useI18n()
  const location = useLocation()
  const state = useChampionCollectionState()
  const filterState = useChampionsFilterState()
  const [profileResolution, setProfileResolution] = useState<UserProfileResolution | null>(null)

  useEffect(() => {
    let active = true

    resolveUserProfileSnapshot()
      .then((resolution) => {
        if (active) {
          setProfileResolution(resolution)
        }
      })
      .catch(() => {
        if (active) {
          setProfileResolution(null)
        }
      })

    return () => {
      active = false
    }
  }, [])

  const derived = useUserHeroesPageDerived({
    locale,
    t,
    state,
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
  })

  return {
    locale,
    t,
    state,
    profileResolution,
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
    activeFilterChips: derived.activeFilterChips,
    activeFilters: derived.activeFilters,
    hasActiveFilters: derived.hasActiveFilters,
    filteredChampions: derived.filteredChampions,
    visibleChampions: derived.filteredChampions,
    heroIllustrationByChampionId: derived.heroIllustrationByChampionId,
    matchedSeats: derived.matchedSeats,
    canToggleResultVisibility: false,
    showAllResults: true,
    hasRandomOrder: false,
    rosterSeatColumns: derived.rosterSeatColumns,
    rosterSummary: derived.rosterSummary,
    shareLinkState,
    showResultsQuickNavTop: motion.showResultsQuickNavTop,
    resultsPaneRef: motion.resultsPaneRef,
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
    setIdentityFiltersExpanded: filterState.setIdentityFiltersExpanded,
    setMetaFiltersExpanded: filterState.setMetaFiltersExpanded,
    ...filterActions,
    toggleResultVisibility: () => undefined,
    randomizeResultOrder: () => undefined,
    scrollResultsToTop: motion.scrollResultsToTop,
    copyCurrentLink,
    getMechanicCategoryHint: (groupId) => getMechanicCategoryHint(groupId, t),
    saveListScroll: () => {
      saveWorkbenchResultsPaneScroll('user-heroes', filterState.locationSearch, motion.resultsPaneRef.current?.scrollTop ?? 0)
    },
    locationSearch: filterState.locationSearch,
  }
}
