import type { EffectResolveContext, EffectSignalResult } from './resolverShared.ts'

// tag_* 前缀 → tagged champion buff。
export function resolveTagSignal(
  ctx: Pick<EffectResolveContext, 'effectName' | 'numericValue' | 'rawEffect' | 'source'>,
): EffectSignalResult | null {
  const { effectName, numericValue, rawEffect, source } = ctx
  if (!effectName.startsWith('tag_')) {
    return null
  }
  return {
    ok: true,
    signal: { kind: 'taggedChampionBuff', value: numericValue, rawEffect, source },
    bucket: 'supportSignals',
  }
}
