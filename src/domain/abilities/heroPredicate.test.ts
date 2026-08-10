import { describe, expect, it } from 'vitest'

import {
  evalHeroPredicate,
  parseHeroPredicate,
  predicateHasNode,
} from './heroPredicate'
import type { HeroAbilityProfile, HeroPredicateAST } from './abilityModel'

function createHero(overrides: Partial<HeroAbilityProfile> = {}): HeroAbilityProfile {
  return {
    heroId: overrides.heroId ?? '1',
    name: { original: 'h', display: 'h' },
    seat: overrides.seat ?? 1,
    roles: overrides.roles ?? [],
    tags: overrides.tags ?? [],
    baseAttackDamageTypes: overrides.baseAttackDamageTypes ?? [],
    baseAttackCooldown: overrides.baseAttackCooldown ?? null,
    age: overrides.age ?? null,
    abilityScores: overrides.abilityScores ?? {},
    baseDamage: overrides.baseDamage ?? 1,
    baseHealth: overrides.baseHealth ?? 1,
    carrySignals: [],
    supportSignals: [],
    unsupportedSignals: [],
    sourceBreakdown: { carrySignals: [], supportSignals: [], unsupportedSignals: [] },
    ...(overrides.ownedSaveContext ? { ownedSaveContext: overrides.ownedSaveContext } : {}),
    ...(overrides.eligiblePatronIds ? { eligiblePatronIds: overrides.eligiblePatronIds } : {}),
  }
}

