import { useMemo } from 'react'
import type { AppLocale } from '../../app/i18n'
import type { OwnedHero } from '../../domain/user-profile/types'
import type { ActiveFilterChip } from '../../features/champion-filters/types'
import { collectAttributeFilterOptions, groupMechanicOptions, seatOptions } from '../../features/champion-filters/options'
import { filterChampions } from '../../rules/championFilter'
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
      return t({ zh: '顶部指标：已拥有英雄', en: 'Top metric: Owned champions' })
    case 'epic-slots':
      return t({ zh: '顶部指标：史诗装备槽位', en: 'Top metric: Epic equipment slots' })
    case 'shiny-slots':
      return t({ zh: '顶部指标：闪耀槽位', en: 'Top metric: Shiny slots' })
    case 'golden-slots':
      return t({ zh: '顶部指标：金装槽位', en: 'Top metric: Golden slots' })
    case 'legendary-slots':
      return t({ zh: '顶部指标：传奇装备位', en: 'Top metric: Legendary equipment slots' })
  }
}

type ReadyChampionState = Extract<ChampionState, { status: 'ready' }>

function collectChampionFilterOptions(state: ReadyChampionState, locale: AppLocale) {
  return {
    roles: state.roles,
    affiliations: state.affiliations,
    raceOptions: collectAttributeFilterOptions(state.champions, 'race', locale),
    genderOptions: collectAttributeFilterOptions(state.champions, 'gender', locale),
    alignmentOptions: collectAttributeFilterOptions(state.champions, 'alignment', locale),
    professionOptions: collectAttributeFilterOptions(state.champions, 'profession', locale),
    acquisitionOptions: collectAttributeFilterOptions(state.champions, 'acquisition', locale),
    mechanicOptions: collectAttributeFilterOptions(state.champions, 'mechanics', locale),
  }
}

function buildOrderedSelectedFilters(
  filters: ChampionsFilterState,
  opts: ReturnType<typeof collectChampionFilterOptions>,
) {
  return {
    orderedSelectedSeats: seatOptions.filter((seat) => filters.selectedSeats.includes(seat)),
    orderedSelectedRoles: opts.roles.filter((role) => filters.selectedRoles.includes(role)),
    orderedSelectedAffiliations: opts.affiliations.filter((affiliation) =>
      filters.selectedAffiliations.includes(affiliation.original),
    ),
    orderedSelectedRaces: opts.raceOptions.filter((race) => filters.selectedRaces.includes(race)),
    orderedSelectedGenders: opts.genderOptions.filter((gender) => filters.selectedGenders.includes(gender)),
    orderedSelectedAlignments: opts.alignmentOptions.filter((alignment) => filters.selectedAlignments.includes(alignment)),
    orderedSelectedProfessions: opts.professionOptions.filter((profession) =>
      filters.selectedProfessions.includes(profession),
    ),
    orderedSelectedAcquisitions: opts.acquisitionOptions.filter((acquisition) =>
      filters.selectedAcquisitions.includes(acquisition),
    ),
    orderedSelectedMechanics: opts.mechanicOptions.filter((mechanic) => filters.selectedMechanics.includes(mechanic)),
  }
}

function hasActiveChampionFilters(filters: ChampionsFilterState, activeRosterMetricFilterId: UserHeroesRosterMetricFilterId | null): boolean {
  if (filters.search.trim().length > 0) return true
  if (filters.selectedSeats.length > 0) return true
  if (filters.selectedRoles.length > 0) return true
  if (filters.selectedAffiliations.length > 0) return true
  if (filters.selectedRaces.length > 0) return true
  if (filters.selectedGenders.length > 0) return true
  if (filters.selectedAlignments.length > 0) return true
  if (filters.selectedProfessions.length > 0) return true
  if (filters.selectedAcquisitions.length > 0) return true
  if (filters.selectedMechanics.length > 0) return true
  return activeRosterMetricFilterId !== null
}

