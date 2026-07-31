import { describe, expect, it } from 'vitest'
import { resolveSurvivalSignal } from './survivalResolver.ts'
import { buildResolveContext } from './resolverTestFixtures.ts'

describe('resolveSurvivalSignal', () => {
  it('health_mult → heroHealthMultiplier / add', () => {
    const r = resolveSurvivalSignal(buildResolveContext({ effectName: 'health_mult', numericValue: 200 }))
    expect(r?.ok).toBe(true)
    if (r?.ok) {
      expect(r.signal.kind).toBe('heroHealthMultiplier')
      expect(r.signal.value).toBe(200)
      expect(r.signal.amountFunc).toBeUndefined()
      expect(r.bucket).toBe('supportSignals')
    }
  })

  it('global_health_mult → globalHealthMultiplier', () => {
    const r = resolveSurvivalSignal(buildResolveContext({ effectName: 'global_health_mult' }))
    expect(r?.ok).toBe(true)
    expect(r && r.ok && r.signal.kind).toBe('globalHealthMultiplier')
  })

  it('damage_reduction → damageReduction / add', () => {
    const r = resolveSurvivalSignal(buildResolveContext({ effectName: 'damage_reduction' }))
    expect(r?.ok).toBe(true)
    if (r?.ok) {
      expect(r.signal.kind).toBe('damageReduction')
      expect(r.signal.amountFunc).toBeUndefined()
    }
  })

  it('trials_damage_reduction_mult → damageReduction / mult（与 add 等价类区分）', () => {
    const r = resolveSurvivalSignal(buildResolveContext({ effectName: 'trials_damage_reduction_mult' }))
    expect(r?.ok).toBe(true)
    expect(r && r.ok && r.signal.kind).toBe('damageReduction')
    expect(r && r.ok && r.signal.amountFunc).toBe('mult')
  })

  it('不匹配的 effect 名 → null', () => {
    expect(resolveSurvivalSignal(buildResolveContext({ effectName: 'buff_base_crit_chance_add' }))).toBeNull()
  })
})
