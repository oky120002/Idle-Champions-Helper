import { describe, expect, it } from 'vitest'
import { resolveAdjacentSignal } from './adjacentResolver.ts'
import { buildResolveContext } from './resolverTestFixtures.ts'

describe('resolveAdjacentSignal', () => {
  it('adjacent_ 前缀 → adjacentBuff（support 池）', () => {
    const r = resolveAdjacentSignal(buildResolveContext({ effectName: 'adjacent_damage_mult', numericValue: 150 }))
    expect(r?.ok).toBe(true)
    if (r?.ok) {
      expect(r.signal.kind).toBe('adjacentBuff')
      expect(r.signal.value).toBe(150)
      expect(r.bucket).toBe('supportSignals')
    }
  })

  it('非 adjacent_ 前缀 → null', () => {
    expect(resolveAdjacentSignal(buildResolveContext({ effectName: 'hero_dps_multiplier_mult' }))).toBeNull()
    expect(resolveAdjacentSignal(buildResolveContext({ effectName: 'tag_buff' }))).toBeNull()
  })

  it('边界：value=0 原样透传', () => {
    const r = resolveAdjacentSignal(buildResolveContext({ effectName: 'adjacent_damage_mult', numericValue: 0 }))
    expect(r && r.ok && r.signal.value).toBe(0)
  })
})
