import { useMemo } from 'react'
import type { AppLocale } from '../../app/i18n'
import type { OwnedHero } from '../../domain/user-profile/types'
import type { ActiveFilterChip } from '../../features/champion-filters/types'
import { collectAttributeFilterOptions, groupMechanicOptions, seatOptions } from '../../features/champion-filters/options'
import { championFilterSnapshotToFilters, filterChampions, hasActiveChampionFilters } from '../../rules/championFilter'
import { buildActiveFilterChips } from '../champions/champion-filter-model'
import {
  buildChampionRosterSeatColumns,
  buildChampionRosterSummary,
  buildOwnedHeroById,
} from '../champions/championRoster'
import type { ChampionState, ChampionsFilterState, ChampionsPageTranslator } from '../champions/types'
import type { UserHeroesRosterMetricFilterId } from './types'

type UseUserHeroesPageDerivedOptions = {
  locale: AppLocale
  t: ChampionsPageTranslator
  state: ChampionState
  filters: ChampionsFilterState
  ownedHeroes: OwnedHero[]
  activeRosterMetricFilterId: UserHeroesRosterMetricFilterId | null
}

function matchesRosterMetric(ownedHero: OwnedHero | null, filterId: UserHeroesRosterMetricFilterId): boolean {
  if (!ownedHero) {
    return false
  }

  switch (filterId) {
    case 'owned':
      return true
    case 'epic-slots':
      return Object.values(ownedHero.lootBySlot).some((slot) => slot.rarity >= 4)
    case 'shiny-slots':
      return Object.values(ownedHero.lootBySlot).some((slot) => slot.gild === 1)
    case 'golden-slots':
      return Object.values(ownedHero.lootBySlot).some((slot) => slot.gild === 2)
    case 'legendary-slots':
      return Object.keys(ownedHero.legendaryBySlot).length > 0
  }
}

function buildRosterMetricMatchedChampionIds(
  championIds: string[],
  ownedHeroById: ReadonlyMap<string, OwnedHero>,
  activeRosterMetricFilterId: UserHeroesRosterMetricFilterId | null,
): Set<string> {
  if (activeRosterMetricFilterId === null) {
    return new Set(championIds)
  }

  return new Set(
    championIds.filter((championId) => matchesRosterMetric(ownedHeroById.get(championId) ?? null, activeRosterMetricFilterId)),
  )
}

function getRosterMetricChipLabel(
  filterId: UserHeroesRosterMetricFilterId,
  t: ChampionsPageTranslator,
): string {
  switch (filterId) {
    case 'owned':
      return t("顶部指标：已拥有英雄")
    case 'epic-slots':
      return t("顶部指标：史诗装备槽位")
    case 'shiny-slots':
      return t("顶部指标：闪耀槽位")
    case 'golden-slots':
      return t("顶部指标：金装槽位")
    case 'legendary-slots':
      return t("顶部指标：传奇装备位")
  }
}

export function useUserHeroesPageDerived({
  locale,
  t,
  state,
  filters,
  ownedHeroes,
  activeRosterMetricFilterId,
}: UseUserHeroesPageDerivedOptions) {
  const baseFilteredChampions = useMemo(() => {
    if (state.status !== 'ready') {
      return []
    }

    return filterChampions(state.champions, championFilterSnapshotToFilters(filters))
  }, [filters, state])
  const ownedHeroById = useMemo(() => buildOwnedHeroById(ownedHeroes), [ownedHeroes])
  const filteredChampionIds = useMemo(
    () => baseFilteredChampions.map((champion) => champion.id),
    [baseFilteredChampions],
  )
  const matchedChampionIds = useMemo(
    () => buildRosterMetricMatchedChampionIds(filteredChampionIds, ownedHeroById, activeRosterMetricFilterId),
    [activeRosterMetricFilterId, filteredChampionIds, ownedHeroById],
  )
  const filteredChampions = useMemo(
    () => baseFilteredChampions.filter((champion) => matchedChampionIds.has(champion.id)),
    [baseFilteredChampions, matchedChampionIds],
  )
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
  const patrons = state.status === 'ready' ? state.patrons : []
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
  const orderedSelectedPatrons = patrons.filter((patron) => filters.selectedPatrons.includes(patron.id))

  const baseActiveFilterChips = buildActiveFilterChips({
    locale,
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
    orderedSelectedPatrons,
  })
  const rosterMetricChip: ActiveFilterChip | null = activeRosterMetricFilterId != null
    ? {
        id: 'roster-metric',
        label: getRosterMetricChipLabel(activeRosterMetricFilterId, t),
        clearLabel: t("清空顶部指标筛选"),
      }
    : null
  const activeFilterChips = [
    ...baseActiveFilterChips,
    ...(rosterMetricChip ? [rosterMetricChip] : []),
  ]
  const activeFilters = activeFilterChips.map((chip) => chip.label)
  const hasActiveFilters = hasActiveChampionFilters(filters) || activeRosterMetricFilterId !== null
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
    patrons,
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
