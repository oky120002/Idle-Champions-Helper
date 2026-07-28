import { describe, expect, it } from 'vitest'

import {
  computeEquipmentAdjustmentByHero,
  computeEquipmentMult,
  parseLootEffectValue,
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

describe('parseLootEffectValue', () => {
  it('提取 hero_dps_multiplier_mult 数值（per-carry base DPS 装备）', () => {
    expect(parseLootEffectValue('hero_dps_multiplier_mult,350')).toBe(350)
  })
  it('非 base-DPS effect（buff_upgrade 技能 buff）→ null', () => {
    expect(parseLootEffectValue('buff_upgrade,275,2192')).toBeNull()
  })
  it('非 base-DPS effect（reduce_ultimate_cooldown 冷却）→ null', () => {
    expect(parseLootEffectValue('reduce_ultimate_cooldown,45')).toBeNull()
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
