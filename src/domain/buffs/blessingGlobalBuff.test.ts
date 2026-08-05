import { describe, expect, it } from 'vitest'

import type { BlessingCatalogEntry } from '../user-profile/types'
import { combineGlobalBuffMultipliers, computeActualBlessingGlobalBuff } from './blessingGlobalBuff'
import type { EffectDefinitionEntry } from './effectDefinitionDps'

// type 1=地图（仅 currencyId campaign）/ type 2=全局（跨 campaign）
const BLESSINGS: BlessingCatalogEntry[] = [
  { id: '1', type: 2, currencyId: 1, effects: [{ effectString: 'global_dps_multiplier_mult,$replace', perLevel: 100 }] }, // 全局 Double Damage
  { id: '2', type: 1, currencyId: 1, effects: [{ effectString: 'global_dps_multiplier_mult,$replace', perLevel: 50 }] }, // 地图 c1
  { id: '3', type: 1, currencyId: 3, effects: [{ effectString: 'global_dps_multiplier_mult,$replace', perLevel: 50 }] }, // 地图 c3
  { id: '4', type: 2, currencyId: 3, effects: [{ effectString: 'gold_multiplier_mult,$replace', perLevel: 10 }] }, // 全局非 DPS
]

describe('computeActualBlessingGlobalBuff', () => {
  it('全局(type2)全算 + 地图(type1)仅当前 campaign', () => {
    // id1 全局 lv1(+100%) + id2 地图c1 lv40(+2000%)；id3 地图c3 不算
    const m = computeActualBlessingGlobalBuff({ '1': 1, '2': 40, '3': 40 }, BLESSINGS, '1')
    expect(m).toBeCloseTo(1 + (100 + 2000) / 100, 5) // 21
  })

  it('不传 currentCampaignId → 不过滤（全算地图，向后兼容）', () => {
    const m = computeActualBlessingGlobalBuff({ '1': 1, '2': 40, '3': 40 }, BLESSINGS)
    expect(m).toBeCloseTo(1 + (100 + 2000 + 2000) / 100, 5) // 41
  })

  it('未购买（level 0）+ 非 global_dps → 不计', () => {
    const m = computeActualBlessingGlobalBuff({ '1': 0, '2': 40, '4': 10 }, BLESSINGS, '1')
    expect(m).toBeCloseTo(1 + 2000 / 100, 5) // 21（id1 lv0 不计，id4 gold 不计）
  })

  it('未导入存档（null/空）→ 1（向后兼容）', () => {
    expect(computeActualBlessingGlobalBuff({}, BLESSINGS, '1')).toBe(1)
    expect(computeActualBlessingGlobalBuff(null, BLESSINGS, '1')).toBe(1)
  })

  describe('effect_def,<id> 引用（#9 通道1）', () => {
    const templates = new Map<string, EffectDefinitionEntry>([
      ['930', { id: '930', effectKeys: [{ effectString: 'global_dps_multiplier_mult,$replace', filterTargets: [], targets: [] }] }],
      ['455', { id: '455', effectKeys: [{ effectString: 'hero_dps_multiplier_mult,$replace', filterTargets: [{ type: 'by_tags', tags: 'male' }], targets: ['all'] }] }],
    ])
    const edBlessings: BlessingCatalogEntry[] = [
      { id: '64', type: 2, currencyId: 1, effects: [{ effectString: 'effect_def,930', perLevel: 100 }] },
      { id: '70', type: 2, currencyId: 1, effects: [{ effectString: 'effect_def,455', perLevel: 100 }] },
    ]

    it('effect_def 引用的 global_dps 解引用计入 globalBuff', () => {
      // ed930 global_dps perLevel100 × lv1 = +100% → 2
      expect(computeActualBlessingGlobalBuff({ '64': 1 }, edBlessings, null, templates)).toBeCloseTo(2, 5)
    })

    it('effect_def 引用的 hero_dps 不计入 globalBuff（属 per-carry 通道）', () => {
      // ed455 hero_dps 不计入 globalBuff → 1
      expect(computeActualBlessingGlobalBuff({ '70': 1 }, edBlessings, null, templates)).toBe(1)
    })

    it('无 template → effect_def 引用跳过（向后兼容，未加载 effect-definitions）', () => {
      expect(computeActualBlessingGlobalBuff({ '64': 1 }, edBlessings, null, null)).toBe(1)
    })

    it('裸 global_dps 与 effect_def global_dps 同 pool 叠加', () => {
      const mixed: BlessingCatalogEntry[] = [
        { id: 'a', type: 2, currencyId: 1, effects: [{ effectString: 'global_dps_multiplier_mult,$replace', perLevel: 50 }] },
        { id: 'b', type: 2, currencyId: 1, effects: [{ effectString: 'effect_def,930', perLevel: 100 }] },
      ]
      // 50×1 + 100×1 = 150 → 2.5
      expect(computeActualBlessingGlobalBuff({ a: 1, b: 1 }, mixed, null, templates)).toBeCloseTo(2.5, 5)
    })
  })
})

describe('combineGlobalBuffMultipliers', () => {
  it('空 → 1', () => expect(combineGlobalBuffMultipliers([])).toBe(1))

  it('patron(55.7) + blessing(68) add pool 合并 → 122.7（非相乘）', () => {
    const patron = 1 + 5470 / 100
    const blessing = 1 + 6700 / 100
    expect(combineGlobalBuffMultipliers([patron, blessing])).toBeCloseTo(1 + (5470 + 6700) / 100, 1)
  })

  it('单个 mult → 原值', () => expect(combineGlobalBuffMultipliers([55.7])).toBeCloseTo(55.7, 5))

  it('全是 1 → 1', () => expect(combineGlobalBuffMultipliers([1, 1])).toBe(1))
})
