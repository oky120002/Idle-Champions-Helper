import { describe, expect, it } from 'vitest'

import {
  attachSignalSemantics,
  matchesHeroQualifier,
  normalizeExplicitTargeting,
  normalizeTargetQualifier,
  parsePerHeroExpr,
} from '../../../../src/domain/abilities/signalSemantics.js'
import type { HeroAbilityProfile } from '../../../../src/domain/abilities/abilityModel'

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

describe('planner signal semantics', () => {
  it('normalizeTargetQualifier 把 | 分隔的多 tag 解析为 OR 谓词（IC OR 语义）', () => {
    // IC tags 用 | 表示 OR（任一匹配）：cleric|wizard|sorcerer|warlock = 目标是四职业之一。
    const qualifier = normalizeTargetQualifier({
      targets: [{ type: 'tags', tags: 'cleric|wizard|sorcerer|warlock' }],
    })
    expect(qualifier?.predicate).toEqual({
      op: 'or',
      children: [
        { op: 'tag', tag: 'cleric' },
        { op: 'tag', tag: 'wizard' },
        { op: 'tag', tag: 'sorcerer' },
        { op: 'tag', tag: 'warlock' },
      ],
    })
  })

  it('normalizeTargetQualifier 把 ^ 分隔的多 tag 解析为 AND 谓词（IC AND 语义）', () => {
    // IC tags 用 ^ 表示 AND（全部命中）：lawful^good = 守序且善良。
    const qualifier = normalizeTargetQualifier({
      targets: [{ type: 'tags', tags: 'lawful^good' }],
    })
    expect(qualifier?.predicate).toEqual({
      op: 'and',
      children: [{ op: 'tag', tag: 'lawful' }, { op: 'tag', tag: 'good' }],
    })
  })

  it('normalizeTargetQualifier 把 !tag^!tag 解析为 AND(NOT, NOT)', () => {
    // ! 前缀 NOT，^ 连接：!evil^!blackdicesociety = 既非 evil 也非 blackdicesociety。
    const qualifier = normalizeTargetQualifier({
      targets: [{ type: 'tags', tags: '!evil^!blackdicesociety' }],
    })
    expect(qualifier?.predicate).toEqual({
      op: 'and',
      children: [
        { op: 'not', child: { op: 'tag', tag: 'evil' } },
        { op: 'not', child: { op: 'tag', tag: 'blackdicesociety' } },
      ],
    })
  })

  it('normalizeTargetQualifier 把单 !tag 解析为 NOT', () => {
    const qualifier = normalizeTargetQualifier({
      targets: [{ type: 'tags', tags: '!human' }],
    })
    expect(qualifier?.predicate).toEqual({ op: 'not', child: { op: 'tag', tag: 'human' } })
  })

  it('normalizeTargetQualifier 对复合表达式（括号/|^混用）解析为谓词树精确求值', () => {
    // IC tags 支持括号复合：((geneutral|evil)^dps)|(good^support)。
    // 统一谓词树支持任意嵌套，精确求值，不再降级保守。
    const qualifier = normalizeTargetQualifier({
      targets: [{ type: 'tags', tags: '((geneutral|evil)^dps)|(good^support)' }],
    })
    expect(qualifier?.predicate).toEqual({
      op: 'or',
      children: [
        {
          op: 'and',
          children: [
            { op: 'or', children: [{ op: 'tag', tag: 'geneutral' }, { op: 'tag', tag: 'evil' }] },
            { op: 'tag', tag: 'dps' },
          ],
        },
        { op: 'and', children: [{ op: 'tag', tag: 'good' }, { op: 'tag', tag: 'support' }] },
      ],
    })
    expect(matchesHeroQualifier(createHero('h', { tags: ['geneutral', 'dps'] }), qualifier)).toBe(true)
    expect(matchesHeroQualifier(createHero('h', { tags: ['good', 'support'] }), qualifier)).toBe(true)
    expect(matchesHeroQualifier(createHero('h', { tags: ['good'] }), qualifier)).toBe(false)
    expect(matchesHeroQualifier(createHero('h', { tags: [] }), qualifier)).toBe(false)
  })

  it('parsePerHeroExpr 解析标签、属性、年龄、攻击类型与英雄 id 限定（functional 谓词）', () => {
    expect(parsePerHeroExpr('HasTag(`female`) || HasTag(`evil`)')).toEqual({
      op: 'or',
      children: [{ op: 'tag', tag: 'female' }, { op: 'tag', tag: 'evil' }],
    })

    expect(parsePerHeroExpr('is_undead')).toEqual({ op: 'tag', tag: 'undead' })

    expect(parsePerHeroExpr('GetStat(`CHA`) >= 11')).toEqual({
      op: 'stat',
      stat: 'cha',
      operator: '>=',
      value: 11,
    })

    expect(parsePerHeroExpr('GetStat(`total_ability_score`) <= 78')).toEqual({
      op: 'stat',
      stat: 'total_ability_score',
      operator: '<=',
      value: 78,
    })

    expect(parsePerHeroExpr('age <= 20 && hero_id!=58')).toEqual({
      op: 'and',
      children: [
        { op: 'age', operator: '<=', value: 20 },
        { op: 'heroId', heroId: '58', negate: true },
      ],
    })

    expect(parsePerHeroExpr('HasAttackDamageType(`magic`)')).toEqual({
      op: 'attackType',
      attackType: 'magic',
      negate: false,
    })

    expect(parsePerHeroExpr('!HasAttackDamageType(`melee`)')).toEqual({
      op: 'not',
      child: { op: 'attackType', attackType: 'melee', negate: false },
    })

    expect(parsePerHeroExpr('!HasTag(`human`)')).toEqual({
      op: 'not',
      child: { op: 'tag', tag: 'human' },
    })

    expect(parsePerHeroExpr('(HasTag(`female`) || HasTag(`non_binary`)) && age<110')).toEqual({
      op: 'and',
      children: [
        { op: 'or', children: [{ op: 'tag', tag: 'female' }, { op: 'tag', tag: 'non_binary' }] },
        { op: 'age', operator: '<', value: 110 },
      ],
    })

    expect(parsePerHeroExpr('age <= 20 && hero_id != 146')).toEqual({
      op: 'and',
      children: [
        { op: 'age', operator: '<=', value: 20 },
        { op: 'heroId', heroId: '146', negate: true },
      ],
    })

    expect(parsePerHeroExpr('as_int(!HasTag(`dps`))')).toEqual({
      op: 'not',
      child: { op: 'tag', tag: 'dps' },
    })

    expect(parsePerHeroExpr('as_int(HasTag(`dragonborn`))')).toEqual({ op: 'tag', tag: 'dragonborn' })

    expect(parsePerHeroExpr('base_attack_cooldown<=4')).toEqual({
      op: 'baseAttackCooldown',
      operator: '<=',
      value: 4,
    })

    // 数值表达式（min_stat_value 是变量）返回 null，归 stage 7 stack 计算。
    expect(parsePerHeroExpr('as_int(GetStat(`int`) >= min_stat_value)')).toBeNull()
  })

  it('matchesHeroQualifier 对谓词树递归求值标签、属性、年龄、攻击类型与英雄 id', () => {
    const hero = createHero('carry', {
      tags: ['female', 'evil', 'undead'],
      baseAttackDamageTypes: ['magic'],
      baseAttackCooldown: 4.5,
      age: 19,
      abilityScores: { cha: 13 },
    })

    expect(matchesHeroQualifier(hero, {
      predicate: {
        op: 'and',
        children: [
          { op: 'tag', tag: 'female' },
          { op: 'stat', stat: 'cha', operator: '>=', value: 11 },
          { op: 'age', operator: '<=', value: 20 },
        ],
      },
    })).toBe(true)

    expect(matchesHeroQualifier(hero, {
      predicate: { op: 'stat', stat: 'total_ability_score', operator: '<=', value: 90 },
    })).toBe(true)

    expect(matchesHeroQualifier(hero, {
      predicate: { op: 'stat', stat: 'total_ability_score', operator: '>=', value: 100 },
    })).toBe(false)

    expect(matchesHeroQualifier(hero, {
      predicate: { op: 'tag', tag: 'undead' },
    })).toBe(true)

    expect(matchesHeroQualifier(hero, {
      predicate: { op: 'not', child: { op: 'tag', tag: 'human' } },
    })).toBe(true)

    expect(matchesHeroQualifier(hero, {
      predicate: { op: 'not', child: { op: 'tag', tag: 'evil' } },
    })).toBe(false)

    expect(matchesHeroQualifier(hero, {
      predicate: { op: 'age', operator: '<', value: 19 },
    })).toBe(false)

    expect(matchesHeroQualifier(hero, {
      predicate: { op: 'heroId', heroId: 'carry', negate: true },
    })).toBe(false)

    expect(matchesHeroQualifier(hero, {
      predicate: { op: 'attackType', attackType: 'magic', negate: false },
    })).toBe(true)

    expect(matchesHeroQualifier(hero, {
      predicate: { op: 'attackType', attackType: 'magic', negate: true },
    })).toBe(false)

    expect(matchesHeroQualifier(hero, {
      predicate: { op: 'baseAttackCooldown', operator: '<=', value: 4.5 },
    })).toBe(true)

    expect(matchesHeroQualifier(hero, {
      predicate: { op: 'baseAttackCooldown', operator: '<', value: 4.5 },
    })).toBe(false)
  })

  it('attachSignalSemantics 统一挂接 target 与 formation count qualifier', () => {
    const taggedSignal = attachSignalSemantics(
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
      predicate: { op: 'tag', tag: 'female' },
    })
    expect(taggedSignal.formationCountQualifier).toBeNull()
    expect(taggedSignal.amountFunc).toBe('add')

    const stackedSignal = attachSignalSemantics(
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
      predicate: { op: 'stat', stat: 'str', operator: '>=', value: 15 },
    })
    expect(stackedSignal.stackFunc).toBe('per_hero_attribute')
    expect(stackedSignal.amountFunc).toBe('mult')
  })

  it('attachSignalSemantics 支持攻击伤害类型表达式', () => {
    const stackedSignal = attachSignalSemantics(
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
      predicate: { op: 'attackType', attackType: 'ranged', negate: false },
    })
  })

  it('attachSignalSemantics 把 attack_type 过滤统一挂到 carry qualifier', () => {
    const signal = attachSignalSemantics(
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
      predicate: { op: 'attackType', attackType: 'magic', negate: false },
    })
    expect(signal.formationCountQualifier).toBeNull()
  })

  it('normalizeStatQualifiers 归一化 gte/lte/eq 这类官方比较符别名', async () => {
    const { normalizeStatQualifiers } = await import('../../../../src/domain/abilities/signalSemantics.js')

    expect(normalizeStatQualifiers({
      target_filters: [{ type: 'stat', stat: 'dex', comparison: 'gte', check: 15 }],
    })).toEqual([
      { stat: 'dex', operator: '>=', value: 15 },
    ])

    expect(normalizeStatQualifiers({
      target_filters: [{ type: 'stat', stat: 'wis', comparison: 'lte', check: 13 }],
    })).toEqual([
      { stat: 'wis', operator: '<=', value: 13 },
    ])

    expect(normalizeStatQualifiers({
      target_filters: [{ type: 'stat', stat: 'int', comparison: 'eq', check: 12 }],
    })).toEqual([
      { stat: 'int', operator: '==', value: 12 },
    ])
  })

  it('attachSignalSemantics 保留 parser 预设的计数与位置语义', () => {
    const signal = attachSignalSemantics(
      {
        kind: 'heroDpsMultiplier',
        value: 100,
        rawEffect: 'hero_dps_mult_per_target_crusader,100,adj',
        source: 'official-parsed',
        amountFunc: 'add',
        stackFunc: 'per_target_crusader',
        formationCountPositionQualifier: { relation: 'adjacent' },
        formationCountQualifier: { predicate: { op: 'tag', tag: 'companion' } },
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
      predicate: { op: 'tag', tag: 'companion' },
    })
    expect(signal.amountFunc).toBe('add')
    expect(signal.stackFunc).toBe('per_target_crusader')
  })

  it('normalizeExplicitTargeting 只接受当前可稳定计分的目标关系', () => {
    expect(normalizeExplicitTargeting({ targets: ['adj'] })).toEqual({
      status: 'supported',
      relation: 'adjacent',
    })

    expect(normalizeExplicitTargeting({ targets: ['non_adj'] })).toEqual({
      status: 'supported',
      relation: 'nonAdjacent',
    })

    expect(normalizeExplicitTargeting({
      targets: [{ type: 'attack_type', attack: 'magic' }],
    })).toEqual({
      status: 'supported',
      relation: 'any',
    })

    expect(normalizeExplicitTargeting({ targets: ['all'] })).toEqual({
      status: 'supported',
      relation: 'any',
    })

    expect(normalizeExplicitTargeting({ targets: ['all_slots'] })).toEqual({
      status: 'supported',
      relation: 'any',
    })

    expect(normalizeExplicitTargeting({ targets: [{ type: 'distance', distance: 1 }] })).toEqual({
      status: 'supported',
      relation: 'adjacent',
    })

    expect(normalizeExplicitTargeting({ targets: [{ type: 'distance', distance: 1, self: true }] })).toEqual({
      status: 'supported',
      relation: 'adjacentOrSelf',
    })

    expect(normalizeExplicitTargeting({ targets: [{ type: 'distance', distance: 2 }] })).toEqual({
      status: 'supported',
      relation: 'withinTwoSlots',
    })

    expect(normalizeExplicitTargeting({ targets: [{ type: 'distance', distance: 2, self: true }] })).toEqual({
      status: 'supported',
      relation: 'withinTwoSlotsOrSelf',
    })

    expect(normalizeExplicitTargeting({ targets: [{ type: 'distance', distance: 3 }] })).toEqual({
      status: 'supported',
      relation: 'withinThreeSlots',
    })

    expect(normalizeExplicitTargeting({ targets: ['col'] })).toEqual({
      status: 'supported',
      relation: 'sameColumn',
    })

    expect(normalizeExplicitTargeting({ targets: ['next_col'] })).toEqual({
      status: 'supported',
      relation: 'aheadColumn',
    })

    expect(normalizeExplicitTargeting({ targets: ['prev_col'] })).toEqual({
      status: 'supported',
      relation: 'behindColumn',
    })

    expect(normalizeExplicitTargeting({ targets: ['next_two_col'] })).toEqual({
      status: 'supported',
      relation: 'aheadTwoColumns',
    })

    expect(normalizeExplicitTargeting({ targets: ['prev_two_col'] })).toEqual({
      status: 'supported',
      relation: 'behindTwoColumns',
    })

    expect(normalizeExplicitTargeting({ targets: ['behind'] })).toEqual({
      status: 'supported',
      relation: 'allBehindColumns',
    })

    expect(normalizeExplicitTargeting({ targets: ['col_and_prev_col'] })).toEqual({
      status: 'supported',
      relation: 'sameOrBehindColumn',
    })

    expect(normalizeExplicitTargeting({ targets: ['col_and_behind'] })).toEqual({
      status: 'supported',
      relation: 'sameOrBehindColumns',
    })

    expect(normalizeExplicitTargeting({ targets: ['ahead'] })).toEqual({
      status: 'supported',
      relation: 'allAheadColumns',
    })

    expect(normalizeExplicitTargeting({ targets: ['col_and_ahead'] })).toEqual({
      status: 'supported',
      relation: 'sameOrAheadColumns',
    })

    expect(normalizeExplicitTargeting({ targets: ['self_and_ahead'] })).toEqual({
      status: 'supported',
      relation: 'sameOrAheadColumns',
    })

    expect(normalizeExplicitTargeting({
      targets: [{ type: 'cascade', cascade_type: 'self_and_adj' }],
    })).toEqual({
      status: 'supported',
      relation: 'adjacentOrSelf',
    })

    expect(normalizeExplicitTargeting({
      targets: [{ type: 'col_and_back_x', num_back_cols: 1 }],
    })).toEqual({
      status: 'supported',
      relation: 'sameOrBehindColumn',
    })

    expect(normalizeExplicitTargeting({ targets: ['prev_and_next_col'] })).toEqual({
      status: 'supported',
      relation: 'adjacentColumns',
    })

    expect(normalizeExplicitTargeting({ targets: ['self_and_prev_two_col'] })).toEqual({
      status: 'supported',
      relation: 'selfAndBehindTwoColumns',
    })

    expect(normalizeExplicitTargeting({ targets: ['self_and_adj'] })).toEqual({
      status: 'supported',
      relation: 'adjacentOrSelf',
    })

    expect(normalizeExplicitTargeting({ targets: ['front_2_columns'] })).toEqual({
      status: 'supported',
      relation: 'frontTwoColumns',
    })

    expect(normalizeExplicitTargeting({ targets: ['back_2_columns'] })).toEqual({
      status: 'supported',
      relation: 'backTwoColumns',
    })

    expect(normalizeExplicitTargeting({
      targets: [{ type: 'exactly_x_behind', num_columns: 2 }],
    })).toEqual({
      status: 'supported',
      relation: 'exactlyBehindTwoColumns',
    })

    expect(normalizeExplicitTargeting({
      targets: [{ type: 'col_num', start_from_back: true, column: 0 }],
    })).toEqual({
      status: 'supported',
      relation: 'rearMostColumn',
    })

    expect(normalizeExplicitTargeting({ targets: ['front'] }).status).toBe('unsupported')
  })

  it('per_upgrade_targets 保留 carry 目标限定，同时挂接位置关系', () => {
    const signal = attachSignalSemantics(
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
      predicate: { op: 'tag', tag: 'female' },
    })
    expect(signal.formationCountQualifier).toEqual({
      predicate: { op: 'tag', tag: 'female' },
    })
  })

  it('all_slots + 过滤限定会保留为全阵型目标 buff', () => {
    const signal = attachSignalSemantics(
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
      predicate: { op: 'tag', tag: 'female' },
    })
    expect(signal.formationCountQualifier).toBeNull()
  })
})
