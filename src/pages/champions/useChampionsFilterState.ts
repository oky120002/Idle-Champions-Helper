import { useEffect, useMemo, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { buildChampionsTransitionKey } from './champion-filter-model'
import { buildFilterSearchParams, readInitialFilterExpansion, readInitialFilterState } from './query-state'
import type { ChampionsFilterState } from './types'

export function useChampionsFilterState() {
  const location = useLocation()
  const [, setSearchParams] = useSearchParams()
  const initialFilters = useMemo(() => readInitialFilterState(location.search), [location.search])
  const initialExpansion = useMemo(() => readInitialFilterExpansion(location.search), [location.search])

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

    if (nextSearch !== currentSearch) {
      setSearchParams(nextSearchParams, { replace: true })
    }
  }, [filters, location.search, setSearchParams])

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
