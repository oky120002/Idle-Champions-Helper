import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { buildPetsFilterSearchParams, readInitialPetsFilterState } from './query-state'
import type { AssetFilter, PetsFilterState, SourceFilter } from './types'

export function usePetsFilterState() {
  const location = useLocation()
  const [, setSearchParams] = useSearchParams()
  const initialFilters = useMemo(() => readInitialPetsFilterState(location.search), [location.search])
  const normalizedLocationSearch = useMemo(
    () => new URLSearchParams(location.search).toString(),
    [location.search],
  )
  const lastAppliedLocationSearchRef = useRef(normalizedLocationSearch)
  const pendingLocationSyncSearchRef = useRef<string | null>(null)

  const [query, setQuery] = useState(initialFilters.query)
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>(initialFilters.sourceFilter)
  const [assetFilter, setAssetFilter] = useState<AssetFilter>(initialFilters.assetFilter)
  const [showAllResults, setShowAllResults] = useState(initialFilters.showAllResults)

  const filters = useMemo<PetsFilterState>(
    () => ({
      query,
      sourceFilter,
      assetFilter,
      showAllResults,
    }),
    [assetFilter, query, showAllResults, sourceFilter],
  )
  const transitionKey = useMemo(() => buildPetsFilterSearchParams(filters).toString(), [filters])

  useEffect(() => {
    const nextSearchParams = buildPetsFilterSearchParams(filters)
    const nextSearch = nextSearchParams.toString()
    const currentSearch = new URLSearchParams(location.search).toString()
    const pendingLocationSyncSearch = pendingLocationSyncSearchRef.current

    if (pendingLocationSyncSearch !== null && currentSearch === pendingLocationSyncSearch) {
      if (nextSearch === currentSearch) {
        pendingLocationSyncSearchRef.current = null
      }

      return
    }

    if (nextSearch !== currentSearch) {
      setSearchParams(nextSearchParams, { replace: true })
    }
  }, [filters, location.search, setSearchParams])

  useLayoutEffect(() => {
    if (normalizedLocationSearch === lastAppliedLocationSearchRef.current) {
      return
    }

    lastAppliedLocationSearchRef.current = normalizedLocationSearch
    const currentFilterSearch = buildPetsFilterSearchParams(filters).toString()

    if (currentFilterSearch === normalizedLocationSearch) {
      pendingLocationSyncSearchRef.current = null
      return
    }

    const nextFilters = readInitialPetsFilterState(location.search)
    pendingLocationSyncSearchRef.current = normalizedLocationSearch
    let cancelled = false

    queueMicrotask(() => {
      if (cancelled || pendingLocationSyncSearchRef.current !== normalizedLocationSearch) {
        return
      }

      setQuery(nextFilters.query)
      setSourceFilter(nextFilters.sourceFilter)
      setAssetFilter(nextFilters.assetFilter)
      setShowAllResults(nextFilters.showAllResults)
    })

    return () => {
      cancelled = true
    }
  }, [filters, location.search, normalizedLocationSearch])

  return {
    locationSearch: location.search,
    filters,
    transitionKey,
    setQuery,
    setSourceFilter,
    setAssetFilter,
    setShowAllResults,
  }
}
