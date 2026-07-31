import type { ParsedEffectPayload } from '../../../src/domain/effects/effect-string.ts'
import type { HeroAbilitySource } from '../../../src/domain/abilities/abilityModel'
import {
  makeUnsupported,
  resolveNumericValue,
  type EffectResolveContext,
  type EffectSignalMetadata,
  type EffectSignalResult,
} from './resolverShared.ts'
import { resolveDpsSignal } from './dpsResolver.ts'
import { resolveAdjacentSignal } from './adjacentResolver.ts'
import { resolveGoldSignal } from './goldResolver.ts'
import { resolveCritSignal } from './critResolver.ts'
import { resolveSurvivalSignal } from './survivalResolver.ts'
import { resolveVulnerabilitySignal } from './vulnerabilityResolver.ts'
import { resolveSpeedSignal } from './speedResolver.ts'
import { resolveTagSignal } from './tagResolver.ts'

// effect resolver 派发表：首匹配生效。各 resolver 处理的 effect 名族互斥（dps/adjacent/gold/crit/
// survival/vulnerability/speed/tag），顺序不改变结果；新增机制在此登记一行即可。
const EFFECT_RESOLVERS: ReadonlyArray<(ctx: EffectResolveContext) => EffectSignalResult | null> = [
  resolveDpsSignal,
  resolveAdjacentSignal,
  resolveGoldSignal,
  resolveCritSignal,
  resolveSurvivalSignal,
  resolveVulnerabilitySignal,
  resolveSpeedSignal,
  resolveTagSignal,
]

function dispatchEffectResolvers(ctx: EffectResolveContext): EffectSignalResult | null {
  for (const resolve of EFFECT_RESOLVERS) {
    const result = resolve(ctx)
    if (result) {
      return result
    }
  }
  return null
}

function buildRawEffect(
  effectName: string,
  effectValue: string,
  effectPayload: ParsedEffectPayload | null | undefined,
): string {
  return effectPayload?.effectString ?? `${effectName},${effectValue}`
}

export function normalizeEffectSignal(
  effectName: string,
  effectValue: string,
  source: HeroAbilitySource,
  effectMetadata: EffectSignalMetadata = {},
): EffectSignalResult {
  if (effectMetadata.signalPreset) {
    return {
      ok: true,
      signal: effectMetadata.signalPreset,
      bucket: effectMetadata.bucketOverride ?? 'supportSignals',
    }
  }

  const rawEffect = buildRawEffect(effectName, effectValue, effectMetadata.effectPayload)
  const numericValue = resolveNumericValue(
    effectValue,
    effectMetadata.effectPayload,
    effectMetadata.effectPayloads,
    effectMetadata.upgradePayloadsById,
  )

  if (!Number.isFinite(numericValue)) {
    return makeUnsupported(effectName, effectValue, `Effect value is not numeric: ${effectValue}`, source)
  }

  const ctx: EffectResolveContext = { effectName, effectValue, source, numericValue, rawEffect, effectMetadata }

  return (
    dispatchEffectResolvers(ctx)
    ?? makeUnsupported(effectName, effectValue, `No parser for effect: ${effectName}`, source)
  )
}
