import { useEffect, useMemo, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { SHARE_RESET_DELAY_MS } from './constants'
import { readInitialFilterExpansion, readInitialFilterState } from './query-state'
import type { IllustrationsFilterState, ShareLinkState, ViewFilter } from './types'

export type IllustrationFilterStateController = {
  filters: IllustrationsFilterState
  isIdentityFiltersExpanded: boolean
  isMetaFiltersExpanded: boolean
  shareLinkState: ShareLinkState
  setSearch: Dispatch<SetStateAction<string>>
  setViewFilter: Dispatch<SetStateAction<ViewFilter>>
  setSelectedSeats: Dispatch<SetStateAction<number[]>>
  setSelectedRoles: Dispatch<SetStateAction<string[]>>
  setSelectedAffiliations: Dispatch<SetStateAction<string[]>>
  setSelectedRaces: Dispatch<SetStateAction<string[]>>
  setSelectedGenders: Dispatch<SetStateAction<string[]>>
  setSelectedAlignments: Dispatch<SetStateAction<string[]>>
  setSelectedProfessions: Dispatch<SetStateAction<string[]>>
  setSelectedAcquisitions: Dispatch<SetStateAction<string[]>>
  setSelectedMechanics: Dispatch<SetStateAction<string[]>>
  setShowAllResults: Dispatch<SetStateAction<boolean>>
  setShareLinkState: Dispatch<SetStateAction<ShareLinkState>>
  toggleIdentityFiltersExpanded: () => void
  toggleMetaFiltersExpanded: () => void
}

export function useIllustrationFilterState(searchString: string): IllustrationFilterStateController {
  const initialFilters = useMemo(() => readInitialFilterState(searchString), [searchString])
  const initialExpansion = useMemo(() => readInitialFilterExpansion(searchString), [searchString])

  const [search, setSearch] = useState(initialFilters.search)
  const [viewFilter, setViewFilter] = useState(initialFilters.scope)
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
  const [shareLinkState, setShareLinkState] = useState<ShareLinkState>('idle')

  useEffect(() => {
    if (shareLinkState === 'idle') {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      setShareLinkState('idle')
    }, SHARE_RESET_DELAY_MS)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [shareLinkState])

  const filters = useMemo<IllustrationsFilterState>(
    () => ({
      search,
      scope: viewFilter,
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
      viewFilter,
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

  return {
    filters,
    isIdentityFiltersExpanded,
    isMetaFiltersExpanded,
    shareLinkState,
    setSearch,
    setViewFilter,
    setSelectedSeats,
    setSelectedRoles,
    setSelectedAffiliations,
    setSelectedRaces,
    setSelectedGenders,
    setSelectedAlignments,
    setSelectedProfessions,
    setSelectedAcquisitions,
    setSelectedMechanics,
    setShowAllResults,
    setShareLinkState,
    toggleIdentityFiltersExpanded: () => setIdentityFiltersExpanded((current) => !current),
    toggleMetaFiltersExpanded: () => setMetaFiltersExpanded((current) => !current),
  }
}
