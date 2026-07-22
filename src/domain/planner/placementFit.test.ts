import { describe, expect, it } from 'vitest'

import { evaluatePlacementFit } from './placementFit'
import type { HeroAbilityProfile } from '../abilities/abilityModel'
import type { OfficialPlannerScenarioModel } from './plannerModel'

function createHero(heroId: string, overrides: Partial<HeroAbilityProfile> = {}): HeroAbilityProfile {
  return {
    heroId,
    name: { original: heroId, display: heroId },
    seat: overrides.seat ?? 1,
    roles: overrides.roles ?? [],
    tags: overrides.tags ?? [],
    baseAttackDamageTypes: overrides.baseAttackDamageTypes ?? [],
    baseAttackCooldown: overrides.baseAttackCooldown ?? null,
    age: overrides.age ?? null,
    abilityScores: overrides.abilityScores ?? {},
    baseDamage: overrides.baseDamage ?? 1,
    baseHealth: overrides.baseHealth ?? 1,
    carrySignals: overrides.carrySignals ?? [],
    supportSignals: overrides.supportSignals ?? [],
    unsupportedSignals: overrides.unsupportedSignals ?? [],
    sourceBreakdown: overrides.sourceBreakdown ?? {
      carrySignals: [],
      supportSignals: [],
      unsupportedSignals: [],
    },
  }
}

const scenario: OfficialPlannerScenarioModel = {
  variantId: 'variant-1',
  scenarioRef: { kind: 'variant', id: 'variant-1' },
  name: { original: 'Test', display: 'Test' },
  formationLayoutId: 'layout-a',
  objectiveArea: 1,
  slotTopology: [
    { slotId: 's1', row: 1, column: 1, x: 60, y: 10, adjacentSlotIds: ['s2'] },
    { slotId: 's2', row: 1, column: 2, x: 40, y: 10, adjacentSlotIds: ['s1', 's3'] },
    { slotId: 's3', row: 1, column: 3, x: 20, y: 10, adjacentSlotIds: ['s2'] },
  ],
  forcedHeroes: [],
  bannedHeroes: [],
  lockedSlots: [],
  enemyTypes: [],
  scenarioWarnings: [],
}

const extendedScenario: OfficialPlannerScenarioModel = {
  ...scenario,
  slotTopology: [
    { slotId: 's1', row: 1, column: 1, x: 80, y: 10, adjacentSlotIds: ['s2'] },
    { slotId: 's2', row: 1, column: 2, x: 60, y: 10, adjacentSlotIds: ['s1', 's3'] },
    { slotId: 's3', row: 1, column: 3, x: 40, y: 10, adjacentSlotIds: ['s2', 's4'] },
    { slotId: 's4', row: 1, column: 4, x: 20, y: 10, adjacentSlotIds: ['s3'] },
  ],
}

const graphScenario: OfficialPlannerScenarioModel = {
  ...scenario,
  slotTopology: [
    { slotId: 's1', row: 1, column: 1, x: 80, y: 10, adjacentSlotIds: ['s2'] },
    { slotId: 's2', row: 1, column: 2, x: 60, y: 10, adjacentSlotIds: ['s1', 's3', 's5'] },
    { slotId: 's3', row: 1, column: 3, x: 40, y: 10, adjacentSlotIds: ['s2', 's4'] },
    { slotId: 's4', row: 1, column: 4, x: 20, y: 10, adjacentSlotIds: ['s3'] },
    { slotId: 's5', row: 2, column: 2, x: 60, y: 30, adjacentSlotIds: ['s2', 's6'] },
    { slotId: 's6', row: 2, column: 3, x: 40, y: 30, adjacentSlotIds: ['s5'] },
  ],
}

