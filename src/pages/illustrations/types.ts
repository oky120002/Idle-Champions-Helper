import type { AppLocale, LocaleText } from '../../app/i18n'
import type {
  Champion,
  ChampionAnimation,
  ChampionIllustration,
  ChampionIllustrationKind,
  LocalizedText,
} from '../../domain/types'
import type { ActiveFilterChip, MechanicOptionGroup } from '../../features/champion-filters/types'
import type { FilterableIllustration } from '../../rules/illustrationFilter'

export type ViewFilter = 'all' | ChampionIllustrationKind

export type ShareLinkState = 'idle' | 'success' | 'error'

export type IllustrationState =
  | { status: 'loading' }
  | {
      status: 'ready'
      illustrations: ChampionIllustration[]
      animations: ChampionAnimation[]
      champions: Champion[]
      roles: string[]
      affiliations: LocalizedText[]
    }
  | { status: 'error'; message: string }

export type IllustrationsFilterState = {
  search: string
  scope: ViewFilter
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

export type IllustrationFilterExpansion = {
  identity: boolean
  meta: boolean
}

export type IllustrationsPageTranslator = (text: LocaleText) => string

export type IllustrationsPageUiState = {
  isIdentityFiltersExpanded: boolean
  isMetaFiltersExpanded: boolean
  shareLinkState: ShareLinkState
  shareButtonLabel: string
  hasRandomOrder: boolean
}

export type IllustrationsPageOptions = {
  roleOptions: string[]
  affiliationOptions: LocalizedText[]
  raceOptions: string[]
  genderOptions: string[]
  alignmentOptions: string[]
  professionOptions: string[]
  acquisitionOptions: string[]
  mechanicOptions: string[]
  mechanicOptionGroups: MechanicOptionGroup[]
}

export type IllustrationsPageResults = {
  illustrations: ChampionIllustration[]
  filteredIllustrationEntries: FilterableIllustration[]
  visibleIllustrationEntries: FilterableIllustration[]
  totalHeroCount: number
  totalSkinCount: number
  filteredHeroCount: number
  filteredSkinCount: number
  canToggleResultVisibility: boolean
}

export type IllustrationsPageActions = {
  updateSearch: (value: string) => void
  updateScope: (scope: ViewFilter) => void
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
  toggleIdentityFiltersExpanded: () => void
  toggleMetaFiltersExpanded: () => void
  toggleResultVisibility: () => void
  randomizeResultOrder: () => void
  copyCurrentLink: () => Promise<void>
}

export type IllustrationsPageModel = {
  locale: AppLocale
  t: IllustrationsPageTranslator
  state: IllustrationState
  filters: IllustrationsFilterState
  ui: IllustrationsPageUiState
  options: IllustrationsPageOptions
  results: IllustrationsPageResults
  animationByIllustrationId: ReadonlyMap<string, ChampionAnimation>
  activeFilterChips: ActiveFilterChip[]
  activeFilters: string[]
  hasActiveFilters: boolean
  identityFiltersSelectedCount: number
  metaFiltersSelectedCount: number
  actions: IllustrationsPageActions
}
