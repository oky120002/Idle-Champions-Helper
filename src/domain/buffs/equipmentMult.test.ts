import { describe, expect, it } from 'vitest'

import { unwrap } from '../../../tests/utils/dom-assertions'

import {
  collectEquipmentBuffsByHero,
  computeEquipmentAdjustmentByHero,
  computeEquipmentCritByHero,
  computeEquipmentGlobalDpsByHero,
  computeEquipmentGoldByHero,
  computeEquipmentHealthByHero,
  computeEquipmentMult,
  parseBuffUpgradeEffect,
  parseLootEffect,
  synthesizeHypotheticalLootByHero,
} from './equipmentMult'
import type { LootCatalogEntry } from './equipmentMult'

const cat = (heroId: string, slotId: string, rarity: string, effect: string): LootCatalogEntry =>
  ({ heroId, slotId, rarity, effectString: effect })

// 明斯克(hero 7) slot1/2 hero_dps 装备（真实 loot_defines 数据，rarity 1-4 base 50/125/200/350）
const MINSC_CATALOG: LootCatalogEntry[] = [
  cat('7', '1', '1', 'hero_dps_multiplier_mult,50'),
  cat('7', '1', '2', 'hero_dps_multiplier_mult,125'),
  cat('7', '1', '3', 'hero_dps_multiplier_mult,200'),
  cat('7', '1', '4', 'hero_dps_multiplier_mult,350'),
  cat('7', '2', '4', 'hero_dps_multiplier_mult,350'),
]

describe('parseLootEffect', () => {
  it('hero_dps_multiplier_mult → {kind, value}', () => {
    expect(parseLootEffect('hero_dps_multiplier_mult,350')).toEqual({ kind: 'hero_dps_multiplier_mult', value: 350 })
  })
  it('global_dps_multiplier_mult → {kind, value}', () => {
    expect(parseLootEffect('global_dps_multiplier_mult,230')).toEqual({ kind: 'global_dps_multiplier_mult', value: 230 })
  })
  it('health_mult → {kind, value}', () => {
    expect(parseLootEffect('health_mult,100')).toEqual({ kind: 'health_mult', value: 100 })
  })
  it('非单参数 effect（buff_upgrade 元加成）→ null', () => {
    expect(parseLootEffect('buff_upgrade,275,2192')).toBeNull()
  })
  it('未接入 effect（reduce_ultimate_cooldown 冷却）→ null', () => {
    expect(parseLootEffect('reduce_ultimate_cooldown,45')).toBeNull()
  })
})

describe('computeEquipmentMult', () => {
  // enchant 缩放：final% = base% × (1 + enchant/250)。
  // 1/250 反推自明斯克 4 装备实测（slot1/2/3/5 base×(1+enchant/250) 精确匹配 1378/1343/1032/1224）。
  it('slot1 r4 base350 enchant734 → +1378%（与游戏实测一致）', () => {
    // 350 × (1 + 734/250) = 350 × 3.936 = 1377.6
    const mult = computeEquipmentMult('7', { '1': { rarity: 4, enchant: 734 } }, MINSC_CATALOG)
    expect(mult).toBeCloseTo(1 + 1377.6 / 100, 1)
  })

  it('明斯克 slot1+2 r4 enchant734/709 → ×28.2（base attack 装备加成，10^1.45）', () => {
    const mult = computeEquipmentMult(
      '7',
      { '1': { rarity: 4, enchant: 734 }, '2': { rarity: 4, enchant: 709 } },
      MINSC_CATALOG,
    )
    // 1377.6 + 1342.6 = 2720.2 → 1 + 27.20 = 28.20
    expect(mult).toBeCloseTo(1 + (1377.6 + 1342.6) / 100, 1)
  })

  it('enchant=0 → base 无缩放（r4 base350 → ×4.5）', () => {
    const mult = computeEquipmentMult('7', { '1': { rarity: 4, enchant: 0 } }, MINSC_CATALOG)
    expect(mult).toBeCloseTo(1 + 350 / 100, 5)
  })

  it('enchant 缩放单调递增（高 ilvl > 低 ilvl）', () => {
    const low = computeEquipmentMult('7', { '1': { rarity: 4, enchant: 100 } }, MINSC_CATALOG)
    const high = computeEquipmentMult('7', { '1': { rarity: 4, enchant: 700 } }, MINSC_CATALOG)
    expect(high).toBeGreaterThan(low)
  })

  it('无 owned loot → 1（无装备加成，向后兼容未导入存档）', () => {
    expect(computeEquipmentMult('7', {}, MINSC_CATALOG)).toBe(1)
    expect(computeEquipmentMult('7', null, MINSC_CATALOG)).toBe(1)
  })

  it('owned 缺 enchant 字段（旧数据）→ 按 enchant=0 处理（base，向后兼容）', () => {
    const mult = computeEquipmentMult('7', { '1': { rarity: 4 } }, MINSC_CATALOG)
    expect(mult).toBeCloseTo(1 + 350 / 100, 5)
  })

  it('owned rarity 缺失（catalog 无该 rarity）→ 该槽不计', () => {
    const mult = computeEquipmentMult('7', { '1': { rarity: 9, enchant: 100 } }, MINSC_CATALOG)
    expect(mult).toBe(1)
  })

  it('只计 hero_dps，global_dps 装备不计入 per-carry adjustment', () => {
    // hero 1 slot1 是 global_dps（非 hero_dps），对 per-carry hero_dps adjustment 贡献 0
    const catalog = [cat('1', '1', '1', 'global_dps_multiplier_mult,230')]
    expect(computeEquipmentMult('1', { '1': { rarity: 1 } }, catalog)).toBe(1)
  })
})

