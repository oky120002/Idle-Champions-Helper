import { describe, expect, it } from 'vitest'

import { buildScoringBonusInputs } from './scoringBonusInputs'
import type { EffectDefinitionEntry } from '../buffs/effectDefinitionDps'
import type { PatronPerkCatalogEntry } from '../buffs/patronPerkGlobalBuff'
import type { LootCatalogEntry } from '../buffs/equipmentMult'
import type { FeatCatalog } from '../abilities/featSignals'
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
    specializations: [],
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

  it('未导入存档 + hypotheticalEquipment → 按假设装备（统一稀有度+附魔）算装备加成', () => {
    const lootCatalog: LootCatalogEntry[] = [
      { heroId: '1', slotId: '1', rarity: '4', effectString: 'hero_dps_multiplier_mult,100' },
      { heroId: '1', slotId: '2', rarity: '4', effectString: 'hero_dps_multiplier_mult,50' },
    ]
    const r = buildScoringBonusInputs({
      profileSnapshot: null,
      lootCatalog,
      effectDefinitions: [],
      patronPerkCatalog: [],
      hypotheticalEquipment: { heroIds: ['1'], rarity: 4, enchant: 2000 },
    })
    // 两槽 hero_dps base 100+50=150，enchant 2000 → ×(1+2000/250)=×9 → 1350 addPercent → multiplier 14.5
    expect(r.equipmentAdjustmentByHero.get('1')).toBeCloseTo(14.5, 5)
    expect(r.equipmentBuffsByHero.size).toBe(0) // 该 catalog 无 buff_upgrade 条目
  })

  it('有存档时 hypotheticalEquipment 被忽略（按存档 per-slot 实际）', () => {
    const lootCatalog: LootCatalogEntry[] = [
      { heroId: '1', slotId: '1', rarity: '1', effectString: 'hero_dps_multiplier_mult,10' },
      { heroId: '1', slotId: '1', rarity: '4', effectString: 'hero_dps_multiplier_mult,40' },
    ]
    const snap = makeSnapshot({
      ownedHeroes: [makeOwnedHero('1', { '1': { slotId: '1', rarity: 1, gild: 0, enchant: 0, pigment: 0, found: {} } })],
    })
    const r = buildScoringBonusInputs({
      profileSnapshot: snap,
      lootCatalog,
      effectDefinitions: [],
      patronPerkCatalog: [],
      hypotheticalEquipment: { heroIds: ['1'], rarity: 4, enchant: 2000 }, // 应被忽略
    })
    // 存档 rarity 1 hero_dps=10，enchant 0 → ×1 = 10 → multiplier 1.1（假设 rarity4+enchant2000 不生效）
    expect(r.equipmentAdjustmentByHero.get('1')).toBeCloseTo(1.1, 5)
  })

  it('未导入存档且无 hypotheticalEquipment → 空 map（向后兼容）', () => {
    const r = buildScoringBonusInputs({
      profileSnapshot: null,
      lootCatalog: [{ heroId: '1', slotId: '1', rarity: '4', effectString: 'hero_dps_multiplier_mult,100' }],
      effectDefinitions: [],
      patronPerkCatalog: [],
    })
    expect(r.equipmentAdjustmentByHero.size).toBe(0)
  })

  it('owned feat 的 buff_upgrade wrapper → 合并 equipmentBuffsByHero（owned-aware，复用装备反查通道）', () => {
    const featCatalog: FeatCatalog = {
      '7': [{ id: '100', rarity: 3, signals: [], buffWrappers: [{ targetUpgradeId: '1234', value: 40, rawEffect: 'buff_upgrade,40,1234' }] }],
    }
    const hero = makeOwnedHero('7', {})
    hero.feats = ['100']
    const r = buildScoringBonusInputs({
      profileSnapshot: makeSnapshot({ ownedHeroes: [hero] }),
      lootCatalog: [],
      effectDefinitions: [],
      patronPerkCatalog: [],
      featCatalog,
    })
    expect(r.equipmentBuffsByHero.get('7')).toEqual([
      { targetUpgradeId: '1234', value: 40, rawEffect: 'buff_upgrade,40,1234' },
    ])
  })

  it('未装备该 feat → wrapper 不接入（owned-aware）', () => {
    const featCatalog: FeatCatalog = {
      '7': [{ id: '100', rarity: 3, signals: [], buffWrappers: [{ targetUpgradeId: '1234', value: 40, rawEffect: 'buff_upgrade,40,1234' }] }],
    }
    const hero = makeOwnedHero('7', {}) // feats: []
    const r = buildScoringBonusInputs({
      profileSnapshot: makeSnapshot({ ownedHeroes: [hero] }),
      lootCatalog: [],
      effectDefinitions: [],
      patronPerkCatalog: [],
      featCatalog,
    })
    expect(r.equipmentBuffsByHero.has('7')).toBe(false)
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

  it('owned buff_upgrade loot → equipmentBuffsByHero 收集（enchant 缩放，per-hero wrapper 元数据）', () => {
    const lootCatalog: LootCatalogEntry[] = [
      { heroId: 'h1', slotId: '3', rarity: '4', effectString: 'buff_upgrade,275,4' },
      { heroId: 'h1', slotId: '1', rarity: '1', effectString: 'hero_dps_multiplier_mult,100' },
    ]
    const r = buildScoringBonusInputs({
      profileSnapshot: makeSnapshot({
        // slot3 buff_upgrade enchant 250 → 275 × (1+250/250) = 550
        ownedHeroes: [makeOwnedHero('h1', { '3': { slotId: '3', rarity: 4, gild: 0, enchant: 250, pigment: 0, found: {} } })],
      }),
      lootCatalog,
      effectDefinitions: [],
      patronPerkCatalog: [],
    })
    expect(r.equipmentBuffsByHero.get('h1')).toEqual([
      { targetUpgradeId: '4', value: 550, rawEffect: 'buff_upgrade,275,4' },
    ])
    // 加性装备（hero_dps slot1）不计入 buff_upgrade 通道（无 owned slot1 → adjustment 空）
    expect(r.equipmentAdjustmentByHero.has('h1')).toBe(false)
  })

  it('未导入存档或无 buff_upgrade 装备 → equipmentBuffsByHero 空（向后兼容）', () => {
    const r = buildScoringBonusInputs({
      profileSnapshot: makeSnapshot({ ownedHeroes: [] }),
      lootCatalog: [{ heroId: 'h1', slotId: '3', rarity: '4', effectString: 'buff_upgrade,275,4' }],
      effectDefinitions: [],
      patronPerkCatalog: [],
    })
    expect(r.equipmentBuffsByHero.size).toBe(0)
  })
})
