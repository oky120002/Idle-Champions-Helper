import type { Dispatch, SetStateAction } from 'react'
import { buildSharedFilterActions } from '../../features/champion-filters/filter-action-builder'
import type { ViewFilter } from './types'

type IllustrationFilterActionOptions = {
  runFilterMutation: (mutation: () => void) => void
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
}

export function buildIllustrationFilterActions({
  runFilterMutation,
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
}: IllustrationFilterActionOptions) {
  const sharedActions = buildSharedFilterActions({
    runFilterMutation,
    setSearch,
    setSelectedSeats,
    setSelectedRoles,
    setSelectedAffiliations,
    setSelectedRaces,
    setSelectedGenders,
    setSelectedAlignments,
    setSelectedProfessions,
    setSelectedAcquisitions,
    setSelectedMechanics,
    resetExtraFilters: () => setViewFilter('all'),
    extraChipMutations: {
      view: () => setViewFilter('all'),
    },
  })

  return {
    ...sharedActions,
    updateScope: (scope: ViewFilter) => {
      runFilterMutation(() => {
        setViewFilter(scope)
      })
    },
  }
}