describe('placement fit', () => {
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

  it('adjacentBuff 只在相邻时生效', () => {
    const supportHero = createHero('support', {
      supportSignals: [
        { kind: 'adjacentBuff', value: 100, rawEffect: 'adjacent_buff,100', source: 'official-parsed' },
      ],
    })

    const activeFit = evaluatePlacementFit({
      carryHero: createHero('carry'),
      carrySlotId: 's2',
      supportHero,
      supportSlotId: 's1',
      scenario,
    })
    const inactiveFit = evaluatePlacementFit({
      carryHero: createHero('carry'),
      carrySlotId: 's3',
      supportHero,
      supportSlotId: 's1',
      scenario,
    })

    expect(activeFit.totalMultiplier).toBe(2)
    expect(inactiveFit.totalMultiplier).toBe(1)
    expect(inactiveFit.scoreBreakdown[0]?.reasonCode).toBe('position-mismatch')
  })

  it('non-adjacent hero buff 只在非相邻位计分', () => {
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
      carryHero: createHero('carry'),
      carrySlotId: 's3',
      supportHero,
      supportSlotId: 's1',
      scenario,
    })
    const inactiveFit = evaluatePlacementFit({
      carryHero: createHero('carry'),
      carrySlotId: 's2',
      supportHero,
      supportSlotId: 's1',
      scenario,
    })

    expect(activeFit.totalMultiplier).toBe(2)
    expect(activeFit.scoreBreakdown[0]?.reasonCode).toBe('non-adjacent-match')
    expect(inactiveFit.totalMultiplier).toBe(1)
    expect(inactiveFit.scoreBreakdown[0]?.reasonCode).toBe('position-mismatch')
  })

  it('same-column hero buff 只在同列计分', () => {
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
      carryHero: createHero('carry'),
      carrySlotId: 's2',
      supportHero,
      supportSlotId: 's2',
      scenario,
    })
    const inactiveFit = evaluatePlacementFit({
      carryHero: createHero('carry'),
      carrySlotId: 's3',
      supportHero,
      supportSlotId: 's2',
      scenario,
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

  it('carry 自带 heroDpsMultiplier 只在自己作为 carry 时计入', () => {
    const carryHero = createHero('carry', {
      carrySignals: [
        { kind: 'heroDpsMultiplier', value: 150, rawEffect: 'hero_dps_multiplier_mult,150', source: 'official-parsed' },
      ],
    })

    const fit = evaluatePlacementFit({
      carryHero,
      carrySlotId: 's2',
      supportHero: carryHero,
      supportSlotId: 's2',
      scenario,
    })

    expect(fit.totalMultiplier).toBe(2.5)
    expect(fit.scoreBreakdown[0]?.reasonCode).toBe('carry-self-match')
  })

  it('taggedChampionBuff 标签命中时计分', () => {
    const fit = evaluatePlacementFit({
      carryHero: createHero('carry', { tags: ['female', 'elf'] }),
      carrySlotId: 's2',
      supportHero: createHero('support', {
        supportSignals: [
          {
            kind: 'taggedChampionBuff',
            value: 50,
            rawEffect: 'tag_dps,50',
            source: 'repo-semantic-patch',
            targetQualifier: { predicate: { op: 'tag', tag: 'female' } },
          },
        ],
      }),
      supportSlotId: 's1',
      scenario,
    })

    expect(fit.totalMultiplier).toBe(1.5)
    expect(fit.scoreBreakdown[0]?.reasonCode).toBe('tag-match')
  })

  it('taggedChampionBuff 缺少目标语义时只出 warning', () => {
    const fit = evaluatePlacementFit({
      carryHero: createHero('carry', { tags: ['female'] }),
      carrySlotId: 's2',
      supportHero: createHero('support', {
        supportSignals: [
          { kind: 'taggedChampionBuff', value: 50, rawEffect: 'tag_dps,50', source: 'official-parsed' },
        ],
      }),
      supportSlotId: 's1',
      scenario,
    })

    expect(fit.totalMultiplier).toBe(1)
    expect(fit.warnings[0]).toContain('缺少 carry 目标标签')
    expect(fit.scoreBreakdown[0]?.reasonCode).toBe('missing-target-qualifier')
  })

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
      carrySlotId: 's2',
      supportHero,
      supportSlotId: 's1',
      scenario,
      placements: { s1: 'support', s2: 'carry', s3: 'other' },
      heroesById,
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
      carrySlotId: 's2',
      supportHero,
      supportSlotId: 's1',
      scenario,
      placements: { s1: 'support', s2: 'carry', s3: 'other' },
      heroesById,
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
      carryHero: supportHero,
      carrySlotId: 's2',
      supportHero,
      supportSlotId: 's2',
      scenario,
      placements: { s1: 'adj-1', s2: 'carry', s3: 'adj-2' },
      heroesById,
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

  it('buff_upgrade 会按基础 buff 幅度折算增量收益', () => {
    const fit = evaluatePlacementFit({
      carryHero: createHero('carry'),
      carrySlotId: 's2',
      supportHero: createHero('support', {
        supportSignals: [
          {
            kind: 'heroDpsMultiplier',
            value: 50,
            rawEffect: 'buff_upgrade,50,base-upgrade',
            source: 'official-parsed',
            positionQualifier: { relation: 'adjacent' },
            bonusScaleOfSignal: {
              kind: 'heroDpsMultiplier',
              value: 80,
              rawEffect: 'hero_dps_multiplier_mult,80',
              source: 'official-parsed',
              positionQualifier: { relation: 'adjacent' },
            },
          },
        ],
      }),
      supportSlotId: 's1',
      scenario,
    })

    expect(fit.totalMultiplier).toBeCloseTo(1.4, 6)
    expect(fit.scoreBreakdown[0]?.multiplier).toBeCloseTo(1.4, 6)
  })

  it('buff_upgrade_per_any_tagged_crusader_mult 会先算堆叠，再折算基础 buff 幅度', () => {
    const supportHero = createHero('support', {
      supportSignals: [
        {
          kind: 'heroDpsMultiplier',
          value: 200,
          rawEffect: 'buff_upgrade_per_any_tagged_crusader_mult,200,base-upgrade,evil',
          source: 'official-parsed',
          amountFunc: 'mult',
          stackFunc: 'per_tagged_crusader_mult',
          positionQualifier: { relation: 'any' },
          formationCountQualifier: {
            predicate: { op: 'tag', tag: 'evil' },
          },
          targetQualifier: {
            predicate: { op: 'stat', stat: 'int', operator: '<=', value: 12 },
          },
          bonusScaleOfSignal: {
            kind: 'heroDpsMultiplier',
            value: 100,
            rawEffect: 'hero_dps_multiplier_mult,100',
            source: 'official-parsed',
            positionQualifier: { relation: 'any' },
            targetQualifier: {
              predicate: { op: 'stat', stat: 'int', operator: '<=', value: 12 },
            },
          },
        },
      ],
    })
    const carryHero = createHero('carry', {
      abilityScores: { int: 10 },
    })
    const allyA = createHero('ally-a', { tags: ['evil'] })
    const allyB = createHero('ally-b', { tags: ['evil'] })

    const fit = evaluatePlacementFit({
      carryHero,
      carrySlotId: 's2',
      supportHero,
      supportSlotId: 's1',
      scenario: extendedScenario,
      placements: {
        s1: 'support',
        s2: 'carry',
        s3: 'ally-a',
        s4: 'ally-b',
      },
      heroesById: new Map([
        ['support', supportHero],
        ['carry', carryHero],
        ['ally-a', allyA],
        ['ally-b', allyB],
      ]),
    })

    expect(fit.totalMultiplier).toBeCloseTo(9, 6)
    expect(fit.scoreBreakdown[0]?.multiplier).toBeCloseTo(9, 6)
  })

  it('buff_upgrade_mult_by_distance_from_source_mult 会按槽位距离先堆叠，再折算基础 buff 幅度', () => {
    const fit = evaluatePlacementFit({
      carryHero: createHero('carry'),
      carrySlotId: 's4',
      supportHero: createHero('support', {
        supportSignals: [
          {
            kind: 'heroDpsMultiplier',
            value: 400,
            rawEffect: 'buff_upgrade_mult_by_distance_from_source_mult,400,base-upgrade',
            source: 'official-parsed',
            amountFunc: 'mult',
            stackFunc: 'per_slot_distance_from_source',
            positionQualifier: { relation: 'nonAdjacent' },
            bonusScaleOfSignal: {
              kind: 'heroDpsMultiplier',
              value: 100,
              rawEffect: 'hero_dps_multiplier_mult,100',
              source: 'official-parsed',
              positionQualifier: { relation: 'nonAdjacent' },
            },
          },
        ],
      }),
      supportSlotId: 's1',
      scenario: extendedScenario,
    })

    expect(fit.totalMultiplier).toBeCloseTo(125, 6)
    expect(fit.scoreBreakdown[0]?.multiplier).toBeCloseTo(125, 6)
  })

  it('manual stacking 先降级为 warning，不计分', () => {
    const fit = evaluatePlacementFit({
      carryHero: createHero('carry'),
      carrySlotId: 's2',
      supportHero: createHero('support', {
        supportSignals: [
          {
            kind: 'globalDpsMultiplier',
            value: 100,
            rawEffect: 'global_dps_multiplier_mult,100',
            source: 'official-parsed',
            applyManually: true,
          },
        ],
      }),
      supportSlotId: 's1',
      scenario,
    })

    expect(fit.totalMultiplier).toBe(1)
    expect(fit.warnings[0]).toContain('手动触发')
  })

  it('stat qualifier 命中时可以作为 carry 目标条件计分', () => {
    const fit = evaluatePlacementFit({
      carryHero: createHero('carry', {
        abilityScores: { cha: 13 },
      }),
      carrySlotId: 's2',
      supportHero: createHero('support', {
        supportSignals: [
          {
            kind: 'taggedChampionBuff',
            value: 40,
            rawEffect: 'tag_dps,40',
            source: 'official-parsed',
            targetQualifier: {
              predicate: { op: 'stat', stat: 'cha', operator: '>=', value: 11 },
            },
          },
        ],
      }),
      supportSlotId: 's1',
      scenario,
    })

    expect(fit.totalMultiplier).toBe(1.4)
    expect(fit.scoreBreakdown[0]?.reasonCode).toBe('stat-match')
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
      carrySlotId: 's2',
      supportHero,
      supportSlotId: 's1',
      scenario,
      placements: { s1: 'support', s2: 'carry', s3: 'other' },
      heroesById,
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
      carrySlotId: 's2',
      supportHero,
      supportSlotId: 's1',
      scenario,
      placements: { s1: 'support', s2: 'carry', s3: 'other' },
      heroesById,
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
      carrySlotId: 's2',
      supportHero,
      supportSlotId: 's1',
      scenario,
      placements: { s1: 'support', s2: 'carry', s3: 'other' },
      heroesById,
    })

    expect(fit.totalMultiplier).toBeCloseTo(1.21)
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
      carrySlotId: 's4',
      supportHero,
      supportSlotId: 's1',
      scenario: extendedScenario,
      placements: { s1: 'support', s2: 'other', s3: 'other-two', s4: 'carry' },
      heroesById,
    })

    expect(fit.totalMultiplier).toBe(4)
    expect(fit.scoreBreakdown[0]?.reasonCode).toBe('non-adjacent-match')
  })
})
