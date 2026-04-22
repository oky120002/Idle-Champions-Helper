import { useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useI18n } from '../../app/i18n'
import { useWorkbenchResultsMotion } from '../../components/workbench/useWorkbenchResultsMotion'
import { useWorkbenchShareLink } from '../../components/workbench/useWorkbenchShareLink'
import type { Pet, PetAnimation } from '../../domain/types'
import { MAX_VISIBLE_PETS } from './constants'
import { shufflePets } from './pet-results-order'
import { matchesPetQuery } from './search'
import type { PetsPageModel } from './types'
import { usePetsCollectionState } from './usePetsCollectionState'
import { usePetsFilterState } from './usePetsFilterState'

const EMPTY_PETS: Pet[] = []
const EMPTY_ANIMATIONS: PetAnimation[] = []

export function usePetsPageModel(): PetsPageModel {
  const location = useLocation()
  const { locale, t } = useI18n()
  const state = usePetsCollectionState()
  const filterState = usePetsFilterState()
  const [randomOrderSeed, setRandomOrderSeed] = useState<number | null>(null)

  const pets = state.status === 'ready' ? state.pets : EMPTY_PETS
  const animations = state.status === 'ready' ? state.animations : EMPTY_ANIMATIONS
  const filteredPets = useMemo(() => {
    const nextPets = pets.filter((pet) => {
      if (filterState.filters.sourceFilter !== 'all' && pet.acquisition.kind !== filterState.filters.sourceFilter) {
        return false
      }

      const hasCompleteArt = Boolean(pet.icon && pet.illustration)

      if (filterState.filters.assetFilter === 'complete' && !hasCompleteArt) {
        return false
      }

      if (filterState.filters.assetFilter === 'missing' && hasCompleteArt) {
        return false
      }

      return matchesPetQuery(pet, filterState.filters.query)
    })

    return randomOrderSeed === null ? nextPets : shufflePets(nextPets, randomOrderSeed)
  }, [filterState.filters.assetFilter, filterState.filters.query, filterState.filters.sourceFilter, pets, randomOrderSeed])
  const visiblePets = useMemo(
    () => (filterState.filters.showAllResults ? filteredPets : filteredPets.slice(0, MAX_VISIBLE_PETS)),
    [filterState.filters.showAllResults, filteredPets],
  )
  const animationByPetId = useMemo(() => new Map(animations.map((animation) => [animation.petId, animation])), [animations])
  const canToggleResultVisibility = filteredPets.length > MAX_VISIBLE_PETS
  const activeFilterCount =
    Number(filterState.filters.query.trim().length > 0) +
    Number(filterState.filters.sourceFilter !== 'all') +
    Number(filterState.filters.assetFilter !== 'all')
  const summary = useMemo(
    () => ({
      total: pets.length,
      gems: pets.filter((pet) => pet.acquisition.kind === 'gems').length,
      premium: pets.filter((pet) => pet.acquisition.kind === 'premium').length,
      patron: pets.filter((pet) => pet.acquisition.kind === 'patron').length,
      unavailable: pets.filter((pet) => pet.acquisition.kind === 'not-yet-available').length,
      completeArt: pets.filter((pet) => pet.icon && pet.illustration).length,
    }),
    [pets],
  )
  const motion = useWorkbenchResultsMotion({
    storageKey: 'pets',
    locationSearch: filterState.locationSearch,
    stateStatus: state.status,
    filteredCount: filteredPets.length,
    visibleCount: visiblePets.length,
    showAllResults: filterState.filters.showAllResults,
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

  return {
    locale,
    t,
    state,
    filters: filterState.filters,
    ui: {
      shareLinkState,
      shareButtonLabel,
      hasRandomOrder: randomOrderSeed !== null,
      showResultsQuickNavTop: motion.showResultsQuickNavTop,
    },
    results: {
      filteredPets,
      visiblePets,
      animationByPetId,
      canToggleResultVisibility,
    },
    summary,
    activeFilterCount,
    totalPets: pets.length,
    resultsPaneRef: motion.resultsPaneRef,
    actions: {
      updateQuery: (value) => runFilterMutation(() => filterState.setQuery(value)),
      updateSourceFilter: (value) => runFilterMutation(() => filterState.setSourceFilter(value)),
      updateAssetFilter: (value) => runFilterMutation(() => filterState.setAssetFilter(value)),
      clearAllFilters: () => {
        motion.prepareResultsViewportTransition('filters')
        filterState.setShowAllResults(false)
        filterState.setQuery('')
        filterState.setSourceFilter('all')
        filterState.setAssetFilter('all')
      },
      toggleResultVisibility: () => {
        motion.prepareResultsViewportTransition('visibility')
        filterState.setShowAllResults((current) => !current)
      },
      randomizeResultOrder: () => setRandomOrderSeed((current) => (current === null ? 1 : current + 1)),
      scrollResultsToTop: motion.scrollResultsToTop,
      copyCurrentLink,
    },
  }
}
