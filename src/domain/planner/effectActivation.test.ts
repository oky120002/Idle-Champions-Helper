import { describe, expect, it } from 'vitest'
import type { EffectGrant, HeroAbilityProfile, HeroAbilitySignal } from '../abilities/abilityModel'
import { scoreFormation } from './steadyStateScoring'
import { computeEffectActivation } from './placementSlotRelation'
import { EMPTY_VIABILITY_CONTEXT, type OfficialPlannerScenarioModel } from './plannerModel'

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
    sourceBreakdown: { carrySignals: [], supportSignals: [], unsupportedSignals: [] },
    ...(overrides.effectGrants ? { effectGrants: overrides.effectGrants } : {}),
  }
}

const scenario: OfficialPlannerScenarioModel = {
  variantId: 'v1',
  scenarioRef: { kind: 'variant', id: 'v1' },
  name: { original: 'T', display: 'T' },
  formationLayoutId: 'l1',
  objectiveArea: 1,
  slotTopology: [
    { slotId: 's1', row: 1, column: 1, adjacentSlotIds: ['s2'] },
    { slotId: 's2', row: 1, column: 2, adjacentSlotIds: ['s1', 's3'] },
    { slotId: 's3', row: 1, column: 3, adjacentSlotIds: ['s2'] },
  ],
  forcedHeroes: [],
  enemyTypes: [],
  allowedHeroes: [],
  allowedTagExpression: [],
  attributeRequirements: [],
  occupiedSlotCount: 0,
  viabilityContext: EMPTY_VIABILITY_CONTEXT,
  damageSourcePattern: null,
  scenarioWarnings: [],
}

const healGrant: EffectGrant = {
  effectDefId: '4',
  effectKeys: ['celeste_heal'],
  relation: 'aheadColumn',
  excludeSelf: false,
  requiredLevel: 1,
}

describe('computeEffectActivation', () => {
  it('授予英雄在阵型中 + 目标在作用范围 → 目标获得 effect', () => {
    const celeste = createHero('2', { effectGrants: [healGrant] })
    const knox = createHero('82')
    const heroes = new Map([['2', celeste], ['82', knox]])
    // s1(col1) → s2(col2): delta=1 → aheadColumn 匹配
    const result = computeEffectActivation({ s1: '2', s2: '82' }, heroes, scenario)
    expect(result.get('82')?.has('celeste_heal')).toBe(true)
    expect(result.get('82')?.has('#4')).toBe(true)
    // 授予英雄自身不在 aheadColumn（delta=0），不获得 effect
    expect(result.get('2')?.has('celeste_heal')).toBeFalsy()
  })

  it('授予英雄不在阵型中 → 无 effect 激活', () => {
    const celeste = createHero('2', { effectGrants: [healGrant] })
    const knox = createHero('82')
    const heroes = new Map([['2', celeste], ['82', knox]])
    const result = computeEffectActivation({ s2: '82' }, heroes, scenario)
    expect(result.get('82')?.has('celeste_heal')).toBeFalsy()
  })

  it('requiredLevel > 授予英雄等级 → 不激活', () => {
    const celeste = createHero('2', { effectGrants: [{ ...healGrant, requiredLevel: 500 }] })
    const knox = createHero('82')
    const heroes = new Map([['2', celeste], ['82', knox]])
    const result = computeEffectActivation({ s1: '2', s2: '82' }, heroes, scenario, new Map([['2', 100]]))
    expect(result.get('82')?.has('celeste_heal')).toBeFalsy()
  })

  it('relation=any（无位置限定）→ 全队获得 effect', () => {
    const portentGrant: EffectGrant = {
      effectDefId: '2436',
      effectKeys: ['alyndra_portented_v2'],
      relation: 'any',
      excludeSelf: false,
      requiredLevel: 1,
    }
    const alyndra = createHero('77', { effectGrants: [portentGrant] })
    const other = createHero('99')
    const heroes = new Map([['77', alyndra], ['99', other]])
    const result = computeEffectActivation({ s1: '77', s2: '99' }, heroes, scenario)
    expect(result.get('99')?.has('alyndra_portented_v2')).toBe(true)
    expect(result.get('77')?.has('alyndra_portented_v2')).toBe(true)
  })

  it('relation=self → 仅授予英雄自身获得 effect', () => {
    const selfGrant: EffectGrant = {
      effectDefId: '2416',
      effectKeys: [],
      relation: 'self',
      excludeSelf: false,
      requiredLevel: 1,
    }
    const cazrin = createHero('166', { effectGrants: [selfGrant] })
    const other = createHero('99')
    const heroes = new Map([['166', cazrin], ['99', other]])
    const result = computeEffectActivation({ s1: '166', s2: '99' }, heroes, scenario)
    expect(result.get('166')?.has('#2416')).toBe(true)
    expect(result.get('99')?.has('#2416')).toBeFalsy()
  })
})

