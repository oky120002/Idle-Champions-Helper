import { describe, expect, it } from 'vitest'

import { evaluatePlacementFit } from '../../../../src/domain/planner/placementFit'
import type { OfficialPlannerHeroModel, OfficialPlannerScenarioModel } from '../../../../src/domain/planner/plannerModel'

function createHero(heroId: string, overrides: Partial<OfficialPlannerHeroModel> = {}): OfficialPlannerHeroModel {
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
    isCarryViable: overrides.isCarryViable ?? false,
    heuristicRoleMultiplier: overrides.heuristicRoleMultiplier ?? 1,
    carrySignals: overrides.carrySignals ?? [],
    supportSignals: overrides.supportSignals ?? [],
    unsupportedSignals: overrides.unsupportedSignals ?? [],
    sourceBreakdown: overrides.sourceBreakdown ?? {
      isCarryViable: 'official-parsed',
      heuristicRoleMultiplier: 'heuristic-fallback',
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
    { slotId: 's1', row: 1, column: 1, adjacentSlotIds: ['s2'] },
    { slotId: 's2', row: 1, column: 2, adjacentSlotIds: ['s1', 's3'] },
    { slotId: 's3', row: 1, column: 3, adjacentSlotIds: ['s2'] },
  ],
  forcedHeroes: [],
  bannedHeroes: [],
  lockedSlots: [],
  scenarioWarnings: [],
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

    expect(fit.fitScore).toBe(2)
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

    expect(activeFit.fitScore).toBe(2)
    expect(inactiveFit.fitScore).toBe(1)
    expect(inactiveFit.scoreBreakdown[0]?.reasonCode).toBe('position-mismatch')
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

    expect(fit.fitScore).toBe(2.5)
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
            targetQualifier: { requiredTags: ['female'], matchMode: 'any' },
          },
        ],
      }),
      supportSlotId: 's1',
      scenario,
    })

    expect(fit.fitScore).toBe(1.5)
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

    expect(fit.fitScore).toBe(1)
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
          targetQualifier: { requiredTags: ['female'], matchMode: 'any' },
        },
      ],
    })
    const heroesById = new Map([
      ['carry', carryHero],
      ['support', supportHero],
      ['other', createHero('other', { tags: ['female'] })],
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

    expect(fit.fitScore).toBeCloseTo(1.6)
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
          targetQualifier: { requiredTags: ['female'], matchMode: 'any' },
        },
      ],
    })
    const heroesById = new Map([
      ['carry', carryHero],
      ['support', supportHero],
      ['other', createHero('other', { tags: ['female'] })],
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

    expect(fit.fitScore).toBeCloseTo(1.728)
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

    expect(fit.fitScore).toBe(1)
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
              requiredStats: [{ stat: 'cha', operator: '>=', value: 11 }],
            },
          },
        ],
      }),
      supportSlotId: 's1',
      scenario,
    })

    expect(fit.fitScore).toBe(1.4)
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
          formationCountQualifier: { requiredTags: ['evil'], matchMode: 'any' },
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

    expect(fit.fitScore).toBeCloseTo(1.331)
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
            requiredStats: [{ stat: 'dex', operator: '>=', value: 16 }],
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

    expect(fit.fitScore).toBeCloseTo(1.3)
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
            requiredAttackDamageTypes: ['magic'],
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

    expect(fit.fitScore).toBeCloseTo(1.21)
  })
})
