import { describe, expect, it } from 'vitest'
import { resolveTagSignal } from './tagResolver.ts'
import { buildResolveContext } from './resolverTestFixtures.ts'

describe('resolveTagSignal', () => {
  it('tag_ 前缀 → taggedChampionBuff（support 池）', () => {
    const r = resolveTagSignal(buildResolveContext({ effectName: 'tag_damage_mult', numericValue: 100 }))
    expect(r?.ok).toBe(true)
    if (r?.ok) {
      expect(r.signal.kind).toBe('taggedChampionBuff')
      expect(r.signal.value).toBe(100)
      expect(r.bucket).toBe('supportSignals')
    }
  })

  it('非 tag_ 前缀 → null', () => {
    expect(resolveTagSignal(buildResolveContext({ effectName: 'adjacent_damage_mult' }))).toBeNull()
    expect(resolveTagSignal(buildResolveContext({ effectName: 'gold_multiplier_mult' }))).toBeNull()
  })

  it('边界：value=0 原样透传', () => {
    const r = resolveTagSignal(buildResolveContext({ effectName: 'tag_damage_mult', numericValue: 0 }))
    expect(r && r.ok && r.signal.value).toBe(0)
  })
})
