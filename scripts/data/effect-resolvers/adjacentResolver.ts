import type { EffectResolveContext, EffectSignalResult } from './resolverShared.ts'

// adjacent_* 前缀 → 邻位 buff。
export function resolveAdjacentSignal(
  ctx: Pick<EffectResolveContext, 'effectName' | 'numericValue' | 'rawEffect' | 'source'>,
): EffectSignalResult | null {
  const { effectName, numericValue, rawEffect, source } = ctx
  if (!effectName.startsWith('adjacent_')) {
    return null
  }
  return {
    ok: true,
    signal: { kind: 'adjacentBuff', value: numericValue, rawEffect, source },
    bucket: 'supportSignals',
  }
}
