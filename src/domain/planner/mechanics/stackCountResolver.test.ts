import { describe, expect, it } from 'vitest'
import { parseHeroPredicate } from '../../abilities/heroPredicate'
import { unwrap } from '../../../../tests/utils/dom-assertions'
import { STACK_COUNT_RESOLVERS } from './stackCountResolver'
import { buildInput, buildSignal, createHero } from './mechanicTestFixtures'

describe('STACK_COUNT_RESOLVERS', () => {
  it('keys 覆盖全部支持的 stackFunc（与 scoringSupportSync 守护一致）', () => {
    expect(Object.keys(STACK_COUNT_RESOLVERS).sort((a, b) => a.localeCompare(b))).toEqual([
      'per_col_behind',
      'per_crusader',
      'per_hero',
      'per_hero_attribute',
      'per_slot_distance_from_source',
      'per_tagged_crusader_mult',
      'per_target_crusader',
      'per_upgrade_targets',
    ])
  })

  it('per_crusader 计数匹配 formationCountQualifier 的英雄', () => {
    const femalePredicate = unwrap(parseHeroPredicate('female', 'shorthand'), 'failed to parse female predicate')
    const support = createHero('support', { tags: ['female'] })
    const other = createHero('other', { tags: ['female'] })
    const nonFemale = createHero('nofemale')
    const input = buildInput({
      carryHero: createHero('carry'),
      supportHero: support,
      placements: { s1: 'support', s2: 'nofemale', s3: 'other' },
      heroesById: new Map([
        ['carry', createHero('carry')],
        ['support', support],
        ['nofemale', nonFemale],
        ['other', other],
      ]),
    })
    const signal = buildSignal({ value: 100, stackFunc: 'per_crusader', formationCountQualifier: { predicate: femalePredicate } })
    const resolver = unwrap(STACK_COUNT_RESOLVERS.per_crusader, 'missing per_crusader resolver')
    expect(resolver.count(input, signal)).toBe(2)
  })

  it('excludeSelf 排除 support 自身', () => {
    const femalePredicate = unwrap(parseHeroPredicate('female', 'shorthand'), 'failed to parse female predicate')
    const support = createHero('support', { tags: ['female'] })
    const other = createHero('other', { tags: ['female'] })
    const input = buildInput({
      carryHero: createHero('carry'),
      supportHero: support,
      placements: { s1: 'support', s3: 'other' },
      heroesById: new Map([
        ['carry', createHero('carry')],
        ['support', support],
        ['other', other],
      ]),
    })
    const signal = buildSignal({
      value: 100,
      stackFunc: 'per_crusader',
      formationCountQualifier: { predicate: femalePredicate },
      excludeSelf: true,
    })
    const resolver = unwrap(STACK_COUNT_RESOLVERS.per_crusader, 'missing per_crusader resolver')
    expect(resolver.count(input, signal)).toBe(1)
  })

  it('缺 placements/heroesById → null（需上下文，消费侧降级 warning）', () => {
    const input = buildInput({ carryHero: createHero('carry'), supportHero: createHero('support') })
    const signal = buildSignal({
      value: 100,
      stackFunc: 'per_crusader',
      formationCountQualifier: { predicate: unwrap(parseHeroPredicate('female', 'shorthand'), 'failed to parse female predicate') },
    })
    const resolver = unwrap(STACK_COUNT_RESOLVERS.per_crusader, 'missing per_crusader resolver')
    expect(resolver.count(input, signal)).toBeNull()
  })

  it('per_upgrade_targets 传入 activeEffectKeys（HasEffect 谓词匹配生效）', () => {
    const hasEffectPredicate = unwrap(parseHeroPredicate('HasEffect(`buff_xy`)', 'functional'), 'failed to parse HasEffect')
    const withEffect = createHero('with-effect')
    const withoutEffect = createHero('no-effect')
    const input = buildInput({
      carryHero: createHero('carry'),
      supportHero: createHero('support'),
      placements: { s1: 'with-effect', s2: 'no-effect' },
      heroesById: new Map([
        ['carry', createHero('carry')],
        ['support', createHero('support')],
        ['with-effect', withEffect],
        ['no-effect', withoutEffect],
      ]),
      activeEffectKeysByHero: new Map([
        ['with-effect', new Set(['buff_xy'])],
      ]),
    })
    const signal = buildSignal({
      value: 100,
      stackFunc: 'per_upgrade_targets',
      targetQualifier: { predicate: hasEffectPredicate },
    })
    const resolver = unwrap(STACK_COUNT_RESOLVERS.per_upgrade_targets, 'missing per_upgrade_targets resolver')
    expect(resolver.count(input, signal)).toBe(1)
  })
})
