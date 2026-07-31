import { describe, expect, it } from 'vitest'
import { parseHeroPredicate } from '../../abilities/heroPredicate'
import { STACK_COUNT_RESOLVERS } from './stackCountResolver'
import { buildInput, buildSignal, createHero } from './mechanicTestFixtures'

describe('STACK_COUNT_RESOLVERS', () => {
  it('keys 覆盖全部支持的 stackFunc（与 scoringSupportSync 守护一致）', () => {
    expect(Object.keys(STACK_COUNT_RESOLVERS).sort()).toEqual([
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
    const femalePredicate = parseHeroPredicate('female', 'shorthand')!
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
    expect(STACK_COUNT_RESOLVERS.per_crusader!.count(input, signal)).toBe(2)
  })

  it('excludeSelf 排除 support 自身', () => {
    const femalePredicate = parseHeroPredicate('female', 'shorthand')!
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
    expect(STACK_COUNT_RESOLVERS.per_crusader!.count(input, signal)).toBe(1)
  })

  it('缺 placements/heroesById → null（需上下文，消费侧降级 warning）', () => {
    const input = buildInput({ carryHero: createHero('carry'), supportHero: createHero('support') })
    const signal = buildSignal({
      value: 100,
      stackFunc: 'per_crusader',
      formationCountQualifier: { predicate: parseHeroPredicate('female', 'shorthand')! },
    })
    expect(STACK_COUNT_RESOLVERS.per_crusader!.count(input, signal)).toBeNull()
  })
})