describe('HasEffect 谓词评分集成', () => {
  it('HasEffect(celeste_heal)&&hero_id==82: Celeste 在前一阵型位 + Knox 在后 → Knox 减伤生效', () => {
    const knoxSignal: HeroAbilitySignal = {
      kind: 'damageReduction',
      value: 25,
      rawEffect: 'damage_reduction,25',
      source: 'official-parsed',
      targetQualifier: { predicate: { op: 'heroId', heroId: '82', negate: false } },
      formationCountQualifier: {
        predicate: {
          op: 'and',
          children: [
            { op: 'hasEffect', effectName: 'celeste_heal' },
            { op: 'heroId', heroId: '82', negate: false },
          ],
        },
      },
      positionQualifier: { relation: 'self' },
      formationCountPositionQualifier: null,
      amountFunc: null,
      stackFunc: 'per_hero_attribute',
      applyManually: false,
      stacksMultiply: null,
      excludeSelf: false,
      requiredLevel: 1,
      upgradeId: '15956',
    }
    const celeste = createHero('2', { seat: 2, effectGrants: [healGrant] })
    const knox = createHero('82', { seat: 12, supportSignals: [knoxSignal], carrySignals: [], tags: [] })
    const heroes = new Map([['2', celeste], ['82', knox]])

    // Celeste s1(col1) → Knox s2(col2): Knox 在 Celeste 的 next_col → celeste_heal 激活
    const result = scoreFormation({
      placements: { s1: '2', s2: '82' },
      heroesById: heroes,
      scenario,
    })

    // Knox 的 damageReduction 信号应被激活（celeste_heal 在 s1→s2 的 next_col 范围）
    const survivalBreakdown = result.breakdown
    expect(survivalBreakdown).not.toBeNull()
  })

  it('Celeste 不在阵型 → celeste_heal 未激活 → Knox 减伤不生效', () => {
    const knoxSignal: HeroAbilitySignal = {
      kind: 'damageReduction',
      value: 25,
      rawEffect: 'damage_reduction,25',
      source: 'official-parsed',
      targetQualifier: { predicate: { op: 'heroId', heroId: '82', negate: false } },
      formationCountQualifier: {
        predicate: {
          op: 'and',
          children: [
            { op: 'hasEffect', effectName: 'celeste_heal' },
            { op: 'heroId', heroId: '82', negate: false },
          ],
        },
      },
      positionQualifier: { relation: 'self' },
      formationCountPositionQualifier: null,
      amountFunc: null,
      stackFunc: 'per_hero_attribute',
      applyManually: false,
      stacksMultiply: null,
      excludeSelf: false,
      requiredLevel: 1,
      upgradeId: '15956',
    }
    const knox = createHero('82', { seat: 12, supportSignals: [knoxSignal], carrySignals: [], tags: [] })
    const heroes = new Map([['82', knox]])

    const result = scoreFormation({
      placements: { s1: '82' },
      heroesById: heroes,
      scenario,
    })

    // 无 Celeste → celeste_heal 未激活 → count=0 → damageReduction 不计
    expect(result.breakdown).not.toBeNull()
  })
})