describe('computeEquipmentGlobalDpsByHero', () => {
  it('per-hero global_dps addPercent（enchant=0 取 base；非全队求和，scoreFormation 按 placed 求和）', () => {
    const catalog = [
      cat('1', '1', '1', 'global_dps_multiplier_mult,10'),
      cat('2', '1', '1', 'global_dps_multiplier_mult,50'),
    ]
    const heroes = [
      { heroId: '1', lootBySlot: { '1': { rarity: 1 } } },
      { heroId: '2', lootBySlot: { '1': { rarity: 1 } } },
    ]
    const map = computeEquipmentGlobalDpsByHero(heroes, catalog)
    expect(map.get('1')).toBe(10) // addPercent（非 multiplier）
    expect(map.get('2')).toBe(50)
  })

  it('enchant 缩放（base × (1+enchant/250)，hero 1 slot1 r4 base230 enchant750 → 920）', () => {
    const catalog = [cat('1', '1', '4', 'global_dps_multiplier_mult,230')]
    const heroes = [{ heroId: '1', lootBySlot: { '1': { rarity: 4, enchant: 750 } } }]
    expect(computeEquipmentGlobalDpsByHero(heroes, catalog).get('1')).toBeCloseTo(920, 1)
  })

  it('只计 global_dps，hero_dps 装备不计入（明斯克 slot1 是 hero_dps）', () => {
    const heroes = [{ heroId: '7', lootBySlot: { '1': { rarity: 4, enchant: 734 } } }]
    expect(computeEquipmentGlobalDpsByHero(heroes, MINSC_CATALOG).has('7')).toBe(false)
  })

  it('无 global_dps 装备 → 空 map', () => {
    expect(computeEquipmentGlobalDpsByHero([], MINSC_CATALOG).size).toBe(0)
    expect(computeEquipmentGlobalDpsByHero([{ heroId: '7', lootBySlot: {} }], MINSC_CATALOG).size).toBe(0)
  })
})

describe('computeEquipmentGoldByHero', () => {
  it('per-hero gold addPercent（gold_multiplier_mult，enchant=0 取 base）', () => {
    const catalog = [cat('goldhero', '1', '4', 'gold_multiplier_mult,100')]
    const heroes = [{ heroId: 'goldhero', lootBySlot: { '1': { rarity: 4 } } }]
    expect(computeEquipmentGoldByHero(heroes, catalog).get('goldhero')).toBe(100)
  })

  it('enchant 缩放（base × (1+enchant/250)，base100 enchant250 → 200）', () => {
    const catalog = [cat('goldhero', '1', '4', 'gold_multiplier_mult,100')]
    const heroes = [{ heroId: 'goldhero', lootBySlot: { '1': { rarity: 4, enchant: 250 } } }]
    expect(computeEquipmentGoldByHero(heroes, catalog).get('goldhero')).toBeCloseTo(200, 1)
  })

  it('只计 gold，hero_dps/global_dps 装备不计入（明斯克 slot1 是 hero_dps）', () => {
    const heroes = [{ heroId: '7', lootBySlot: { '1': { rarity: 4, enchant: 734 } } }]
    expect(computeEquipmentGoldByHero(heroes, MINSC_CATALOG).has('7')).toBe(false)
  })
})