describe('parseHeroPredicate · shorthand dialect（filter_targets.tags）', () => {
  it('裸 tag → tag 节点（小写）', () => {
    expect(parseHeroPredicate('Female', 'shorthand')).toEqual({ op: 'tag', tag: 'female' })
  })

  it('| 分隔 → OR（IC 多职业任一）', () => {
    expect(parseHeroPredicate('cleric|wizard|sorcerer|warlock', 'shorthand')).toEqual({
      op: 'or',
      children: [
        { op: 'tag', tag: 'cleric' },
        { op: 'tag', tag: 'wizard' },
        { op: 'tag', tag: 'sorcerer' },
        { op: 'tag', tag: 'warlock' },
      ],
    })
  })

  it('^ 分隔 → AND', () => {
    expect(parseHeroPredicate('lawful^good', 'shorthand')).toEqual({
      op: 'and',
      children: [{ op: 'tag', tag: 'lawful' }, { op: 'tag', tag: 'good' }],
    })
  })

  it('! 前缀 → NOT', () => {
    expect(parseHeroPredicate('!human', 'shorthand')).toEqual({
      op: 'not', child: { op: 'tag', tag: 'human' },
    })
  })

  it('!a^!b → AND(NOT, NOT)', () => {
    expect(parseHeroPredicate('!evil^!blackdicesociety', 'shorthand')).toEqual({
      op: 'and',
      children: [
        { op: 'not', child: { op: 'tag', tag: 'evil' } },
        { op: 'not', child: { op: 'tag', tag: 'blackdicesociety' } },
      ],
    })
  })

  it('复合括号 → 精确嵌套谓词树（不再降级保守）', () => {
    expect(parseHeroPredicate('((geneutral|evil)^dps)|(good^support)', 'shorthand')).toEqual({
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
  })

  it('外层括号被剥离（非语义分组）', () => {
    expect(parseHeroPredicate('(female)', 'shorthand')).toEqual({ op: 'tag', tag: 'female' })
    expect(parseHeroPredicate('((a|b))', 'shorthand')).toEqual({
      op: 'or', children: [{ op: 'tag', tag: 'a' }, { op: 'tag', tag: 'b' }],
    })
  })

  it('非串 / 空串 → null', () => {
    expect(parseHeroPredicate(undefined, 'shorthand')).toBeNull()
    expect(parseHeroPredicate('   ', 'shorthand')).toBeNull()
    expect(parseHeroPredicate(123, 'shorthand')).toBeNull()
  })
})

describe('parseHeroPredicate · functional dialect（per_hero_expr）', () => {
  it('HasTag / is_undead / true', () => {
    expect(parseHeroPredicate('HasTag(`female`)', 'functional')).toEqual({ op: 'tag', tag: 'female' })
    expect(parseHeroPredicate('is_undead', 'functional')).toEqual({ op: 'tag', tag: 'undead' })
    expect(parseHeroPredicate('true', 'functional')).toEqual({ op: 'true' })
  })

  it('GetStat 比较（含 total_ability_score）', () => {
    expect(parseHeroPredicate('GetStat(`CHA`) >= 11', 'functional')).toEqual({
      op: 'stat', stat: 'cha', operator: '>=', value: 11,
    })
    expect(parseHeroPredicate('GetStat(`total_ability_score`) <= 78', 'functional')).toEqual({
      op: 'stat', stat: 'total_ability_score', operator: '<=', value: 78,
    })
  })

  it('age / base_attack_cooldown 比较（含小数）', () => {
    expect(parseHeroPredicate('age <= 20', 'functional')).toEqual({
      op: 'age', operator: '<=', value: 20,
    })
    expect(parseHeroPredicate('base_attack_cooldown<=4', 'functional')).toEqual({
      op: 'baseAttackCooldown', operator: '<=', value: 4,
    })
  })

  it('hero_id == / !=', () => {
    expect(parseHeroPredicate('hero_id == 146', 'functional')).toEqual({
      op: 'heroId', heroId: '146', negate: false,
    })
    expect(parseHeroPredicate('hero_id != 146', 'functional')).toEqual({
      op: 'heroId', heroId: '146', negate: true,
    })
  })

  it('HasAttackDamageType / ! 前缀 NOT', () => {
    expect(parseHeroPredicate('HasAttackDamageType(`magic`)', 'functional')).toEqual({
      op: 'attackType', attackType: 'magic', negate: false,
    })
    expect(parseHeroPredicate('!HasAttackDamageType(`melee`)', 'functional')).toEqual({
      op: 'not', child: { op: 'attackType', attackType: 'melee', negate: false },
    })
    expect(parseHeroPredicate('!HasTag(`human`)', 'functional')).toEqual({
      op: 'not', child: { op: 'tag', tag: 'human' },
    })
  })

  it('has_base_attack_dmg_type_X 是 HasAttackDamageType 的裸标识符别名（raw 23 处）', () => {
    expect(parseHeroPredicate('has_base_attack_dmg_type_magic', 'functional')).toEqual({
      op: 'attackType', attackType: 'magic', negate: false,
    })
    // 含别名的 OR：旧实现因别名子句 null 导致整式 null，丢弃 HasTag(fallbacks)。
    expect(parseHeroPredicate(
      'HasTag(`fallbacks`) || has_base_attack_dmg_type_melee || has_base_attack_dmg_type_ranged',
      'functional',
    )).toEqual({
      op: 'or',
      children: [
        { op: 'tag', tag: 'fallbacks' },
        { op: 'attackType', attackType: 'melee', negate: false },
        { op: 'attackType', attackType: 'ranged', negate: false },
      ],
    })
  })

  it('has_tag_X 是 HasTag(`X`) 的裸标识符别名（raw has_tag_rivalswaterdeep/speed）', () => {
    expect(parseHeroPredicate('has_tag_rivalswaterdeep', 'functional')).toEqual({ op: 'tag', tag: 'rivalswaterdeep' })
    expect(parseHeroPredicate('has_tag_speed', 'functional')).toEqual({ op: 'tag', tag: 'speed' })
    // 含 has_tag_X 别名的 OR：旧实现因别名子句 null 导致整式 null。
    expect(parseHeroPredicate('HasTag(`gold`) || has_tag_rivalswaterdeep', 'functional')).toEqual({
      op: 'or',
      children: [{ op: 'tag', tag: 'gold' }, { op: 'tag', tag: 'rivalswaterdeep' }],
    })
  })

  it('as_int 透传子表达式', () => {
    expect(parseHeroPredicate('as_int(HasTag(`dragonborn`))', 'functional')).toEqual({
      op: 'tag', tag: 'dragonborn',
    })
    expect(parseHeroPredicate('as_int(!HasTag(`dps`))', 'functional')).toEqual({
      op: 'not', child: { op: 'tag', tag: 'dps' },
    })
  })

  it('|| / && + 括号复合（age<=20 && hero_id!=146 两种写法）', () => {
    expect(parseHeroPredicate('age <= 20 && hero_id != 146', 'functional')).toEqual({
      op: 'and',
      children: [
        { op: 'age', operator: '<=', value: 20 },
        { op: 'heroId', heroId: '146', negate: true },
      ],
    })
    expect(parseHeroPredicate('age<=20&&hero_id!=146', 'functional')).toEqual({
      op: 'and',
      children: [
        { op: 'age', operator: '<=', value: 20 },
        { op: 'heroId', heroId: '146', negate: true },
      ],
    })
    expect(parseHeroPredicate('(HasTag(`female`) || HasTag(`non_binary`)) && age<110', 'functional')).toEqual({
      op: 'and',
      children: [
        { op: 'or', children: [{ op: 'tag', tag: 'female' }, { op: 'tag', tag: 'non_binary' }] },
        { op: 'age', operator: '<', value: 110 },
      ],
    })
  })

  it('数值表达式（min/变量/GetUpgradeAmount）→ null（归 stage 7 numericExpression）', () => {
    expect(parseHeroPredicate('as_int(GetStat(`int`) >= min_stat_value)', 'functional')).toBeNull()
    expect(parseHeroPredicate('min(floor(levels_past_softcap/num_levels_per_stack),1)', 'functional')).toBeNull()
    expect(parseHeroPredicate('has_non_standard_race', 'functional')).toBeNull()
    // has_tag_X 在数值表达式（stack 数量）内作 0/1 变量，顶层 floor 仍归 stage 7 numericExpression
    expect(parseHeroPredicate('floor(max(has_tag_acqinc,has_tag_cteam)*min(hero_level,hero_softcap))', 'functional')).toBeNull()
  })

  it('GetUpgradeUnlocked(N) → upgradeUnlocked 节点（owner/reqLvl 由 build 期 enrichment 补）', () => {
    expect(parseHeroPredicate('GetUpgradeUnlocked(17492)', 'functional')).toEqual({
      op: 'upgradeUnlocked', upgradeId: '17492',
    })
  })

  it('GetUpgradePurchased(N) / GetFeatEquipped(N) → 对应节点', () => {
    expect(parseHeroPredicate('GetUpgradePurchased(19680)', 'functional')).toEqual({
      op: 'upgradePurchased', upgradeId: '19680',
    })
    expect(parseHeroPredicate('GetFeatEquipped(2628)', 'functional')).toEqual({
      op: 'featEquipped', featId: '2628',
    })
  })

  it('含 GetUpgradePurchased + GetFeatEquipped 的复合式不再整体丢弃（hero 119 BDS 样本）', () => {
    // raw：HasTag(blackdicesociety) || (GetUpgradePurchased(19680)&&HasTag(good)) || (GetFeatEquipped(2628)&&GetStat(int)>=13)
    const ast = parseHeroPredicate(
      'HasTag(`blackdicesociety`) || (GetUpgradePurchased(19680) && HasTag(`good`)) || (GetFeatEquipped(2628) && GetStat(`int`)>=13)',
      'functional',
    )
    expect(ast).not.toBeNull()
    expect(predicateHasNode(ast, 'upgradePurchased')).toBe(true)
    expect(predicateHasNode(ast, 'featEquipped')).toBe(true)
  })

  it('is_alive / EligibleForPatron(var) → 对应节点', () => {
    expect(parseHeroPredicate('is_alive', 'functional')).toEqual({ op: 'isAlive' })
    expect(parseHeroPredicate('EligibleForPatron(aeon_current_patron_id)', 'functional')).toEqual({ op: 'eligibleForPatron' })
  })

  it('hero 119 !is_alive 复合式 + hero 150 EligibleForPatron 可解析', () => {
    expect(parseHeroPredicate('!is_alive || is_undead || HasTag(`undead`)', 'functional')).not.toBeNull()
    expect(parseHeroPredicate('EligibleForPatron(aeon_current_patron_id)', 'functional')).not.toBeNull()
  })

  it('HasEffect(`name`) → hasEffect 节点', () => {
    expect(parseHeroPredicate('HasEffect(`celeste_heal`)', 'functional')).toEqual({
      op: 'hasEffect', effectName: 'celeste_heal',
    })
    expect(parseHeroPredicate('HasEffect(`vampire_spawn`)', 'functional')).toEqual({
      op: 'hasEffect', effectName: 'vampire_spawn',
    })
  })

  it('HasEffectByID(N) → hasEffectById 节点', () => {
    expect(parseHeroPredicate('HasEffectByID(2474)', 'functional')).toEqual({
      op: 'hasEffectById', effectId: '2474',
    })
    expect(parseHeroPredicate('HasEffectByID(2416)', 'functional')).toEqual({
      op: 'hasEffectById', effectId: '2416',
    })
  })

  it('!HasEffect(`vampire_spawn`) → NOT hasEffect（Kas 样本）', () => {
    expect(parseHeroPredicate('!HasEffect(`vampire_spawn`)', 'functional')).toEqual({
      op: 'not', child: { op: 'hasEffect', effectName: 'vampire_spawn' },
    })
  })

  it('HasEffect(`celeste_heal`)&&hero_id==82 → AND（Knox 样本）', () => {
    expect(parseHeroPredicate('HasEffect(`celeste_heal`)&&hero_id==82', 'functional')).toEqual({
      op: 'and',
      children: [
        { op: 'hasEffect', effectName: 'celeste_heal' },
        { op: 'heroId', heroId: '82', negate: false },
      ],
    })
  })

  it('HasTag(`tanking`) && HasEffectByID(2416) && GetUpgradeUnlocked(17676) → AND 三子句（Cazrin 样本）', () => {
    const ast = parseHeroPredicate('HasTag(`tanking`) && HasEffectByID(2416) && GetUpgradeUnlocked(17676)', 'functional')
    expect(ast).not.toBeNull()
    expect(predicateHasNode(ast, 'hasEffectById')).toBe(true)
    expect(predicateHasNode(ast, 'tag')).toBe(true)
    expect(predicateHasNode(ast, 'upgradeUnlocked')).toBe(true)
  })
})

describe('evalHeroPredicate', () => {
  const hero = createHero({
    heroId: 'carry',
    tags: ['female', 'evil', 'undead'],
    baseAttackDamageTypes: ['magic'],
    baseAttackCooldown: 4.5,
    age: 19,
    abilityScores: { cha: 13, str: 10, dex: 10, con: 10, int: 10, wis: 10 },
  })

  it('tag / not tag / attackType（hero 侧大小写无关：tags 经小写化后匹配）', () => {
    expect(evalHeroPredicate({ op: 'tag', tag: 'evil' }, hero)).toBe(true)
    expect(evalHeroPredicate({ op: 'not', child: { op: 'tag', tag: 'human' } }, hero)).toBe(true)
    expect(evalHeroPredicate({ op: 'not', child: { op: 'tag', tag: 'evil' } }, hero)).toBe(false)
    expect(evalHeroPredicate({ op: 'attackType', attackType: 'magic', negate: false }, hero)).toBe(true)
    expect(evalHeroPredicate({ op: 'attackType', attackType: 'magic', negate: true }, hero)).toBe(false)
  })

  it('stat（total_ability_score 聚合）/ age / heroId / baseAttackCooldown', () => {
    // 13+10*5 = 63
    expect(evalHeroPredicate({ op: 'stat', stat: 'total_ability_score', operator: '<=', value: 90 }, hero)).toBe(true)
    expect(evalHeroPredicate({ op: 'stat', stat: 'total_ability_score', operator: '>=', value: 100 }, hero)).toBe(false)
    expect(evalHeroPredicate({ op: 'stat', stat: 'cha', operator: '>=', value: 11 }, hero)).toBe(true)
    expect(evalHeroPredicate({ op: 'age', operator: '<', value: 19 }, hero)).toBe(false)
    expect(evalHeroPredicate({ op: 'age', operator: '<=', value: 19 }, hero)).toBe(true)
    expect(evalHeroPredicate({ op: 'heroId', heroId: 'carry', negate: true }, hero)).toBe(false)
    expect(evalHeroPredicate({ op: 'heroId', heroId: 'carry', negate: false }, hero)).toBe(true)
    expect(evalHeroPredicate({ op: 'baseAttackCooldown', operator: '<=', value: 4.5 }, hero)).toBe(true)
    expect(evalHeroPredicate({ op: 'baseAttackCooldown', operator: '<', value: 4.5 }, hero)).toBe(false)
  })

  it('属性缺失（age null）→ compareNumber false（不抛错）', () => {
    const noAge = createHero({ age: null, baseAttackCooldown: null })
    expect(evalHeroPredicate({ op: 'age', operator: '<=', value: 20 }, noAge)).toBe(false)
    expect(evalHeroPredicate({ op: 'baseAttackCooldown', operator: '<=', value: 5 }, noAge)).toBe(false)
  })

  it('or / and / true 复合递归', () => {
    expect(evalHeroPredicate({
      op: 'and',
      children: [
        { op: 'tag', tag: 'female' },
        { op: 'stat', stat: 'cha', operator: '>=', value: 11 },
        { op: 'age', operator: '<=', value: 20 },
      ],
    }, hero)).toBe(true)
    expect(evalHeroPredicate({ op: 'or', children: [{ op: 'tag', tag: 'good' }, { op: 'true' }] }, hero)).toBe(true)
    expect(evalHeroPredicate({ op: 'true' }, hero)).toBe(true)
  })

  it('upgradeUnlocked：owner 等级 >= requiredLevel → true；未达/缺省 → false', () => {
    // build 期 enrichment 后的完整节点（ownerHeroId + requiredLevel 已烘进）
    const node = { op: 'upgradeUnlocked' as const, upgradeId: '17492', ownerHeroId: '165', requiredLevel: 70 }
    const ctx = (levels: Record<string, number>) =>
      createHero({ heroId: 'y', ownedSaveContext: { ownedLevels: new Map(Object.entries(levels)), ownedSpecializations: new Map(), equippedFeatIds: new Set(), currentPatronId: null } })
    expect(evalHeroPredicate(node, ctx({ '165': 500 }))).toBe(true)
    expect(evalHeroPredicate(node, ctx({ '165': 50 }))).toBe(false) // 等级不足
    expect(evalHeroPredicate(node, ctx({}))).toBe(false) // owner 未拥有
    expect(evalHeroPredicate(node, hero)).toBe(false) // 无 ownedSaveContext（未导入存档）
    expect(evalHeroPredicate({ op: 'upgradeUnlocked', upgradeId: '9999' }, ctx({ '165': 500 }))).toBe(false) // build 未解析
  })

  it('upgradePurchased：spec 查 owner.specializations；regular 查 owner 等级 >= reqLvl', () => {
    const ctx = (opts: { specs?: Record<string, string[]>; levels?: Record<string, number> }) =>
      createHero({
        heroId: 'y',
        ownedSaveContext: {
          ownedLevels: new Map(Object.entries(opts.levels ?? {})),
          ownedSpecializations: new Map(Object.entries(opts.specs ?? {}).map(([k, v]) => [k, new Set(v)])),
          equippedFeatIds: new Set(),
          currentPatronId: null,
        },
      })
    // spec 节点（19680 崇善之书，owner=119）
    const specNode = { op: 'upgradePurchased' as const, upgradeId: '19680', ownerHeroId: '119', requiredLevel: 120, isSpecialization: true }
    expect(evalHeroPredicate(specNode, ctx({ specs: { '119': ['19680'] } }))).toBe(true)
    expect(evalHeroPredicate(specNode, ctx({ specs: { '119': ['19681'] } }))).toBe(false) // 选了 evil 不是 good
    expect(evalHeroPredicate(specNode, ctx({}))).toBe(false) // owner 无专精记录
    // regular 节点（owner 等级门）
    const regNode = { op: 'upgradePurchased' as const, upgradeId: '9999', ownerHeroId: '165', requiredLevel: 70, isSpecialization: false }
    expect(evalHeroPredicate(regNode, ctx({ levels: { '165': 500 } }))).toBe(true)
    expect(evalHeroPredicate(regNode, ctx({ levels: { '165': 50 } }))).toBe(false)
  })

  it('featEquipped：被评估英雄 equippedFeatIds 命中 → true，未命中/缺省 → false', () => {
    const heroWithFeat = createHero({
      heroId: '119',
      ownedSaveContext: { ownedLevels: new Map(), ownedSpecializations: new Map(), equippedFeatIds: new Set(['2628', '1065']), currentPatronId: null },
    })
    expect(evalHeroPredicate({ op: 'featEquipped', featId: '2628' }, heroWithFeat)).toBe(true)
    expect(evalHeroPredicate({ op: 'featEquipped', featId: '9999' }, heroWithFeat)).toBe(false)
    // 无 ownedSaveContext（未导入存档）→ false，不抛错
    expect(evalHeroPredicate({ op: 'featEquipped', featId: '2628' }, hero)).toBe(false)
  })

  it('is_alive 恒 true（稳态模型不建模战斗死亡）；!is_alive 恒 false', () => {
    expect(evalHeroPredicate({ op: 'isAlive' }, hero)).toBe(true)
    expect(evalHeroPredicate({ op: 'not', child: { op: 'isAlive' } }, hero)).toBe(false)
    // hero 119 样本：!is_alive || is_undead || HasTag(undead) → false || ... || ...（稳态化简）
    const undeadHero = createHero({ tags: ['undead'] })
    expect(evalHeroPredicate({ op: 'or', children: [
      { op: 'not', child: { op: 'isAlive' } },
      { op: 'tag', tag: 'undead' },
    ] }, undeadHero)).toBe(true)
  })

  it('eligibleForPatron：currentPatronId 在 eligiblePatronIds → true；自由玩(0)→全 true；未导入→false', () => {
    const ctx = (currentPatronId: number | null, eligiblePatronIds: string[] | null) =>
      createHero({
        heroId: '150',
        ...(eligiblePatronIds ? { eligiblePatronIds } : {}),
        ownedSaveContext: { ownedLevels: new Map(), ownedSpecializations: new Map(), equippedFeatIds: new Set(), currentPatronId },
      })
    expect(evalHeroPredicate({ op: 'eligibleForPatron' }, ctx(3, ['1', '3', '4', '5']))).toBe(true) // 当前 patron 3 eligible
    expect(evalHeroPredicate({ op: 'eligibleForPatron' }, ctx(2, ['1', '3', '4', '5']))).toBe(false) // patron 2 不在列表
    expect(evalHeroPredicate({ op: 'eligibleForPatron' }, ctx(0, ['1', '3']))).toBe(true) // 自由玩全 eligible
    expect(evalHeroPredicate({ op: 'eligibleForPatron' }, ctx(null, ['1', '3']))).toBe(false) // 未导入存档
    expect(evalHeroPredicate({ op: 'eligibleForPatron' }, ctx(3, null))).toBe(false) // 无 eligiblePatronIds 数据
  })

  it('hasEffect / hasEffectById：activeEffectKeys 命中 → true；缺省 → false（保守）', () => {
    const activeKeys = new Set(['celeste_heal', '#2474'])
    expect(evalHeroPredicate({ op: 'hasEffect', effectName: 'celeste_heal' }, hero, activeKeys)).toBe(true)
    expect(evalHeroPredicate({ op: 'hasEffect', effectName: 'vampire_spawn' }, hero, activeKeys)).toBe(false)
    expect(evalHeroPredicate({ op: 'hasEffectById', effectId: '2474' }, hero, activeKeys)).toBe(true)
    expect(evalHeroPredicate({ op: 'hasEffectById', effectId: '2416' }, hero, activeKeys)).toBe(false)
    // 无 activeEffectKeys（未传入）→ 保守 false
    expect(evalHeroPredicate({ op: 'hasEffect', effectName: 'celeste_heal' }, hero)).toBe(false)
    expect(evalHeroPredicate({ op: 'hasEffectById', effectId: '2474' }, hero)).toBe(false)
  })
})

describe('predicateHasNode', () => {
  it('顶层 op 匹配', () => {
    expect(predicateHasNode({ op: 'tag', tag: 'x' }, 'tag')).toBe(true)
    expect(predicateHasNode({ op: 'tag', tag: 'x' }, 'stat')).toBe(false)
  })

  it('or / and 子节点递归', () => {
    const ast: HeroPredicateAST = {
      op: 'and',
      children: [
        { op: 'or', children: [{ op: 'tag', tag: 'a' }, { op: 'stat', stat: 'cha', operator: '>=', value: 11 }] },
        { op: 'tag', tag: 'b' },
      ],
    }
    expect(predicateHasNode(ast, 'stat')).toBe(true)
    expect(predicateHasNode(ast, 'age')).toBe(false)
  })

  it('not child 递归 + null 安全', () => {
    expect(predicateHasNode({ op: 'not', child: { op: 'age', operator: '<=', value: 20 } }, 'age')).toBe(true)
    expect(predicateHasNode(null, 'tag')).toBe(false)
    expect(predicateHasNode(undefined, 'tag')).toBe(false)
  })
})
