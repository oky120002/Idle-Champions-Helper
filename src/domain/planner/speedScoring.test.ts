import { describe, expect, it } from 'vitest'

import {
  computeFormationSpeedMultiplier,
  computeHeroSpeedGain,
  applyEquipmentBuffsToSpeedEffects,
  type HeroSpeedProfile,
  type SpeedEffectEntry,
} from './speedScoring'

function entry(category: SpeedEffectEntry['category'], value: number, extra: Partial<SpeedEffectEntry> = {}): SpeedEffectEntry {
  return { category, value, rawEffect: `test_${category}`, ...extra }
}

function profile(heroId: string, effects: SpeedEffectEntry[]): HeroSpeedProfile {
  return { heroId, effects, speedGain: computeHeroSpeedGain(effects) }
}

describe('computeFormationSpeedMultiplier', () => {
  it('returns 1 for empty formation', () => {
    expect(computeFormationSpeedMultiplier([])).toBe(1)
  })

  it('returns 1 for heroes with no speed effects', () => {
    expect(computeFormationSpeedMultiplier([profile('1', [])])).toBe(1)
  })

  describe('questProgress — multiply variant', () => {
    it('50% chance ×2 → 1.5', () => {
      // Havilar: chance_multiply_tagged_monster_quest_rewards,50,2,fiend
      const e = entry('questProgress', 50, { multiplier: 2 })
      // 1 + 0.5 × (2-1) = 1.5
      expect(computeFormationSpeedMultiplier([profile('havilar', [e])])).toBeCloseTo(1.5, 6)
    })

    it('25% chance ×2 → 1.25', () => {
      const e = entry('questProgress', 25, { multiplier: 2 })
      expect(computeFormationSpeedMultiplier([profile('melf', [e])])).toBeCloseTo(1.25, 6)
    })

    it('two multiply effects multiply', () => {
      const e1 = entry('questProgress', 50, { multiplier: 2, rawEffect: 'a' })
      const e2 = entry('questProgress', 25, { multiplier: 2, rawEffect: 'b' })
      // 1.5 × 1.25 = 1.875
      expect(computeFormationSpeedMultiplier([profile('h', [e1, e2])])).toBeCloseTo(1.875, 6)
    })
  })

  describe('questProgress — reduce variant', () => {
    it('25% chance × 100% reduction → 1/(1-0.25) = 1.333', () => {
      // BBEG: chance_reduce_quest_requirement,25,100
      const e = entry('questProgress', 25, { reductionAmount: 100 })
      expect(computeFormationSpeedMultiplier([profile('bbeg', [e])])).toBeCloseTo(1 / 0.75, 6)
    })

    it('2% chance × 100% reduction → tiny boost', () => {
      // Nahara: chance_reduce_quest_requirement,2,100
      const e = entry('questProgress', 2, { reductionAmount: 100 })
      expect(computeFormationSpeedMultiplier([profile('nahara', [e])])).toBeCloseTo(1 / 0.98, 6)
    })
  })

  describe('spawnSpeed', () => {
    it('+100% → 2.0', () => {
      // Deekin: increase_monster_spawn_time_mult,100
      const e = entry('spawnSpeed', 100)
      expect(computeFormationSpeedMultiplier([profile('deekin', [e])])).toBe(2)
    })

    it('+10% → 1.1', () => {
      const e = entry('spawnSpeed', 10)
      expect(computeFormationSpeedMultiplier([profile('widdle', [e])])).toBeCloseTo(1.1, 6)
    })

    it('two heroes additive: 100% + 10% → 2.1', () => {
      const p1 = profile('deekin', [entry('spawnSpeed', 100)])
      const p2 = profile('widdle', [entry('spawnSpeed', 10)])
      expect(computeFormationSpeedMultiplier([p1, p2])).toBeCloseTo(2.1, 6)
    })
  })

  describe('extraEnemies', () => {
    it('100% chance 1 extra → 2.0', () => {
      // Ezmerelda: spawn_additional_monsters,100
      const e = entry('extraEnemies', 100) // 100% × 1 = 1 extra
      expect(computeFormationSpeedMultiplier([profile('ez', [e])])).toBe(2)
    })

    it('50% chance 1 extra → 1.5', () => {
      const e = entry('extraEnemies', 50)
      expect(computeFormationSpeedMultiplier([profile('h', [e])])).toBe(1.5)
    })

    it('Minsc: 33% ×1 + 10% ×2 = 0.33 + 0.20 = 0.53 → 1.53', () => {
      // minsc_boastful,33,10 → chance1=33%,count1=1 + chance2=10%,count2=2
      const e1 = entry('extraEnemies', 33, { rawEffect: 'minsc_1' })
      const e2 = entry('extraEnemies', 20, { rawEffect: 'minsc_2' }) // 10%×2=20%
      expect(computeFormationSpeedMultiplier([profile('minsc', [e1, e2])])).toBeCloseTo(1.53, 6)
    })
  })

  describe('timeScale', () => {
    it('+25% → 1.25', () => {
      // Shandie: time_scale_when_not_attacked,25,30
      const e = entry('timeScale', 25)
      expect(computeFormationSpeedMultiplier([profile('shandie', [e])])).toBeCloseTo(1.25, 6)
    })

    it('caps at 10×', () => {
      const e = entry('timeScale', 1200) // +1200% = 13× → capped to 10
      expect(computeFormationSpeedMultiplier([profile('h', [e])])).toBe(10)
    })
  })

  describe('transitionSpeedup', () => {
    it('+50% → 1.5', () => {
      // Diana: area_transition_time_scale,50
      const e = entry('transitionSpeedup', 50)
      expect(computeFormationSpeedMultiplier([profile('diana', [e])])).toBeCloseTo(1.5, 6)
    })

    it('caps at 5×', () => {
      const e = entry('transitionSpeedup', 600) // +600% = 7× → capped to 5
      expect(computeFormationSpeedMultiplier([profile('h', [e])])).toBe(5)
    })
  })

  describe('simultaneousSpawn', () => {
    it('Vi present → 1.5× bonus', () => {
      const e = entry('simultaneousSpawn', 1)
      expect(computeFormationSpeedMultiplier([profile('vi', [e])])).toBe(1.5)
    })
  })

  describe('preSpawn', () => {
    it('Lark present → 1.2× bonus', () => {
      const e = entry('preSpawn', 1)
      expect(computeFormationSpeedMultiplier([profile('lark', [e])])).toBeCloseTo(1.2, 6)
    })
  })

  describe('multi-category formation', () => {
    it('Deekin + Shandie = spawnSpeed × timeScale', () => {
      // Deekin: spawnSpeed 100% → 2.0
      // Shandie: timeScale 25% → 1.25
      // Total: 2.0 × 1.25 = 2.5
      const deekin = profile('deekin', [entry('spawnSpeed', 100)])
      const shandie = profile('shandie', [entry('timeScale', 25)])
      expect(computeFormationSpeedMultiplier([deekin, shandie])).toBe(2.5)
    })

    it('full speed formation multiplies all categories', () => {
      // Deekin spawnSpeed 100%, Havilar questProgress 50%×2, Shandie timeScale 25%
      // = 1.5 × 2.0 × 1.25 = 3.75
      const deekin = profile('deekin', [entry('spawnSpeed', 100)])
      const havilar = profile('havilar', [entry('questProgress', 50, { multiplier: 2 })])
      const shandie = profile('shandie', [entry('timeScale', 25)])
      expect(computeFormationSpeedMultiplier([deekin, havilar, shandie])).toBe(3.75)
    })
  })
})