describe('computeEquipmentCritByHero', () => {
  it('per-hero crit mult（hero 25 slot3 chance 275 + slot4 damage 150，enchant=0 取 base）', () => {
    const catalog = [
      cat('25', '3', '4', 'buff_base_crit_chance_mult,275'),
      cat('25', '4', '4', 'buff_base_crit_damage_mult,150'),
    ]
    const heroes = [{ heroId: '25', lootBySlot: { '3': { rarity: 4 }, '4': { rarity: 4 } } }]
    const bonus = unwrap(computeEquipmentCritByHero(heroes, catalog).get('25'), 'hero 25 crit bonus missing')
    // chance: 1 + 275/100 = 3.75；damage: 1 + 150/100 = 2.5
    expect(bonus.chanceMult).toBeCloseTo(3.75, 5)
    expect(bonus.damageMult).toBeCloseTo(2.5, 5)
  })

  it('enchant 缩放（base × (1+enchant/250)，chance base275 enchant250 → value550 → mult6.5）', () => {
    const catalog = [cat('25', '3', '4', 'buff_base_crit_chance_mult,275')]
    const heroes = [{ heroId: '25', lootBySlot: { '3': { rarity: 4, enchant: 250 } } }]
    expect(unwrap(computeEquipmentCritByHero(heroes, catalog).get('25'), 'hero 25 missing').chanceMult).toBeCloseTo(6.5, 5)
  })

  it('只 chance 无 damage → damageMult=1（反之亦然）', () => {
    const catalog = [cat('25', '3', '4', 'buff_base_crit_chance_mult,275')]
    const heroes = [{ heroId: '25', lootBySlot: { '3': { rarity: 4 } } }]
    const bonus = unwrap(computeEquipmentCritByHero(heroes, catalog).get('25'), 'hero 25 crit bonus missing')
    expect(bonus.chanceMult).toBeCloseTo(3.75, 5)
    expect(bonus.damageMult).toBe(1)
  })

  it('无 crit 装备 → 空 map', () => {
    expect(computeEquipmentCritByHero([{ heroId: '7', lootBySlot: { '1': { rarity: 4, enchant: 734 } } }], MINSC_CATALOG).has('7')).toBe(false)
    expect(computeEquipmentCritByHero([], MINSC_CATALOG).size).toBe(0)
  })
})

describe('computeEquipmentHealthByHero', () => {
  it('per-hero health（hero 3 slot2 r4=100、hero 10 slot1 r4=100，enchant=0 取 base）', () => {
    const catalog = [
      cat('3', '2', '4', 'health_mult,100'),
      cat('10', '1', '4', 'health_mult,100'),
    ]
    const heroes = [
      { heroId: '3', lootBySlot: { '2': { rarity: 4 } } },
      { heroId: '10', lootBySlot: { '1': { rarity: 4 } } },
    ]
    const map = computeEquipmentHealthByHero(heroes, catalog)
    // health_mult,100 → +100% → multiplier 1 + 100/100 = 2
    expect(map.get('3')).toBeCloseTo(2, 5)
    expect(map.get('10')).toBeCloseTo(2, 5)
  })

  it('enchant 缩放同 hero_dps（base × (1+enchant/250)，hero 3 slot2 r4=100 enchant750 → ×5）', () => {
    // 100 × (1 + 750/250) = 100 × 4 = 400% → 1 + 4 = 5.0
    const catalog = [cat('3', '2', '4', 'health_mult,100')]
    const heroes = [{ heroId: '3', lootBySlot: { '2': { rarity: 4, enchant: 750 } } }]
    expect(computeEquipmentHealthByHero(heroes, catalog).get('3')).toBeCloseTo(5.0, 1)
  })

  it('只计 health_mult，hero_dps/global_dps 装备不计入（明斯克 slot1 是 hero_dps）', () => {
    const heroes = [{ heroId: '7', lootBySlot: { '1': { rarity: 4, enchant: 734 } } }]
    expect(computeEquipmentHealthByHero(heroes, MINSC_CATALOG).has('7')).toBe(false)
  })

  it('无 health 装备 → 空 map（不进 map，scoreFormation 缺省 ?? 1）', () => {
    expect(computeEquipmentHealthByHero([], MINSC_CATALOG).size).toBe(0)
    expect(computeEquipmentHealthByHero([{ heroId: '7', lootBySlot: {} }], MINSC_CATALOG).size).toBe(0)
  })
})

