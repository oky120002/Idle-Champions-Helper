import {
  appendCommonFilterSearchParams,
  COMMON_FILTER_PARAM_KEYS,
  readCommonFilterExpansion,
  readCommonFilterState,
} from '../../features/champion-filters/query-state'
import {
  DEFAULT_SCROLL_KEY,
  RESULTS_VIEW_ALL,
  SEARCH_PARAM_VIEW,
} from './constants'
import type { ChampionsFilterState } from './types'

export function readShowAllResults(searchParams: URLSearchParams): boolean {
  return searchParams.get(SEARCH_PARAM_VIEW) === RESULTS_VIEW_ALL
}

export function buildFilterSearchParams(filters: ChampionsFilterState): URLSearchParams {
  const searchParams = new URLSearchParams()
  appendCommonFilterSearchParams(searchParams, filters, COMMON_FILTER_PARAM_KEYS)

  if (filters.showAllResults) {
    searchParams.set(SEARCH_PARAM_VIEW, RESULTS_VIEW_ALL)
  }

  return searchParams
}

/**
 * 构建阵型编辑页 URL，携带当前筛选维度（不含 showAllResults）。
 * 供英雄列表页「带着筛选去摆阵型」入口跳转使用。
 */
export function buildFormationFilterHref(filters: ChampionsFilterState): string {
  const searchParams = new URLSearchParams()
  appendCommonFilterSearchParams(searchParams, filters, COMMON_FILTER_PARAM_KEYS)
  const search = searchParams.toString()
  return search !== '' ? `/formation?${search}` : '/formation'
}

export function buildScrollRestoreKey(search: string): string {
  return `champions-pane-scroll:${search !== '' ? search : DEFAULT_SCROLL_KEY}`
}

export function saveChampionListScroll(search: string, scrollTop: number): void {
  if (typeof window === 'undefined') {
    return
  }

  window.sessionStorage.setItem(buildScrollRestoreKey(search), String(scrollTop))
}

export function readInitialFilterState(search: string): ChampionsFilterState {
  const searchParams = new URLSearchParams(search)

  return {
    ...readCommonFilterState(searchParams, COMMON_FILTER_PARAM_KEYS),
    showAllResults: readShowAllResults(searchParams),
  }
}

export function readInitialFilterExpansion(search: string): {
  identity: boolean
  meta: boolean
} {
  return readCommonFilterExpansion(new URLSearchParams(search), COMMON_FILTER_PARAM_KEYS)
}