describe('computeHeroSpeedGain', () => {
  it('returns 1 for empty effects', () => {
    expect(computeHeroSpeedGain([])).toBe(1)
  })

  it('returns per-hero multiplier for single hero effects', () => {
    const effects = [entry('spawnSpeed', 100)]
    // Should equal the formation multiplier of a single-hero formation
    expect(computeHeroSpeedGain(effects)).toBe(2)
  })
})

describe('applyEquipmentBuffsToSpeedEffects', () => {
  it('returns unchanged for empty effects or buffs', () => {
    expect(applyEquipmentBuffsToSpeedEffects([], [])).toEqual([])
    expect(applyEquipmentBuffsToSpeedEffects([entry('spawnSpeed', 100)], [])).toEqual([entry('spawnSpeed', 100)])
  })

  it('scales value by buff percentage when upgradeId matches', () => {
    const effect = { ...entry('spawnSpeed', 100), upgradeId: '12345' }
    const buffs = [{ targetUpgradeId: '12345', value: 50 }]
    // 100 × (1 + 50/100) = 150
    const result = applyEquipmentBuffsToSpeedEffects([effect], buffs)
    expect(result[0]?.value).toBe(150)
  })

  it('does not scale when upgradeId is missing', () => {
    const effect = entry('spawnSpeed', 100) // no upgradeId
    const buffs = [{ targetUpgradeId: '12345', value: 50 }]
    const result = applyEquipmentBuffsToSpeedEffects([effect], buffs)
    expect(result[0]?.value).toBe(100)
  })

  it('does not scale binary effects (simultaneousSpawn/preSpawn)', () => {
    const effect = { ...entry('simultaneousSpawn', 1), upgradeId: '12345' }
    const buffs = [{ targetUpgradeId: '12345', value: 500 }]
    const result = applyEquipmentBuffsToSpeedEffects([effect], buffs)
    expect(result[0]?.value).toBe(1)
  })

  it('accumulates multiple buffs on same upgrade', () => {
    const effect = { ...entry('spawnSpeed', 100), upgradeId: '12345' }
    const buffs = [
      { targetUpgradeId: '12345', value: 30 },
      { targetUpgradeId: '12345', value: 20 },
    ]
    // 100 × (1 + 50/100) = 150
    const result = applyEquipmentBuffsToSpeedEffects([effect], buffs)
    expect(result[0]?.value).toBe(150)
  })
})
