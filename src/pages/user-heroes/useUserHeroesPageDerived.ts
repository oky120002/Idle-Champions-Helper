import { useMemo } from 'react'
import type { AppLocale } from '../../app/i18n'
import type { OwnedHero } from '../../domain/user-profile/types'
import { collectAttributeFilterOptions, groupMechanicOptions, seatOptions } from '../../features/champion-filters/options'
import { filterChampions } from '../../rules/championFilter'
import { buildActiveFilterChips } from '../champions/champion-filter-model'
import {
  buildChampionRosterSeatColumns,
  buildChampionRosterSummary,
  buildOwnedHeroById,
} from '../champions/championRoster'
import type { ChampionState, ChampionsFilterState, ChampionsPageTranslator } from '../champions/types'

type UseUserHeroesPageDerivedOptions = {
  locale: AppLocale
  t: ChampionsPageTranslator
  state: ChampionState
  filters: ChampionsFilterState
  ownedHeroes: OwnedHero[]
}

export function useUserHeroesPageDerived({
  locale,
  t,
  state,
  filters,
  ownedHeroes,
}: UseUserHeroesPageDerivedOptions) {
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
  const matchedChampionIds = useMemo(
    () => new Set(filteredChampions.map((champion) => champion.id)),
    [filteredChampions],
  )
  const ownedHeroById = useMemo(() => buildOwnedHeroById(ownedHeroes), [ownedHeroes])
  const rosterSeatColumns = useMemo(
    () => (
      state.status === 'ready'
        ? buildChampionRosterSeatColumns(state.champions, matchedChampionIds, ownedHeroById)
        : []
    ),
    [matchedChampionIds, ownedHeroById, state],
  )
  const rosterSummary = useMemo(
    () => (
      state.status === 'ready'
        ? buildChampionRosterSummary(state.champions, ownedHeroes, matchedChampionIds)
        : null
    ),
    [matchedChampionIds, ownedHeroes, state],
  )
  const heroIllustrationByChampionId = useMemo(
    () =>
      state.status === 'ready'
        ? new Map(state.heroIllustrations.map((illustration) => [illustration.championId, illustration]))
        : new Map(),
    [state],
  )
  const matchedSeats = useMemo(
    () => new Set(filteredChampions.map((champion) => champion.seat)).size,
    [filteredChampions],
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
  const mechanicOptionGroups = groupMechanicOptions(mechanicOptions)
  const identityFiltersSelectedCount =
    filters.selectedRaces.length + filters.selectedGenders.length + filters.selectedAlignments.length
  const metaFiltersSelectedCount =
    filters.selectedProfessions.length + filters.selectedAcquisitions.length + filters.selectedMechanics.length

  return {
    filteredChampions,
    rosterSeatColumns,
    rosterSummary,
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
    mechanicOptionGroups,
    identityFiltersSelectedCount,
    metaFiltersSelectedCount,
  }
}
