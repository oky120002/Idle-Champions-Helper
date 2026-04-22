import type { AssetFilter, PetsFilterState, SourceFilter } from './types'

const SEARCH_PARAM_QUERY = 'q'
const SEARCH_PARAM_SOURCE = 'source'
const SEARCH_PARAM_ASSET = 'asset'
const SEARCH_PARAM_VIEW = 'view'
const RESULTS_VIEW_ALL = 'all'

function readSourceFilter(searchParams: URLSearchParams): SourceFilter {
  const sourceFilter = searchParams.get(SEARCH_PARAM_SOURCE)

  if (
    sourceFilter === 'gems' ||
    sourceFilter === 'premium' ||
    sourceFilter === 'patron' ||
    sourceFilter === 'not-yet-available' ||
    sourceFilter === 'unknown'
  ) {
    return sourceFilter
  }

  return 'all'
}

function readAssetFilter(searchParams: URLSearchParams): AssetFilter {
  const assetFilter = searchParams.get(SEARCH_PARAM_ASSET)

  if (assetFilter === 'complete' || assetFilter === 'missing') {
    return assetFilter
  }

  return 'all'
}

export function readInitialPetsFilterState(search: string): PetsFilterState {
  const searchParams = new URLSearchParams(search)

  return {
    query: searchParams.get(SEARCH_PARAM_QUERY) ?? '',
    sourceFilter: readSourceFilter(searchParams),
    assetFilter: readAssetFilter(searchParams),
    showAllResults: searchParams.get(SEARCH_PARAM_VIEW) === RESULTS_VIEW_ALL,
  }
}

export function buildPetsFilterSearchParams(filters: PetsFilterState): URLSearchParams {
  const searchParams = new URLSearchParams()

  if (filters.query.trim().length > 0) {
    searchParams.set(SEARCH_PARAM_QUERY, filters.query.trim())
  }

  if (filters.sourceFilter !== 'all') {
    searchParams.set(SEARCH_PARAM_SOURCE, filters.sourceFilter)
  }

  if (filters.assetFilter !== 'all') {
    searchParams.set(SEARCH_PARAM_ASSET, filters.assetFilter)
  }

  if (filters.showAllResults) {
    searchParams.set(SEARCH_PARAM_VIEW, RESULTS_VIEW_ALL)
  }

  return searchParams
}
