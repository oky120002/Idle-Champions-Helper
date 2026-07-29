import { describe, expect, it } from 'vitest'
import { buildFeatCatalog, normalizeFeatEntry } from './feat-catalog'

describe('normalizeFeatEntry', () => {
  it('hero_dps feat → damage dimension', () => {
    const e = normalizeFeatEntry({ id: 35, hero_id: 7, rarity: 2, effects: [{ effect_string: 'hero_dps_multiplier_mult,30' }] })
    expect(e).toEqual({
      id: '35',
      rarity: 2,
      signals: [{ dimension: 'damage', signal: expect.objectContaining({ kind: 'heroDpsMultiplier', value: 30 }) }],
    })
  })

  it('global_dps feat → damage dimension', () => {
    const e = normalizeFeatEntry({ id: 38, hero_id: 7, rarity: 2, effects: [{ effect_string: 'global_dps_multiplier_mult,10' }] })
    expect(e?.signals[0]?.dimension).toBe('damage')
    expect(e?.signals[0]?.signal.kind).toBe('globalDpsMultiplier')
  })

  it('gold feat → gold dimension', () => {
    const e = normalizeFeatEntry({ id: 1, hero_id: 4, rarity: 3, effects: [{ effect_string: 'gold_multiplier_mult,25' }] })
    expect(e?.signals[0]?.dimension).toBe('gold')
  })

  it('reduce_attack_cooldown feat → speed dimension', () => {
    const e = normalizeFeatEntry({ id: 1, hero_id: 19, rarity: 3, effects: [{ effect_string: 'reduce_attack_cooldown,0.5' }] })
    expect(e?.signals[0]?.dimension).toBe('speed')
  })

  it('非 scoring dimension（increase_ability_score）→ 跳过；无 scoring signal → null', () => {
    expect(normalizeFeatEntry({ id: 270, hero_id: 7, rarity: 4, effects: [{ effect_string: 'increase_ability_score,cha,2' }] })).toBeNull()
  })

  it('多 effect feat（多 signal）', () => {
    const e = normalizeFeatEntry({
      id: 1714, hero_id: 7, rarity: 4,
      effects: [{ effect_string: 'global_dps_multiplier_mult,25' }, { effect_string: 'add_global_ceremorphosis_stacks,1' }],
    })
    // add_global_ceremorphosis_stacks 非 scoring dimension → 只 global_dps 进
    expect(e?.signals).toHaveLength(1)
    expect(e?.signals[0]?.dimension).toBe('damage')
  })

  it('无 id 或无 effects → null', () => {
    expect(normalizeFeatEntry({ effects: [] })).toBeNull()
    expect(normalizeFeatEntry({ id: 1 })).toBeNull()
  })
})

describe('buildFeatCatalog', () => {
  it('按 heroId 索引，过滤 null', () => {
    const catalog = buildFeatCatalog([
      { id: 35, hero_id: 7, rarity: 2, effects: [{ effect_string: 'hero_dps_multiplier_mult,30' }] },
      { id: 270, hero_id: 7, rarity: 4, effects: [{ effect_string: 'increase_ability_score,cha,2' }] }, // null
      { id: 1, hero_id: 4, rarity: 3, effects: [{ effect_string: 'gold_multiplier_mult,25' }] },
    ])
    expect(Object.keys(catalog).sort()).toEqual(['4', '7'])
    expect(catalog['7']).toHaveLength(1) // 270 过滤
    expect(catalog['7']?.[0]?.id).toBe('35')
  })
})
