import type { Dispatch, SetStateAction } from 'react'
import type { ActiveFilterChip } from '../../features/champion-filters/types'
import { toggleFilterValue } from '../../rules/championFilter'
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
  function clearAllFilters() {
    runFilterMutation(() => {
      setSearch('')
      setViewFilter('all')
      setSelectedSeats([])
      setSelectedRoles([])
      setSelectedAffiliations([])
      setSelectedRaces([])
      setSelectedGenders([])
      setSelectedAlignments([])
      setSelectedProfessions([])
      setSelectedAcquisitions([])
      setSelectedMechanics([])
    })
  }

  function clearActiveFilterChip(id: ActiveFilterChip['id']) {
    switch (id) {
      case 'search':
        runFilterMutation(() => setSearch(''))
        return
      case 'view':
        runFilterMutation(() => setViewFilter('all'))
        return
      case 'seats':
        runFilterMutation(() => setSelectedSeats([]))
        return
      case 'roles':
        runFilterMutation(() => setSelectedRoles([]))
        return
      case 'affiliations':
        runFilterMutation(() => setSelectedAffiliations([]))
        return
      case 'races':
        runFilterMutation(() => setSelectedRaces([]))
        return
      case 'genders':
        runFilterMutation(() => setSelectedGenders([]))
        return
      case 'alignments':
        runFilterMutation(() => setSelectedAlignments([]))
        return
      case 'professions':
        runFilterMutation(() => setSelectedProfessions([]))
        return
      case 'acquisitions':
        runFilterMutation(() => setSelectedAcquisitions([]))
        return
      case 'mechanics':
        runFilterMutation(() => setSelectedMechanics([]))
        return
      default:
        return
    }
  }

  return {
    updateSearch: (value: string) => {
      runFilterMutation(() => {
        setSearch(value)
      })
    },
    updateScope: (scope: ViewFilter) => {
      runFilterMutation(() => {
        setViewFilter(scope)
      })
    },
    clearAllFilters,
    clearActiveFilterChip,
    resetSeats: () => runFilterMutation(() => setSelectedSeats([])),
    toggleSeat: (seat: number) =>
      runFilterMutation(() => {
        setSelectedSeats((current) => toggleFilterValue(current, seat))
      }),
    resetRole: () => runFilterMutation(() => setSelectedRoles([])),
    toggleRole: (role: string) =>
      runFilterMutation(() => {
        setSelectedRoles((current) => toggleFilterValue(current, role))
      }),
    resetAffiliation: () => runFilterMutation(() => setSelectedAffiliations([])),
    toggleAffiliation: (affiliation: string) =>
      runFilterMutation(() => {
        setSelectedAffiliations((current) => toggleFilterValue(current, affiliation))
      }),
    resetRace: () => runFilterMutation(() => setSelectedRaces([])),
    toggleRace: (race: string) =>
      runFilterMutation(() => {
        setSelectedRaces((current) => toggleFilterValue(current, race))
      }),
    resetGender: () => runFilterMutation(() => setSelectedGenders([])),
    toggleGender: (gender: string) =>
      runFilterMutation(() => {
        setSelectedGenders((current) => toggleFilterValue(current, gender))
      }),
    resetAlignment: () => runFilterMutation(() => setSelectedAlignments([])),
    toggleAlignment: (alignment: string) =>
      runFilterMutation(() => {
        setSelectedAlignments((current) => toggleFilterValue(current, alignment))
      }),
    resetProfession: () => runFilterMutation(() => setSelectedProfessions([])),
    toggleProfession: (profession: string) =>
      runFilterMutation(() => {
        setSelectedProfessions((current) => toggleFilterValue(current, profession))
      }),
    resetAcquisition: () => runFilterMutation(() => setSelectedAcquisitions([])),
    toggleAcquisition: (acquisition: string) =>
      runFilterMutation(() => {
        setSelectedAcquisitions((current) => toggleFilterValue(current, acquisition))
      }),
    resetMechanic: () => runFilterMutation(() => setSelectedMechanics([])),
    toggleMechanic: (mechanic: string) =>
      runFilterMutation(() => {
        setSelectedMechanics((current) => toggleFilterValue(current, mechanic))
      }),
  }
}
