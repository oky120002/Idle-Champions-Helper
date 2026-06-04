import { describe, expect, it } from 'vitest'

import {
  attachPlannerSignalSemantics,
  matchesPlannerHeroQualifier,
  parsePlannerPerHeroExpr,
} from '../../../../src/domain/planner/plannerSignalSemantics.js'
import type { OfficialPlannerHeroModel } from '../../../../src/domain/planner/plannerModel'

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

describe('planner signal semantics', () => {
  it('parsePlannerPerHeroExpr 解析标签、属性和年龄限定', () => {
    expect(parsePlannerPerHeroExpr('HasTag(`female`) || HasTag(`evil`)')).toEqual({
      requiredTags: ['female', 'evil'],
      matchMode: 'any',
    })

    expect(parsePlannerPerHeroExpr('is_undead')).toEqual({
      requiredTags: ['undead'],
      matchMode: 'any',
    })

    expect(parsePlannerPerHeroExpr('GetStat(`CHA`) >= 11')).toEqual({
      requiredStats: [{ stat: 'cha', operator: '>=', value: 11 }],
    })

    expect(parsePlannerPerHeroExpr('GetStat(`total_ability_score`) <= 78')).toEqual({
      requiredStats: [{ stat: 'total_ability_score', operator: '<=', value: 78 }],
    })

    expect(parsePlannerPerHeroExpr('age <= 20 && hero_id!=58')).toEqual({
      maxAge: 20,
      maxAgeOperator: '<=',
      excludedHeroIds: ['58'],
    })

    expect(parsePlannerPerHeroExpr('HasAttackDamageType(`magic`)')).toEqual({
      requiredAttackDamageTypes: ['magic'],
    })

    expect(parsePlannerPerHeroExpr('!HasAttackDamageType(`melee`)')).toEqual({
      excludedAttackDamageTypes: ['melee'],
    })

    expect(parsePlannerPerHeroExpr('!HasTag(`human`)')).toEqual({
      excludedTags: ['human'],
    })

    expect(parsePlannerPerHeroExpr('(HasTag(`female`) || HasTag(`non_binary`)) && age<110')).toEqual({
      requiredTags: ['female', 'non_binary'],
      matchMode: 'any',
      maxAge: 110,
      maxAgeOperator: '<',
    })

    expect(parsePlannerPerHeroExpr('age <= 20 && hero_id != 146')).toEqual({
      maxAge: 20,
      maxAgeOperator: '<=',
      excludedHeroIds: ['146'],
    })

    expect(parsePlannerPerHeroExpr('as_int(!HasTag(`dps`))')).toEqual({
      excludedTags: ['dps'],
    })

    expect(parsePlannerPerHeroExpr('as_int(HasTag(`dragonborn`))')).toEqual({
      requiredTags: ['dragonborn'],
      matchMode: 'any',
    })

    expect(parsePlannerPerHeroExpr('base_attack_cooldown<=4')).toEqual({
      requiredBaseAttackCooldown: {
        operator: '<=',
        value: 4,
      },
    })

    expect(parsePlannerPerHeroExpr('as_int(GetStat(`int`) >= min_stat_value)')).toBeNull()
  })

  it('matchesPlannerHeroQualifier 用统一规则判断标签、属性、年龄和排除英雄', () => {
    const hero = createHero('carry', {
      tags: ['female', 'evil', 'undead'],
      baseAttackDamageTypes: ['magic'],
      baseAttackCooldown: 4.5,
      age: 19,
      abilityScores: { cha: 13 },
    })

    expect(matchesPlannerHeroQualifier(hero, {
      requiredTags: ['female'],
      requiredStats: [{ stat: 'cha', operator: '>=', value: 11 }],
      maxAge: 20,
    })).toBe(true)

    expect(matchesPlannerHeroQualifier(hero, {
      requiredStats: [{ stat: 'total_ability_score', operator: '<=', value: 90 }],
    })).toBe(true)

    expect(matchesPlannerHeroQualifier(hero, {
      requiredStats: [{ stat: 'total_ability_score', operator: '>=', value: 100 }],
    })).toBe(false)

    expect(matchesPlannerHeroQualifier(hero, {
      requiredTags: ['undead'],
    })).toBe(true)

    expect(matchesPlannerHeroQualifier(hero, {
      excludedTags: ['human'],
    })).toBe(true)

    expect(matchesPlannerHeroQualifier(hero, {
      excludedTags: ['evil'],
    })).toBe(false)

    expect(matchesPlannerHeroQualifier(hero, {
      maxAge: 19,
      maxAgeOperator: '<',
    })).toBe(false)

    expect(matchesPlannerHeroQualifier(hero, {
      excludedHeroIds: ['carry'],
    })).toBe(false)

    expect(matchesPlannerHeroQualifier(hero, {
      requiredAttackDamageTypes: ['magic'],
    })).toBe(true)

    expect(matchesPlannerHeroQualifier(hero, {
      excludedAttackDamageTypes: ['magic'],
    })).toBe(false)

    expect(matchesPlannerHeroQualifier(hero, {
      requiredBaseAttackCooldown: { operator: '<=', value: 4.5 },
    })).toBe(true)

    expect(matchesPlannerHeroQualifier(hero, {
      requiredBaseAttackCooldown: { operator: '<', value: 4.5 },
    })).toBe(false)
  })

  it('attachPlannerSignalSemantics 统一挂接 target 与 formation count qualifier', () => {
    const taggedSignal = attachPlannerSignalSemantics(
      {
        kind: 'taggedChampionBuff',
        value: 40,
        rawEffect: 'tag_dps,40',
        source: 'official-parsed',
      },
      {
        filter_targets: [{ type: 'by_tags', tags: 'female' }],
        amount_func: 'add',
      },
    )

    expect(taggedSignal.targetQualifier).toEqual({
      requiredTags: ['female'],
      matchMode: 'any',
    })
    expect(taggedSignal.formationCountQualifier).toBeNull()
    expect(taggedSignal.amountFunc).toBe('add')

    const stackedSignal = attachPlannerSignalSemantics(
      {
        kind: 'globalDpsMultiplier',
        value: 20,
        rawEffect: 'global_dps_multiplier_mult,20',
        source: 'official-parsed',
      },
      {
        stack_func: 'per_hero_attribute',
        amount_func: 'mult',
        per_hero_expr: 'GetStat(`STR`) >= 15',
      },
    )

    expect(stackedSignal.targetQualifier).toBeNull()
    expect(stackedSignal.formationCountQualifier).toEqual({
      requiredStats: [{ stat: 'str', operator: '>=', value: 15 }],
    })
    expect(stackedSignal.stackFunc).toBe('per_hero_attribute')
    expect(stackedSignal.amountFunc).toBe('mult')
  })

  it('attachPlannerSignalSemantics 支持攻击伤害类型表达式', () => {
    const stackedSignal = attachPlannerSignalSemantics(
      {
        kind: 'globalDpsMultiplier',
        value: 15,
        rawEffect: 'global_dps_multiplier_mult,15',
        source: 'official-parsed',
      },
      {
        stack_func: 'per_hero_attribute',
        amount_func: 'mult',
        per_hero_expr: 'HasAttackDamageType(`ranged`)',
      },
    )

    expect(stackedSignal.formationCountQualifier).toEqual({
      requiredAttackDamageTypes: ['ranged'],
    })
  })
})
