import type { AggregatedPool } from '../placementFit'

/**
 * 把一批 pool 合并进 sharedPools（同 dimension:scope 的 addPercent 相加、multFactor 相乘）。
 * pool 内 poolMultiplier = (1 + addPercent/100) × multFactor。原地合并：sharedPools 被修改。
 */
export function mergePools(sharedPools: Map<string, AggregatedPool>, pools: AggregatedPool[]): void {
  for (const pool of pools) {
    const key = `${pool.dimension}:${pool.scope}`
    const merged = sharedPools.get(key) ?? {
      dimension: pool.dimension,
      scope: pool.scope,
      addPercent: 0,
      multFactor: 1,
      poolMultiplier: 1,
    }
    merged.addPercent += pool.addPercent
    merged.multFactor *= pool.multFactor
    merged.poolMultiplier = (1 + merged.addPercent / 100) * merged.multFactor
    sharedPools.set(key, merged)
  }
}

/** Π(poolMultiplier)：pool 间乘法。 */
export function productOfPoolMultipliers(pools: Map<string, AggregatedPool>): number {
  let aggregate = 1
  for (const [key, pool] of pools) {
    if (!Number.isFinite(pool.addPercent) || !Number.isFinite(pool.multFactor) || !Number.isFinite(pool.poolMultiplier)) {
      throw new Error(`pool ${key} contains a non-finite value`)
    }
    if (pool.poolMultiplier < 0) {
      throw new Error(`pool ${key} contains a negative multiplier`)
    }
    aggregate *= pool.poolMultiplier
  }
  if (!Number.isFinite(aggregate)) {
    throw new Error('pool multiplier product is non-finite')
  }
  return aggregate
}
