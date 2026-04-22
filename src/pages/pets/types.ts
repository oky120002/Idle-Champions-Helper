import type { RefObject } from 'react'
import type { AppLocale, LocaleText } from '../../app/i18n'
import type { WorkbenchShareLinkState } from '../../components/filter-sidebar/useWorkbenchShareLink'
import type { Pet, PetAcquisitionKind, PetAnimation } from '../../domain/types'

export type SourceFilter = 'all' | PetAcquisitionKind
export type AssetFilter = 'all' | 'complete' | 'missing'

export type PetState =
  | { status: 'loading' }
  | { status: 'ready'; pets: Pet[]; animations: PetAnimation[] }
  | { status: 'error'; message: string }

export type PetsFilterState = {
  query: string
  sourceFilter: SourceFilter
  assetFilter: AssetFilter
  showAllResults: boolean
}

export type PetsPageTranslator = (text: LocaleText) => string

export type PetsSummary = {
  total: number
  gems: number
  premium: number
  patron: number
  unavailable: number
  completeArt: number
}

export type PetsPageUiState = {
  shareLinkState: WorkbenchShareLinkState
  shareButtonLabel: string
  hasRandomOrder: boolean
  showResultsQuickNavTop: boolean
}

export type PetsPageResults = {
  filteredPets: Pet[]
  visiblePets: Pet[]
  animationByPetId: ReadonlyMap<string, PetAnimation>
  canToggleResultVisibility: boolean
}

export type PetsPageActions = {
  updateQuery: (value: string) => void
  updateSourceFilter: (value: SourceFilter) => void
  updateAssetFilter: (value: AssetFilter) => void
  clearAllFilters: () => void
  toggleResultVisibility: () => void
  randomizeResultOrder: () => void
  scrollResultsToTop: () => void
  copyCurrentLink: () => Promise<void>
}

export type PetsPageModel = {
  locale: AppLocale
  t: PetsPageTranslator
  state: PetState
  filters: PetsFilterState
  ui: PetsPageUiState
  results: PetsPageResults
  summary: PetsSummary
  activeFilterCount: number
  totalPets: number
  resultsPaneRef: RefObject<HTMLDivElement | null>
  actions: PetsPageActions
}
