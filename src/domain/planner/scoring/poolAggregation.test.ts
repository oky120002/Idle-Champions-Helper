import { describe, expect, it } from 'vitest'
import { unwrap } from '../../../../tests/utils/dom-assertions'
import type { AggregatedPool } from '../placementFit'
import { mergePools, productOfPoolMultipliers } from './poolAggregation'

function makePool(dimension: string, scope: string, addPercent: number, multFactor: number): AggregatedPool {
  return {
    addPercent,
    multFactor,
    dimension: dimension as AggregatedPool['dimension'],
    poolMultiplier: (1 + addPercent / 100) * multFactor,
    scope: scope as AggregatedPool['scope'],
  }
}

describe('mergePools', () => {
  it('同 dimension:scope 的 addPercent 相加、multFactor 相乘', () => {
    const shared = new Map<string, AggregatedPool>()
    mergePools(shared, [makePool('damage', 'global', 100, 2)])
    mergePools(shared, [makePool('damage', 'global', 50, 3)])

    const merged = unwrap(shared.get('damage:global'), 'missing damage:global')
    expect(merged.addPercent).toBe(150)
    expect(merged.multFactor).toBe(6)
    // poolMultiplier = (1 + 150/100) × 6 = 15
    expect(merged.poolMultiplier).toBe(15)
  })

  it('不同 dimension:scope 各自独立 entry', () => {
    const shared = new Map<string, AggregatedPool>()
    mergePools(shared, [makePool('damage', 'global', 100, 1), makePool('damage', 'hero', 200, 1)])
    expect(shared.size).toBe(2)
    expect(shared.has('damage:global')).toBe(true)
    expect(shared.has('damage:hero')).toBe(true)
  })

  it('合并顺序不影响结果（交换律）', () => {
    const a = makePool('damage', 'global', 100, 2)
    const b = makePool('damage', 'global', 50, 3)

    const order1 = new Map<string, AggregatedPool>()
    mergePools(order1, [a, b])
    const order2 = new Map<string, AggregatedPool>()
    mergePools(order2, [b, a])

    const o1 = unwrap(order1.get('damage:global'), 'missing damage:global in order1')
    const o2 = unwrap(order2.get('damage:global'), 'missing damage:global in order2')
    expect(o1.addPercent).toBe(o2.addPercent)
    expect(o1.multFactor).toBe(o2.multFactor)
    expect(o1.poolMultiplier).toBe(o2.poolMultiplier)
  })

  it('空池数组合并不改变 sharedPools', () => {
    const shared = new Map<string, AggregatedPool>([['damage:global', makePool('damage', 'global', 100, 1)]])
    mergePools(shared, [])
    expect(shared.size).toBe(1)
  })
})

describe('productOfPoolMultipliers', () => {
  it('pool 间 poolMultiplier 相乘', () => {
    const shared = new Map<string, AggregatedPool>([
      ['damage:global', makePool('damage', 'global', 100, 1)], // (1+1)×1 = 2
      ['damage:hero', makePool('damage', 'hero', 200, 2)], // (1+2)×2 = 6
    ])
    // 2 × 6 = 12
    expect(productOfPoolMultipliers(shared)).toBe(12)
  })

  it('空 Map → 1', () => {
    expect(productOfPoolMultipliers(new Map())).toBe(1)
  })
})
