import { describe, expect, it, vi } from 'vitest'
import { buildChampionFilterActions } from '../../../src/pages/champions/champion-filter-actions'
import { buildIllustrationFilterActions } from '../../../src/pages/illustrations/illustration-filter-actions'
import type { ViewFilter } from '../../../src/pages/illustrations/types'

function createStateSetter<T>(initialValue: T) {
  let currentValue = initialValue
  const setter = vi.fn((nextValue: T | ((value: T) => T)) => {
    currentValue =
      typeof nextValue === 'function' ? (nextValue as (value: T) => T)(currentValue) : nextValue
  })

  return {
    setter,
    read: () => currentValue,
  }
}

function createFilterActionHarness() {
  const search = createStateSetter('starter')
  const view = createStateSetter<ViewFilter>('skin')
  const selectedSeats = createStateSetter<number[]>([1])
  const selectedRoles = createStateSetter<string[]>(['support'])
  const selectedAffiliations = createStateSetter<string[]>(['hall'])
  const selectedRaces = createStateSetter<string[]>(['human'])
  const selectedGenders = createStateSetter<string[]>(['male'])
  const selectedAlignments = createStateSetter<string[]>(['good'])
  const selectedProfessions = createStateSetter<string[]>(['warlock'])
  const selectedAcquisitions = createStateSetter<string[]>(['event'])
  const selectedMechanics = createStateSetter<string[]>(['control_slow'])
  const runFilterMutation = vi.fn((mutation: () => void) => mutation())

  return {
    runFilterMutation,
    search,
    view,
    selectedSeats,
    selectedRoles,
    selectedAffiliations,
    selectedRaces,
    selectedGenders,
    selectedAlignments,
    selectedProfessions,
    selectedAcquisitions,
    selectedMechanics,
  }
}

describe('filter action builders', () => {
  it('champions actions 只重置通用筛选维度，并保持 mutation 边界一致', () => {
    const harness = createFilterActionHarness()
    const actions = buildChampionFilterActions({
      runFilterMutation: harness.runFilterMutation,
      setSearch: harness.search.setter,
      setSelectedSeats: harness.selectedSeats.setter,
      setSelectedRoles: harness.selectedRoles.setter,
      setSelectedAffiliations: harness.selectedAffiliations.setter,
      setSelectedRaces: harness.selectedRaces.setter,
      setSelectedGenders: harness.selectedGenders.setter,
      setSelectedAlignments: harness.selectedAlignments.setter,
      setSelectedProfessions: harness.selectedProfessions.setter,
      setSelectedAcquisitions: harness.selectedAcquisitions.setter,
      setSelectedMechanics: harness.selectedMechanics.setter,
    })

    actions.clearAllFilters()
    actions.toggleSeat(3)

    expect(harness.runFilterMutation).toHaveBeenCalledTimes(2)
    expect(harness.search.read()).toBe('')
    expect(harness.view.read()).toBe('skin')
    expect(harness.selectedSeats.read()).toEqual([3])
    expect(harness.selectedRoles.read()).toEqual([])
    expect(harness.selectedAffiliations.read()).toEqual([])
    expect(harness.selectedRaces.read()).toEqual([])
    expect(harness.selectedGenders.read()).toEqual([])
    expect(harness.selectedAlignments.read()).toEqual([])
    expect(harness.selectedProfessions.read()).toEqual([])
    expect(harness.selectedAcquisitions.read()).toEqual([])
    expect(harness.selectedMechanics.read()).toEqual([])
  })

  it('illustrations actions 会把 view 也纳入 clearAllFilters 和单 chip 清理', () => {
    const harness = createFilterActionHarness()
    const actions = buildIllustrationFilterActions({
      runFilterMutation: harness.runFilterMutation,
      setSearch: harness.search.setter,
      setViewFilter: harness.view.setter,
      setSelectedSeats: harness.selectedSeats.setter,
      setSelectedRoles: harness.selectedRoles.setter,
      setSelectedAffiliations: harness.selectedAffiliations.setter,
      setSelectedRaces: harness.selectedRaces.setter,
      setSelectedGenders: harness.selectedGenders.setter,
      setSelectedAlignments: harness.selectedAlignments.setter,
      setSelectedProfessions: harness.selectedProfessions.setter,
      setSelectedAcquisitions: harness.selectedAcquisitions.setter,
      setSelectedMechanics: harness.selectedMechanics.setter,
    })

    actions.clearActiveFilterChip('view')
    expect(harness.view.read()).toBe('all')

    actions.updateScope('hero-base')
    actions.clearAllFilters()

    expect(harness.runFilterMutation).toHaveBeenCalledTimes(3)
    expect(harness.search.read()).toBe('')
    expect(harness.view.read()).toBe('all')
    expect(harness.selectedSeats.read()).toEqual([])
    expect(harness.selectedRoles.read()).toEqual([])
    expect(harness.selectedAffiliations.read()).toEqual([])
    expect(harness.selectedRaces.read()).toEqual([])
    expect(harness.selectedGenders.read()).toEqual([])
    expect(harness.selectedAlignments.read()).toEqual([])
    expect(harness.selectedProfessions.read()).toEqual([])
    expect(harness.selectedAcquisitions.read()).toEqual([])
    expect(harness.selectedMechanics.read()).toEqual([])
  })

  it('未知 chip id 不会触发额外 mutation', () => {
    const harness = createFilterActionHarness()
    const actions = buildChampionFilterActions({
      runFilterMutation: harness.runFilterMutation,
      setSearch: harness.search.setter,
      setSelectedSeats: harness.selectedSeats.setter,
      setSelectedRoles: harness.selectedRoles.setter,
      setSelectedAffiliations: harness.selectedAffiliations.setter,
      setSelectedRaces: harness.selectedRaces.setter,
      setSelectedGenders: harness.selectedGenders.setter,
      setSelectedAlignments: harness.selectedAlignments.setter,
      setSelectedProfessions: harness.selectedProfessions.setter,
      setSelectedAcquisitions: harness.selectedAcquisitions.setter,
      setSelectedMechanics: harness.selectedMechanics.setter,
    })

    actions.clearActiveFilterChip('unknown')

    expect(harness.runFilterMutation).not.toHaveBeenCalled()
    expect(harness.search.read()).toBe('starter')
    expect(harness.selectedSeats.read()).toEqual([1])
  })
})
