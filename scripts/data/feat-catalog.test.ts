import { describe, expect, it } from 'vitest'
import { buildFeatCatalog, normalizeFeatEntry } from './feat-catalog'

describe('normalizeFeatEntry', () => {
  it('hero_dps feat → damage dimension', () => {
    const e = normalizeFeatEntry({ id: 35, hero_id: 7, rarity: 2, effects: [{ effect_string: 'hero_dps_multiplier_mult,30' }] })
    expect(e?.id).toBe('35')
    expect(e?.rarity).toBe(2)
    expect(e?.signals[0]?.dimension).toBe('damage')
    expect(e?.signals[0]?.signal).toMatchObject({ kind: 'heroDpsMultiplier', value: 30 })
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

  it('buff_upgrade wrapper（放大英雄 upgrade）→ buffWrappers 收集，不进 direct signals', () => {
    const e = normalizeFeatEntry({
      id: 100, hero_id: 7, rarity: 3,
      effects: [{ effect_string: 'buff_upgrade,40,1234' }],
    })
    expect(e?.signals).toEqual([])
    expect(e?.buffWrappers).toEqual([
      { targetUpgradeId: '1234', value: 40, rawEffect: 'buff_upgrade,40,1234' },
    ])
  })

  it('buff_upgrades 多 target → 每 target 一个 wrapper', () => {
    const e = normalizeFeatEntry({
      id: 101, hero_id: 7, rarity: 3,
      effects: [{ effect_string: 'buff_upgrades,25,111,112' }],
    })
    expect(e?.buffWrappers.map((w) => w.targetUpgradeId).sort((a, b) => a.localeCompare(b))).toEqual(['111', '112'])
    expect(e?.buffWrappers.every((w) => w.value === 25)).toBe(true)
  })

  it('仅 buff_upgrade（无 direct scoring signal）→ 保留（buffWrappers 非空不 null）', () => {
    const e = normalizeFeatEntry({
      id: 102, hero_id: 7, rarity: 3,
      effects: [{ effect_string: 'buff_upgrade,30,9999' }],
    })
    expect(e).not.toBeNull()
    expect(e?.signals).toEqual([])
    expect(e?.buffWrappers).toHaveLength(1)
  })
})

describe('buildFeatCatalog', () => {
  it('按 heroId 索引，过滤 null', () => {
    const catalog = buildFeatCatalog([
      { id: 35, hero_id: 7, rarity: 2, effects: [{ effect_string: 'hero_dps_multiplier_mult,30' }] },
      { id: 270, hero_id: 7, rarity: 4, effects: [{ effect_string: 'increase_ability_score,cha,2' }] }, // null
      { id: 1, hero_id: 4, rarity: 3, effects: [{ effect_string: 'gold_multiplier_mult,25' }] },
    ])
    expect(Object.keys(catalog).sort((a, b) => a.localeCompare(b))).toEqual(['4', '7'])
    expect(catalog['7']).toHaveLength(1) // 270 过滤
    expect(catalog['7']?.[0]?.id).toBe('35')
  })
})
