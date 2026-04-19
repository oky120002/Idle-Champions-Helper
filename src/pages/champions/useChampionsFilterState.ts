import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { buildChampionsTransitionKey } from './champion-filter-model'
import { buildFilterSearchParams, readInitialFilterExpansion, readInitialFilterState } from './query-state'
import type { ChampionsFilterState } from './types'

export function useChampionsFilterState() {
  const location = useLocation()
  const [, setSearchParams] = useSearchParams()
  const initialFilters = useMemo(() => readInitialFilterState(location.search), [location.search])
  const initialExpansion = useMemo(() => readInitialFilterExpansion(location.search), [location.search])
  const normalizedLocationSearch = useMemo(
    () => new URLSearchParams(location.search).toString(),
    [location.search],
  )
  const lastAppliedLocationSearchRef = useRef(normalizedLocationSearch)
  const pendingLocationSyncSearchRef = useRef<string | null>(null)

  const [search, setSearch] = useState(initialFilters.search)
  const [selectedSeats, setSelectedSeats] = useState(initialFilters.selectedSeats)
  const [selectedRoles, setSelectedRoles] = useState(initialFilters.selectedRoles)
  const [selectedAffiliations, setSelectedAffiliations] = useState(initialFilters.selectedAffiliations)
  const [selectedRaces, setSelectedRaces] = useState(initialFilters.selectedRaces)
  const [selectedGenders, setSelectedGenders] = useState(initialFilters.selectedGenders)
  const [selectedAlignments, setSelectedAlignments] = useState(initialFilters.selectedAlignments)
  const [selectedProfessions, setSelectedProfessions] = useState(initialFilters.selectedProfessions)
  const [selectedAcquisitions, setSelectedAcquisitions] = useState(initialFilters.selectedAcquisitions)
  const [selectedMechanics, setSelectedMechanics] = useState(initialFilters.selectedMechanics)
  const [isIdentityFiltersExpanded, setIdentityFiltersExpanded] = useState(initialExpansion.identity)
  const [isMetaFiltersExpanded, setMetaFiltersExpanded] = useState(initialExpansion.meta)
  const [showAllResults, setShowAllResults] = useState(initialFilters.showAllResults)

  const filters = useMemo<ChampionsFilterState>(
    () => ({
      search,
      selectedSeats,
      selectedRoles,
      selectedAffiliations,
      selectedRaces,
      selectedGenders,
      selectedAlignments,
      selectedProfessions,
      selectedAcquisitions,
      selectedMechanics,
      showAllResults,
    }),
    [
      search,
      selectedSeats,
      selectedRoles,
      selectedAffiliations,
      selectedRaces,
      selectedGenders,
      selectedAlignments,
      selectedProfessions,
      selectedAcquisitions,
      selectedMechanics,
      showAllResults,
    ],
  )
  const transitionKey = useMemo(() => buildChampionsTransitionKey(filters), [filters])

  useEffect(() => {
    const nextSearchParams = buildFilterSearchParams(filters)
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
    const currentFilterSearch = buildFilterSearchParams(filters).toString()

    if (currentFilterSearch === normalizedLocationSearch) {
      pendingLocationSyncSearchRef.current = null
      return
    }

    const nextFilters = readInitialFilterState(location.search)
    const nextExpansion = readInitialFilterExpansion(location.search)
    pendingLocationSyncSearchRef.current = normalizedLocationSearch
    let cancelled = false

    queueMicrotask(() => {
      if (cancelled || pendingLocationSyncSearchRef.current !== normalizedLocationSearch) {
        return
      }

      setSearch(nextFilters.search)
      setSelectedSeats(nextFilters.selectedSeats)
      setSelectedRoles(nextFilters.selectedRoles)
      setSelectedAffiliations(nextFilters.selectedAffiliations)
      setSelectedRaces(nextFilters.selectedRaces)
      setSelectedGenders(nextFilters.selectedGenders)
      setSelectedAlignments(nextFilters.selectedAlignments)
      setSelectedProfessions(nextFilters.selectedProfessions)
      setSelectedAcquisitions(nextFilters.selectedAcquisitions)
      setSelectedMechanics(nextFilters.selectedMechanics)
      setShowAllResults(nextFilters.showAllResults)
      setIdentityFiltersExpanded(nextExpansion.identity)
      setMetaFiltersExpanded(nextExpansion.meta)
    })

    return () => {
      cancelled = true
    }
  }, [filters, location.search, normalizedLocationSearch])

  return {
    locationSearch: location.search,
    filters,
    transitionKey,
    search,
    setSearch,
    selectedSeats,
    setSelectedSeats,
    selectedRoles,
    setSelectedRoles,
    selectedAffiliations,
    setSelectedAffiliations,
    selectedRaces,
    setSelectedRaces,
    selectedGenders,
    setSelectedGenders,
    selectedAlignments,
    setSelectedAlignments,
    selectedProfessions,
    setSelectedProfessions,
    selectedAcquisitions,
    setSelectedAcquisitions,
    selectedMechanics,
    setSelectedMechanics,
    isIdentityFiltersExpanded,
    setIdentityFiltersExpanded,
    isMetaFiltersExpanded,
    setMetaFiltersExpanded,
    showAllResults,
    setShowAllResults,
  }
}
