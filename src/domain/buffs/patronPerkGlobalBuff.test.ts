import { describe, expect, it } from 'vitest'

import { computeActualPatronPerkGlobalBuff } from './patronPerkGlobalBuff'
import type { PatronPerkCatalogEntry } from './patronPerkGlobalBuff'
import type { EffectDefinitionEntry } from './effectDefinitionDps'

// typeId 2=全局（恒生效）；patronId 统一 '1'，全局语义下不影响。
const PERKS: PatronPerkCatalogEntry[] = [
  { id: '1', patronId: '1', typeId: 2, effects: [{ effectString: 'global_dps_multiplier_mult,$replace', perLevel: 100 }] },
  { id: '2', patronId: '1', typeId: 2, effects: [{ effectString: 'global_dps_multiplier_mult,$replace', perLevel: 10 }] },
  { id: '3', patronId: '1', typeId: 2, effects: [{ effectString: 'gold_multiplier_mult,$replace', perLevel: 10 }] },
  { id: '4', patronId: '1', typeId: 2, effects: [{ effectString: 'global_dps_multiplier_mult_area_tags,$replace,underground', perLevel: 100 }] },
]

describe('computeActualPatronPerkGlobalBuff', () => {
  it('actual level：perk1 lv10 + perk2 lv10 → 1+(1000+100)/100 = 12', () => {
    expect(computeActualPatronPerkGlobalBuff({ '1': 10, '2': 10 }, PERKS)).toBeCloseTo(12, 5)
  })

  it('未购买（level 0 或缺）→ 不计', () => {
    expect(computeActualPatronPerkGlobalBuff({ '1': 0, '2': 10 }, PERKS)).toBeCloseTo(2, 5)
  })

  it('非 global_dps effect（gold / area_tags 条件版）→ 不计', () => {
    expect(computeActualPatronPerkGlobalBuff({ '1': 10, '2': 10, '3': 10, '4': 10 }, PERKS)).toBeCloseTo(12, 5)
  })

  it('未导入存档（null / 空 actualLevels）→ 1（无加成，向后兼容）', () => {
    expect(computeActualPatronPerkGlobalBuff({}, PERKS)).toBe(1)
    expect(computeActualPatronPerkGlobalBuff(null, PERKS)).toBe(1)
  })

  it('满级 21 global_dps perk 理论上界（反推自 patron-perks.json actual Σ=12600）→ ×127', () => {
    const perks: PatronPerkCatalogEntry[] = [
      { id: '1', patronId: '1', typeId: 2, effects: [{ effectString: 'global_dps_multiplier_mult,$replace', perLevel: 100 }] },
      { id: '2', patronId: '1', typeId: 2, effects: [{ effectString: 'global_dps_multiplier_mult,$replace', perLevel: 100 }] },
    ]
    expect(computeActualPatronPerkGlobalBuff({ '1': 10, '2': 10 }, perks)).toBeCloseTo(21, 5)
  })

  describe('effect_def,<id> 引用（#9 通道1）', () => {
    const templates = new Map<string, EffectDefinitionEntry>([
      ['930', { id: '930', effectKeys: [{ effectString: 'global_dps_multiplier_mult,$replace', filterTargets: [], targets: [] }] }],
      ['455', { id: '455', effectKeys: [{ effectString: 'hero_dps_multiplier_mult,$replace', filterTargets: [{ type: 'by_tags', tags: 'male' }], targets: ['all'] }] }],
    ])
    const edPerks: PatronPerkCatalogEntry[] = [
      { id: '20', patronId: '1', typeId: 2, effects: [{ effectString: 'effect_def,930', perLevel: 100 }] },
      { id: '21', patronId: '1', typeId: 2, effects: [{ effectString: 'effect_def,455', perLevel: 100 }] },
    ]

    it('effect_def 引用的 global_dps 解引用计入 globalBuff', () => {
      expect(computeActualPatronPerkGlobalBuff({ '20': 1 }, edPerks, null, templates)).toBeCloseTo(2, 5)
    })

    it('effect_def 引用的 hero_dps 不计入 globalBuff（属 per-carry 通道）', () => {
      expect(computeActualPatronPerkGlobalBuff({ '21': 1 }, edPerks, null, templates)).toBe(1)
    })

    it('无 template → effect_def 引用跳过（向后兼容）', () => {
      expect(computeActualPatronPerkGlobalBuff({ '20': 1 }, edPerks, null, null)).toBe(1)
    })
  })
})

describe('computeActualPatronPerkGlobalBuff · type 1 本地 patron 过滤', () => {
  // typeId 1=本地（仅 active patron 生效）/ 2=全局（恒生效）
  const MIXED: PatronPerkCatalogEntry[] = [
    { id: '10', patronId: '1', typeId: 1, effects: [{ effectString: 'global_dps_multiplier_mult,$replace', perLevel: 50 }] },
    { id: '11', patronId: '2', typeId: 1, effects: [{ effectString: 'global_dps_multiplier_mult,$replace', perLevel: 50 }] },
    { id: '12', patronId: '1', typeId: 2, effects: [{ effectString: 'global_dps_multiplier_mult,$replace', perLevel: 100 }] },
  ]

  it('active patron=1：仅 patron1 的 type1 + 全部 type2 生效（patron2 type1 排除）', () => {
    // id10(p1,type1,lv10=500) + id12(type2,lv10=1000)；id11(p2,type1) 排除
    expect(computeActualPatronPerkGlobalBuff({ '10': 10, '11': 10, '12': 10 }, MIXED, '1')).toBeCloseTo(1 + (500 + 1000) / 100, 5)
  })

  it('不传 activePatronId → type1 全算（向后兼容）', () => {
    // id10 + id11 + id12 全算（500+500+1000）
    expect(computeActualPatronPerkGlobalBuff({ '10': 10, '11': 10, '12': 10 }, MIXED)).toBeCloseTo(1 + (500 + 500 + 1000) / 100, 5)
  })

  it('active patron=0（无 patron 自由玩）→ 排除所有 type1，仅 type2', () => {
    // 仅 id12(type2)；'0' !== '1' 且 !== '2'，两 type1 均排除
    expect(computeActualPatronPerkGlobalBuff({ '10': 10, '11': 10, '12': 10 }, MIXED, '0')).toBeCloseTo(1 + 1000 / 100, 5)
  })
})
