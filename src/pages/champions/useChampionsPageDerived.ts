import { useMemo } from 'react'
import type { AppLocale } from '../../app/i18n'
import { collectAttributeFilterOptions, groupMechanicOptions, seatOptions } from '../../features/champion-filters/options'
import { filterChampions } from '../../rules/championFilter'
import { buildActiveFilterChips } from './champion-filter-model'
import { shuffleChampions } from './champion-results-order'
import { MAX_VISIBLE_RESULTS } from './constants'
import type { ChampionState, ChampionsFilterState, ChampionsPageTranslator } from './types'

type UseChampionsPageDerivedOptions = {
  locale: AppLocale
  t: ChampionsPageTranslator
  state: ChampionState
  filters: ChampionsFilterState
  randomOrderSeed: number | null
  selectedChampionId: string | null
}

export function useChampionsPageDerived({
  locale,
  t,
  state,
  filters,
  randomOrderSeed,
  selectedChampionId,
}: UseChampionsPageDerivedOptions) {
  const filteredChampions = useMemo(() => {
    if (state.status !== 'ready') {
      return []
    }

    return filterChampions(state.champions, {
      search: filters.search,
      seats: filters.selectedSeats,
      roles: filters.selectedRoles,
      affiliations: filters.selectedAffiliations,
      races: filters.selectedRaces,
      genders: filters.selectedGenders,
      alignments: filters.selectedAlignments,
      professions: filters.selectedProfessions,
      acquisitions: filters.selectedAcquisitions,
      mechanics: filters.selectedMechanics,
    })
  }, [filters, state])
  const orderedChampions = useMemo(
    () => (randomOrderSeed === null ? filteredChampions : shuffleChampions(filteredChampions, randomOrderSeed)),
    [filteredChampions, randomOrderSeed],
  )

  const visibleChampions = useMemo(
    () => (filters.showAllResults ? orderedChampions : orderedChampions.slice(0, MAX_VISIBLE_RESULTS)),
    [filters.showAllResults, orderedChampions],
  )
  const selectedChampion = useMemo(
    () =>
      selectedChampionId !== null
        ? visibleChampions.find((champion) => champion.id === selectedChampionId) ?? null
        : null,
    [selectedChampionId, visibleChampions],
  )
  const selectedChampionVisual = useMemo(
    () =>
      state.status === 'ready' && selectedChampion
        ? state.visuals.find((visual) => visual.championId === selectedChampion.id) ?? null
        : null,
    [selectedChampion, state],
  )
  const heroIllustrationByChampionId = useMemo(
    () =>
      state.status === 'ready'
        ? new Map(state.heroIllustrations.map((illustration) => [illustration.championId, illustration]))
        : new Map(),
    [state],
  )
  const matchedSeats = useMemo(
    () => new Set(orderedChampions.map((champion) => champion.seat)).size,
    [orderedChampions],
  )

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

  const orderedSelectedSeats = seatOptions.filter((seat) => filters.selectedSeats.includes(seat))
  const orderedSelectedRoles = roles.filter((role) => filters.selectedRoles.includes(role))
  const orderedSelectedAffiliations = affiliations.filter((affiliation) =>
    filters.selectedAffiliations.includes(affiliation.original),
  )
  const orderedSelectedRaces = raceOptions.filter((race) => filters.selectedRaces.includes(race))
  const orderedSelectedGenders = genderOptions.filter((gender) => filters.selectedGenders.includes(gender))
  const orderedSelectedAlignments = alignmentOptions.filter((alignment) => filters.selectedAlignments.includes(alignment))
  const orderedSelectedProfessions = professionOptions.filter((profession) =>
    filters.selectedProfessions.includes(profession),
  )
  const orderedSelectedAcquisitions = acquisitionOptions.filter((acquisition) =>
    filters.selectedAcquisitions.includes(acquisition),
  )
  const orderedSelectedMechanics = mechanicOptions.filter((mechanic) => filters.selectedMechanics.includes(mechanic))

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
    filters.search.trim().length > 0 ||
    filters.selectedSeats.length > 0 ||
    filters.selectedRoles.length > 0 ||
    filters.selectedAffiliations.length > 0 ||
    filters.selectedRaces.length > 0 ||
    filters.selectedGenders.length > 0 ||
    filters.selectedAlignments.length > 0 ||
    filters.selectedProfessions.length > 0 ||
    filters.selectedAcquisitions.length > 0 ||
    filters.selectedMechanics.length > 0
  const canToggleResultVisibility = filteredChampions.length > MAX_VISIBLE_RESULTS
  const mechanicOptionGroups = groupMechanicOptions(mechanicOptions)
  const identityFiltersSelectedCount =
    filters.selectedRaces.length + filters.selectedGenders.length + filters.selectedAlignments.length
  const metaFiltersSelectedCount =
    filters.selectedProfessions.length + filters.selectedAcquisitions.length + filters.selectedMechanics.length

  return {
    filteredChampions,
    visibleChampions,
    selectedChampion,
    selectedChampionVisual,
    heroIllustrationByChampionId,
    matchedSeats,
    roles,
    affiliations,
    raceOptions,
    genderOptions,
    alignmentOptions,
    professionOptions,
    acquisitionOptions,
    mechanicOptions,
    activeFilterChips,
    activeFilters,
    hasActiveFilters,
    canToggleResultVisibility,
    mechanicOptionGroups,
    identityFiltersSelectedCount,
    metaFiltersSelectedCount,
  }
}
