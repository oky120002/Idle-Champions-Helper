import { describe, expect, it } from 'vitest'

import {
  attachSignalSemantics,
  matchesHeroQualifier,
  mergeHeroQualifiers,
  normalizeExplicitTargeting,
  normalizeStatQualifiers,
  normalizeTargetQualifier,
} from './signalSemantics.js'
import type { HeroAbilityProfile, HeroQualifier } from './abilityModel'

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

describe('normalizeTargetQualifier', () => {
  it('| 分隔的多 tag → OR 谓词（IC tags OR 语义）', () => {
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

  it('^ 分隔的多 tag → AND 谓词（IC tags AND 语义）', () => {
    const qualifier = normalizeTargetQualifier({
      targets: [{ type: 'tags', tags: 'lawful^good' }],
    })
    expect(qualifier?.predicate).toEqual({
      op: 'and',
      children: [{ op: 'tag', tag: 'lawful' }, { op: 'tag', tag: 'good' }],
    })
  })

  it('!tag^!tag → AND(NOT, NOT)', () => {
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

  it('单 !tag → NOT', () => {
    const qualifier = normalizeTargetQualifier({
      targets: [{ type: 'tags', tags: '!human' }],
    })
    expect(qualifier?.predicate).toEqual({ op: 'not', child: { op: 'tag', tag: 'human' } })
  })

  it('复合括号 → 精确谓词树，端到端求值正确', () => {
    // IC tags 支持括号复合：((geneutral|evil)^dps)|(good^support)。
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

  it('attack_type filter → attackType 节点', () => {
    const qualifier = normalizeTargetQualifier({
      targets: [{ type: 'attack_type', attack: 'Magic' }],
    })
    expect(qualifier?.predicate).toEqual({ op: 'attackType', attackType: 'magic', negate: false })
  })

  it('hero_expr filter（functional 谓词）→ 对应 AST 节点', () => {
    // IC filter_targets type:'hero_expr' 与 per_hero_expr 同方言（HasTag/GetStat/age/hero_id/HasAttackDamageType）。
    // 真实样本：Diana "DEX>=15"、Sheila "Good tag"、Diana "age<=20 && hero_id!=146"。
    expect(normalizeTargetQualifier({
      filter_targets: [{ type: 'hero_expr', hero_expr: 'GetStat(`dex`)>=15' }],
    })?.predicate).toEqual({ op: 'stat', stat: 'dex', operator: '>=', value: 15 })

    expect(normalizeTargetQualifier({
      filter_targets: [{ type: 'hero_expr', hero_expr: 'HasTag(`good`)' }],
    })?.predicate).toEqual({ op: 'tag', tag: 'good' })

    expect(normalizeTargetQualifier({
      filter_targets: [{ type: 'hero_expr', hero_expr: 'age<=20&&hero_id!=146' }],
    })?.predicate).toEqual({
      op: 'and',
      children: [
        { op: 'age', operator: '<=', value: 20 },
        { op: 'heroId', heroId: '146', negate: true },
      ],
    })
  })

  it('hero_expr 与 by_tags 共存 → AND 合并', () => {
    const qualifier = normalizeTargetQualifier({
      filter_targets: [
        { type: 'by_tags', tags: 'dwarf' },
        { type: 'hero_expr', hero_expr: 'HasAttackDamageType(`melee`)' },
      ],
    })
    expect(qualifier?.predicate).toEqual({
      op: 'and',
      children: [
        { op: 'tag', tag: 'dwarf' },
        { op: 'attackType', attackType: 'melee', negate: false },
      ],
    })
  })

  it('hero_expr 不可解析（运行时变量）→ 保守丢弃该 filter，不影响其他 filter', () => {
    // GetUpgradeUnlocked 等运行时叶子 parseHeroPredicate 返回 null，该 filter 不进 predicate。
    const qualifier = normalizeTargetQualifier({
      filter_targets: [
        { type: 'by_tags', tags: 'female' },
        { type: 'hero_expr', hero_expr: 'GetUpgradeUnlocked(19357)' },
      ],
    })
    expect(qualifier?.predicate).toEqual({ op: 'tag', tag: 'female' })
  })

  it('hero_ids filter → 英雄白名单谓词（真实样本 effect_def 134/163）', () => {
    // 真实样本：恩拉克"adj 位置 + hero_id=24 才 +400%"（effect_def 134）、
    // 宾温"adj 位置 + hero_id=27 才 +400%"（effect_def 163）。
    // 修复前 hero_ids 被静默丢弃 → targetQualifier=null → adj 全英雄吃 400%（高估 carryDps）。
    const qualifier = normalizeTargetQualifier({
      filter_targets: [{ type: 'hero_ids', hero_ids: [24] }],
    })
    expect(qualifier?.predicate).toEqual({ op: 'heroId', heroId: '24', negate: false })
    expect(matchesHeroQualifier(createHero('24'), qualifier)).toBe(true)
    expect(matchesHeroQualifier(createHero('27'), qualifier)).toBe(false)
  })

  it('hero_ids 多英雄 → OR', () => {
    const qualifier = normalizeTargetQualifier({
      filter_targets: [{ type: 'hero_ids', hero_ids: [24, 27] }],
    })
    expect(qualifier?.predicate).toEqual({
      op: 'or',
      children: [
        { op: 'heroId', heroId: '24', negate: false },
        { op: 'heroId', heroId: '27', negate: false },
      ],
    })
  })

  it('exclude_heroes filter → NOT 英雄黑名单', () => {
    // exclude_heroes 排除特定英雄（NOT 语义）。当前关联多为减益（不处理），
    // 修复保证语义正确，防未来减益处理时再丢失限定（与 hero_ids 对称）。
    const qualifier = normalizeTargetQualifier({
      filter_targets: [{ type: 'exclude_heroes', hero_ids: [27] }],
    })
    expect(qualifier?.predicate).toEqual({ op: 'not', child: { op: 'heroId', heroId: '27', negate: false } })
    expect(matchesHeroQualifier(createHero('24'), qualifier)).toBe(true)
    expect(matchesHeroQualifier(createHero('27'), qualifier)).toBe(false)
  })

  it('hero_ids 与 by_tags 共存 → AND 合并', () => {
    const qualifier = normalizeTargetQualifier({
      filter_targets: [
        { type: 'by_tags', tags: 'dwarf' },
        { type: 'hero_ids', hero_ids: [24] },
      ],
    })
    expect(qualifier?.predicate).toEqual({
      op: 'and',
      children: [
        { op: 'tag', tag: 'dwarf' },
        { op: 'heroId', heroId: '24', negate: false },
      ],
    })
  })
})

describe('normalizeStatQualifiers', () => {
  it('归一化 gte/lte/eq 官方比较符别名', () => {
    expect(normalizeStatQualifiers({
      target_filters: [{ type: 'stat', stat: 'dex', comparison: 'gte', check: 15 }],
    })).toEqual([{ stat: 'dex', operator: '>=', value: 15 }])

    expect(normalizeStatQualifiers({
      target_filters: [{ type: 'stat', stat: 'wis', comparison: 'lte', check: 13 }],
    })).toEqual([{ stat: 'wis', operator: '<=', value: 13 }])

    expect(normalizeStatQualifiers({
      target_filters: [{ type: 'stat', stat: 'int', comparison: 'eq', check: 12 }],
    })).toEqual([{ stat: 'int', operator: '==', value: 12 }])
  })
})

describe('normalizeExplicitTargeting', () => {
  it('只接受当前可稳定计分的目标关系', () => {
    expect(normalizeExplicitTargeting({ targets: ['adj'] })).toEqual({ status: 'supported', relation: 'adjacent' })
    expect(normalizeExplicitTargeting({ targets: ['non_adj'] })).toEqual({ status: 'supported', relation: 'nonAdjacent' })
    expect(normalizeExplicitTargeting({ targets: [{ type: 'attack_type', attack: 'magic' }] })).toEqual({ status: 'supported', relation: 'any' })
    expect(normalizeExplicitTargeting({ targets: ['all'] })).toEqual({ status: 'supported', relation: 'any' })
    expect(normalizeExplicitTargeting({ targets: ['all_slots'] })).toEqual({ status: 'supported', relation: 'any' })
    expect(normalizeExplicitTargeting({ targets: [{ type: 'distance', distance: 1 }] })).toEqual({ status: 'supported', relation: 'adjacent' })
    expect(normalizeExplicitTargeting({ targets: [{ type: 'distance', distance: 1, self: true }] })).toEqual({ status: 'supported', relation: 'adjacentOrSelf' })
    expect(normalizeExplicitTargeting({ targets: [{ type: 'distance', distance: 2 }] })).toEqual({ status: 'supported', relation: 'withinTwoSlots' })
    expect(normalizeExplicitTargeting({ targets: [{ type: 'distance', distance: 2, self: true }] })).toEqual({ status: 'supported', relation: 'withinTwoSlotsOrSelf' })
    expect(normalizeExplicitTargeting({ targets: [{ type: 'distance', distance: 3 }] })).toEqual({ status: 'supported', relation: 'withinThreeSlots' })
    expect(normalizeExplicitTargeting({ targets: ['col'] })).toEqual({ status: 'supported', relation: 'sameColumn' })
    expect(normalizeExplicitTargeting({ targets: ['next_col'] })).toEqual({ status: 'supported', relation: 'aheadColumn' })
    expect(normalizeExplicitTargeting({ targets: ['prev_col'] })).toEqual({ status: 'supported', relation: 'behindColumn' })
    expect(normalizeExplicitTargeting({ targets: ['next_two_col'] })).toEqual({ status: 'supported', relation: 'aheadTwoColumns' })
    expect(normalizeExplicitTargeting({ targets: ['prev_two_col'] })).toEqual({ status: 'supported', relation: 'behindTwoColumns' })
    expect(normalizeExplicitTargeting({ targets: ['behind'] })).toEqual({ status: 'supported', relation: 'allBehindColumns' })
    expect(normalizeExplicitTargeting({ targets: ['col_and_prev_col'] })).toEqual({ status: 'supported', relation: 'sameOrBehindColumn' })
    expect(normalizeExplicitTargeting({ targets: ['col_and_behind'] })).toEqual({ status: 'supported', relation: 'sameOrBehindColumns' })
    expect(normalizeExplicitTargeting({ targets: ['ahead'] })).toEqual({ status: 'supported', relation: 'allAheadColumns' })
    expect(normalizeExplicitTargeting({ targets: ['col_and_ahead'] })).toEqual({ status: 'supported', relation: 'sameOrAheadColumns' })
    expect(normalizeExplicitTargeting({ targets: ['self_and_ahead'] })).toEqual({ status: 'supported', relation: 'sameOrAheadColumns' })
    expect(normalizeExplicitTargeting({ targets: [{ type: 'cascade', cascade_type: 'self_and_adj' }] })).toEqual({ status: 'supported', relation: 'adjacentOrSelf' })
    expect(normalizeExplicitTargeting({ targets: [{ type: 'col_and_back_x', num_back_cols: 1 }] })).toEqual({ status: 'supported', relation: 'sameOrBehindColumn' })
    expect(normalizeExplicitTargeting({ targets: ['prev_and_next_col'] })).toEqual({ status: 'supported', relation: 'adjacentColumns' })
    expect(normalizeExplicitTargeting({ targets: ['self_and_prev_two_col'] })).toEqual({ status: 'supported', relation: 'selfAndBehindTwoColumns' })
    expect(normalizeExplicitTargeting({ targets: ['self_and_adj'] })).toEqual({ status: 'supported', relation: 'adjacentOrSelf' })
    expect(normalizeExplicitTargeting({ targets: ['front_2_columns'] })).toEqual({ status: 'supported', relation: 'frontTwoColumns' })
    expect(normalizeExplicitTargeting({ targets: ['back_2_columns'] })).toEqual({ status: 'supported', relation: 'backTwoColumns' })
    // Jim 自身列 + 前后各一列（3 列宽带）：值走 amount_expr + per_upgrade_targets，关系靠这里解锁
    expect(normalizeExplicitTargeting({ targets: ['self_and_behind_and_ahead'] })).toEqual({ status: 'supported', relation: 'selfAndAheadAndBehindColumns' })
    expect(normalizeExplicitTargeting({ targets: [{ type: 'exactly_x_behind', num_columns: 2 }] })).toEqual({ status: 'supported', relation: 'exactlyBehindTwoColumns' })
    expect(normalizeExplicitTargeting({ targets: [{ type: 'col_num', start_from_back: true, column: 0 }] })).toEqual({ status: 'supported', relation: 'rearMostColumn' })
    expect(normalizeExplicitTargeting({ targets: ['front'] }).status).toBe('unsupported')
  })
})

describe('matchesHeroQualifier', () => {
  it('qualifier 为 null/undefined → true（无限制，整队计数用）', () => {
    expect(matchesHeroQualifier(createHero('h'), null)).toBe(true)
    expect(matchesHeroQualifier(createHero('h'), undefined)).toBe(true)
  })

  it('正常 qualifier 转发 evalHeroPredicate', () => {
    const hero = createHero('h', { tags: ['evil'] })
    expect(matchesHeroQualifier(hero, { predicate: { op: 'tag', tag: 'evil' } })).toBe(true)
    expect(matchesHeroQualifier(hero, { predicate: { op: 'tag', tag: 'good' } })).toBe(false)
  })
})

describe('attachSignalSemantics', () => {
  it('统一挂接 target 与 formation count qualifier', () => {
    const taggedSignal = attachSignalSemantics(
      { kind: 'taggedChampionBuff', value: 40, rawEffect: 'tag_dps,40', source: 'official-parsed' },
      { filter_targets: [{ type: 'by_tags', tags: 'female' }], amount_func: 'add' },
    )
    expect(taggedSignal.targetQualifier).toEqual({ predicate: { op: 'tag', tag: 'female' } })
    expect(taggedSignal.formationCountQualifier).toBeNull()
    expect(taggedSignal.amountFunc).toBe('add')

    const stackedSignal = attachSignalSemantics(
      { kind: 'globalDpsMultiplier', value: 20, rawEffect: 'global_dps_multiplier_mult,20', source: 'official-parsed' },
      { stack_func: 'per_hero_attribute', amount_func: 'mult', per_hero_expr: 'GetStat(`STR`) >= 15' },
    )
    expect(stackedSignal.targetQualifier).toBeNull()
    expect(stackedSignal.formationCountQualifier).toEqual({
      predicate: { op: 'stat', stat: 'str', operator: '>=', value: 15 },
    })
    expect(stackedSignal.stackFunc).toBe('per_hero_attribute')
    expect(stackedSignal.amountFunc).toBe('mult')
  })

  it('per_hero_expr 攻击伤害类型表达式挂到 formationCountQualifier', () => {
    const signal = attachSignalSemantics(
      { kind: 'globalDpsMultiplier', value: 15, rawEffect: 'global_dps_multiplier_mult,15', source: 'official-parsed' },
      { stack_func: 'per_hero_attribute', amount_func: 'mult', per_hero_expr: 'HasAttackDamageType(`ranged`)' },
    )
    expect(signal.formationCountQualifier).toEqual({
      predicate: { op: 'attackType', attackType: 'ranged', negate: false },
    })
  })

  it('attack_type filter 统一挂到 carry qualifier（formationCountQualifier 为 null）', () => {
    const signal = attachSignalSemantics(
      { kind: 'heroDpsMultiplier', value: 150, rawEffect: 'hero_dps_multiplier_mult,150', source: 'official-parsed' },
      { targets: ['all_slots'], filter_targets: [{ type: 'attack_type', attack: 'magic' }] },
    )
    expect(signal.targetQualifier).toEqual({ predicate: { op: 'attackType', attackType: 'magic', negate: false } })
    expect(signal.formationCountQualifier).toBeNull()
  })

  it('保留 parser 预设的计数与位置语义', () => {
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
      { targets: ['self'] },
    )
    expect(signal.positionQualifier).toEqual({ relation: 'self' })
    expect(signal.formationCountPositionQualifier).toEqual({ relation: 'adjacent' })
    expect(signal.formationCountQualifier).toEqual({ predicate: { op: 'tag', tag: 'companion' } })
    expect(signal.amountFunc).toBe('add')
    expect(signal.stackFunc).toBe('per_target_crusader')
  })

  it('per_upgrade_targets 保留 carry 目标限定，同时挂接位置关系', () => {
    const signal = attachSignalSemantics(
      { kind: 'heroDpsMultiplier', value: 100, rawEffect: 'hero_dps_multiplier_mult,0', source: 'official-parsed' },
      {
        stack_func: 'per_upgrade_targets',
        amount_func: 'mult',
        targets: ['non_adj'],
        filter_targets: [{ type: 'by_tags', tags: 'female' }],
      },
    )
    expect(signal.positionQualifier).toEqual({ relation: 'nonAdjacent' })
    expect(signal.targetQualifier).toEqual({ predicate: { op: 'tag', tag: 'female' } })
    expect(signal.formationCountQualifier).toEqual({ predicate: { op: 'tag', tag: 'female' } })
  })

  it('all_slots + 过滤限定保留为全阵型目标 buff', () => {
    const signal = attachSignalSemantics(
      { kind: 'heroDpsMultiplier', value: 125, rawEffect: 'hero_dps_multiplier_mult,125', source: 'official-parsed' },
      { targets: ['all_slots'], filter_targets: [{ type: 'by_tags', tags: 'female' }] },
    )
    expect(signal.positionQualifier).toBeNull()
    expect(signal.targetQualifier).toEqual({ predicate: { op: 'tag', tag: 'female' } })
    expect(signal.formationCountQualifier).toBeNull()
  })

  it('hero_expr filter 限定 hero_dps_multiplier_mult 的目标英雄', () => {
    // 真实样本：Diana hero_dps_multiplier_mult,100 + hero_expr:GetStat(`dex`)>=15。
    // 修复前 hero_expr 被丢弃 → targetQualifier=null → buff 误用到全部英雄。
    const signal = attachSignalSemantics(
      { kind: 'heroDpsMultiplier', value: 100, rawEffect: 'hero_dps_multiplier_mult,100', source: 'official-parsed' },
      { filter_targets: [{ type: 'hero_expr', hero_expr: 'GetStat(`dex`)>=15' }] },
    )
    expect(signal.targetQualifier).toEqual({ predicate: { op: 'stat', stat: 'dex', operator: '>=', value: 15 } })
  })

  it('stack_func_data.tag 为 count 限定，filter_targets 回归 target 限定（蔚 ed=1644 善良榜样）', () => {
    // 真实样本：蔚"善良榜样" effect_def 1644。raw effect_key 同时携带：
    //   stack_func_data:{tag:"good|acqinc|cteam"}（count：数这些英雄叠层）
    //   filter_targets:[{by_tags:geneutral}]（target：buff geneutral 英雄）
    // 修复前 filter_targets 被误用为 formationCountQualifier、targetQualifier 丢失 →
    // 既数错（geneutral 当 count）又 buff 错目标（任意英雄都吃）。
    const signal = attachSignalSemantics(
      { kind: 'heroDpsMultiplier', value: 300, rawEffect: 'hero_dps_multiplier_mult,300', source: 'official-parsed' },
      {
        targets: ['all'],
        filter_targets: [{ type: 'by_tags', tags: 'geneutral' }],
        amount_func: 'mult',
        stack_func: 'per_hero',
        stack_func_data: { tag: 'good|acqinc|cteam' },
      },
    )
    // count 限定来自 stack_func_data.tag（多 tag → OR，与 IC tags 同方言）
    expect(signal.formationCountQualifier).toEqual({
      predicate: {
        op: 'or',
        children: [
          { op: 'tag', tag: 'good' },
          { op: 'tag', tag: 'acqinc' },
          { op: 'tag', tag: 'cteam' },
        ],
      },
    })
    // target 限定回归 filter_targets（geneutral）
    expect(signal.targetQualifier).toEqual({ predicate: { op: 'tag', tag: 'geneutral' } })
    expect(signal.stackFunc).toBe('per_hero')
    expect(signal.amountFunc).toBe('mult')
  })

  it('stack_func_data.tag 单独存在（无 filter_targets）→ count 限定不再丢失', () => {
    // 真实样本：effect_def 1161 hero_dps_multiplier_mult,100 +
    // stack_func_data:{tag:"blackdicesociety|evil"}（无 filter_targets）。
    // 修复前 stack_func_data 从未被读取 → formationCountQualifier=null → 误数全英雄。
    const signal = attachSignalSemantics(
      { kind: 'heroDpsMultiplier', value: 100, rawEffect: 'hero_dps_multiplier_mult,100', source: 'official-parsed' },
      { stack_func: 'per_crusader', amount_func: 'add', stack_func_data: { tag: 'blackdicesociety|evil' } },
    )
    expect(signal.formationCountQualifier).toEqual({
      predicate: {
        op: 'or',
        children: [{ op: 'tag', tag: 'blackdicesociety' }, { op: 'tag', tag: 'evil' }],
      },
    })
    expect(signal.targetQualifier).toBeNull()
  })
})

describe('mergeHeroQualifiers', () => {
  // buff_upgrade wrapper 派生时合并 base 与 wrapper 的 targetQualifier（AND）。
  it('null 取另一个，同结构去重，不同则 AND 合并', () => {
    const tag = { predicate: { op: 'tag', tag: 'dwarf' } } satisfies HeroQualifier
    const heroId = { predicate: { op: 'heroId', heroId: '82', negate: false } } satisfies HeroQualifier
    expect(mergeHeroQualifiers(null, tag)).toEqual(tag)
    expect(mergeHeroQualifiers(tag, null)).toEqual(tag)
    expect(mergeHeroQualifiers(null, null)).toBeNull()
    expect(mergeHeroQualifiers(tag, { predicate: { op: 'tag', tag: 'dwarf' } })).toEqual(tag)
    expect(mergeHeroQualifiers(tag, heroId)).toEqual({
      predicate: { op: 'and', children: [{ op: 'tag', tag: 'dwarf' }, { op: 'heroId', heroId: '82', negate: false }] },
    })
  })
})
