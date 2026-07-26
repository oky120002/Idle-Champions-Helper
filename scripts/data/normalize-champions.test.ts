import { describe, expect, it } from 'vitest'

import { normalizeChampionAbility } from './normalize-champions'

// ability_defines（ult/主动技能）提取 + uptime 折算。
// ability_defines 的 id === hero_id 对齐；effect 三形态（裸 string / JSON 串 / effect_def,N 引用）。
// uptime = duration/baseCooldown（modron 满级 steady-state），value × uptime 预折算进 effect_string。

describe('normalizeChampionAbility', () => {
  it('裸 string effect 按 uptime 折算 value（Wild Shape）', () => {
    const ability = normalizeChampionAbility(
      { id: 10, duration: 30, base_cooldown: 3600, effect: 'hero_dps_multiplier_mult,1' },
      new Map(),
    )
    expect(ability).not.toBeNull()
    expect(ability!.id).toBe('10')
    expect(ability!.duration).toBe(30)
    expect(ability!.baseCooldown).toBe(3600)
    expect(ability!.effects).toHaveLength(1)
    expect(ability!.effects[0]!.startsWith('hero_dps_multiplier_mult,')).toBe(true)
    // value 1 × (30/3600) ≈ 0.00833
    expect(Number(ability!.effects[0]!.split(',')[1])).toBeCloseTo(1 * (30 / 3600), 6)
  })

  it('JSON 串 effect parse effect_string 后折算（Pact Weapon）', () => {
    const ability = normalizeChampionAbility(
      {
        id: 9,
        duration: 30,
        base_cooldown: 3600,
        effect: '{"effect_string":"hero_dps_multiplier_mult,100","visual_effect":"red_sparks"}',
      },
      new Map(),
    )
    expect(ability!.effects).toHaveLength(1)
    expect(ability!.effects[0]!.startsWith('hero_dps_multiplier_mult,')).toBe(true)
    // value 100 × (30/3600) ≈ 0.833
    expect(Number(ability!.effects[0]!.split(',')[1])).toBeCloseTo(100 * (30 / 3600), 6)
  })

  it('effect_def,N 引用展开 effect_defines[N].effect_keys（Commander 全队 DPS）', () => {
    const effectDefinitionsById = new Map([
      ['28', {
        id: 28,
        effect_keys: [
          { effect_string: 'global_dps_multiplier_mult,100', targets: ['self'] },
          { effect_string: 'do_nothing', targets: ['other'] },
        ],
      }],
    ])
    const ability = normalizeChampionAbility(
      { id: 1, duration: 30, base_cooldown: 3600, effect: 'effect_def,28' },
      effectDefinitionsById,
    )
    // global_dps 100 × 1/120 ≈ 0.833；do_nothing 无 value 段，原样返回。
    expect(ability!.effects).toHaveLength(2)
    const dps = ability!.effects.find((s) => s.startsWith('global_dps_multiplier_mult,'))!
    expect(Number(dps.split(',')[1])).toBeCloseTo(100 * (30 / 3600), 6)
    expect(ability!.effects).toContain('do_nothing')
  })

  it('uptime=0（duration=0）→ value 折算为 0（非 DPS ult 本不收，DPS ult 无 modron 保守不计）', () => {
    const ability = normalizeChampionAbility(
      { id: 3, duration: 0, base_cooldown: 7200, effect: 'hero_dps_multiplier_mult,100' },
      new Map(),
    )
    expect(ability!.effects).toEqual(['hero_dps_multiplier_mult,0'])
  })

  it('无 ability → null', () => {
    expect(normalizeChampionAbility(undefined, new Map())).toBeNull()
  })
})
