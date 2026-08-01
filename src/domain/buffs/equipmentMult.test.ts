import { describe, expect, it } from 'vitest'

import {
  computeEquipmentAdjustmentByHero,
  computeEquipmentGlobalDpsMult,
  computeEquipmentMult,
  parseLootEffect,
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

describe('computeEquipmentGlobalDpsMult', () => {
  it('跨英雄全队聚合：两英雄 global_dps 装备求和（enchant=0 取 base）', () => {
    // hero 1 slot1 r1=10、hero 2 slot1 r1=50 → 10+50=60% → 1.6
    const catalog = [
      cat('1', '1', '1', 'global_dps_multiplier_mult,10'),
      cat('2', '1', '1', 'global_dps_multiplier_mult,50'),
    ]
    const heroes = [
      { heroId: '1', lootBySlot: { '1': { rarity: 1 } } },
      { heroId: '2', lootBySlot: { '1': { rarity: 1 } } },
    ]
    expect(computeEquipmentGlobalDpsMult(heroes, catalog)).toBeCloseTo(1.6, 5)
  })

  it('enchant 缩放同 hero_dps（base × (1+enchant/250)，hero 1 slot1 r4 base230）', () => {
    // 230 × (1 + 750/250) = 230 × 4 = 920% → 9.2
    const catalog = [cat('1', '1', '4', 'global_dps_multiplier_mult,230')]
    const heroes = [{ heroId: '1', lootBySlot: { '1': { rarity: 4, enchant: 750 } } }]
    expect(computeEquipmentGlobalDpsMult(heroes, catalog)).toBeCloseTo(1 + 920 / 100, 1)
  })

  it('只计 global_dps，hero_dps 装备不计入全队池（明斯克 slot1 是 hero_dps）', () => {
    const heroes = [{ heroId: '7', lootBySlot: { '1': { rarity: 4, enchant: 734 } } }]
    expect(computeEquipmentGlobalDpsMult(heroes, MINSC_CATALOG)).toBe(1)
  })

  it('无 owned loot（未导入存档）→ 1', () => {
    expect(computeEquipmentGlobalDpsMult([], MINSC_CATALOG)).toBe(1)
    expect(computeEquipmentGlobalDpsMult([{ heroId: '1', lootBySlot: {} }], MINSC_CATALOG)).toBe(1)
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
