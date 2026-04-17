import {
  DEFAULT_SCROLL_KEY,
  RESULTS_VIEW_ALL,
  SEARCH_PARAM_ACQUISITION,
  SEARCH_PARAM_AFFILIATION,
  SEARCH_PARAM_ALIGNMENT,
  SEARCH_PARAM_GENDER,
  SEARCH_PARAM_MECHANIC,
  SEARCH_PARAM_PROFESSION,
  SEARCH_PARAM_QUERY,
  SEARCH_PARAM_RACE,
  SEARCH_PARAM_ROLE,
  SEARCH_PARAM_SEAT,
  SEARCH_PARAM_VIEW,
} from './constants'
import type { ChampionsFilterState } from './types'
import {
  appendSortedStringValues,
  readSearchValue,
  readSeatValues,
  readStringValues,
} from '../../features/champion-filters/query'

export function readShowAllResults(searchParams: URLSearchParams): boolean {
  return searchParams.get(SEARCH_PARAM_VIEW) === RESULTS_VIEW_ALL
}

export function buildFilterSearchParams(filters: ChampionsFilterState): URLSearchParams {
  const searchParams = new URLSearchParams()
  const normalizedSearch = filters.search.trim()

  if (normalizedSearch) {
    searchParams.set(SEARCH_PARAM_QUERY, normalizedSearch)
  }

  filters.selectedSeats
    .slice()
    .sort((left, right) => left - right)
    .forEach((seat) => searchParams.append(SEARCH_PARAM_SEAT, String(seat)))
  appendSortedStringValues(searchParams, SEARCH_PARAM_ROLE, filters.selectedRoles)
  appendSortedStringValues(searchParams, SEARCH_PARAM_AFFILIATION, filters.selectedAffiliations)
  appendSortedStringValues(searchParams, SEARCH_PARAM_RACE, filters.selectedRaces)
  appendSortedStringValues(searchParams, SEARCH_PARAM_GENDER, filters.selectedGenders)
  appendSortedStringValues(searchParams, SEARCH_PARAM_ALIGNMENT, filters.selectedAlignments)
  appendSortedStringValues(searchParams, SEARCH_PARAM_PROFESSION, filters.selectedProfessions)
  appendSortedStringValues(searchParams, SEARCH_PARAM_ACQUISITION, filters.selectedAcquisitions)
  appendSortedStringValues(searchParams, SEARCH_PARAM_MECHANIC, filters.selectedMechanics)

  if (filters.showAllResults) {
    searchParams.set(SEARCH_PARAM_VIEW, RESULTS_VIEW_ALL)
  }

  return searchParams
}

export function buildScrollRestoreKey(search: string): string {
  return `champions-page-scroll:${search || DEFAULT_SCROLL_KEY}`
}

export function saveChampionListScroll(search: string): void {
  if (typeof window === 'undefined') {
    return
  }

  window.sessionStorage.setItem(buildScrollRestoreKey(search), String(window.scrollY))
}

export function readInitialFilterState(search: string): ChampionsFilterState {
  const searchParams = new URLSearchParams(search)

  return {
    search: readSearchValue(searchParams),
    selectedSeats: readSeatValues(searchParams),
    selectedRoles: readStringValues(searchParams, SEARCH_PARAM_ROLE),
    selectedAffiliations: readStringValues(searchParams, SEARCH_PARAM_AFFILIATION),
    selectedRaces: readStringValues(searchParams, SEARCH_PARAM_RACE),
    selectedGenders: readStringValues(searchParams, SEARCH_PARAM_GENDER),
    selectedAlignments: readStringValues(searchParams, SEARCH_PARAM_ALIGNMENT),
    selectedProfessions: readStringValues(searchParams, SEARCH_PARAM_PROFESSION),
    selectedAcquisitions: readStringValues(searchParams, SEARCH_PARAM_ACQUISITION),
    selectedMechanics: readStringValues(searchParams, SEARCH_PARAM_MECHANIC),
    showAllResults: readShowAllResults(searchParams),
  }
}

export function readInitialFilterExpansion(search: string): {
  identity: boolean
  meta: boolean
} {
  const searchParams = new URLSearchParams(search)

  return {
    identity:
      readStringValues(searchParams, SEARCH_PARAM_RACE).length > 0 ||
      readStringValues(searchParams, SEARCH_PARAM_GENDER).length > 0 ||
      readStringValues(searchParams, SEARCH_PARAM_ALIGNMENT).length > 0,
    meta:
      readStringValues(searchParams, SEARCH_PARAM_PROFESSION).length > 0 ||
      readStringValues(searchParams, SEARCH_PARAM_ACQUISITION).length > 0 ||
      readStringValues(searchParams, SEARCH_PARAM_MECHANIC).length > 0,
  }
}
