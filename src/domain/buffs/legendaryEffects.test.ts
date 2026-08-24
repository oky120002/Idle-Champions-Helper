import { describe, expect, it } from 'vitest'

import type { OwnedHero, OwnedHeroLegendarySlot } from '../user-profile/types'
import {
  collectLegendaryContributions,
  rankLegendaryForgeCandidates,
  synthesizeHypotheticalLegendaryContributions,
  type LegendaryEffectCatalogEntry,
} from './legendaryEffects'

function makeLegendarySlot(effectId: string | null, level: number): OwnedHeroLegendarySlot {
  return { slotId: '1', level, effectId, effectIds: effectId !== null ? [effectId] : [], resetCurrencyId: null, upgradeCost: 0 }
}

function makeOwnedHero(heroId: string, legendaryBySlot: Record<string, OwnedHeroLegendarySlot>): OwnedHero {
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
    lootBySlot: {},
    legendaryBySlot,
    specializations: [],
  }
}

const CATALOG: LegendaryEffectCatalogEntry[] = [
  // 简单 global_dps 无 per_crusader（117 条类型）
  { id: 'simple-global', effectString: 'global_dps_multiplier_mult,100', stackFunc: null, targetFilters: null, filterTargets: null },
  // global_dps per_crusader 无 target_filters（55 条类型）
  { id: 'per-crusader-all', effectString: 'global_dps_multiplier_mult,10', stackFunc: 'per_crusader', targetFilters: null, filterTargets: null },
  // global_dps per_crusader 带 target_filters（327 条类型）
  { id: 'per-crusader-human', effectString: 'global_dps_multiplier_mult,30', stackFunc: 'per_crusader', targetFilters: [{ type: 'tags', tags: 'human' }], filterTargets: null },
  // hero_dps 带 filter_targets（491 条类型）
  { id: 'hero-dps-male', effectString: 'hero_dps_multiplier_mult,125', stackFunc: null, targetFilters: null, filterTargets: [{ type: 'by_tags', tags: 'male' }] },
]

