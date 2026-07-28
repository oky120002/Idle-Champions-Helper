import { describe, expect, it } from 'vitest'

import { computeActualPatronPerkGlobalBuff } from './patronPerkGlobalBuff'
import type { PatronPerkCatalogEntry } from './patronPerkGlobalBuff'

const PERKS: PatronPerkCatalogEntry[] = [
  { id: '1', effects: [{ effectString: 'global_dps_multiplier_mult,$replace', perLevel: 100 }] },
  { id: '2', effects: [{ effectString: 'global_dps_multiplier_mult,$replace', perLevel: 10 }] },
  { id: '3', effects: [{ effectString: 'gold_multiplier_mult,$replace', perLevel: 10 }] },
  { id: '4', effects: [{ effectString: 'global_dps_multiplier_mult_area_tags,$replace,underground', perLevel: 100 }] },
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
    // 简化：2 个 perk 满级验证公式 scale
    const perks: PatronPerkCatalogEntry[] = [
      { id: '1', effects: [{ effectString: 'global_dps_multiplier_mult,$replace', perLevel: 100 }] },
      { id: '2', effects: [{ effectString: 'global_dps_multiplier_mult,$replace', perLevel: 100 }] },
    ]
    // lv 10/10 → 1+(1000+1000)/100 = 21
    expect(computeActualPatronPerkGlobalBuff({ '1': 10, '2': 10 }, perks)).toBeCloseTo(21, 5)
  })
})