describe('computeEquipmentAdjustmentByHero', () => {
  it('遍历 ownedHeroes 算 per-hero mult；无加成（mult=1）不进 map（省载荷，scoreFormation 缺省 ?? 1）', () => {
    const heroes = [
      {
        heroId: '7',
        lootBySlot: { '1': { rarity: 4, enchant: 734 }, '2': { rarity: 4, enchant: 709 } },
      },
      { heroId: '8', lootBySlot: {} },
    ]
    const map = computeEquipmentAdjustmentByHero(heroes, MINSC_CATALOG)
    expect(map.get('7')).toBeCloseTo(1 + (1377.6 + 1342.6) / 100, 1)
    expect(map.has('8')).toBe(false)
  })

  it('空 ownedHeroes → 空 map', () => {
    expect(computeEquipmentAdjustmentByHero([], MINSC_CATALOG).size).toBe(0)
  })
})

describe('parseBuffUpgradeEffect', () => {
  it('buff_upgrade 单 target → {value, targetUpgradeIds:[uid]}', () => {
    expect(parseBuffUpgradeEffect('buff_upgrade,275,2192')).toEqual({ value: 275, targetUpgradeIds: ['2192'] })
  })

  it('buff_upgrades 多 target → 每个 uid 一项', () => {
    expect(parseBuffUpgradeEffect('buff_upgrades,87.5,9761,9762')).toEqual({
      value: 87.5,
      targetUpgradeIds: ['9761', '9762'],
    })
  })

  it('4 参变体 buff_upgrade,10,13416,0 → 取 args[1]，第4参忽略（与 build extractTargetIds 一致）', () => {
    expect(parseBuffUpgradeEffect('buff_upgrade,10,13416,0')).toEqual({
      value: 10,
      targetUpgradeIds: ['13416'],
    })
  })

  it('非 buff_upgrade effect（加性 hero_dps）→ null', () => {
    expect(parseBuffUpgradeEffect('hero_dps_multiplier_mult,350')).toBeNull()
  })

  it('复杂 buff_upgrade 变体（per_tagged，依赖 build 期 stack 元数据）→ null（runtime 不构造）', () => {
    expect(parseBuffUpgradeEffect('buff_upgrade_per_any_tagged_crusader_mult,200,12345,evil')).toBeNull()
  })

  it('reduce_ultimate_cooldown（非 DPS）→ null', () => {
    expect(parseBuffUpgradeEffect('reduce_ultimate_cooldown,45')).toBeNull()
  })
})