describe('collectLegendaryContributions', () => {
  it('returns empty for no owned heroes', () => {
    const result = collectLegendaryContributions([], CATALOG)
    expect(result.globalDpsAddPercent.size).toBe(0)
    expect(result.contributions).toHaveLength(0)
  })

  it('returns empty for hero with no forged legendary slots', () => {
    const hero = makeOwnedHero('1', {})
    const result = collectLegendaryContributions([hero], CATALOG)
    expect(result.globalDpsAddPercent.size).toBe(0)
    expect(result.contributions).toHaveLength(0)
  })

  it('skips slots with null effectId', () => {
    const hero = makeOwnedHero('1', { '1': makeLegendarySlot(null, 5) })
    const result = collectLegendaryContributions([hero], CATALOG)
    expect(result.globalDpsAddPercent.size).toBe(0)
    expect(result.contributions).toHaveLength(0)
  })

  it('skips effectIds not in catalog', () => {
    const hero = makeOwnedHero('1', { '1': makeLegendarySlot('nonexistent', 5) })
    const result = collectLegendaryContributions([hero], CATALOG)
    expect(result.globalDpsAddPercent.size).toBe(0)
    expect(result.contributions).toHaveLength(0)
  })

  it('routes simple global_dps to globalDpsAddPercent with level scaling', () => {
    const hero = makeOwnedHero('1', { '1': makeLegendarySlot('simple-global', 5) })
    const result = collectLegendaryContributions([hero], CATALOG)
    // base 100 × level 5 = 500
    expect(result.globalDpsAddPercent.get('1')).toBe(500)
    expect(result.contributions).toHaveLength(0)
  })

  it('accumulates multiple simple global_dps slots per hero', () => {
    const hero = makeOwnedHero('1', {
      '1': makeLegendarySlot('simple-global', 2),
      '2': makeLegendarySlot('simple-global', 3),
    })
    const result = collectLegendaryContributions([hero], CATALOG)
    // 100×2 + 100×3 = 500
    expect(result.globalDpsAddPercent.get('1')).toBe(500)
  })

  it('routes per_crusader global_dps to contributions (not globalDpsAddPercent)', () => {
    const hero = makeOwnedHero('1', { '1': makeLegendarySlot('per-crusader-all', 10) })
    const result = collectLegendaryContributions([hero], CATALOG)
    expect(result.globalDpsAddPercent.size).toBe(0)
    expect(result.contributions).toHaveLength(1)
    const c = result.contributions[0]
    expect(c).toBeDefined()
    expect(c?.ownerHeroId).toBe('1')
    expect(c?.pool).toBe('global')
    expect(c?.baseValue).toBe(100) // 10 × 10
    expect(c?.perCrusader).toBe(true)
    expect(c?.countQualifier).toBeNull() // no target_filters = count all
  })

  it('parses target_filters for per_crusader count qualifier', () => {
    const hero = makeOwnedHero('1', { '1': makeLegendarySlot('per-crusader-human', 1) })
    const result = collectLegendaryContributions([hero], CATALOG)
    expect(result.contributions).toHaveLength(1)
    const c = result.contributions[0]
    expect(c).toBeDefined()
    expect(c?.perCrusader).toBe(true)
    expect(c?.countQualifier).not.toBeNull()
    // countQualifier should match "human" tag
  })

  it('routes hero_dps with filter to contributions', () => {
    const hero = makeOwnedHero('1', { '1': makeLegendarySlot('hero-dps-male', 1) })
    const result = collectLegendaryContributions([hero], CATALOG)
    expect(result.globalDpsAddPercent.size).toBe(0)
    expect(result.contributions).toHaveLength(1)
    const c = result.contributions[0]
    expect(c).toBeDefined()
    expect(c?.ownerHeroId).toBe('1')
    expect(c?.pool).toBe('hero')
    expect(c?.baseValue).toBe(125)
    expect(c?.targetQualifier).not.toBeNull()
    expect(c?.perCrusader).toBe(false)
  })

  it('handles level 0 as level 1 (minimum)', () => {
    const hero = makeOwnedHero('1', { '1': makeLegendarySlot('simple-global', 0) })
    const result = collectLegendaryContributions([hero], CATALOG)
    // base 100 × max(1, 0) = 100
    expect(result.globalDpsAddPercent.get('1')).toBe(100)
  })

  it('produces contributions from multiple heroes', () => {
    const hero1 = makeOwnedHero('1', { '1': makeLegendarySlot('hero-dps-male', 1) })
    const hero2 = makeOwnedHero('2', { '1': makeLegendarySlot('per-crusader-all', 1) })
    const result = collectLegendaryContributions([hero1, hero2], CATALOG)
    expect(result.contributions).toHaveLength(2)
    expect(result.contributions.some((c) => c.ownerHeroId === '1')).toBe(true)
    expect(result.contributions.some((c) => c.ownerHeroId === '2')).toBe(true)
  })
})

describe('hypothetical legendary effects', () => {
  it('uses only catalog entries owned by the requested hero at the requested level', () => {
    const result = synthesizeHypotheticalLegendaryContributions(
      { heroIds: ['1'], level: 3 },
      [
        { id: 'simple-global', effectString: 'global_dps_multiplier_mult,100', stackFunc: null, targetFilters: null, filterTargets: null, heroIds: ['1'] },
        { id: 'per-crusader-all', effectString: 'global_dps_multiplier_mult,10', stackFunc: 'per_crusader', targetFilters: null, filterTargets: null, heroIds: ['2'] },
      ],
    )
    expect(result.globalDpsAddPercent.get('1')).toBe(300)
    expect(result.contributions).toHaveLength(0)
  })

  it('ranks forge candidates by current formation impact with stable ties', () => {
    const result = rankLegendaryForgeCandidates(
      ['b', 'a'],
      new Map([['b', ['human']], ['a', ['human']]]),
      new Map([['s1', 'b'], ['s2', 'a']]),
      [
        { id: 'a-global', effectString: 'global_dps_multiplier_mult,20', stackFunc: null, targetFilters: null, filterTargets: null, heroIds: ['a'] },
        { id: 'b-global', effectString: 'global_dps_multiplier_mult,20', stackFunc: null, targetFilters: null, filterTargets: null, heroIds: ['b'] },
      ],
    )
    expect(result.map((item) => item.heroId)).toEqual(['a', 'b'])
    expect(result[0]?.score).toBe(20)
  })
})
