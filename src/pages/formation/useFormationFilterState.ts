import { useCallback, useState, useLayoutEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
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
} from '../../features/champion-filters/constants'
import {
  appendCommonFilterSearchParams,
  readCommonFilterState,
  type CommonFilterSearchParamKeys,
  type CommonFilterSearchState,
} from '../../features/champion-filters/query-state'
import { hasActiveChampionFilters } from '../../rules/championFilter'
import type { ChampionFilterSnapshot } from '../../domain/types'

const FORMATION_FILTER_PARAM_KEYS: CommonFilterSearchParamKeys = {
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

/**
 * 阵型编辑页筛选状态。
 *
 * 与英雄列表页不同，阵型页不提供筛选 UI——筛选来自 URL（英雄列表页跳转入口）或
 * 方案恢复（preset.filterSnapshot）。state 是唯一真相源，URL 是镜像（便于刷新保持）。
 * 不做 URL → state 持续同步，避免双向防循环复杂度。
 *
 * initialSnapshot 非 null 时（从方案页恢复），初始化为快照值并同步 URL（便于刷新保持）；
 * 否则从 URL 读取（英雄列表页跳转入口）。
 */
export function useFormationFilterState(initialSnapshot?: ChampionFilterSnapshot | null) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [filterState] = useState<CommonFilterSearchState>(() =>
    initialSnapshot ?? readCommonFilterState(searchParams, FORMATION_FILTER_PARAM_KEYS),
  )

  const syncUrl = useCallback(
    (next: CommonFilterSearchState) => {
      const urlParams = new URLSearchParams()
      appendCommonFilterSearchParams(urlParams, next, FORMATION_FILTER_PARAM_KEYS)
      setSearchParams(urlParams, { replace: true })
    },
    [setSearchParams],
  )

  // 恢复方案时 initialSnapshot 非 null → 同步 URL，让刷新后仍保持筛选。
  const initialSyncedRef = useRef(false)
  useLayoutEffect(() => {
    if (initialSyncedRef.current) {
      return
    }
    initialSyncedRef.current = true
    if (initialSnapshot && hasActiveChampionFilters(initialSnapshot)) {
      syncUrl(initialSnapshot)
    }
  }, [initialSnapshot, syncUrl])

  return {
    filterState,
    hasActiveFilter: hasActiveChampionFilters(filterState),
  }
}
