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

function resetAction<T>(setter: SelectionSetter<T>, run: FilterMutationRunner): FilterMutation {
  return () => { run(() => { setter([]); }); }
}

function toggleAction<T>(setter: SelectionSetter<T>, run: FilterMutationRunner): (value: T) => void {
  return (value) => { run(() => { setter((current) => toggleSelectionValue(current, value)); }); }
}

function buildChipMutations(o: SharedFilterActionOptions): Record<ActiveFilterChip['id'], FilterMutation> {
  return {
    search: () => { o.setSearch(''); },
    seats: () => { o.setSelectedSeats([]); },
    roles: () => { o.setSelectedRoles([]); },
    affiliations: () => { o.setSelectedAffiliations([]); },
    races: () => { o.setSelectedRaces([]); },
    genders: () => { o.setSelectedGenders([]); },
    alignments: () => { o.setSelectedAlignments([]); },
    professions: () => { o.setSelectedProfessions([]); },
    acquisitions: () => { o.setSelectedAcquisitions([]); },
    mechanics: () => { o.setSelectedMechanics([]); },
    ...o.extraChipMutations,
  }
}

function buildClearAllFilters(o: SharedFilterActionOptions): FilterMutation {
  return () =>
    { o.runFilterMutation(() => {
      o.setSearch('')
      o.setSelectedSeats([])
      o.setSelectedRoles([])
      o.setSelectedAffiliations([])
      o.setSelectedRaces([])
      o.setSelectedGenders([])
      o.setSelectedAlignments([])
      o.setSelectedProfessions([])
      o.setSelectedAcquisitions([])
      o.setSelectedMechanics([])
      o.resetExtraFilters?.()
    }); }
}

export function buildSharedFilterActions(options: SharedFilterActionOptions) {
  const { runFilterMutation } = options
  const chipMutations = buildChipMutations(options)

  return {
    updateSearch: (value: string) =>
      { runFilterMutation(() => { options.setSearch(value); }); },
    clearAllFilters: buildClearAllFilters(options),
    clearActiveFilterChip: (id: ActiveFilterChip['id']) => {
      const mutation = chipMutations[id]
      if (!mutation) return
      runFilterMutation(mutation)
    },
    resetSeats: resetAction(options.setSelectedSeats, runFilterMutation),
    toggleSeat: toggleAction(options.setSelectedSeats, runFilterMutation),
    resetRole: resetAction(options.setSelectedRoles, runFilterMutation),
    toggleRole: toggleAction(options.setSelectedRoles, runFilterMutation),
    resetAffiliation: resetAction(options.setSelectedAffiliations, runFilterMutation),
    toggleAffiliation: toggleAction(options.setSelectedAffiliations, runFilterMutation),
    resetRace: resetAction(options.setSelectedRaces, runFilterMutation),
    toggleRace: toggleAction(options.setSelectedRaces, runFilterMutation),
    resetGender: resetAction(options.setSelectedGenders, runFilterMutation),
    toggleGender: toggleAction(options.setSelectedGenders, runFilterMutation),
    resetAlignment: resetAction(options.setSelectedAlignments, runFilterMutation),
    toggleAlignment: toggleAction(options.setSelectedAlignments, runFilterMutation),
    resetProfession: resetAction(options.setSelectedProfessions, runFilterMutation),
    toggleProfession: toggleAction(options.setSelectedProfessions, runFilterMutation),
    resetAcquisition: resetAction(options.setSelectedAcquisitions, runFilterMutation),
    toggleAcquisition: toggleAction(options.setSelectedAcquisitions, runFilterMutation),
    resetMechanic: resetAction(options.setSelectedMechanics, runFilterMutation),
    toggleMechanic: toggleAction(options.setSelectedMechanics, runFilterMutation),
  }
}