describe('collectEquipmentBuffsByHero', () => {
  it('owned buff_upgrade 装备 → per-hero EquipmentBuff（enchant=0 取 base）', () => {
    const catalog = [cat('1', '3', '1', 'buff_upgrade,25,4'), cat('1', '3', '4', 'buff_upgrade,275,4')]
    const map = collectEquipmentBuffsByHero(
      [{ heroId: '1', lootBySlot: { '3': { rarity: 4, enchant: 0 } } }],
      catalog,
    )
    expect(map.get('1')).toEqual([
      { targetUpgradeId: '4', value: 275, rawEffect: 'buff_upgrade,275,4' },
    ])
  })

  it('enchant 缩放：base 275 enchant 250 → 275×2=550', () => {
    const catalog = [cat('1', '3', '4', 'buff_upgrade,275,4')]
    const map = collectEquipmentBuffsByHero(
      [{ heroId: '1', lootBySlot: { '3': { rarity: 4, enchant: 250 } } }],
      catalog,
    )
    expect(map.get('1')?.[0]?.value).toBe(550)
  })

  it('buff_upgrades 多 target → 每 target 一个 EquipmentBuff（同 value/rawEffect）', () => {
    const catalog = [cat('1', '1', '1', 'buff_upgrades,87.5,9761,9762')]
    const map = collectEquipmentBuffsByHero(
      [{ heroId: '1', lootBySlot: { '1': { rarity: 1 } } }],
      catalog,
    )
    expect(map.get('1')).toEqual([
      { targetUpgradeId: '9761', value: 87.5, rawEffect: 'buff_upgrades,87.5,9761,9762' },
      { targetUpgradeId: '9762', value: 87.5, rawEffect: 'buff_upgrades,87.5,9761,9762' },
    ])
  })

  it('加性装备（hero_dps）不计入 buff_upgrade 收集', () => {
    const catalog = [cat('1', '1', '1', 'hero_dps_multiplier_mult,100')]
    const map = collectEquipmentBuffsByHero(
      [{ heroId: '1', lootBySlot: { '1': { rarity: 1 } } }],
      catalog,
    )
    expect(map.has('1')).toBe(false)
  })

  it('无 owned loot → 空 map（向后兼容）', () => {
    const catalog = [cat('1', '3', '4', 'buff_upgrade,275,4')]
    expect(collectEquipmentBuffsByHero([{ heroId: '1', lootBySlot: {} }], catalog).has('1')).toBe(false)
    expect(collectEquipmentBuffsByHero([], catalog).size).toBe(0)
  })
})

describe('synthesizeHypotheticalLootByHero', () => {
  const catalog: LootCatalogEntry[] = [
    { heroId: '1', slotId: '1', rarity: '1', effectString: 'hero_dps_multiplier_mult,10' },
    { heroId: '1', slotId: '1', rarity: '4', effectString: 'hero_dps_multiplier_mult,40' },
    { heroId: '1', slotId: '2', rarity: '4', effectString: 'hero_dps_multiplier_mult,20' },
    { heroId: '2', slotId: '1', rarity: '4', effectString: 'hero_dps_multiplier_mult,15' },
  ]

  it('每英雄每 slot（catalog 推断）统一 {rarity, enchant}；catalog 无该英雄 → 不产出', () => {
    const result = synthesizeHypotheticalLootByHero(
      { heroIds: ['1', '2', '999'], rarity: 4, enchant: 2000 },
      catalog,
    )
    const byHero = new Map(result.map((entry) => [entry.heroId, entry.lootBySlot]))
    expect(byHero.has('999')).toBe(false) // catalog 无 hero 999 → 跳过
    const hero1Loot = unwrap(byHero.get('1'), 'hero 1 missing')
    expect(Object.keys(hero1Loot).sort((a, b) => a.localeCompare(b))).toEqual(['1', '2']) // hero 1 两 slot
    expect(hero1Loot['1']).toEqual({ rarity: 4, enchant: 2000 })
    expect(hero1Loot['2']).toEqual({ rarity: 4, enchant: 2000 })
    expect(unwrap(byHero.get('2'), 'hero 2 missing')['1']).toEqual({ rarity: 4, enchant: 2000 })
  })

  it('稀有度可调：rarity=1 套到每槽（查询时按 catalog 该 rarity 条目命中或落空）', () => {
    const result = synthesizeHypotheticalLootByHero(
      { heroIds: ['1'], rarity: 1, enchant: 0 },
      catalog,
    )
    const hero1 = unwrap(result[0], 'result[0] missing')
    expect(hero1.lootBySlot['1']).toEqual({ rarity: 1, enchant: 0 })
    expect(hero1.lootBySlot['2']).toEqual({ rarity: 1, enchant: 0 })
  })

  it('config heroIds 为空 → 空', () => {
    expect(synthesizeHypotheticalLootByHero({ heroIds: [], rarity: 4, enchant: 2000 }, catalog)).toEqual([])
  })
})
