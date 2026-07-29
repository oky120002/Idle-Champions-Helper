import {
  makeUnsupported,
  parseTagQualifierFromArg,
  type EffectResolveContext,
  type EffectSignalResult,
} from './resolverShared.ts'

// 金币池（gold find 全队聚合 stat → globalGoldMultiplier）。
export function resolveGoldSignal(ctx: EffectResolveContext): EffectSignalResult | null {
  const { effectName, effectValue, source, numericValue, rawEffect, effectMetadata } = ctx

  if (effectName === 'gold_multiplier_mult') {
    return {
      ok: true,
      signal: { kind: 'globalGoldMultiplier', value: numericValue, rawEffect, source },
      bucket: 'supportSignals',
    }
  }

  if (effectName === 'gold_mult_per_tagged_crusader_mult') {
    const formationCountQualifier = parseTagQualifierFromArg(effectMetadata.effectPayload?.args?.[1] ?? null)
    if (!formationCountQualifier) {
      return makeUnsupported(
        effectName,
        effectValue,
        `Unsupported tagged count qualifier: ${JSON.stringify(effectMetadata.effectPayload?.args?.[1] ?? null)}`,
        source,
      )
    }

    return {
      ok: true,
      signal: {
        kind: 'globalGoldMultiplier',
        value: numericValue,
        rawEffect,
        source,
        amountFunc: 'mult',
        stackFunc: 'per_tagged_crusader_mult',
        formationCountQualifier,
      },
      bucket: 'supportSignals',
    }
  }

  return null
}
