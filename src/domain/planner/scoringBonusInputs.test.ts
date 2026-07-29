import { describe, expect, it } from 'vitest'

import { buildScoringBonusInputs } from './scoringBonusInputs'
import type { EffectDefinitionEntry } from '../buffs/effectDefinitionDps'
import type { PatronPerkCatalogEntry } from '../buffs/patronPerkGlobalBuff'
import type { LootCatalogEntry } from '../buffs/equipmentMult'
import type { OwnedHero, UserProfileSnapshot } from '../user-profile/types'

function makeSnapshot(over: Partial<UserProfileSnapshot> = {}): UserProfileSnapshot {
  return {
    schemaVersion: 1,
    ownedHeroes: [],
    importedFormationSaves: [],
    updatedAt: '2026-01-01',
    warnings: [],
    legendaryLevelCap: 0,
    ...over,
  }
}

function makeOwnedHero(heroId: string, lootBySlot: OwnedHero['lootBySlot']): OwnedHero {
  return {
    heroId,
    level: 1,
    equipment: {},
    feats: [],
    legendaryEffects: [],
    unlockedFeats: [],
    activeFeats: [],
    featSlots: 0,
    isOwned: true,
    gildableSlotId: null,
    lootBySlot,
    legendaryBySlot: {},
  }
}

describe('buildScoringBonusInputs', () => {
  it('未导入存档（profileSnapshot=null）→ 全默认（空装备 map / globalBuff 1 / hero_dps 空）', () => {
    const r = buildScoringBonusInputs({
      profileSnapshot: null,
      lootCatalog: [],
      effectDefinitions: [],
      patronPerkCatalog: [],
    })
    expect(r.equipmentAdjustmentByHero.size).toBe(0)
    expect(r.globalBuffMultiplier).toBe(1)
    expect(r.externalHeroDpsContributions).toEqual([])
  })

  it('profile 无 patron/blessings/loot → 同默认（向后兼容）', () => {
    const r = buildScoringBonusInputs({
      profileSnapshot: makeSnapshot(),
      lootCatalog: [],
      effectDefinitions: [],
      patronPerkCatalog: [],
    })
    expect(r.equipmentAdjustmentByHero.size).toBe(0)
    expect(r.globalBuffMultiplier).toBe(1)
    expect(r.externalHeroDpsContributions).toEqual([])
  })

  it('patron global_dps perk → globalBuffMultiplier = 1 + Σ(value)/100', () => {
    const perks: PatronPerkCatalogEntry[] = [
      { id: '1', patronId: '1', typeId: 2, effects: [{ effectString: 'global_dps_multiplier_mult,$replace', perLevel: 100 }] },
    ]
    const r = buildScoringBonusInputs({
      profileSnapshot: makeSnapshot({ patronPerks: { '1': 10 }, activeContext: { patronId: 1, deity: null } }),
      lootCatalog: [],
      effectDefinitions: [],
      patronPerkCatalog: perks,
    })
    // 100 × 10 = 1000 → 1 + 1000/100 = 11
    expect(r.globalBuffMultiplier).toBeCloseTo(11, 5)
    // global_dps 不进 hero_dps 通道
    expect(r.externalHeroDpsContributions).toEqual([])
  })

  it('effect_def 引用的 hero_dps（带 filter）→ externalHeroDpsContributions 收集；不计入 globalBuff', () => {
    const effectDefinitions: EffectDefinitionEntry[] = [
      { id: '455', effectKeys: [{ effectString: 'hero_dps_multiplier_mult,$replace', filterTargets: [{ type: 'by_tags', tags: 'male' }], targets: ['all'] }] },
    ]
    const perks: PatronPerkCatalogEntry[] = [
      { id: '20', patronId: '1', typeId: 2, effects: [{ effectString: 'effect_def,455', perLevel: 100 }] },
    ]
    const r = buildScoringBonusInputs({
      profileSnapshot: makeSnapshot({ patronPerks: { '20': 10 }, activeContext: { patronId: 1, deity: null } }),
      lootCatalog: [],
      effectDefinitions,
      patronPerkCatalog: perks,
    })
    expect(r.globalBuffMultiplier).toBe(1)
    expect(r.externalHeroDpsContributions).toHaveLength(1)
    // 100 × 10 = 1000
    expect(r.externalHeroDpsContributions[0]?.value).toBe(1000)
  })

  it('type1 patron perk：activeContext.patronId 不匹配 → 排除（验证 active 上下文透传）', () => {
    const perks: PatronPerkCatalogEntry[] = [
      { id: '10', patronId: '1', typeId: 1, effects: [{ effectString: 'global_dps_multiplier_mult,$replace', perLevel: 100 }] },
    ]
    // active patron=2 → perk(patron1, type1) 排除
    const r = buildScoringBonusInputs({
      profileSnapshot: makeSnapshot({ patronPerks: { '10': 10 }, activeContext: { patronId: 2, deity: null } }),
      lootCatalog: [],
      effectDefinitions: [],
      patronPerkCatalog: perks,
    })
    expect(r.globalBuffMultiplier).toBe(1)
  })

  it('owned loot + loot-catalog → equipmentAdjustmentByHero 计入（per-hero 装备调整比）', () => {
    const lootCatalog: LootCatalogEntry[] = [
      { heroId: 'h1', slotId: '1', rarity: '1', effectString: 'hero_dps_multiplier_mult,350' },
    ]
    const r = buildScoringBonusInputs({
      profileSnapshot: makeSnapshot({
        ownedHeroes: [makeOwnedHero('h1', { '1': { slotId: '1', rarity: 1, gild: 0, enchant: 0, pigment: 0, found: {} } })],
      }),
      lootCatalog,
      effectDefinitions: [],
      patronPerkCatalog: [],
    })
    // 350 × (1 + 0/250) = 350 → 1 + 350/100 = 4.5
    expect(r.equipmentAdjustmentByHero.get('h1')).toBeCloseTo(4.5, 5)
  })
})
