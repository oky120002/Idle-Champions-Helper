import { describe, expect, it } from 'vitest'
import { parseEffectPayload } from '../../../src/domain/effects/effect-string.ts'
import { resolveGoldSignal } from './goldResolver.ts'
import { buildResolveContext } from './resolverTestFixtures.ts'

describe('resolveGoldSignal', () => {
  it('gold_multiplier_mult → 全队金币池（support）', () => {
    const r = resolveGoldSignal(buildResolveContext({ effectName: 'gold_multiplier_mult', numericValue: 50 }))
    expect(r?.ok).toBe(true)
    if (r?.ok) {
      expect(r.signal.kind).toBe('globalGoldMultiplier')
      expect(r.signal.value).toBe(50)
      expect(r.bucket).toBe('supportSignals')
    }
  })

  it('gold_mult_per_tagged_crusader_mult → per_tagged_crusader_mult + formationCountQualifier', () => {
    const r = resolveGoldSignal(buildResolveContext({
      effectName: 'gold_mult_per_tagged_crusader_mult',
      effectPayload: parseEffectPayload('gold_mult_per_tagged_crusader_mult,100,female'),
    }))
    expect(r?.ok).toBe(true)
    if (r?.ok) {
      expect(r.signal.kind).toBe('globalGoldMultiplier')
      expect(r.signal.amountFunc).toBe('mult')
      expect(r.signal.stackFunc).toBe('per_tagged_crusader_mult')
      expect(r.signal.formationCountQualifier).toBeTruthy()
    }
  })

  it('gold_mult_per_tagged_crusader_mult 缺 tag qualifier → unsupported', () => {
    const r = resolveGoldSignal(buildResolveContext({
      effectName: 'gold_mult_per_tagged_crusader_mult',
      effectPayload: parseEffectPayload('gold_mult_per_tagged_crusader_mult,100'),
    }))
    expect(r?.ok).toBe(false)
  })

  it('不匹配的 effect 名 → null', () => {
    expect(resolveGoldSignal(buildResolveContext({ effectName: 'not_a_gold_effect' }))).toBeNull()
  })
})
