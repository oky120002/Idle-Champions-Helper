import type { CSSProperties, RefObject } from 'react'
import type { AppLocale, LocaleText } from '../../app/i18n'
import type { ChampionMechanicCategoryId } from '../../domain/championTags'
import type { Champion, ChampionVisual, LocalizedText } from '../../domain/types'
import type { ActiveFilterChip, MechanicOptionGroup } from '../../features/champion-filters/types'

export type ResultsTransitionReason = 'filters' | 'visibility'

export interface PendingResultsTransition {
  previousFilteredCount: number
  previousVisibleCount: number
  shouldRelocate: boolean
  targetTop: number
  reason: ResultsTransitionReason
}

export interface ResultsQuickNavigationState {
  isVisible: boolean
  canScrollTop: boolean
  canScrollBottom: boolean
}

export type ChampionState =
  | { status: 'loading' }
  | {
      status: 'ready'
      champions: Champion[]
      visuals: ChampionVisual[]
      roles: string[]
      affiliations: LocalizedText[]
    }
  | {
      status: 'error'
      message: string
    }

export interface ChampionsFilterState {
  search: string
  selectedSeats: number[]
  selectedRoles: string[]
  selectedAffiliations: string[]
  selectedRaces: string[]
  selectedGenders: string[]
  selectedAlignments: string[]
  selectedProfessions: string[]
  selectedAcquisitions: string[]
  selectedMechanics: string[]
  showAllResults: boolean
}

export interface ChampionsPageTranslator {
  (text: LocaleText): string
}

export interface ChampionsPageModel {
  locale: AppLocale
  t: ChampionsPageTranslator
  state: ChampionState
  search: string
  selectedSeats: number[]
  selectedRoles: string[]
  selectedAffiliations: string[]
  selectedRaces: string[]
  selectedGenders: string[]
  selectedAlignments: string[]
  selectedProfessions: string[]
  selectedAcquisitions: string[]
  selectedMechanics: string[]
  isIdentityFiltersExpanded: boolean
  isMetaFiltersExpanded: boolean
  activeFilterChips: ActiveFilterChip[]
  activeFilters: string[]
  hasActiveFilters: boolean
  filteredChampions: Champion[]
  visibleChampions: Champion[]
  selectedChampion: Champion | null
  selectedChampionVisual: ChampionVisual | null
  matchedSeats: number
  canToggleResultVisibility: boolean
  showAllResults: boolean
  showResultsQuickNavTop: boolean
  showResultsQuickNavBottom: boolean
  resultsShellHeight: number | null
  championsWorkspaceStyle: CSSProperties
  resultsShellRef: RefObject<HTMLElement | null>
  resultsContentRef: RefObject<HTMLDivElement | null>
  roles: string[]
  affiliations: LocalizedText[]
  raceOptions: string[]
  genderOptions: string[]
  alignmentOptions: string[]
  professionOptions: string[]
  acquisitionOptions: string[]
  mechanicOptions: string[]
  mechanicOptionGroups: MechanicOptionGroup[]
  identityFiltersSelectedCount: number
  metaFiltersSelectedCount: number
  setIdentityFiltersExpanded: (expanded: boolean) => void
  setMetaFiltersExpanded: (expanded: boolean) => void
  updateSearch: (value: string) => void
  clearAllFilters: () => void
  clearActiveFilterChip: (id: ActiveFilterChip['id']) => void
  resetSeats: () => void
  toggleSeat: (seat: number) => void
  resetRole: () => void
  toggleRole: (role: string) => void
  resetAffiliation: () => void
  toggleAffiliation: (affiliation: string) => void
  resetRace: () => void
  toggleRace: (race: string) => void
  resetGender: () => void
  toggleGender: (gender: string) => void
  resetAlignment: () => void
  toggleAlignment: (alignment: string) => void
  resetProfession: () => void
  toggleProfession: (profession: string) => void
  resetAcquisition: () => void
  toggleAcquisition: (acquisition: string) => void
  resetMechanic: () => void
  toggleMechanic: (mechanic: string) => void
  toggleResultVisibility: () => void
  toggleChampionVisual: (championId: string) => void
  clearSelectedChampion: () => void
  scrollResultsToBoundary: (direction: 'top' | 'bottom') => void
  getMechanicCategoryHint: (groupId: ChampionMechanicCategoryId) => string
  saveListScroll: () => void
  locationSearch: string
}
