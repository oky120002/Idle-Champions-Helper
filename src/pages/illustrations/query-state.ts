import {
  appendCommonFilterSearchParams,
  readCommonFilterExpansion,
  readCommonFilterState,
  type CommonFilterSearchParamKeys,
} from '../../features/champion-filters/query-state'
import {
  RESULTS_VIEW_ALL,
  SEARCH_PARAM_ACQUISITION,
  SEARCH_PARAM_AFFILIATION,
  SEARCH_PARAM_ALIGNMENT,
  SEARCH_PARAM_GENDER,
  SEARCH_PARAM_MECHANIC,
  SEARCH_PARAM_PROFESSION,
  SEARCH_PARAM_QUERY,
  SEARCH_PARAM_RACE,
  SEARCH_PARAM_RESULTS,
  SEARCH_PARAM_ROLE,
  SEARCH_PARAM_SCOPE,
  SEARCH_PARAM_SEAT,
} from './constants'
import type { IllustrationFilterExpansion, IllustrationsFilterState, ViewFilter } from './types'

const ILLUSTRATION_FILTER_PARAM_KEYS: CommonFilterSearchParamKeys = {
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

export function readScopeValue(searchParams: URLSearchParams): ViewFilter {
  const scope = searchParams.get(SEARCH_PARAM_SCOPE)

  if (scope === 'hero-base' || scope === 'skin') {
    return scope
  }

  return 'all'
}

export function readShowAllResults(searchParams: URLSearchParams): boolean {
  return searchParams.get(SEARCH_PARAM_RESULTS) === RESULTS_VIEW_ALL
}

export function buildFilterSearchParams(filters: IllustrationsFilterState): URLSearchParams {
  const searchParams = new URLSearchParams()

  if (filters.scope !== 'all') {
    searchParams.set(SEARCH_PARAM_SCOPE, filters.scope)
  }

  appendCommonFilterSearchParams(searchParams, filters, ILLUSTRATION_FILTER_PARAM_KEYS)

  if (filters.showAllResults) {
    searchParams.set(SEARCH_PARAM_RESULTS, RESULTS_VIEW_ALL)
  }

  return searchParams
}

export function buildShareUrl(pathname: string, search: string, hash: string): string | null {
  if (typeof window === 'undefined') {
    return null
  }

  const url = new URL(window.location.href)
  url.hash = `#${pathname}${search}${hash}`

  return url.toString()
}

export function readInitialFilterState(search: string): IllustrationsFilterState {
  const searchParams = new URLSearchParams(search)

  return {
    scope: readScopeValue(searchParams),
    ...readCommonFilterState(searchParams, ILLUSTRATION_FILTER_PARAM_KEYS),
    showAllResults: readShowAllResults(searchParams),
  }
}

export function readInitialFilterExpansion(search: string): IllustrationFilterExpansion {
  return readCommonFilterExpansion(new URLSearchParams(search), ILLUSTRATION_FILTER_PARAM_KEYS)
}
