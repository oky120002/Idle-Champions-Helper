import {
  appendCommonFilterSearchParams,
  COMMON_FILTER_PARAM_KEYS,
  readCommonFilterExpansion,
  readCommonFilterState,
} from '../../features/champion-filters/query-state'
import {
  RESULTS_VIEW_ALL,
  SEARCH_PARAM_RESULTS,
  SEARCH_PARAM_SCOPE,
} from './constants'
import type { IllustrationFilterExpansion, IllustrationsFilterState, ViewFilter } from './types'

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

  appendCommonFilterSearchParams(searchParams, filters, COMMON_FILTER_PARAM_KEYS)

  if (filters.showAllResults) {
    searchParams.set(SEARCH_PARAM_RESULTS, RESULTS_VIEW_ALL)
  }

  return searchParams
}

export function readInitialFilterState(search: string): IllustrationsFilterState {
  const searchParams = new URLSearchParams(search)

  return {
    scope: readScopeValue(searchParams),
    ...readCommonFilterState(searchParams, COMMON_FILTER_PARAM_KEYS),
    showAllResults: readShowAllResults(searchParams),
  }
}

export function readInitialFilterExpansion(search: string): IllustrationFilterExpansion {
  return readCommonFilterExpansion(new URLSearchParams(search), COMMON_FILTER_PARAM_KEYS)
}
