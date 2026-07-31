import { describe, expect, it } from 'vitest'
import { resolveCritSignal } from './critResolver.ts'
import { buildResolveContext } from './resolverTestFixtures.ts'

describe('resolveCritSignal', () => {
  it('buff_base_crit_chance_add → heroCritChance / add（无 amountFunc 字段）', () => {
    const r = resolveCritSignal(buildResolveContext({ effectName: 'buff_base_crit_chance_add', numericValue: 5 }))
    expect(r?.ok).toBe(true)
    if (r?.ok) {
      expect(r.signal.kind).toBe('heroCritChance')
      expect(r.signal.value).toBe(5)
      expect(r.signal.amountFunc).toBeUndefined()
      expect(r.bucket).toBe('supportSignals')
    }
  })

  it('buff_base_crit_chance_mult → heroCritChance / mult', () => {
    const r = resolveCritSignal(buildResolveContext({ effectName: 'buff_base_crit_chance_mult' }))
    expect(r?.ok).toBe(true)
    expect(r && r.ok && r.signal.amountFunc).toBe('mult')
  })

  it('buff_base_crit_damage_mult → heroCritDamage / mult', () => {
    const r = resolveCritSignal(buildResolveContext({ effectName: 'buff_base_crit_damage_mult' }))
    expect(r?.ok).toBe(true)
    if (r?.ok) {
      expect(r.signal.kind).toBe('heroCritDamage')
      expect(r.signal.amountFunc).toBe('mult')
    }
  })

  it('global_buff_base_crit_chance_add → globalCritChance', () => {
    const r = resolveCritSignal(buildResolveContext({ effectName: 'global_buff_base_crit_chance_add' }))
    expect(r?.ok).toBe(true)
    expect(r && r.ok && r.signal.kind).toBe('globalCritChance')
  })

  it('global_buff_base_crit_damage_mult → globalCritDamage / mult', () => {
    const r = resolveCritSignal(buildResolveContext({ effectName: 'global_buff_base_crit_damage_mult' }))
    expect(r?.ok).toBe(true)
    expect(r && r.ok && r.signal.kind).toBe('globalCritDamage')
    expect(r && r.ok && r.signal.amountFunc).toBe('mult')
  })

  it('不匹配的 effect 名 → null', () => {
    expect(resolveCritSignal(buildResolveContext({ effectName: 'health_mult' }))).toBeNull()
  })
})
