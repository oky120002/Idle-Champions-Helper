import {
  SEARCH_PARAM_ACQUISITION,
  SEARCH_PARAM_AFFILIATION,
  SEARCH_PARAM_ALIGNMENT,
  SEARCH_PARAM_GENDER,
  SEARCH_PARAM_MECHANIC,
  SEARCH_PARAM_PATRON,
  SEARCH_PARAM_PROFESSION,
  SEARCH_PARAM_QUERY,
  SEARCH_PARAM_RACE,
  SEARCH_PARAM_ROLE,
  SEARCH_PARAM_SEAT,
} from './constants'
import {
  appendSortedStringValues,
  readSearchValue,
  readSeatValues,
  readStringValues,
} from './query'

/**
 * 跨页面共享的筛选 param keys——champions / illustrations / formation 三页同名，
 * 跳转时筛选条件在 URL 中无缝传递。消费方直接引用，不再各自重复组装。
 */
export const COMMON_FILTER_PARAM_KEYS: CommonFilterSearchParamKeys = {
  query: SEARCH_PARAM_QUERY,
  seat: SEARCH_PARAM_SEAT,
  role: SEARCH_PARAM_ROLE,
  affiliation: SEARCH_PARAM_AFFILIATION,
  race: SEARCH_PARAM_RACE,
  gender: SEARCH_PARAM_GENDER,
  alignment: SEARCH_PARAM_ALIGNMENT,
  profession: SEARCH_PARAM_PROFESSION,
  acquisition: SEARCH_PARAM_ACQUISITION,
  mechanic: SEARCH_PARAM_MECHANIC,
  patron: SEARCH_PARAM_PATRON,
}

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
  patron: string
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
  selectedPatrons: string[]
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

  if (normalizedSearch !== '') {
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
  appendSortedStringValues(searchParams, keys.patron, filters.selectedPatrons)

  return searchParams
}

export function readCommonFilterState(
  searchParams: URLSearchParams,
  keys: CommonFilterSearchParamKeys,
): CommonFilterSearchState {
  return {
    search: readSearchValue(searchParams, keys.query),
    selectedSeats: readSeatValues(searchParams, keys.seat),
    selectedRoles: readStringValues(searchParams, keys.role),
    selectedAffiliations: readStringValues(searchParams, keys.affiliation),
    selectedRaces: readStringValues(searchParams, keys.race),
    selectedGenders: readStringValues(searchParams, keys.gender),
    selectedAlignments: readStringValues(searchParams, keys.alignment),
    selectedProfessions: readStringValues(searchParams, keys.profession),
    selectedAcquisitions: readStringValues(searchParams, keys.acquisition),
    selectedMechanics: readStringValues(searchParams, keys.mechanic),
    selectedPatrons: readStringValues(searchParams, keys.patron),
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
