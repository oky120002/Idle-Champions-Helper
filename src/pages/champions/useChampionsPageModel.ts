import { useState } from 'react'
import { useI18n } from '../../app/i18n'
import { getMechanicCategoryHint } from '../../features/champion-filters/mechanicHints'
import { buildChampionFilterActions } from './champion-filter-actions'
import { saveChampionListScroll } from './query-state'
import { useChampionCollectionState } from './useChampionCollectionState'
import { useChampionResultsMotion } from './useChampionResultsMotion'
import { useChampionsFilterState } from './useChampionsFilterState'
import { useChampionsPageDerived } from './useChampionsPageDerived'
import type { ChampionsPageModel } from './types'

export function useChampionsPageModel(): ChampionsPageModel {
  const { locale, t } = useI18n()
  const state = useChampionCollectionState()
  const filterState = useChampionsFilterState()
  const [randomOrderSeed, setRandomOrderSeed] = useState<number | null>(null)
  const [selectedChampionId, setSelectedChampionId] = useState<string | null>(null)

  const derived = useChampionsPageDerived({
    locale,
    t,
    state,
    filters: filterState.filters,
    randomOrderSeed,
    selectedChampionId,
  })
  const motion = useChampionResultsMotion({
    locationSearch: filterState.locationSearch,
    stateStatus: state.status,
    filteredCount: derived.filteredChampions.length,
    visibleCount: derived.visibleChampions.length,
    showAllResults: filterState.showAllResults,
    transitionKey: filterState.transitionKey,
  })

  function runFilterMutation(mutation: () => void) {
    motion.prepareResultsViewportTransition('filters')
    filterState.setShowAllResults(false)
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

  const showResultsQuickNavTop =
    motion.resultsQuickNavigation.isVisible && motion.resultsQuickNavigation.canScrollTop

  return {
    locale,
    t,
    state,
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
    visibleChampions: derived.visibleChampions,
    selectedChampion: derived.selectedChampion,
    selectedChampionVisual: derived.selectedChampionVisual,
    heroIllustrationByChampionId: derived.heroIllustrationByChampionId,
    matchedSeats: derived.matchedSeats,
    canToggleResultVisibility: derived.canToggleResultVisibility,
    showAllResults: filterState.showAllResults,
    hasRandomOrder: randomOrderSeed !== null,
    showResultsQuickNavTop,
    resultsPaneRef: motion.resultsPaneRef,
    resultsPaneSectionRef: motion.resultsPaneSectionRef,
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
    toggleResultVisibility: () => {
      motion.prepareResultsViewportTransition('visibility')
      filterState.setShowAllResults((current) => !current)
    },
    randomizeResultOrder: () => {
      setRandomOrderSeed((current) => (current === null ? 1 : current + 1))
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
      saveChampionListScroll(filterState.locationSearch, motion.resultsPaneRef.current?.scrollTop ?? 0)
    },
    locationSearch: filterState.locationSearch,
  }
}
