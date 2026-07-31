import { describe, expect, it } from 'vitest'

import { evaluatePlacementFit } from './placementFit'
import { createHero, scenario } from './placementFitTestFixtures'

describe('placement fit — pools', () => {
  it('global support 对 carry 生效，并把百分比换算为 multiplier', () => {
    const fit = evaluatePlacementFit({
      carryHero: createHero('carry'),
      carrySlotId: 's2',
      supportHero: createHero('support', {
        supportSignals: [
          { kind: 'globalDpsMultiplier', value: 100, rawEffect: 'global_dps_multiplier_mult,100', source: 'official-parsed' },
        ],
      }),
      supportSlotId: 's1',
      scenario,
    })

    expect(fit.totalMultiplier).toBe(2)
    expect(fit.scoreBreakdown[0]?.reasonCode).toBe('global-match')
  })

  it('同 pool 内多个 additive signal 按百分比相加（非累乘）', () => {
    const fit = evaluatePlacementFit({
      carryHero: createHero('carry'),
      carrySlotId: 's2',
      supportHero: createHero('support', {
        supportSignals: [
          { kind: 'globalDpsMultiplier', value: 100, rawEffect: 'global_dps_mult_a,100', source: 'official-parsed' },
          { kind: 'globalDpsMultiplier', value: 100, rawEffect: 'global_dps_mult_b,100', source: 'official-parsed' },
        ],
      }),
      supportSlotId: 's1',
      scenario,
    })

    // 同属 damage:global pool，additive 百分比相加：1 + (100+100)/100 = 3（非 (1+1)*(1+1)=4）
    expect(fit.totalMultiplier).toBe(3)
  })

  it('pool 间 global×hero 相乘，pool 内 additive 相加', () => {
    const fit = evaluatePlacementFit({
      carryHero: createHero('carry'),
      carrySlotId: 's2',
      supportHero: createHero('support', {
        supportSignals: [
          { kind: 'globalDpsMultiplier', value: 100, rawEffect: 'global_dps_mult_a,100', source: 'official-parsed' },
          { kind: 'globalDpsMultiplier', value: 100, rawEffect: 'global_dps_mult_b,100', source: 'official-parsed' },
          { kind: 'adjacentBuff', value: 100, rawEffect: 'adjacent_buff,100', source: 'official-parsed' },
        ],
      }),
      supportSlotId: 's1',
      scenario,
    })

    // global pool: 1+(100+100)/100=3；hero pool(adjacentBuff): 1+100/100=2；pool 间乘法 = 6
    // 旧纯累乘为 2*2*2=8；lumped Σ 为 1+300/100=4——本断言区分两者
    expect(fit.totalMultiplier).toBe(6)
  })

  it('multiplicative signal 在 pool 内相乘，与 additive pool 间相乘', () => {
    const fit = evaluatePlacementFit({
      carryHero: createHero('carry'),
      carrySlotId: 's2',
      supportHero: createHero('support', {
        supportSignals: [
          { kind: 'globalDpsMultiplier', value: 50, rawEffect: 'global_dps_mult_a,50', source: 'official-parsed' },
          { kind: 'adjacentBuff', value: 200, rawEffect: 'adjacent_buff,200', source: 'official-parsed', amountFunc: 'mult' },
        ],
      }),
      supportSlotId: 's1',
      scenario,
    })

    // global pool add: 1+50/100=1.5；hero pool mult: (1+200/100)=3；间乘 = 4.5
    expect(fit.totalMultiplier).toBeCloseTo(4.5, 6)
  })

  it('aggregatePools: false 时跳过 pool 聚合，只产 scoreBreakdown', () => {
    const fit = evaluatePlacementFit({
      carryHero: createHero('carry'),
      carrySlotId: 's2',
      supportHero: createHero('support', {
        supportSignals: [
          { kind: 'globalDpsMultiplier', value: 100, rawEffect: 'global_dps_multiplier_mult,100', source: 'official-parsed' },
        ],
      }),
      supportSlotId: 's1',
      scenario,
      aggregatePools: false,
    })

    // scoreBreakdown 照常产出（crit/vulnerability 维度消费它算 factor）
    expect(fit.scoreBreakdown[0]?.reasonCode).toBe('global-match')
    expect(fit.scoreBreakdown[0]?.multiplier).toBe(2)
    // pool 聚合被跳过——消费方不读 pools/totalMultiplier
    expect(fit.pools).toEqual([])
    expect(fit.totalMultiplier).toBe(1)
  })
})
