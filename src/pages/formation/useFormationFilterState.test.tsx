import { act, renderHook } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import type { ChampionFilterSnapshot } from '../../domain/types'
import { hasActiveFilterEntry, useFormationFilterState } from './useFormationFilterState'

const EMPTY = {
  search: '',
  selectedSeats: [],
  selectedRoles: [],
  selectedAffiliations: [],
  selectedRaces: [],
  selectedGenders: [],
  selectedAlignments: [],
  selectedProfessions: [],
  selectedAcquisitions: [],
  selectedMechanics: [],
  selectedPatrons: [],
}

const SNAPSHOT: ChampionFilterSnapshot = {
  search: 'bru',
  selectedSeats: [1],
  selectedRoles: [],
  selectedAffiliations: [],
  selectedRaces: ['dwarf'],
  selectedGenders: [],
  selectedAlignments: [],
  selectedProfessions: [],
  selectedAcquisitions: [],
  selectedMechanics: [],
  selectedPatrons: [],
}

function renderWithSearch(search: string) {
  return renderHook(() => useFormationFilterState(), {
    wrapper: ({ children }) => <MemoryRouter initialEntries={[`/formation${search}`]}>{children}</MemoryRouter>,
  })
}

describe('hasActiveFilterEntry', () => {
  it('全空返回 false', () => {
    expect(hasActiveFilterEntry(EMPTY)).toBe(false)
  })

  it('有 search 返回 true', () => {
    expect(hasActiveFilterEntry({ ...EMPTY, search: 'bru' })).toBe(true)
  })

  it('有 selectedSeats 返回 true', () => {
    expect(hasActiveFilterEntry({ ...EMPTY, selectedSeats: [1] })).toBe(true)
  })
})

describe('useFormationFilterState', () => {
  it('无 URL 筛选参数时初始为空、hasActiveFilter false', () => {
    const { result } = renderWithSearch('')
    expect(result.current.filterState).toEqual(EMPTY)
    expect(result.current.hasActiveFilter).toBe(false)
  })

  it('URL 含筛选参数时正确读取', () => {
    const { result } = renderWithSearch('?q=bru&seat=1&race=dwarf')
    expect(result.current.filterState).toEqual(SNAPSHOT)
    expect(result.current.hasActiveFilter).toBe(true)
  })

  it('applyFilterSnapshot(null) 清空筛选', () => {
    const { result } = renderWithSearch('?q=bru')
    expect(result.current.hasActiveFilter).toBe(true)

    act(() => result.current.applyFilterSnapshot(null))

    expect(result.current.filterState).toEqual(EMPTY)
    expect(result.current.hasActiveFilter).toBe(false)
  })

  it('applyFilterSnapshot(snapshot) 更新筛选', () => {
    const { result } = renderWithSearch('')

    act(() => result.current.applyFilterSnapshot(SNAPSHOT))

    expect(result.current.filterState).toEqual(SNAPSHOT)
    expect(result.current.hasActiveFilter).toBe(true)
  })

  it('clearFilters 等同 applyFilterSnapshot(null)', () => {
    const { result } = renderWithSearch('?q=bru&seat=1')

    act(() => result.current.clearFilters())

    expect(result.current.filterState).toEqual(EMPTY)
    expect(result.current.hasActiveFilter).toBe(false)
  })
})
