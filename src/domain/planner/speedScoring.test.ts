import { describe, expect, it } from 'vitest'

import {
  computeFormationSpeedMultiplier,
  computeHeroSpeedGain,
  computeSpeedBreakdown,
  applyEquipmentBuffsToSpeedEffects,
  applyFormationSpeedEffects,
  DYNAMIC_SPEED_HERO_IDS,
  DYNAMIC_SPEED_DEFAULTS,
  type HeroSpeedProfile,
  type SpeedEffectEntry,
  type FormationSpeedContext,
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

describe('computeSpeedBreakdown', () => {
  it('returns total=1 and empty arrays for empty formation', () => {
    const bd = computeSpeedBreakdown([])
    expect(bd.total).toBe(1)
    expect(bd.categoryFactors).toEqual([])
    expect(bd.heroContributions).toEqual([])
  })

  it('total matches computeFormationSpeedMultiplier', () => {
    const deekin = profile('deekin', [entry('spawnSpeed', 100)])
    const shandie = profile('shandie', [entry('timeScale', 25)])
    const bd = computeSpeedBreakdown([deekin, shandie])
    expect(bd.total).toBeCloseTo(computeFormationSpeedMultiplier([deekin, shandie]), 10)
  })

  it('lists only non-trivial category factors', () => {
    const deekin = profile('deekin', [entry('spawnSpeed', 100)])
    const shandie = profile('shandie', [entry('timeScale', 25)])
    const bd = computeSpeedBreakdown([deekin, shandie])
    // spawnSpeed=2.0, timeScale=1.25 → both present; other categories absent
    const cats = bd.categoryFactors.map((f) => f.category)
    expect(cats).toContain('spawnSpeed')
    expect(cats).toContain('timeScale')
    expect(cats).not.toContain('questProgress')
    expect(cats).not.toContain('extraEnemies')
    expect(cats).not.toContain('preSpawn')
  })

  it('lists heroes with speed effects only', () => {
    const deekin = profile('deekin', [entry('spawnSpeed', 100)])
    const boring = profile('boring', [])
    const bd = computeSpeedBreakdown([deekin, boring])
    expect(bd.heroContributions).toHaveLength(1)
    expect(bd.heroContributions[0]?.heroId).toBe('deekin')
    expect(bd.heroContributions[0]?.effects).toHaveLength(1)
  })

  it('simultaneousSpawn shows as 1.5 factor', () => {
    const vi = profile('vi', [entry('simultaneousSpawn', 1)])
    const bd = computeSpeedBreakdown([vi])
    const sim = bd.categoryFactors.find((f) => f.category === 'simultaneousSpawn')
    expect(sim?.factor).toBe(1.5)
  })
})

describe('DYNAMIC_SPEED_HERO_IDS', () => {
  it('contains Briv, Lae\'zel, Thellora, Halsin', () => {
    expect(DYNAMIC_SPEED_HERO_IDS.has('58')).toBe(true)  // Briv
    expect(DYNAMIC_SPEED_HERO_IDS.has('128')).toBe(true) // Lae'zel
    expect(DYNAMIC_SPEED_HERO_IDS.has('139')).toBe(true) // Thellora
    expect(DYNAMIC_SPEED_HERO_IDS.has('156')).toBe(true) // Halsin
  })

  it('has exactly 4 entries', () => {
    expect(DYNAMIC_SPEED_HERO_IDS.size).toBe(4)
  })
})

describe('DYNAMIC_SPEED_DEFAULTS', () => {
  it('provides areaSkip defaults for all 4 dynamic heroes', () => {
    for (const heroId of DYNAMIC_SPEED_HERO_IDS) {
      const entry = DYNAMIC_SPEED_DEFAULTS.get(heroId)
      expect(entry, `hero ${heroId} should have a default`).toBeDefined()
      expect(entry?.category).toBe('areaSkip')
      expect(entry?.value).toBeGreaterThan(0)
    }
  })

  it('areaSkip factor = 1 + value/100 (additive)', () => {
    const brivDefault = DYNAMIC_SPEED_DEFAULTS.get('58') as SpeedEffectEntry
    // Briv 25% → factor = 1.25
    const factor = computeFormationSpeedMultiplier([{
      heroId: '58',
      effects: [brivDefault],
      speedGain: 1,
    }])
    expect(factor).toBeCloseTo(1.25, 5)
  })
})

describe('applyFormationSpeedEffects', () => {
  /** Hew Maan style formationBonusTable: adjacent humans → amount replaces chance. */
  const hewMaanTable = {
    tag: 'human' as const,
    ranges: [
      { min: 1, max: 3, amount: 100 },
      { min: 4, max: 5, amount: 700 },
      { min: 6, max: 7, amount: 3100 },
      { min: 8, max: 99, amount: 12700 },
    ],
  }

  function ctx(
    heroAtSlot: Record<string, string>,
    slotTags: Record<string, string[]>,
    adjacency: Record<string, string[]>,
  ): FormationSpeedContext {
    return {
      slotByHeroId: new Map(Object.entries(heroAtSlot).map(([slot, heroId]) => [heroId, slot])),
      tagsBySlot: new Map(Object.entries(slotTags)),
      adjacentSlotIds: new Map(Object.entries(adjacency)),
    }
  }

  it('no formation effects → returns profiles unchanged', () => {
    const deekin = profile('deekin', [entry('spawnSpeed', 100)])
    const result = applyFormationSpeedEffects([deekin], ctx({}, {}, {}))
    expect(result).toEqual([deekin])
  })

  it('Hew Maan with 2 adjacent humans → amount=100 replaces chance', () => {
    const hewMaan = profile('hewmaan', [{
      ...entry('questProgress', 0, { multiplier: 2 }),
      formationBonusTable: hewMaanTable,
    }])
    // hewmaan at s1, adjacent s2+s3, both human
    const context = ctx(
      { s1: 'hewmaan', s2: 'hero2', s3: 'hero3' },
      { s1: ['human'], s2: ['human'], s3: ['human'] },
      { s1: ['s2', 's3'], s2: ['s1'], s3: ['s1'] },
    )
    const result = applyFormationSpeedEffects([hewMaan], context)
    expect(result[0]?.effects[0]?.value).toBe(100) // 2 adjacent humans → range [1,3] → 100
  })

  it('Hew Maan with 5 adjacent humans → amount=700', () => {
    const hewMaan = profile('hewmaan', [{
      ...entry('questProgress', 0, { multiplier: 2 }),
      formationBonusTable: hewMaanTable,
    }])
    const context = ctx(
      { s1: 'hewmaan', s2: 'h2', s3: 'h3', s4: 'h4', s5: 'h5', s6: 'h6' },
      { s1: ['human'], s2: ['human'], s3: ['human'], s4: ['human'], s5: ['human'], s6: ['human'] },
      { s1: ['s2', 's3', 's4', 's5', 's6'] },
    )
    const result = applyFormationSpeedEffects([hewMaan], context)
    expect(result[0]?.effects[0]?.value).toBe(700) // 5 adjacent humans → range [4,5] → 700
  })

  it('Hew Maan with 0 adjacent humans → amount=0 (no match in ranges)', () => {
    const hewMaan = profile('hewmaan', [{
      ...entry('questProgress', 0, { multiplier: 2 }),
      formationBonusTable: hewMaanTable,
    }])
    // hewmaan at s1, no adjacent slots occupied
    const context = ctx(
      { s1: 'hewmaan' },
      { s1: ['human'] },
      { s1: ['s2', 's3'] },
    )
    const result = applyFormationSpeedEffects([hewMaan], context)
    expect(result[0]?.effects[0]?.value).toBe(0)
  })

  it('non-human adjacent heroes do not count', () => {
    const hewMaan = profile('hewmaan', [{
      ...entry('questProgress', 0, { multiplier: 2 }),
      formationBonusTable: hewMaanTable,
    }])
    const context = ctx(
      { s1: 'hewmaan', s2: 'elf1', s3: 'dwarf1' },
      { s1: ['human'], s2: ['elf'], s3: ['dwarf'] },
      { s1: ['s2', 's3'], s2: ['s1'], s3: ['s1'] },
    )
    const result = applyFormationSpeedEffects([hewMaan], context)
    expect(result[0]?.effects[0]?.value).toBe(0) // 0 human neighbors
  })

  it('adjusted value flows into computeFormationSpeedMultiplier', () => {
    // hewmaan with 2 adjacent humans → chance=100, mult=2 → questProgress=2.0
    const hewMaan = profile('hewmaan', [{
      ...entry('questProgress', 0, { multiplier: 2 }),
      formationBonusTable: hewMaanTable,
    }])
    const context = ctx(
      { s1: 'hewmaan', s2: 'hero2', s3: 'hero3' },
      { s1: ['human'], s2: ['human'], s3: ['human'] },
      { s1: ['s2', 's3'], s2: ['s1'], s3: ['s1'] },
    )
    const adjusted = applyFormationSpeedEffects([hewMaan], context)
    // questProgress = 1 + 100/100 × (2-1) = 2.0
    expect(computeFormationSpeedMultiplier(adjusted)).toBeCloseTo(2.0, 6)
  })
})
