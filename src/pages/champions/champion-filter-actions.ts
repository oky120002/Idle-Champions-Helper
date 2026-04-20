import type { Dispatch, SetStateAction } from 'react'
import { buildSharedFilterActions } from '../../features/champion-filters/filter-action-builder'

interface ChampionFilterActionOptions {
  runFilterMutation: (mutation: () => void) => void
  setSearch: Dispatch<SetStateAction<string>>
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

export function buildChampionFilterActions({
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
}: ChampionFilterActionOptions) {
  return buildSharedFilterActions({
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
  })
}
