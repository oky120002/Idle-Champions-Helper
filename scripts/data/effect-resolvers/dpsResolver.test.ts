import { describe, expect, it } from 'vitest'
import { parseEffectPayload } from '../../../src/domain/effects/effect-string.ts'
import { resolveDpsSignal } from './dpsResolver.ts'
import { buildResolveContext } from './resolverTestFixtures.ts'

describe('resolveDpsSignal', () => {
  it('global_dps_multiplier_mult → 全队 dps 池（support）', () => {
    const r = resolveDpsSignal(buildResolveContext({ effectName: 'global_dps_multiplier_mult', numericValue: 200 }))
    expect(r?.ok).toBe(true)
    if (r?.ok) {
      expect(r.signal.kind).toBe('globalDpsMultiplier')
      expect(r.signal.value).toBe(200)
      expect(r.bucket).toBe('supportSignals')
    }
  })

  it('hero_dps_multiplier_mult 无 targeting → carry 池（自身）', () => {
    const r = resolveDpsSignal(buildResolveContext({ effectName: 'hero_dps_multiplier_mult', effect: {} }))
    expect(r?.ok).toBe(true)
    if (r?.ok) {
      expect(r.signal.kind).toBe('heroDpsMultiplier')
      expect(r.bucket).toBe('carrySignals')
    }
  })

  it('hero_dps_multiplier_mult targeting all → support 池', () => {
    const r = resolveDpsSignal(buildResolveContext({
      effectName: 'hero_dps_multiplier_mult',
      effect: { targets: ['all'] },
    }))
    expect(r?.ok).toBe(true)
    expect(r && r.ok && r.bucket).toBe('supportSignals')
  })

  it('hero_dps_mult_per_target_crusader → per_target_crusader / add', () => {
    const r = resolveDpsSignal(buildResolveContext({
      effectName: 'hero_dps_mult_per_target_crusader',
      effectPayload: parseEffectPayload('hero_dps_mult_per_target_crusader,100,all'),
      effect: { targets: ['all'] },
    }))
    expect(r?.ok).toBe(true)
    if (r?.ok) {
      expect(r.signal.amountFunc).toBe('add')
      expect(r.signal.stackFunc).toBe('per_target_crusader')
      expect(r.signal.formationCountPositionQualifier?.relation).toBe('any')
    }
  })

  it('hero_dps_mult_per_target_crusader_mult → mult（与 add 变体等价类区分）', () => {
    const r = resolveDpsSignal(buildResolveContext({
      effectName: 'hero_dps_mult_per_target_crusader_mult',
      effectPayload: parseEffectPayload('hero_dps_mult_per_target_crusader_mult,100,all'),
      effect: { targets: ['all'] },
    }))
    expect(r?.ok).toBe(true)
    expect(r && r.ok && r.signal.amountFunc).toBe('mult')
  })

  it('hero_dps_mult_per_tagged_crusader_mult → per_tagged_crusader_mult + formationCountQualifier', () => {
    const r = resolveDpsSignal(buildResolveContext({
      effectName: 'hero_dps_mult_per_tagged_crusader_mult',
      effectPayload: parseEffectPayload('hero_dps_mult_per_tagged_crusader_mult,100,female'),
      effect: { targets: ['all'] },
    }))
    expect(r?.ok).toBe(true)
    if (r?.ok) {
      expect(r.signal.stackFunc).toBe('per_tagged_crusader_mult')
      expect(r.signal.amountFunc).toBe('mult')
      expect(r.signal.formationCountQualifier).toBeTruthy()
    }
  })

  it('hero_dps_mult_per_crusader_mult → per_crusader + targetQualifier（来自 filter_targets）', () => {
    const r = resolveDpsSignal(buildResolveContext({
      effectName: 'hero_dps_mult_per_crusader_mult',
      effect: { targets: ['all'], filter_targets: [{ type: 'by_tags', tags: 'female' }] },
    }))
    expect(r?.ok).toBe(true)
    if (r?.ok) {
      expect(r.signal.stackFunc).toBe('per_crusader')
      expect(r.signal.targetQualifier).toBeTruthy()
      expect(r.signal.formationCountQualifier).toBeTruthy()
    }
  })

  it('hero_dps_mult_per_col_behind → per_col_behind', () => {
    const r = resolveDpsSignal(buildResolveContext({
      effectName: 'hero_dps_mult_per_col_behind',
      effect: { targets: ['all'] },
    }))
    expect(r?.ok).toBe(true)
    expect(r && r.ok && r.signal.stackFunc).toBe('per_col_behind')
  })

  it('不匹配的 effect 名 → null', () => {
    expect(resolveDpsSignal(buildResolveContext({ effectName: 'not_a_dps_effect' }))).toBeNull()
  })

  it('边界：value=0 与负值原样透传', () => {
    const zero = resolveDpsSignal(buildResolveContext({ effectName: 'global_dps_multiplier_mult', numericValue: 0 }))
    expect(zero && zero.ok && zero.signal.value).toBe(0)
    const neg = resolveDpsSignal(buildResolveContext({ effectName: 'global_dps_multiplier_mult', numericValue: -50 }))
    expect(neg && neg.ok && neg.signal.value).toBe(-50)
  })
})
