import { describe, expect, it } from 'vitest'

import { evaluatePlacementFit } from './placementFit'
import { createHero, extendedScenario, scenario } from './placementFitTestFixtures'

describe('placement fit — counting', () => {
  it('additive 计数效果按 count 线性累加', () => {
    const carryHero = createHero('carry', { tags: ['female'] })
    const supportHero = createHero('support', {
      tags: ['female'],
      supportSignals: [
        {
          kind: 'globalDpsMultiplier',
          value: 20,
          rawEffect: 'global_dps_multiplier_mult,20',
          source: 'official-parsed',
          amountFunc: 'add',
          stackFunc: 'per_crusader',
          targetQualifier: { predicate: { op: 'tag', tag: 'female' } },
        },
      ],
    })
    const heroesById = new Map([
      ['carry', carryHero],
      ['support', supportHero],
      ['other', createHero('other', { tags: ['female'] })],
      ['other-two', createHero('other-two', { tags: ['female'] })],
    ])

    const fit = evaluatePlacementFit({
      carryHero,
      supportHero,
      scenario,
      heroesById,
      carrySlotId: 's2',
      supportSlotId: 's1',
      placements: { s1: 'support', s2: 'carry', s3: 'other' },
    })

    expect(fit.totalMultiplier).toBeCloseTo(1.6)
  })

  it('multiplicative 计数效果按 count 乘方累乘', () => {
    const carryHero = createHero('carry', { tags: ['female'] })
    const supportHero = createHero('support', {
      tags: ['female'],
      supportSignals: [
        {
          kind: 'globalDpsMultiplier',
          value: 20,
          rawEffect: 'global_dps_multiplier_mult,20',
          source: 'official-parsed',
          amountFunc: 'mult',
          stackFunc: 'per_crusader',
          targetQualifier: { predicate: { op: 'tag', tag: 'female' } },
        },
      ],
    })
    const heroesById = new Map([
      ['carry', carryHero],
      ['support', supportHero],
      ['other', createHero('other', { tags: ['female'] })],
      ['other-two', createHero('other-two', { tags: ['female'] })],
    ])

    const fit = evaluatePlacementFit({
      carryHero,
      supportHero,
      scenario,
      heroesById,
      carrySlotId: 's2',
      supportSlotId: 's1',
      placements: { s1: 'support', s2: 'carry', s3: 'other' },
    })

    expect(fit.totalMultiplier).toBeCloseTo(1.728)
  })

  it('position-scoped additive 计数效果按站位子集线性累加', () => {
    const supportHero = createHero('carry', {
      carrySignals: [
        {
          kind: 'heroDpsMultiplier',
          value: 100,
          rawEffect: 'hero_dps_mult_per_target_crusader,100,adj',
          source: 'official-parsed',
          amountFunc: 'add',
          stackFunc: 'per_target_crusader',
          formationCountPositionQualifier: { relation: 'adjacent' },
        },
      ],
    })
    const heroesById = new Map([
      ['carry', supportHero],
      ['adj-1', createHero('adj-1')],
      ['adj-2', createHero('adj-2')],
    ])

    const fit = evaluatePlacementFit({
      supportHero,
      scenario,
      heroesById,
      carryHero: supportHero,
      carrySlotId: 's2',
      supportSlotId: 's2',
      placements: { s1: 'adj-1', s2: 'carry', s3: 'adj-2' },
    })

    expect(fit.totalMultiplier).toBe(3)
  })

  it('per_col_behind 按 carry 落后列数乘方累乘', () => {
    const fit = evaluatePlacementFit({
      carryHero: createHero('carry'),
      carrySlotId: 's1',
      supportHero: createHero('support', {
        supportSignals: [
          {
            kind: 'heroDpsMultiplier',
            value: 100,
            rawEffect: 'hero_dps_mult_per_col_behind,100',
            source: 'official-parsed',
            amountFunc: 'mult',
            stackFunc: 'per_col_behind',
            positionQualifier: { relation: 'allBehindColumns' },
          },
        ],
      }),
      supportSlotId: 's4',
      scenario: extendedScenario,
    })

    expect(fit.totalMultiplier).toBe(8)
  })

  it('per_hero_attribute 支持简单 tag 表达式计数', () => {
    const carryHero = createHero('carry', { tags: ['evil'] })
    const supportHero = createHero('support', {
      tags: ['evil'],
      supportSignals: [
        {
          kind: 'globalDpsMultiplier',
          value: 10,
          rawEffect: 'global_dps_multiplier_mult,10',
          source: 'official-parsed',
          amountFunc: 'mult',
          stackFunc: 'per_hero_attribute',
          formationCountQualifier: { predicate: { op: 'tag', tag: 'evil' } },
        },
      ],
    })
    const heroesById = new Map([
      ['carry', carryHero],
      ['support', supportHero],
      ['other', createHero('other', { tags: ['evil'] })],
    ])

    const fit = evaluatePlacementFit({
      carryHero,
      supportHero,
      scenario,
      heroesById,
      carrySlotId: 's2',
      supportSlotId: 's1',
      placements: { s1: 'support', s2: 'carry', s3: 'other' },
    })

    expect(fit.totalMultiplier).toBeCloseTo(1.331)
  })

  it('per_hero_attribute 支持简单 stat 表达式计数', () => {
    const carryHero = createHero('carry', { abilityScores: { dex: 16 } })
    const supportHero = createHero('support', {
      supportSignals: [
        {
          kind: 'globalDpsMultiplier',
          value: 15,
          rawEffect: 'global_dps_multiplier_mult,15',
          source: 'official-parsed',
          amountFunc: 'add',
          stackFunc: 'per_hero_attribute',
          formationCountQualifier: {
            predicate: { op: 'stat', stat: 'dex', operator: '>=', value: 16 },
          },
        },
      ],
    })
    const heroesById = new Map([
      ['carry', carryHero],
      ['support', supportHero],
      ['other', createHero('other', { abilityScores: { dex: 17 } })],
    ])

    const fit = evaluatePlacementFit({
      carryHero,
      supportHero,
      scenario,
      heroesById,
      carrySlotId: 's2',
      supportSlotId: 's1',
      placements: { s1: 'support', s2: 'carry', s3: 'other' },
    })

    expect(fit.totalMultiplier).toBeCloseTo(1.3)
  })

  it('per_hero_attribute 支持基础攻击伤害类型计数', () => {
    const carryHero = createHero('carry', { baseAttackDamageTypes: ['magic'] })
    const supportHero = createHero('support', {
      supportSignals: [
        {
          kind: 'globalDpsMultiplier',
          value: 10,
          rawEffect: 'global_dps_multiplier_mult,10',
          source: 'official-parsed',
          amountFunc: 'mult',
          stackFunc: 'per_hero_attribute',
          formationCountQualifier: {
            predicate: { op: 'attackType', attackType: 'magic', negate: false },
          },
        },
      ],
    })
    const heroesById = new Map([
      ['carry', carryHero],
      ['support', supportHero],
      ['other', createHero('other', { baseAttackDamageTypes: ['magic'] })],
    ])

    const fit = evaluatePlacementFit({
      carryHero,
      supportHero,
      scenario,
      heroesById,
      carrySlotId: 's2',
      supportSlotId: 's1',
      placements: { s1: 'support', s2: 'carry', s3: 'other' },
    })

    expect(fit.totalMultiplier).toBeCloseTo(1.21)
  })

  it('per_upgrade_targets 根据命中的目标数量累乘', () => {
    const carryHero = createHero('carry', { tags: ['female'] })
    const supportHero = createHero('support', {
      supportSignals: [
        {
          kind: 'heroDpsMultiplier',
          value: 100,
          rawEffect: 'hero_dps_multiplier_mult,0',
          source: 'official-parsed',
          amountFunc: 'mult',
          stackFunc: 'per_upgrade_targets',
          positionQualifier: { relation: 'nonAdjacent' },
          targetQualifier: { predicate: { op: 'tag', tag: 'female' } },
        },
      ],
    })
    const heroesById = new Map([
      ['carry', carryHero],
      ['support', supportHero],
      ['other', createHero('other', { tags: ['female'] })],
      ['other-two', createHero('other-two', { tags: ['female'] })],
    ])

    const fit = evaluatePlacementFit({
      carryHero,
      supportHero,
      heroesById,
      carrySlotId: 's4',
      supportSlotId: 's1',
      scenario: extendedScenario,
      placements: { s1: 'support', s2: 'other', s3: 'other-two', s4: 'carry' },
    })

    expect(fit.totalMultiplier).toBe(4)
    expect(fit.scoreBreakdown[0]?.reasonCode).toBe('non-adjacent-match')
  })

  it('per_hero 是 per_crusader 同义词，按 formationCountQualifier 多 tag OR 计数乘算（蔚善良榜样形态）', () => {
    // 蔚"善良榜样"effect_def 1644：heroDpsMultiplier（self 位）+ per_hero + mult +
    // formationCountQualifier:OR(good|acqinc|cteam)（count）+ targetQualifier:geneutral（target）。
    // heroDpsMultiplier 默认 self 位 → 蔚作为 carry 自 buff；count 数阵型内 good|acqinc|cteam 英雄。
    const vi = createHero('vi', {
      tags: ['geneutral', 'good'],
      supportSignals: [
        {
          kind: 'heroDpsMultiplier',
          value: 100,
          rawEffect: 'hero_dps_multiplier_mult,100',
          source: 'official-parsed',
          amountFunc: 'mult',
          stackFunc: 'per_hero',
          formationCountQualifier: {
            predicate: {
              op: 'or',
              children: [
                { op: 'tag', tag: 'good' },
                { op: 'tag', tag: 'acqinc' },
                { op: 'tag', tag: 'cteam' },
              ],
            },
          },
          targetQualifier: { predicate: { op: 'tag', tag: 'geneutral' } },
        },
      ],
    })
    const heroesById = new Map([
      ['vi', vi],
      ['acqinc-ally', createHero('acqinc-ally', { tags: ['acqinc'] })],
      ['cteam-ally', createHero('cteam-ally', { tags: ['cteam'] })],
    ])

    const fit = evaluatePlacementFit({
      carryHero: vi,
      carrySlotId: 's2',
      supportHero: vi,
      supportSlotId: 's2',
      scenario: extendedScenario,
      placements: { s1: 'acqinc-ally', s2: 'vi', s3: 'cteam-ally' },
      heroesById,
    })

    // count=3（vi/good + acqinc-ally + cteam-ally）→ percentToMultiplier(100)=2 → 2^3 = 8
    expect(fit.totalMultiplier).toBe(8)
    expect(fit.scoreBreakdown[0]?.active).toBe(true)
  })
})
