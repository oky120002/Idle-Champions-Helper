import { describe, expect, it } from 'vitest'

import {
  attachPlannerSignalSemantics,
  matchesPlannerHeroQualifier,
  normalizePlannerExplicitTargeting,
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

  it('attachPlannerSignalSemantics 把 attack_type 过滤统一挂到 carry qualifier', () => {
    const signal = attachPlannerSignalSemantics(
      {
        kind: 'heroDpsMultiplier',
        value: 150,
        rawEffect: 'hero_dps_multiplier_mult,150',
        source: 'official-parsed',
      },
      {
        targets: ['all_slots'],
        filter_targets: [{ type: 'attack_type', attack: 'magic' }],
      },
    )

    expect(signal.targetQualifier).toEqual({
      requiredAttackDamageTypes: ['magic'],
    })
    expect(signal.formationCountQualifier).toBeNull()
  })

  it('normalizePlannerStatQualifiers 归一化 gte/lte/eq 这类官方比较符别名', async () => {
    const { normalizePlannerStatQualifiers } = await import('../../../../src/domain/planner/plannerSignalSemantics.js')

    expect(normalizePlannerStatQualifiers({
      target_filters: [{ type: 'stat', stat: 'dex', comparison: 'gte', check: 15 }],
    })).toEqual([
      { stat: 'dex', operator: '>=', value: 15 },
    ])

    expect(normalizePlannerStatQualifiers({
      target_filters: [{ type: 'stat', stat: 'wis', comparison: 'lte', check: 13 }],
    })).toEqual([
      { stat: 'wis', operator: '<=', value: 13 },
    ])

    expect(normalizePlannerStatQualifiers({
      target_filters: [{ type: 'stat', stat: 'int', comparison: 'eq', check: 12 }],
    })).toEqual([
      { stat: 'int', operator: '==', value: 12 },
    ])
  })

  it('attachPlannerSignalSemantics 保留 parser 预设的计数与位置语义', () => {
    const signal = attachPlannerSignalSemantics(
      {
        kind: 'heroDpsMultiplier',
        value: 100,
        rawEffect: 'hero_dps_mult_per_target_crusader,100,adj',
        source: 'official-parsed',
        amountFunc: 'add',
        stackFunc: 'per_target_crusader',
        formationCountPositionQualifier: { relation: 'adjacent' },
        formationCountQualifier: { requiredTags: ['companion'], matchMode: 'any' },
      },
      {
        targets: ['self'],
      },
    )

    expect(signal.positionQualifier).toEqual({
      relation: 'self',
    })
    expect(signal.formationCountPositionQualifier).toEqual({
      relation: 'adjacent',
    })
    expect(signal.formationCountQualifier).toEqual({
      requiredTags: ['companion'],
      matchMode: 'any',
    })
    expect(signal.amountFunc).toBe('add')
    expect(signal.stackFunc).toBe('per_target_crusader')
  })

  it('normalizePlannerExplicitTargeting 只接受当前可稳定计分的目标关系', () => {
    expect(normalizePlannerExplicitTargeting({ targets: ['adj'] })).toEqual({
      status: 'supported',
      relation: 'adjacent',
    })

    expect(normalizePlannerExplicitTargeting({ targets: ['non_adj'] })).toEqual({
      status: 'supported',
      relation: 'nonAdjacent',
    })

    expect(normalizePlannerExplicitTargeting({
      targets: [{ type: 'attack_type', attack: 'magic' }],
    })).toEqual({
      status: 'supported',
      relation: 'any',
    })

    expect(normalizePlannerExplicitTargeting({ targets: ['all'] })).toEqual({
      status: 'supported',
      relation: 'any',
    })

    expect(normalizePlannerExplicitTargeting({ targets: ['all_slots'] })).toEqual({
      status: 'supported',
      relation: 'any',
    })

    expect(normalizePlannerExplicitTargeting({ targets: [{ type: 'distance', distance: 1 }] })).toEqual({
      status: 'supported',
      relation: 'adjacent',
    })

    expect(normalizePlannerExplicitTargeting({ targets: [{ type: 'distance', distance: 1, self: true }] })).toEqual({
      status: 'supported',
      relation: 'adjacentOrSelf',
    })

    expect(normalizePlannerExplicitTargeting({ targets: [{ type: 'distance', distance: 2 }] })).toEqual({
      status: 'supported',
      relation: 'withinTwoSlots',
    })

    expect(normalizePlannerExplicitTargeting({ targets: [{ type: 'distance', distance: 2, self: true }] })).toEqual({
      status: 'supported',
      relation: 'withinTwoSlotsOrSelf',
    })

    expect(normalizePlannerExplicitTargeting({ targets: [{ type: 'distance', distance: 3 }] })).toEqual({
      status: 'supported',
      relation: 'withinThreeSlots',
    })

    expect(normalizePlannerExplicitTargeting({ targets: ['col'] })).toEqual({
      status: 'supported',
      relation: 'sameColumn',
    })

    expect(normalizePlannerExplicitTargeting({ targets: ['next_col'] })).toEqual({
      status: 'supported',
      relation: 'aheadColumn',
    })

    expect(normalizePlannerExplicitTargeting({ targets: ['prev_col'] })).toEqual({
      status: 'supported',
      relation: 'behindColumn',
    })

    expect(normalizePlannerExplicitTargeting({ targets: ['next_two_col'] })).toEqual({
      status: 'supported',
      relation: 'aheadTwoColumns',
    })

    expect(normalizePlannerExplicitTargeting({ targets: ['prev_two_col'] })).toEqual({
      status: 'supported',
      relation: 'behindTwoColumns',
    })

    expect(normalizePlannerExplicitTargeting({ targets: ['behind'] })).toEqual({
      status: 'supported',
      relation: 'allBehindColumns',
    })

    expect(normalizePlannerExplicitTargeting({ targets: ['col_and_prev_col'] })).toEqual({
      status: 'supported',
      relation: 'sameOrBehindColumn',
    })

    expect(normalizePlannerExplicitTargeting({ targets: ['col_and_behind'] })).toEqual({
      status: 'supported',
      relation: 'sameOrBehindColumns',
    })

    expect(normalizePlannerExplicitTargeting({ targets: ['ahead'] })).toEqual({
      status: 'supported',
      relation: 'allAheadColumns',
    })

    expect(normalizePlannerExplicitTargeting({ targets: ['col_and_ahead'] })).toEqual({
      status: 'supported',
      relation: 'sameOrAheadColumns',
    })

    expect(normalizePlannerExplicitTargeting({ targets: ['prev_and_next_col'] })).toEqual({
      status: 'supported',
      relation: 'adjacentColumns',
    })

    expect(normalizePlannerExplicitTargeting({ targets: ['self_and_prev_two_col'] })).toEqual({
      status: 'supported',
      relation: 'selfAndBehindTwoColumns',
    })

    expect(normalizePlannerExplicitTargeting({ targets: ['self_and_adj'] })).toEqual({
      status: 'supported',
      relation: 'adjacentOrSelf',
    })

    expect(normalizePlannerExplicitTargeting({ targets: ['front_2_columns'] })).toEqual({
      status: 'supported',
      relation: 'frontTwoColumns',
    })

    expect(normalizePlannerExplicitTargeting({ targets: ['back_2_columns'] })).toEqual({
      status: 'supported',
      relation: 'backTwoColumns',
    })

    expect(normalizePlannerExplicitTargeting({
      targets: [{ type: 'exactly_x_behind', num_columns: 2 }],
    })).toEqual({
      status: 'supported',
      relation: 'exactlyBehindTwoColumns',
    })

    expect(normalizePlannerExplicitTargeting({
      targets: [{ type: 'col_num', start_from_back: true, column: 0 }],
    })).toEqual({
      status: 'supported',
      relation: 'rearMostColumn',
    })

    expect(normalizePlannerExplicitTargeting({ targets: ['front'] }).status).toBe('unsupported')
  })

  it('per_upgrade_targets 保留 carry 目标限定，同时挂接位置关系', () => {
    const signal = attachPlannerSignalSemantics(
      {
        kind: 'heroDpsMultiplier',
        value: 100,
        rawEffect: 'hero_dps_multiplier_mult,0',
        source: 'official-parsed',
      },
      {
        stack_func: 'per_upgrade_targets',
        amount_func: 'mult',
        targets: ['non_adj'],
        filter_targets: [{ type: 'by_tags', tags: 'female' }],
      },
    )

    expect(signal.positionQualifier).toEqual({ relation: 'nonAdjacent' })
    expect(signal.targetQualifier).toEqual({
      requiredTags: ['female'],
      matchMode: 'any',
    })
    expect(signal.formationCountQualifier).toEqual({
      requiredTags: ['female'],
      matchMode: 'any',
    })
  })

  it('all_slots + 过滤限定会保留为全阵型目标 buff', () => {
    const signal = attachPlannerSignalSemantics(
      {
        kind: 'heroDpsMultiplier',
        value: 125,
        rawEffect: 'hero_dps_multiplier_mult,125',
        source: 'official-parsed',
      },
      {
        targets: ['all_slots'],
        filter_targets: [{ type: 'by_tags', tags: 'female' }],
      },
    )

    expect(signal.positionQualifier).toBeNull()
    expect(signal.targetQualifier).toEqual({
      requiredTags: ['female'],
      matchMode: 'any',
    })
    expect(signal.formationCountQualifier).toBeNull()
  })
})
