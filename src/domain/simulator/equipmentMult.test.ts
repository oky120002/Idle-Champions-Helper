import { describe, expect, it } from 'vitest'

import {
  computeEquipmentMult,
  computeTheoreticalLootMult,
  parseLootEffectValue,
} from './equipmentMult'
import type { LootCatalogEntry } from './equipmentMult'

const cat = (heroId: string, slotId: string, rarity: string, effect: string): LootCatalogEntry =>
  ({ heroId, slotId, rarity, effectString: effect })

const HERO1_CATALOG: LootCatalogEntry[] = [
  cat('1', '1', '1', 'global_dps_multiplier_mult,10'),
  cat('1', '1', '2', 'global_dps_multiplier_mult,65'),
  cat('1', '1', '3', 'global_dps_multiplier_mult,120'),
  cat('1', '1', '4', 'global_dps_multiplier_mult,230'),
  cat('1', '2', '1', 'global_dps_multiplier_mult,10'),
  cat('1', '2', '4', 'global_dps_multiplier_mult,230'),
]

describe('parseLootEffectValue', () => {
  it('提取 global_dps_multiplier_mult 的数值', () => {
    expect(parseLootEffectValue('global_dps_multiplier_mult,120')).toBe(120)
  })
  it('非 DPS effect（reduce_ultimate_cooldown）返回 null', () => {
    expect(parseLootEffectValue('reduce_ultimate_cooldown,10')).toBeNull()
  })
})

describe('computeEquipmentMult', () => {
  it('owned rarity 1（低）< rarity 4（高）：高 ilvl > 低 ilvl', () => {
    const low = computeEquipmentMult('1', { '1': { rarity: 1 } }, HERO1_CATALOG)
    const high = computeEquipmentMult('1', { '1': { rarity: 4 } }, HERO1_CATALOG)
    expect(high).toBeGreaterThan(low)
  })

  it('单槽 rarity 1（+10%）→ 1.1', () => {
    const mult = computeEquipmentMult('1', { '1': { rarity: 1 } }, HERO1_CATALOG)
    expect(mult).toBeCloseTo(1.1, 5)
  })

  it('两槽各 rarity 4（+230% × 2）→ 1 + 4.6 = 5.6', () => {
    const mult = computeEquipmentMult('1', { '1': { rarity: 4 }, '2': { rarity: 4 } }, HERO1_CATALOG)
    expect(mult).toBeCloseTo(1 + (230 + 230) / 100, 5)
  })

  it('owned rarity 缺失（槽位空）→ 该槽不计', () => {
    const mult = computeEquipmentMult('1', { '1': { rarity: 1 } }, HERO1_CATALOG)
    // 只槽 1 rarity 1 = +10% → 1.1
    expect(mult).toBeCloseTo(1.1, 5)
  })

  it('无 owned loot → 1（无装备加成）', () => {
    expect(computeEquipmentMult('1', {}, HERO1_CATALOG)).toBe(1)
  })
})

describe('computeTheoreticalLootMult', () => {
  it('全 rarity 累加 = 理论上界（所有 slot 所有 rarity 求和）', () => {
    // HERO1_CATALOG: slot1 (10+65+120+230) + slot2 (10+230) = 425 + 240 = 665 → 1 + 6.65 = 7.65
    const theoretical = computeTheoreticalLootMult('1', HERO1_CATALOG)
    expect(theoretical).toBeCloseTo(1 + 665 / 100, 5)
  })

  it('ownedEquipMult ≤ theoreticalLootMult（owned 是理论子集）', () => {
    const owned = computeEquipmentMult('1', { '1': { rarity: 4 }, '2': { rarity: 4 } }, HERO1_CATALOG)
    const theoretical = computeTheoreticalLootMult('1', HERO1_CATALOG)
    expect(owned).toBeLessThanOrEqual(theoretical)
  })
})
