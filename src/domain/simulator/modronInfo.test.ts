import { describe, expect, it } from 'vitest'

import { MODRON_AUTO_RESET_CAP, computeModronResetSuggestion } from './modronInfo'

describe('computeModronResetSuggestion', () => {
  it('预估层数 < cap → 建议重置在预估层', () => {
    const result = computeModronResetSuggestion(500)
    expect(result.suggestedResetArea).toBe(500)
    expect(result.capBoundBy).toBe('formation')
  })

  it('预估层数 > cap → 受 modron cap 限制', () => {
    const result = computeModronResetSuggestion(3000)
    expect(result.suggestedResetArea).toBe(MODRON_AUTO_RESET_CAP)
    expect(result.capBoundBy).toBe('modron-cap')
  })

  it('预估层数 = cap → 边界（modron-cap）', () => {
    const result = computeModronResetSuggestion(MODRON_AUTO_RESET_CAP)
    expect(result.suggestedResetArea).toBe(MODRON_AUTO_RESET_CAP)
    expect(result.capBoundBy).toBe('modron-cap')
  })
})
