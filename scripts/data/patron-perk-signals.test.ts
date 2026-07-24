import { describe, expect, test } from 'vitest'

import {
  computeGlobalBuffMultiplier,
  parsePatronPerkSignals,
} from './patron-perk-signals'
import type { HeroAbilitySignal } from '../../src/domain/abilities/abilityModel'

interface RawPerk {
  patronId: string
  levels: number
  effects: Array<{ effectString: string; perLevel: number }>
}

function perk(p: Partial<RawPerk> & { patronId: string }): RawPerk {
  return { levels: 10, effects: [], ...p }
}

describe('parsePatronPerkSignals', () => {
  test('global_dps_multiplier_mult,$replace 解析为 patronPerkMult signal', () => {
    const signals = parsePatronPerkSignals([
      perk({
        patronId: '1',
        levels: 10,
        effects: [{ effectString: 'global_dps_multiplier_mult,$replace', perLevel: 100 }],
      }),
    ])
    expect(signals.length).toBe(1)
    expect(signals[0]!.signal.kind).toBe('patronPerkMult')
    // value = perLevel × maxLevels（满级理论值）
    expect(signals[0]!.signal.value).toBe(1000)
    expect(signals[0]!.patronId).toBe('1')
  })

  test('非全局 DPS effect（effect_def 引用 / gold）不产生 patronPerkMult signal', () => {
    const signals = parsePatronPerkSignals([
      perk({
        patronId: '1',
        effects: [
          { effectString: 'effect_def,453', perLevel: 5 },
          { effectString: 'gold_multiplier_mult,$replace', perLevel: 2.5 },
        ],
      }),
    ])
    expect(signals).toHaveLength(0)
  })

  test('area_tags 条件全局 DPS 暂不接入（留 scenario tag 匹配后扩展）', () => {
    const signals = parsePatronPerkSignals([
      perk({
        patronId: '1',
        effects: [{ effectString: 'global_dps_multiplier_mult_area_tags,$replace,underground', perLevel: 100 }],
      }),
    ])
    // area_tags 条件版需场景 tag 匹配，MVP 不接入（不产生误算的无条件 signal）
    expect(signals).toHaveLength(0)
  })

  test('per patron 分组（多个 patron 的 perks 分别归属）', () => {
    const signals = parsePatronPerkSignals([
      perk({ patronId: '1', effects: [{ effectString: 'global_dps_multiplier_mult,$replace', perLevel: 100 }] }),
      perk({ patronId: '2', effects: [{ effectString: 'global_dps_multiplier_mult,$replace', perLevel: 10 }] }),
    ])
    const byPatron = new Map(signals.map((s) => [s.patronId, s.signal.value]))
    expect(byPatron.get('1')).toBe(1000)
    expect(byPatron.get('2')).toBe(100)
  })

  test('levels 缺失默认 1（防御）', () => {
    const signals = parsePatronPerkSignals([
      { patronId: '1', levels: undefined, effects: [{ effectString: 'global_dps_multiplier_mult,$replace', perLevel: 100 }] },
    ])
    expect(signals[0]!.signal.value).toBe(100)
  })
})

describe('computeGlobalBuffMultiplier', () => {
  test('空 signals → 1（无加成）', () => {
    expect(computeGlobalBuffMultiplier([])).toBe(1)
  })

  test('add 语义：1 + Σ(value/100)', () => {
    const signals: HeroAbilitySignal[] = [
      { kind: 'patronPerkMult', value: 1000, rawEffect: 'perk1', source: 'official-parsed' },
      { kind: 'patronPerkMult', value: 500, rawEffect: 'perk2', source: 'official-parsed' },
    ]
    // 1 + (1000 + 500)/100 = 1 + 15 = 16
    expect(computeGlobalBuffMultiplier(signals)).toBe(16)
  })

  test('单个 +100% perk → ×2', () => {
    const signals: HeroAbilitySignal[] = [
      { kind: 'patronPerkMult', value: 100, rawEffect: 'perk', source: 'official-parsed' },
    ]
    expect(computeGlobalBuffMultiplier(signals)).toBe(2)
  })
})
