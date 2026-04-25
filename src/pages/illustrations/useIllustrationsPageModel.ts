import { useCallback, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useI18n } from '../../app/i18n'
import { saveWorkbenchResultsPaneScroll, useWorkbenchResultsMotion } from '../../components/workbench/useWorkbenchResultsMotion'
import { useWorkbenchShareLink } from '../../components/workbench/useWorkbenchShareLink'
import type { Champion, ChampionAnimation, ChampionIllustration, LocalizedText } from '../../domain/types'
import { collectAttributeFilterOptions, groupMechanicOptions, seatOptions } from '../../features/champion-filters/options'
import { filterIllustrations } from '../../rules/illustrationFilter'
import { MAX_VISIBLE_ILLUSTRATIONS } from './constants'
import { buildIllustrationFilterActions } from './illustration-filter-actions'
import {
  buildActiveIllustrationFilterChips,
  buildIllustrationEntries,
  countIllustrationEntriesByKind,
  countIllustrationsByKind,
  hasActiveIllustrationFilters,
  shuffleIllustrationEntries,
} from './illustration-model'
import { buildFilterSearchParams } from './query-state'
import type { IllustrationsPageActions, IllustrationsPageModel } from './types'
import { useIllustrationCollectionState } from './useIllustrationCollectionState'
import { useIllustrationFilterState } from './useIllustrationFilterState'
import { useVisibleIllustrationEntries } from './useVisibleIllustrationEntries'

const EMPTY_ILLUSTRATIONS: ChampionIllustration[] = []
const EMPTY_ANIMATIONS: ChampionAnimation[] = []
const EMPTY_CHAMPIONS: Champion[] = []
const EMPTY_STRINGS: string[] = []
const EMPTY_LOCALIZED_TEXTS: LocalizedText[] = []

