import type { HeroAbilityAmountFunc } from '../../../src/domain/abilities/abilityModel'
import { normalizeExplicitTargeting, normalizeTargetQualifier } from '../../../src/domain/abilities/signalSemantics.ts'
import {
  makeUnsupported,
  parseTagQualifierFromArg,
  resolveBucket,
  resolveCountRelation,
  type EffectResolveContext,
  type EffectSignalResult,
} from './resolverShared.ts'

// hero_dps_mult_per_target_crusader[_mult|_prebonus_mult]：按位置计数目标。
// add（单数名）/ mult（_mult、_prebonus_mult）仅 amountFunc 不同，其余逻辑一致。
function resolveHeroDpsPerTarget(ctx: EffectResolveContext, amountFunc: HeroAbilityAmountFunc): EffectSignalResult {
  const { effectName, effectValue, source, numericValue, rawEffect, effectMetadata } = ctx
  const bucketResult = resolveBucket(effectMetadata.effect)
  if (!bucketResult.ok) {
    return makeUnsupported(effectName, effectValue, bucketResult.note, source)
  }

  const countRelation = resolveCountRelation(effectMetadata.effectPayload?.args[1] ?? null)
  if (countRelation === null) {
    return makeUnsupported(
      effectName,
      effectValue,
      `Unsupported per-target count relation: ${JSON.stringify(effectMetadata.effectPayload?.args[1] ?? null)}`,
      source,
    )
  }

  return {
    ok: true,
    signal: {
      kind: 'heroDpsMultiplier',
      value: numericValue,
      stackFunc: 'per_target_crusader',
      formationCountPositionQualifier: { relation: countRelation },
      rawEffect,
      source,
      amountFunc,
    },
    bucket: bucketResult.bucket,
  }
}

// hero_dps_mult_per_tagged_crusader_mult[_amount_before]：按 tag 计数。两个 effect 逻辑完全一致。
function resolveHeroDpsPerTagged(ctx: EffectResolveContext): EffectSignalResult {
  const { effectName, effectValue, source, numericValue, rawEffect, effectMetadata } = ctx
  const bucketResult = resolveBucket(effectMetadata.effect)
  if (!bucketResult.ok) {
    return makeUnsupported(effectName, effectValue, bucketResult.note, source)
  }

  const formationCountQualifier = parseTagQualifierFromArg(effectMetadata.effectPayload?.args[1] ?? null)
  if (!formationCountQualifier) {
    return makeUnsupported(
      effectName,
      effectValue,
      `Unsupported tagged count qualifier: ${JSON.stringify(effectMetadata.effectPayload?.args[1] ?? null)}`,
      source,
    )
  }

  return {
    ok: true,
    signal: {
      kind: 'heroDpsMultiplier',
      value: numericValue,
      amountFunc: 'mult',
      stackFunc: 'per_tagged_crusader_mult',
      rawEffect,
      source,
      formationCountQualifier,
    },
    bucket: bucketResult.bucket,
  }
}

// DPS 池。global_dps_multiplier_mult → 全队；hero_dps_* → 英雄侧（carry/support 按 targeting）。
export function resolveDpsSignal(ctx: EffectResolveContext): EffectSignalResult | null {
  const { effectName, effectValue, source, numericValue, rawEffect, effectMetadata } = ctx

  if (effectName === 'global_dps_multiplier_mult') {
    return {
      ok: true,
      signal: { kind: 'globalDpsMultiplier', value: numericValue, rawEffect, source },
      bucket: 'supportSignals',
    }
  }

  if (effectName === 'hero_dps_multiplier_mult') {
    const explicitTargeting = normalizeExplicitTargeting(effectMetadata.effect)

    if (explicitTargeting.status === 'unsupported') {
      return makeUnsupported(effectName, effectValue, explicitTargeting.note, source)
    }

    return {
      ok: true,
      signal: { kind: 'heroDpsMultiplier', value: numericValue, rawEffect, source },
      bucket:
        explicitTargeting.status === 'supported' && explicitTargeting.relation !== 'self'
          ? 'supportSignals'
          : 'carrySignals',
    }
  }

  if (effectName === 'hero_dps_mult_per_target_crusader') {
    return resolveHeroDpsPerTarget(ctx, 'add')
  }

  if (
    effectName === 'hero_dps_mult_per_target_crusader_mult'
    || effectName === 'hero_dps_mult_per_target_crusader_prebonus_mult'
  ) {
    return resolveHeroDpsPerTarget(ctx, 'mult')
  }

  if (
    effectName === 'hero_dps_mult_per_tagged_crusader_mult'
    || effectName === 'hero_dps_mult_per_tagged_crusader_mult_amount_before'
  ) {
    return resolveHeroDpsPerTagged(ctx)
  }

  if (effectName === 'hero_dps_mult_per_crusader_mult') {
    const bucketResult = resolveBucket(effectMetadata.effect)
    if (!bucketResult.ok) {
      return makeUnsupported(effectName, effectValue, bucketResult.note, source)
    }

    const targetQualifier = normalizeTargetQualifier(effectMetadata.effect)

    return {
      ok: true,
      signal: {
        kind: 'heroDpsMultiplier',
        value: numericValue,
        amountFunc: 'mult',
        stackFunc: 'per_crusader',
        formationCountQualifier: targetQualifier,
        rawEffect,
        source,
        targetQualifier,
      },
      bucket: bucketResult.bucket,
    }
  }

  if (effectName === 'hero_dps_mult_per_col_behind') {
    const bucketResult = resolveBucket(effectMetadata.effect)
    if (!bucketResult.ok) {
      return makeUnsupported(effectName, effectValue, bucketResult.note, source)
    }

    return {
      ok: true,
      signal: {
        kind: 'heroDpsMultiplier',
        value: numericValue,
        amountFunc: 'mult',
        stackFunc: 'per_col_behind',
        rawEffect,
        source,
      },
      bucket: bucketResult.bucket,
    }
  }

  return null
}
