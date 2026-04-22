import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useI18n } from '../../app/i18n'
import { saveWorkbenchResultsPaneScroll, useWorkbenchResultsMotion } from '../../components/filter-sidebar/useWorkbenchResultsMotion'
import { useWorkbenchShareLink } from '../../components/filter-sidebar/useWorkbenchShareLink'
import { getMechanicCategoryHint } from '../../features/champion-filters/mechanicHints'
import { buildChampionFilterActions } from './champion-filter-actions'
import { useChampionCollectionState } from './useChampionCollectionState'
import { useChampionsFilterState } from './useChampionsFilterState'
import { useChampionsPageDerived } from './useChampionsPageDerived'
import type { ChampionsPageModel } from './types'

export function useChampionsPageModel(): ChampionsPageModel {
  const { locale, t } = useI18n()
  const location = useLocation()
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
  const motion = useWorkbenchResultsMotion({
    storageKey: 'champions',
    locationSearch: filterState.locationSearch,
    stateStatus: state.status,
    filteredCount: derived.filteredChampions.length,
    visibleCount: derived.visibleChampions.length,
    showAllResults: filterState.showAllResults,
    transitionKey: filterState.transitionKey,
  })
  const { shareLinkState, copyCurrentLink } = useWorkbenchShareLink(location.pathname, location.search, location.hash)
  const shareButtonLabel =
    shareLinkState === 'success'
      ? t({ zh: '已复制链接', en: 'Link copied' })
      : shareLinkState === 'error'
        ? t({ zh: '复制失败', en: 'Copy failed' })
        : t({ zh: '复制当前链接', en: 'Copy current link' })

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

  const showResultsQuickNavTop = motion.showResultsQuickNavTop

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
    shareLinkState,
    shareButtonLabel,
    showResultsQuickNavTop,
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
    scrollResultsToTop: motion.scrollResultsToTop,
    copyCurrentLink,
    getMechanicCategoryHint: (groupId) => getMechanicCategoryHint(groupId, t),
    saveListScroll: () => {
      saveWorkbenchResultsPaneScroll('champions', filterState.locationSearch, motion.resultsPaneRef.current?.scrollTop ?? 0)
    },
    locationSearch: filterState.locationSearch,
  }
}