function useFilteredChampionPipeline(
  state: ChampionState,
  filters: ChampionsFilterState,
  ownedHeroes: OwnedHero[],
  activeRosterMetricFilterId: UserHeroesRosterMetricFilterId | null,
) {
  const baseFilteredChampions = useMemo(() => {
    if (state.status !== 'ready') return []
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

  const ownedHeroById = useMemo(() => buildOwnedHeroById(ownedHeroes), [ownedHeroes])
  const filteredChampionIds = useMemo(() => baseFilteredChampions.map((c) => c.id), [baseFilteredChampions])
  const matchedChampionIds = useMemo(
    () => buildRosterMetricMatchedChampionIds(filteredChampionIds, ownedHeroById, activeRosterMetricFilterId),
    [activeRosterMetricFilterId, filteredChampionIds, ownedHeroById],
  )
  const filteredChampions = useMemo(
    () => baseFilteredChampions.filter((c) => matchedChampionIds.has(c.id)),
    [baseFilteredChampions, matchedChampionIds],
  )

  return { ownedHeroById, matchedChampionIds, filteredChampions }
}

function useRosterData(
  state: ChampionState,
  ownedHeroes: OwnedHero[],
  matchedChampionIds: Set<string>,
  ownedHeroById: ReadonlyMap<string, OwnedHero>,
  filteredChampions: readonly { readonly id: string; readonly seat: number }[],
) {
  const rosterSeatColumns = useMemo(
    () => state.status === 'ready' ? buildChampionRosterSeatColumns(state.champions, matchedChampionIds, ownedHeroById) : [],
    [matchedChampionIds, ownedHeroById, state],
  )
  const rosterSummary = useMemo(
    () => state.status === 'ready' ? buildChampionRosterSummary(state.champions, ownedHeroes, matchedChampionIds) : null,
    [matchedChampionIds, ownedHeroes, state],
  )
  const heroIllustrationByChampionId = useMemo(
    () => state.status === 'ready' ? new Map(state.heroIllustrations.map((illu) => [illu.championId, illu])) : new Map(),
    [state],
  )
  const matchedSeats = useMemo(() => new Set(filteredChampions.map((c) => c.seat)).size, [filteredChampions])

  return { rosterSeatColumns, rosterSummary, heroIllustrationByChampionId, matchedSeats }
}

function buildActiveFilterChipList(
  locale: AppLocale,
  t: ChampionsPageTranslator,
  filters: ChampionsFilterState,
  filterOptions: ReturnType<typeof collectChampionFilterOptions> | null,
  activeRosterMetricFilterId: UserHeroesRosterMetricFilterId | null,
): ActiveFilterChip[] {
  if (!filterOptions) return []
  const orderedSelected = buildOrderedSelectedFilters(filters, filterOptions)
  const baseActiveFilterChips = buildActiveFilterChips({ locale, t, filters, ...orderedSelected })
  const rosterMetricChip: ActiveFilterChip | null = activeRosterMetricFilterId
    ? {
        id: 'roster-metric',
        label: getRosterMetricChipLabel(activeRosterMetricFilterId, t),
        clearLabel: t({ zh: '清空顶部指标筛选', en: 'Clear top metric filter' }),
      }
    : null
  return [...baseActiveFilterChips, ...(rosterMetricChip ? [rosterMetricChip] : [])]
}

export function useUserHeroesPageDerived({
  locale,
  t,
  state,
  filters,
  ownedHeroes,
  activeRosterMetricFilterId,
}: UseUserHeroesPageDerivedOptions) {
  const { ownedHeroById, matchedChampionIds, filteredChampions } = useFilteredChampionPipeline(
    state, filters, ownedHeroes, activeRosterMetricFilterId,
  )
  const { rosterSeatColumns, rosterSummary, heroIllustrationByChampionId, matchedSeats } = useRosterData(
    state, ownedHeroes, matchedChampionIds, ownedHeroById, filteredChampions,
  )

  const filterOptions = state.status === 'ready' ? collectChampionFilterOptions(state, locale) : null
  const activeFilterChips = buildActiveFilterChipList(locale, t, filters, filterOptions, activeRosterMetricFilterId)
  const activeFilters = activeFilterChips.map((chip) => chip.label)
  const hasActiveFilters = hasActiveChampionFilters(filters, activeRosterMetricFilterId)
  const mechanicOptionGroups = groupMechanicOptions(filterOptions?.mechanicOptions ?? [])
  const identityFiltersSelectedCount =
    filters.selectedRaces.length + filters.selectedGenders.length + filters.selectedAlignments.length
  const metaFiltersSelectedCount =
    filters.selectedProfessions.length + filters.selectedAcquisitions.length + filters.selectedMechanics.length

  return {
    roles: filterOptions?.roles ?? [],
    affiliations: filterOptions?.affiliations ?? [],
    raceOptions: filterOptions?.raceOptions ?? [],
    genderOptions: filterOptions?.genderOptions ?? [],
    alignmentOptions: filterOptions?.alignmentOptions ?? [],
    professionOptions: filterOptions?.professionOptions ?? [],
    acquisitionOptions: filterOptions?.acquisitionOptions ?? [],
    mechanicOptions: filterOptions?.mechanicOptions ?? [],
    mechanicOptionGroups,
    activeFilterChips,
    activeFilters,
    filteredChampions,
    rosterSeatColumns,
    rosterSummary,
    heroIllustrationByChampionId,
    matchedSeats,
    hasActiveFilters,
    identityFiltersSelectedCount,
    metaFiltersSelectedCount,
  }
}
