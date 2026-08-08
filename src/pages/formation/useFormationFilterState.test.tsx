import { renderHook } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import type { ChampionFilterSnapshot } from '../../domain/types'
import { hasActiveChampionFilters } from '../../rules/championFilter'
import { useFormationFilterState } from './useFormationFilterState'

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

describe('hasActiveChampionFilters', () => {
  it('全空返回 false', () => {
    expect(hasActiveChampionFilters(EMPTY)).toBe(false)
  })

  it('有 search 返回 true', () => {
    expect(hasActiveChampionFilters({ ...EMPTY, search: 'bru' })).toBe(true)
  })

  it('有 selectedSeats 返回 true', () => {
    expect(hasActiveChampionFilters({ ...EMPTY, selectedSeats: [1] })).toBe(true)
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
})

describe('useFormationFilterState initialSnapshot', () => {
  function renderWithSnapshot(snapshot: ChampionFilterSnapshot | null, search = '') {
    return renderHook(() => useFormationFilterState(snapshot), {
      wrapper: ({ children }) => <MemoryRouter initialEntries={[`/formation${search}`]}>{children}</MemoryRouter>,
    })
  }

  it('initialSnapshot 非 null 时优先用它初始化（覆盖 URL 参数）', () => {
    const { result } = renderWithSnapshot(SNAPSHOT, '?seat=2')
    expect(result.current.filterState).toEqual(SNAPSHOT)
    expect(result.current.hasActiveFilter).toBe(true)
  })

  it('initialSnapshot 为 null 时回退到 URL 参数', () => {
    const { result } = renderWithSnapshot(null, '?seat=2')
    expect(result.current.filterState.selectedSeats).toEqual([2])
  })
})
