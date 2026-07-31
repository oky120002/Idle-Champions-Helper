import { describe, expect, it } from 'vitest'
import { resolveSpeedSignal } from './speedResolver.ts'
import { buildResolveContext } from './resolverTestFixtures.ts'

describe('resolveSpeedSignal', () => {
  it('base_attack_speed_mult → attackSpeedMult / mult', () => {
    const r = resolveSpeedSignal(buildResolveContext({ effectName: 'base_attack_speed_mult', numericValue: 30 }))
    expect(r?.ok).toBe(true)
    if (r?.ok) {
      expect(r.signal.kind).toBe('attackSpeedMult')
      expect(r.signal.value).toBe(30)
      expect(r.signal.amountFunc).toBe('mult')
      expect(r.bucket).toBe('supportSignals')
    }
  })

  it('reduce_attack_cooldown → attackSpeedMult / add（减冷却=提速）', () => {
    const r = resolveSpeedSignal(buildResolveContext({ effectName: 'reduce_attack_cooldown' }))
    expect(r?.ok).toBe(true)
    if (r?.ok) {
      expect(r.signal.kind).toBe('attackSpeedMult')
      expect(r.signal.amountFunc).toBeUndefined()
    }
  })

  it('reduce_ultimate_cooldown → cooldownReduction / add', () => {
    const r = resolveSpeedSignal(buildResolveContext({ effectName: 'reduce_ultimate_cooldown' }))
    expect(r?.ok).toBe(true)
    if (r?.ok) {
      expect(r.signal.kind).toBe('cooldownReduction')
      expect(r.signal.amountFunc).toBeUndefined()
    }
  })

  it('ability_cooldown_reduction_mult → cooldownReduction / mult', () => {
    const r = resolveSpeedSignal(buildResolveContext({ effectName: 'ability_cooldown_reduction_mult' }))
    expect(r?.ok).toBe(true)
    expect(r && r.ok && r.signal.amountFunc).toBe('mult')
  })

  it('不匹配的 effect 名 → null', () => {
    expect(resolveSpeedSignal(buildResolveContext({ effectName: 'damage_reduction' }))).toBeNull()
  })
})
