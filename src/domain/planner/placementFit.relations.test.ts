import { describe, expect, it } from 'vitest'

import { evaluatePlacementFit } from './placementFit'
import { createHero, extendedScenario, graphScenario, scenario } from './placementFitTestFixtures'

describe('placement fit — relations', () => {
  it('relation=adjacent 的 signal 只在相邻时生效', () => {
    const supportHero = createHero('support', {
      supportSignals: [
        { kind: 'heroDpsMultiplier', value: 100, rawEffect: 'hero_dps_multiplier_mult,100', source: 'official-parsed', positionQualifier: { relation: 'adjacent' } },
      ],
    })

    const activeFit = evaluatePlacementFit({
      supportHero,
      scenario,
      carryHero: createHero('carry'),
      carrySlotId: 's2',
      supportSlotId: 's1',
    })
    const inactiveFit = evaluatePlacementFit({
      supportHero,
      scenario,
      carryHero: createHero('carry'),
      carrySlotId: 's3',
      supportSlotId: 's1',
    })

    expect(activeFit.totalMultiplier).toBe(2)
    expect(inactiveFit.totalMultiplier).toBe(1)
    expect(inactiveFit.scoreBreakdown[0]?.reasonCode).toBe('position-mismatch')
  })

  it('non-adjacent hero buff 只在非相邻位计入目标值', () => {
    const supportHero = createHero('support', {
      supportSignals: [
        {
          kind: 'heroDpsMultiplier',
          value: 100,
          rawEffect: 'hero_dps_multiplier_mult,0',
          source: 'official-parsed',
          positionQualifier: { relation: 'nonAdjacent' },
        },
      ],
    })

    const activeFit = evaluatePlacementFit({
      supportHero,
      scenario,
      carryHero: createHero('carry'),
      carrySlotId: 's3',
      supportSlotId: 's1',
    })
    const inactiveFit = evaluatePlacementFit({
      supportHero,
      scenario,
      carryHero: createHero('carry'),
      carrySlotId: 's2',
      supportSlotId: 's1',
    })

    expect(activeFit.totalMultiplier).toBe(2)
    expect(activeFit.scoreBreakdown[0]?.reasonCode).toBe('non-adjacent-match')
    expect(inactiveFit.totalMultiplier).toBe(1)
    expect(inactiveFit.scoreBreakdown[0]?.reasonCode).toBe('position-mismatch')
  })

  it('same-column hero buff 只在同列计入目标值', () => {
    const supportHero = createHero('support', {
      supportSignals: [
        {
          kind: 'heroDpsMultiplier',
          value: 100,
          rawEffect: 'hero_dps_multiplier_mult,100',
          source: 'official-parsed',
          positionQualifier: { relation: 'sameColumn' },
        },
      ],
    })

    const activeFit = evaluatePlacementFit({
      supportHero,
      scenario,
      carryHero: createHero('carry'),
      carrySlotId: 's2',
      supportSlotId: 's2',
    })
    const inactiveFit = evaluatePlacementFit({
      supportHero,
      scenario,
      carryHero: createHero('carry'),
      carrySlotId: 's3',
      supportSlotId: 's2',
    })

    expect(activeFit.totalMultiplier).toBe(2)
    expect(activeFit.scoreBreakdown[0]?.reasonCode).toBe('same-column-match')
    expect(inactiveFit.totalMultiplier).toBe(1)
    expect(inactiveFit.scoreBreakdown[0]?.reasonCode).toBe('position-mismatch')
  })

  it('ahead/behind column 关系按列差精确命中', () => {
    const aheadSupport = createHero('ahead-support', {
      supportSignals: [
        {
          kind: 'heroDpsMultiplier',
          value: 50,
          rawEffect: 'hero_dps_multiplier_mult,50',
          source: 'official-parsed',
          positionQualifier: { relation: 'aheadColumn' },
        },
      ],
    })
    const behindSupport = createHero('behind-support', {
      supportSignals: [
        {
          kind: 'heroDpsMultiplier',
          value: 50,
          rawEffect: 'hero_dps_multiplier_mult,50',
          source: 'official-parsed',
          positionQualifier: { relation: 'behindColumn' },
        },
      ],
    })

    const aheadFit = evaluatePlacementFit({
      carryHero: createHero('carry'),
      carrySlotId: 's3',
      supportHero: aheadSupport,
      supportSlotId: 's2',
      scenario,
    })
    const behindFit = evaluatePlacementFit({
      carryHero: createHero('carry'),
      carrySlotId: 's1',
      supportHero: behindSupport,
      supportSlotId: 's2',
      scenario,
    })
    const mismatchFit = evaluatePlacementFit({
      carryHero: createHero('carry'),
      carrySlotId: 's1',
      supportHero: aheadSupport,
      supportSlotId: 's2',
      scenario,
    })

    expect(aheadFit.totalMultiplier).toBe(1.5)
    expect(aheadFit.scoreBreakdown[0]?.reasonCode).toBe('ahead-column-match')
    expect(behindFit.totalMultiplier).toBe(1.5)
    expect(behindFit.scoreBreakdown[0]?.reasonCode).toBe('behind-column-match')
    expect(mismatchFit.totalMultiplier).toBe(1)
  })

  it('two-column 与 behind-family 关系支持范围命中', () => {
    const carry = createHero('carry')
    const aheadTwoSupport = createHero('ahead-two', {
      supportSignals: [
        {
          kind: 'heroDpsMultiplier',
          value: 25,
          rawEffect: 'hero_dps_multiplier_mult,25',
          source: 'official-parsed',
          positionQualifier: { relation: 'aheadTwoColumns' },
        },
      ],
    })
    const behindTwoSupport = createHero('behind-two', {
      supportSignals: [
        {
          kind: 'heroDpsMultiplier',
          value: 25,
          rawEffect: 'hero_dps_multiplier_mult,25',
          source: 'official-parsed',
          positionQualifier: { relation: 'behindTwoColumns' },
        },
      ],
    })
    const allBehindSupport = createHero('all-behind', {
      supportSignals: [
        {
          kind: 'heroDpsMultiplier',
          value: 25,
          rawEffect: 'hero_dps_multiplier_mult,25',
          source: 'official-parsed',
          positionQualifier: { relation: 'allBehindColumns' },
        },
      ],
    })
    const sameOrBehindSupport = createHero('same-or-behind', {
      supportSignals: [
        {
          kind: 'heroDpsMultiplier',
          value: 25,
          rawEffect: 'hero_dps_multiplier_mult,25',
          source: 'official-parsed',
          positionQualifier: { relation: 'sameOrBehindColumn' },
        },
      ],
    })
    const sameOrBehindAllSupport = createHero('same-or-behind-all', {
      supportSignals: [
        {
          kind: 'heroDpsMultiplier',
          value: 25,
          rawEffect: 'hero_dps_multiplier_mult,25',
          source: 'official-parsed',
          positionQualifier: { relation: 'sameOrBehindColumns' },
        },
      ],
    })

    expect(evaluatePlacementFit({
      carryHero: carry,
      carrySlotId: 's4',
      supportHero: aheadTwoSupport,
      supportSlotId: 's2',
      scenario: extendedScenario,
    }).scoreBreakdown[0]?.reasonCode).toBe('ahead-two-columns-match')

    expect(evaluatePlacementFit({
      carryHero: carry,
      carrySlotId: 's1',
      supportHero: behindTwoSupport,
      supportSlotId: 's3',
      scenario: extendedScenario,
    }).scoreBreakdown[0]?.reasonCode).toBe('behind-two-columns-match')

    expect(evaluatePlacementFit({
      carryHero: carry,
      carrySlotId: 's1',
      supportHero: allBehindSupport,
      supportSlotId: 's4',
      scenario: extendedScenario,
    }).scoreBreakdown[0]?.reasonCode).toBe('all-behind-columns-match')

    expect(evaluatePlacementFit({
      carryHero: carry,
      carrySlotId: 's2',
      supportHero: sameOrBehindSupport,
      supportSlotId: 's3',
      scenario: extendedScenario,
    }).scoreBreakdown[0]?.reasonCode).toBe('same-or-behind-column-match')

    expect(evaluatePlacementFit({
      carryHero: carry,
      carrySlotId: 's1',
      supportHero: sameOrBehindAllSupport,
      supportSlotId: 's3',
      scenario: extendedScenario,
    }).scoreBreakdown[0]?.reasonCode).toBe('same-or-behind-columns-match')
  })

  it('新增列关系覆盖相对前后列与绝对前后两列', () => {
    const carry = createHero('carry')

    expect(evaluatePlacementFit({
      carryHero: carry,
      carrySlotId: 's2',
      supportHero: createHero('support-ahead-all', {
        supportSignals: [{
          kind: 'heroDpsMultiplier',
          value: 30,
          rawEffect: 'hero_dps_multiplier_mult,30',
          source: 'official-parsed',
          positionQualifier: { relation: 'allAheadColumns' },
        }],
      }),
      supportSlotId: 's1',
      scenario: extendedScenario,
    }).scoreBreakdown[0]?.reasonCode).toBe('all-ahead-columns-match')

    expect(evaluatePlacementFit({
      carryHero: carry,
      carrySlotId: 's3',
      supportHero: createHero('support-adj-cols', {
        supportSignals: [{
          kind: 'heroDpsMultiplier',
          value: 30,
          rawEffect: 'hero_dps_multiplier_mult,30',
          source: 'official-parsed',
          positionQualifier: { relation: 'adjacentColumns' },
        }],
      }),
      supportSlotId: 's2',
      scenario: extendedScenario,
    }).scoreBreakdown[0]?.reasonCode).toBe('adjacent-columns-match')

    expect(evaluatePlacementFit({
      carryHero: carry,
      carrySlotId: 's2',
      supportHero: createHero('support-self-adj', {
        supportSignals: [{
          kind: 'heroDpsMultiplier',
          value: 30,
          rawEffect: 'hero_dps_multiplier_mult,30',
          source: 'official-parsed',
          positionQualifier: { relation: 'adjacentOrSelf' },
        }],
      }),
      supportSlotId: 's1',
      scenario: extendedScenario,
    }).scoreBreakdown[0]?.reasonCode).toBe('adjacent-or-self-match')

    expect(evaluatePlacementFit({
      carryHero: carry,
      carrySlotId: 's1',
      supportHero: createHero('support-self-behind-two', {
        supportSignals: [{
          kind: 'heroDpsMultiplier',
          value: 30,
          rawEffect: 'hero_dps_multiplier_mult,30',
          source: 'official-parsed',
          positionQualifier: { relation: 'selfAndBehindTwoColumns' },
        }],
      }),
      supportSlotId: 's3',
      scenario: extendedScenario,
    }).scoreBreakdown[0]?.reasonCode).toBe('self-and-behind-two-columns-match')

    expect(evaluatePlacementFit({
      carryHero: carry,
      carrySlotId: 's4',
      supportHero: createHero('support-front-two', {
        supportSignals: [{
          kind: 'heroDpsMultiplier',
          value: 30,
          rawEffect: 'hero_dps_multiplier_mult,30',
          source: 'official-parsed',
          positionQualifier: { relation: 'frontTwoColumns' },
        }],
      }),
      supportSlotId: 's2',
      scenario: extendedScenario,
    }).scoreBreakdown[0]?.reasonCode).toBe('front-two-columns-match')

    expect(evaluatePlacementFit({
      carryHero: carry,
      carrySlotId: 's2',
      supportHero: createHero('support-back-two', {
        supportSignals: [{
          kind: 'heroDpsMultiplier',
          value: 30,
          rawEffect: 'hero_dps_multiplier_mult,30',
          source: 'official-parsed',
          positionQualifier: { relation: 'backTwoColumns' },
        }],
      }),
      supportSlotId: 's3',
      scenario: extendedScenario,
    }).scoreBreakdown[0]?.reasonCode).toBe('back-two-columns-match')
  })

  it('exactly-x-behind 关系按精确列差命中', () => {
    const carry = createHero('carry')

    expect(evaluatePlacementFit({
      carryHero: carry,
      carrySlotId: 's2',
      supportHero: createHero('support-exact-1', {
        supportSignals: [{
          kind: 'heroDpsMultiplier',
          value: 20,
          rawEffect: 'hero_dps_multiplier_mult,20',
          source: 'official-parsed',
          positionQualifier: { relation: 'exactlyBehindOneColumn' },
        }],
      }),
      supportSlotId: 's3',
      scenario: extendedScenario,
    }).scoreBreakdown[0]?.reasonCode).toBe('exactly-behind-one-column-match')

    expect(evaluatePlacementFit({
      carryHero: carry,
      carrySlotId: 's2',
      supportHero: createHero('support-exact-2', {
        supportSignals: [{
          kind: 'heroDpsMultiplier',
          value: 20,
          rawEffect: 'hero_dps_multiplier_mult,20',
          source: 'official-parsed',
          positionQualifier: { relation: 'exactlyBehindTwoColumns' },
        }],
      }),
      supportSlotId: 's4',
      scenario: extendedScenario,
    }).scoreBreakdown[0]?.reasonCode).toBe('exactly-behind-two-columns-match')

    expect(evaluatePlacementFit({
      carryHero: carry,
      carrySlotId: 's1',
      supportHero: createHero('support-exact-3', {
        supportSignals: [{
          kind: 'heroDpsMultiplier',
          value: 20,
          rawEffect: 'hero_dps_multiplier_mult,20',
          source: 'official-parsed',
          positionQualifier: { relation: 'exactlyBehindThreeColumns' },
        }],
      }),
      supportSlotId: 's4',
      scenario: extendedScenario,
    }).scoreBreakdown[0]?.reasonCode).toBe('exactly-behind-three-columns-match')
  })

  it('绝对后排列关系按阵型倒数列命中', () => {
    const carry = createHero('carry')

    expect(evaluatePlacementFit({
      carryHero: carry,
      carrySlotId: 's1',
      supportHero: createHero('support-rear-most', {
        supportSignals: [{
          kind: 'heroDpsMultiplier',
          value: 20,
          rawEffect: 'hero_dps_multiplier_mult,20',
          source: 'official-parsed',
          positionQualifier: { relation: 'rearMostColumn' },
        }],
      }),
      supportSlotId: 's4',
      scenario: extendedScenario,
    }).scoreBreakdown[0]?.reasonCode).toBe('rear-most-column-match')

    expect(evaluatePlacementFit({
      carryHero: carry,
      carrySlotId: 's2',
      supportHero: createHero('support-second-rear-most', {
        supportSignals: [{
          kind: 'heroDpsMultiplier',
          value: 20,
          rawEffect: 'hero_dps_multiplier_mult,20',
          source: 'official-parsed',
          positionQualifier: { relation: 'secondRearMostColumn' },
        }],
      }),
      supportSlotId: 's4',
      scenario: extendedScenario,
    }).scoreBreakdown[0]?.reasonCode).toBe('second-rear-most-column-match')

    expect(evaluatePlacementFit({
      carryHero: carry,
      carrySlotId: 's3',
      supportHero: createHero('support-third-rear-most', {
        supportSignals: [{
          kind: 'heroDpsMultiplier',
          value: 20,
          rawEffect: 'hero_dps_multiplier_mult,20',
          source: 'official-parsed',
          positionQualifier: { relation: 'thirdRearMostColumn' },
        }],
      }),
      supportSlotId: 's4',
      scenario: extendedScenario,
    }).scoreBreakdown[0]?.reasonCode).toBe('third-rear-most-column-match')
  })

  it('distance-family 关系按邻接图距离命中', () => {
    const carry = createHero('carry')
    const withinTwoSupport = createHero('within-two', {
      supportSignals: [
        {
          kind: 'heroDpsMultiplier',
          value: 50,
          rawEffect: 'hero_dps_multiplier_mult,50',
          source: 'official-parsed',
          positionQualifier: { relation: 'withinTwoSlots' },
        },
      ],
    })
    const withinTwoOrSelfSupport = createHero('within-two-self', {
      supportSignals: [
        {
          kind: 'heroDpsMultiplier',
          value: 50,
          rawEffect: 'hero_dps_multiplier_mult,50',
          source: 'official-parsed',
          positionQualifier: { relation: 'withinTwoSlotsOrSelf' },
        },
      ],
    })
    const withinThreeSupport = createHero('within-three', {
      supportSignals: [
        {
          kind: 'heroDpsMultiplier',
          value: 50,
          rawEffect: 'hero_dps_multiplier_mult,50',
          source: 'official-parsed',
          positionQualifier: { relation: 'withinThreeSlots' },
        },
      ],
    })

    expect(evaluatePlacementFit({
      carryHero: carry,
      carrySlotId: 's6',
      supportHero: withinTwoSupport,
      supportSlotId: 's2',
      scenario: graphScenario,
    }).scoreBreakdown[0]?.reasonCode).toBe('within-two-slots-match')

    expect(evaluatePlacementFit({
      carryHero: carry,
      carrySlotId: 's2',
      supportHero: withinTwoOrSelfSupport,
      supportSlotId: 's2',
      scenario: graphScenario,
    }).scoreBreakdown[0]?.reasonCode).toBe('within-two-slots-or-self-match')

    expect(evaluatePlacementFit({
      carryHero: carry,
      carrySlotId: 's4',
      supportHero: withinThreeSupport,
      supportSlotId: 's2',
      scenario: graphScenario,
    }).scoreBreakdown[0]?.reasonCode).toBe('within-three-slots-match')

    expect(evaluatePlacementFit({
      carryHero: carry,
      carrySlotId: 's4',
      supportHero: withinTwoSupport,
      supportSlotId: 's5',
      scenario: graphScenario,
    }).scoreBreakdown[0]?.reasonCode).toBe('position-mismatch')
  })

  it('heroDpsMultiplier positionQualifier=any 时 support 位跨槽位 buff carry（targets:all 阵型 buff）', () => {
    // 回归：attachSignalSemantics 对 targets:['all'] 显式设 {relation:'any'}，使 support 位提供的阵型范围
    // hero_dps 信号（如蔚善良榜样 targets:all + filter_targets:geneutral）能跨槽位 buff 匹配 targetQualifier 的 carry。
    // 旧 bug：'all' 降 null → resolvePositionRelation heroDpsMultiplier 默认 'self' → support≠carry 槽位 position-mismatch，
    // support 位的阵型 hero_dps buff 永不生效（蔚善良榜样对 geneutral carry、Diana hero_expr 对 DEX carry 等）。
    const support = createHero('support', {
      tags: ['good'],
      supportSignals: [
        {
          kind: 'heroDpsMultiplier',
          value: 100,
          rawEffect: 'hero_dps_multiplier_mult,100',
          source: 'official-parsed',
          positionQualifier: { relation: 'any' },
          targetQualifier: { predicate: { op: 'tag', tag: 'female' } },
        },
      ],
    })
    const carry = createHero('carry', { tags: ['female'] })

    const fit = evaluatePlacementFit({
      scenario,
      carryHero: carry,
      carrySlotId: 's1',
      supportHero: support,
      supportSlotId: 's3',
      placements: { s1: 'carry', s3: 'support' },
      heroesById: new Map([['carry', carry], ['support', support]]),
    })

    const activeEntry = fit.scoreBreakdown.find((r) => r.rawEffect === 'hero_dps_multiplier_mult,100' && r.active)
    expect(activeEntry, 'targets:all 的 hero_dps 信号须跨槽位生效（relation=any 非 self）').toBeDefined()
    expect(activeEntry?.multiplier).toBe(2)
  })
})
