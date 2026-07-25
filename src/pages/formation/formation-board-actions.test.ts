import { describe, expect, it, vi } from 'vitest'

import { buildFormationBoardActions } from './formation-board-actions'
import type { FormationState } from './types'

const readyState: FormationState = { status: 'ready', dataVersion: 'v1', formations: [], champions: [] }

function buildActions(initialPlacements: Record<string, string>) {
  let placements = initialPlacements
  const setPlacements = vi.fn((updater: ((current: Record<string, string>) => Record<string, string>) | Record<string, string>) => {
    placements = typeof updater === 'function' ? updater(placements) : updater
  })

  const actions = buildFormationBoardActions({
    state: readyState,
    setSelectedLayoutId: vi.fn(),
    setActiveMobileSlotId: vi.fn(),
    setPlacements,
    setScenarioRef: vi.fn(),
    setDraftStatus: vi.fn(),
    setPresetStatus: vi.fn(),
    bumpEditRevision: vi.fn(),
  })

  return { actions, getPlacements: () => placements }
}

describe('handleAssignChampion', () => {
  it('放入英雄到空槽', () => {
    const { actions, getPlacements } = buildActions({})

    actions.handleAssignChampion('s1', 'bruenor')

    expect(getPlacements()).toEqual({ s1: 'bruenor' })
  })

  it('空 championId 清空指定槽位', () => {
    const { actions, getPlacements } = buildActions({ s1: 'bruenor' })

    actions.handleAssignChampion('s1', '')

    expect(getPlacements()).toEqual({})
  })

  it('槽位间拖动原子清原 slot（同英雄不重复占 seat）', () => {
    const { actions, getPlacements } = buildActions({ s1: 'bruenor' })

    actions.handleAssignChampion('s2', 'bruenor')

    expect(getPlacements()).toEqual({ s2: 'bruenor' })
  })

  it('替换槽位英雄时保留他处英雄', () => {
    const { actions, getPlacements } = buildActions({ s1: 'bruenor', s2: 'jim' })

    actions.handleAssignChampion('s2', 'celia')

    expect(getPlacements()).toEqual({ s1: 'bruenor', s2: 'celia' })
  })
})