export function useIllustrationsPageModel(): IllustrationsPageModel {
  const location = useLocation()
  const { locale, t } = useI18n()
  const state = useIllustrationCollectionState()
  const [randomOrderSeed, setRandomOrderSeed] = useState<number | null>(null)
  const {
    filters,
    isIdentityFiltersExpanded,
    isMetaFiltersExpanded,
    setSearch,
    setViewFilter,
    setSelectedSeats,
    setSelectedRoles,
    setSelectedAffiliations,
    setSelectedRaces,
    setSelectedGenders,
    setSelectedAlignments,
    setSelectedProfessions,
    setSelectedAcquisitions,
    setSelectedMechanics,
    setShowAllResults,
    toggleIdentityFiltersExpanded,
    toggleMetaFiltersExpanded,
  } = useIllustrationFilterState()

  const illustrations = state.status === 'ready' ? state.illustrations : EMPTY_ILLUSTRATIONS
  const animations = state.status === 'ready' ? state.animations : EMPTY_ANIMATIONS
  const champions = state.status === 'ready' ? state.champions : EMPTY_CHAMPIONS
  const roles = state.status === 'ready' ? state.roles : EMPTY_STRINGS
  const affiliations = state.status === 'ready' ? state.affiliations : EMPTY_LOCALIZED_TEXTS
  const championMap = useMemo(() => new Map(champions.map((champion) => [champion.id, champion])), [champions])
  const animationByIllustrationId = useMemo(() => new Map(animations.map((animation) => [animation.id, animation])), [animations])
  const availableChampionIds = useMemo(() => new Set(illustrations.map((illustration) => illustration.championId)), [illustrations])
  const availableChampions = useMemo(
    () => champions.filter((champion) => availableChampionIds.has(champion.id)),
    [availableChampionIds, champions],
  )
  const availableRoles = useMemo(() => new Set(availableChampions.flatMap((champion) => champion.roles)), [availableChampions])
  const availableAffiliationIds = useMemo(
    () => new Set(availableChampions.flatMap((champion) => champion.affiliations.map((affiliation) => affiliation.original))),
    [availableChampions],
  )
  const illustrationEntries = useMemo(
    () => buildIllustrationEntries(illustrations, championMap),
    [championMap, illustrations],
  )
  const filteredIllustrationEntries = useMemo(
    () =>
      filterIllustrations(illustrationEntries, {
        search: filters.search,
        seats: filters.selectedSeats,
        kinds: filters.scope === 'all' ? [] : [filters.scope],
        roles: filters.selectedRoles,
        affiliations: filters.selectedAffiliations,
        races: filters.selectedRaces,
        genders: filters.selectedGenders,
        alignments: filters.selectedAlignments,
        professions: filters.selectedProfessions,
        acquisitions: filters.selectedAcquisitions,
        mechanics: filters.selectedMechanics,
      }),
    [illustrationEntries, filters],
  )
  const orderedIllustrationEntries = useMemo(
    () =>
      randomOrderSeed === null
        ? filteredIllustrationEntries
        : shuffleIllustrationEntries(filteredIllustrationEntries, randomOrderSeed),
    [filteredIllustrationEntries, randomOrderSeed],
  )
  const visibleIllustrationEntries = useVisibleIllustrationEntries(
    orderedIllustrationEntries,
    filters.showAllResults,
  )
  const roleOptions = roles.filter((role) => availableRoles.has(role))
  const affiliationOptions = affiliations.filter((affiliation) => availableAffiliationIds.has(affiliation.original))
  const raceOptions = collectAttributeFilterOptions(availableChampions, 'race', locale)
  const genderOptions = collectAttributeFilterOptions(availableChampions, 'gender', locale)
  const alignmentOptions = collectAttributeFilterOptions(availableChampions, 'alignment', locale)
  const professionOptions = collectAttributeFilterOptions(availableChampions, 'profession', locale)
  const acquisitionOptions = collectAttributeFilterOptions(availableChampions, 'acquisition', locale)
  const mechanicOptions = collectAttributeFilterOptions(availableChampions, 'mechanics', locale)
  const mechanicOptionGroups = groupMechanicOptions(mechanicOptions)
  const orderedSelectedSeats = seatOptions.filter((seat) => filters.selectedSeats.includes(seat))
  const orderedSelectedRoles = roleOptions.filter((role) => filters.selectedRoles.includes(role))
  const orderedSelectedAffiliations = affiliations.filter((affiliation) => filters.selectedAffiliations.includes(affiliation.original))
  const orderedSelectedRaces = raceOptions.filter((race) => filters.selectedRaces.includes(race))
  const orderedSelectedGenders = genderOptions.filter((gender) => filters.selectedGenders.includes(gender))
  const orderedSelectedAlignments = alignmentOptions.filter((alignment) => filters.selectedAlignments.includes(alignment))
  const orderedSelectedProfessions = professionOptions.filter((profession) => filters.selectedProfessions.includes(profession))
  const orderedSelectedAcquisitions = acquisitionOptions.filter((acquisition) => filters.selectedAcquisitions.includes(acquisition))
  const orderedSelectedMechanics = mechanicOptions.filter((mechanic) => filters.selectedMechanics.includes(mechanic))
  const activeFilterChips = buildActiveIllustrationFilterChips({
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
  const hasActiveFilters = hasActiveIllustrationFilters(filters)
  const { totalHeroCount, totalSkinCount } = countIllustrationsByKind(illustrations)
  const filteredKindCounts = countIllustrationEntriesByKind(orderedIllustrationEntries)
  const identityFiltersSelectedCount =
    filters.selectedRaces.length + filters.selectedGenders.length + filters.selectedAlignments.length
  const metaFiltersSelectedCount =
    filters.selectedProfessions.length + filters.selectedAcquisitions.length + filters.selectedMechanics.length
  const transitionKey = useMemo(() => buildFilterSearchParams(filters).toString(), [filters])
  const motion = useWorkbenchResultsMotion({
    storageKey: 'illustrations',
    locationSearch: location.search,
    stateStatus: state.status,
    filteredCount: orderedIllustrationEntries.length,
    visibleCount: visibleIllustrationEntries.length,
    showAllResults: filters.showAllResults,
    transitionKey,
  })
  const { shareLinkState, copyCurrentLink } = useWorkbenchShareLink(location.pathname, location.search, location.hash)
  const saveListScroll = useCallback(() => {
    saveWorkbenchResultsPaneScroll('illustrations', location.search, motion.resultsPaneRef.current?.scrollTop ?? 0)
  }, [location.search, motion.resultsPaneRef])

  function runFilterMutation(mutation: () => void) {
    motion.prepareResultsViewportTransition('filters')
    setShowAllResults(false)
    mutation()
  }

  const filterActions = buildIllustrationFilterActions({
    runFilterMutation,
    setSearch,
    setViewFilter,
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

  const actions: IllustrationsPageActions = {
    ...filterActions,
    toggleIdentityFiltersExpanded,
    toggleMetaFiltersExpanded,
    toggleResultVisibility: () => {
      motion.prepareResultsViewportTransition('visibility')
      setShowAllResults((current) => !current)
    },
    randomizeResultOrder: () => setRandomOrderSeed((current) => (current === null ? 1 : current + 1)),
    saveListScroll,
    scrollResultsToTop: motion.scrollResultsToTop,
    copyCurrentLink,
  }

  return {
    locale,
    t,
    state,
    filters,
    ui: {
      isIdentityFiltersExpanded,
      isMetaFiltersExpanded,
      shareLinkState,
      hasRandomOrder: randomOrderSeed !== null,
      showResultsQuickNavTop: motion.showResultsQuickNavTop,
    },
    options: {
      roleOptions,
      affiliationOptions,
      raceOptions,
      genderOptions,
      alignmentOptions,
      professionOptions,
      acquisitionOptions,
      mechanicOptions,
      mechanicOptionGroups,
    },
    results: {
      illustrations,
      filteredIllustrationEntries: orderedIllustrationEntries,
      visibleIllustrationEntries,
      totalHeroCount,
      totalSkinCount,
      filteredHeroCount: filteredKindCounts.totalHeroCount,
      filteredSkinCount: filteredKindCounts.totalSkinCount,
      canToggleResultVisibility: orderedIllustrationEntries.length > MAX_VISIBLE_ILLUSTRATIONS,
    },
    animationByIllustrationId,
    activeFilterChips,
    activeFilters,
    hasActiveFilters,
    identityFiltersSelectedCount,
    metaFiltersSelectedCount,
    resultsPaneRef: motion.resultsPaneRef,
    actions,
  }
}
