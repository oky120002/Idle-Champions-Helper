import type { Dispatch, SetStateAction } from 'react'
import type { ActiveFilterChip } from './types'

type FilterMutation = () => void
type FilterMutationRunner = (mutation: FilterMutation) => void
type SelectionSetter<T> = Dispatch<SetStateAction<T[]>>

export interface SharedFilterActionOptions {
  runFilterMutation: FilterMutationRunner
  setSearch: Dispatch<SetStateAction<string>>
  setSelectedSeats: SelectionSetter<number>
  setSelectedRoles: SelectionSetter<string>
  setSelectedAffiliations: SelectionSetter<string>
  setSelectedRaces: SelectionSetter<string>
  setSelectedGenders: SelectionSetter<string>
  setSelectedAlignments: SelectionSetter<string>
  setSelectedProfessions: SelectionSetter<string>
  setSelectedAcquisitions: SelectionSetter<string>
  setSelectedMechanics: SelectionSetter<string>
  resetExtraFilters?: () => void
  extraChipMutations?: Record<string, FilterMutation>
}

function toggleSelectionValue<T>(values: T[], value: T): T[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value]
}

export function buildSharedFilterActions({
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
  resetExtraFilters,
  extraChipMutations,
}: SharedFilterActionOptions) {
  const chipMutations: Record<ActiveFilterChip['id'], FilterMutation> = {
    search: () => setSearch(''),
    seats: () => setSelectedSeats([]),
    roles: () => setSelectedRoles([]),
    affiliations: () => setSelectedAffiliations([]),
    races: () => setSelectedRaces([]),
    genders: () => setSelectedGenders([]),
    alignments: () => setSelectedAlignments([]),
    professions: () => setSelectedProfessions([]),
    acquisitions: () => setSelectedAcquisitions([]),
    mechanics: () => setSelectedMechanics([]),
    ...extraChipMutations,
  }

  return {
    updateSearch: (value: string) => {
      runFilterMutation(() => {
        setSearch(value)
      })
    },
    clearAllFilters: () => {
      runFilterMutation(() => {
        setSearch('')
        setSelectedSeats([])
        setSelectedRoles([])
        setSelectedAffiliations([])
        setSelectedRaces([])
        setSelectedGenders([])
        setSelectedAlignments([])
        setSelectedProfessions([])
        setSelectedAcquisitions([])
        setSelectedMechanics([])
        resetExtraFilters?.()
      })
    },
    clearActiveFilterChip: (id: ActiveFilterChip['id']) => {
      const mutation = chipMutations[id]

      if (!mutation) {
        return
      }

      runFilterMutation(mutation)
    },
    resetSeats: () => runFilterMutation(() => setSelectedSeats([])),
    toggleSeat: (seat: number) =>
      runFilterMutation(() => {
        setSelectedSeats((current) => toggleSelectionValue(current, seat))
      }),
    resetRole: () => runFilterMutation(() => setSelectedRoles([])),
    toggleRole: (role: string) =>
      runFilterMutation(() => {
        setSelectedRoles((current) => toggleSelectionValue(current, role))
      }),
    resetAffiliation: () => runFilterMutation(() => setSelectedAffiliations([])),
    toggleAffiliation: (affiliation: string) =>
      runFilterMutation(() => {
        setSelectedAffiliations((current) => toggleSelectionValue(current, affiliation))
      }),
    resetRace: () => runFilterMutation(() => setSelectedRaces([])),
    toggleRace: (race: string) =>
      runFilterMutation(() => {
        setSelectedRaces((current) => toggleSelectionValue(current, race))
      }),
    resetGender: () => runFilterMutation(() => setSelectedGenders([])),
    toggleGender: (gender: string) =>
      runFilterMutation(() => {
        setSelectedGenders((current) => toggleSelectionValue(current, gender))
      }),
    resetAlignment: () => runFilterMutation(() => setSelectedAlignments([])),
    toggleAlignment: (alignment: string) =>
      runFilterMutation(() => {
        setSelectedAlignments((current) => toggleSelectionValue(current, alignment))
      }),
    resetProfession: () => runFilterMutation(() => setSelectedProfessions([])),
    toggleProfession: (profession: string) =>
      runFilterMutation(() => {
        setSelectedProfessions((current) => toggleSelectionValue(current, profession))
      }),
    resetAcquisition: () => runFilterMutation(() => setSelectedAcquisitions([])),
    toggleAcquisition: (acquisition: string) =>
      runFilterMutation(() => {
        setSelectedAcquisitions((current) => toggleSelectionValue(current, acquisition))
      }),
    resetMechanic: () => runFilterMutation(() => setSelectedMechanics([])),
    toggleMechanic: (mechanic: string) =>
      runFilterMutation(() => {
        setSelectedMechanics((current) => toggleSelectionValue(current, mechanic))
      }),
  }
}
