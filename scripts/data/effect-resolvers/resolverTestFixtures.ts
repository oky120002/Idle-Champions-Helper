import type { ParsedEffectPayload } from '../../../src/domain/effects/effect-string.ts'
import type { EffectResolveContext, EffectSignalMetadata } from './resolverShared.ts'

// 构造 resolver 单测用的 EffectResolveContext：默认 source=official-parsed、numericValue=100，
// effect/effectPayload 按需覆盖（dps/gold/vulnerability 需要 targeting 或 args）。
export function buildResolveContext(overrides: {
  effectName: string
  numericValue?: number
  effect?: unknown
  effectPayload?: ParsedEffectPayload | null
  effectValue?: string
}): EffectResolveContext {
  const numericValue = overrides.numericValue ?? 100
  const effectValue = overrides.effectValue ?? String(numericValue)
  const effectMetadata: EffectSignalMetadata = {
    effect: overrides.effect ?? {},
    effectPayload: overrides.effectPayload ?? null,
  }
  return {
    effectName: overrides.effectName,
    effectValue,
    source: 'official-parsed',
    numericValue,
    rawEffect: `${overrides.effectName},${effectValue}`,
    effectMetadata,
  }
}
