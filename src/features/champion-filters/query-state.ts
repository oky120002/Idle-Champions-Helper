import {
  appendSortedStringValues,
  readSearchValue,
  readSeatValues,
  readStringValues,
} from './query'

export interface CommonFilterSearchParamKeys {
  query: string
  seat: string
  role: string
  affiliation: string
  race: string
  gender: string
  alignment: string
  profession: string
  acquisition: string
  mechanic: string
}

export interface CommonFilterSearchState {
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
}

export interface CommonFilterExpansionState {
  identity: boolean
  meta: boolean
}

export function appendCommonFilterSearchParams(
  searchParams: URLSearchParams,
  filters: CommonFilterSearchState,
  keys: CommonFilterSearchParamKeys,
): URLSearchParams {
  const normalizedSearch = filters.search.trim()

  if (normalizedSearch) {
    searchParams.set(keys.query, normalizedSearch)
  }

  filters.selectedSeats
    .slice()
    .sort((left, right) => left - right)
    .forEach((seat) => searchParams.append(keys.seat, String(seat)))
  appendSortedStringValues(searchParams, keys.role, filters.selectedRoles)
  appendSortedStringValues(searchParams, keys.affiliation, filters.selectedAffiliations)
  appendSortedStringValues(searchParams, keys.race, filters.selectedRaces)
  appendSortedStringValues(searchParams, keys.gender, filters.selectedGenders)
  appendSortedStringValues(searchParams, keys.alignment, filters.selectedAlignments)
  appendSortedStringValues(searchParams, keys.profession, filters.selectedProfessions)
  appendSortedStringValues(searchParams, keys.acquisition, filters.selectedAcquisitions)
  appendSortedStringValues(searchParams, keys.mechanic, filters.selectedMechanics)

  return searchParams
}

export function readCommonFilterState(
  searchParams: URLSearchParams,
  keys: CommonFilterSearchParamKeys,
): CommonFilterSearchState {
  return {
    search: readSearchValue(searchParams),
    selectedSeats: readSeatValues(searchParams),
    selectedRoles: readStringValues(searchParams, keys.role),
    selectedAffiliations: readStringValues(searchParams, keys.affiliation),
    selectedRaces: readStringValues(searchParams, keys.race),
    selectedGenders: readStringValues(searchParams, keys.gender),
    selectedAlignments: readStringValues(searchParams, keys.alignment),
    selectedProfessions: readStringValues(searchParams, keys.profession),
    selectedAcquisitions: readStringValues(searchParams, keys.acquisition),
    selectedMechanics: readStringValues(searchParams, keys.mechanic),
  }
}

export function readCommonFilterExpansion(
  searchParams: URLSearchParams,
  keys: CommonFilterSearchParamKeys,
): CommonFilterExpansionState {
  return {
    identity:
      readStringValues(searchParams, keys.race).length > 0 ||
      readStringValues(searchParams, keys.gender).length > 0 ||
      readStringValues(searchParams, keys.alignment).length > 0,
    meta:
      readStringValues(searchParams, keys.profession).length > 0 ||
      readStringValues(searchParams, keys.acquisition).length > 0 ||
      readStringValues(searchParams, keys.mechanic).length > 0,
  }
}
