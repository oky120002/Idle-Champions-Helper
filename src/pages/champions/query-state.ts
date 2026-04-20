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
  appendCommonFilterSearchParams,
  readCommonFilterExpansion,
  readCommonFilterState,
  type CommonFilterSearchParamKeys,
} from '../../features/champion-filters/query-state'

const CHAMPION_FILTER_PARAM_KEYS: CommonFilterSearchParamKeys = {
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
}

export function readShowAllResults(searchParams: URLSearchParams): boolean {
  return searchParams.get(SEARCH_PARAM_VIEW) === RESULTS_VIEW_ALL
}

export function buildFilterSearchParams(filters: ChampionsFilterState): URLSearchParams {
  const searchParams = new URLSearchParams()
  appendCommonFilterSearchParams(searchParams, filters, CHAMPION_FILTER_PARAM_KEYS)

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
    ...readCommonFilterState(searchParams, CHAMPION_FILTER_PARAM_KEYS),
    showAllResults: readShowAllResults(searchParams),
  }
}

export function readInitialFilterExpansion(search: string): {
  identity: boolean
  meta: boolean
} {
  return readCommonFilterExpansion(new URLSearchParams(search), CHAMPION_FILTER_PARAM_KEYS)
}
