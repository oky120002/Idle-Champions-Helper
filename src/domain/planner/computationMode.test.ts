import { describe, expect, it } from 'vitest'

import type { HeroAbilityDimension, ResolvedHeroAbilityProfile } from '../abilities/abilityModel'
import { applyComputationMode, compositeGain, MODE_FRACTION, OBJECTIVE_DIMENSIONS } from './computationMode'

function makeHero(
  heroId: string,
  seat: number,
  gain: { self?: Partial<Record<HeroAbilityDimension, number>>; support?: Partial<Record<HeroAbilityDimension, number>> },
): ResolvedHeroAbilityProfile {
  return {
    heroId,
    name: { original: heroId, display: heroId },
    seat,
    roles: [],
    tags: [],
    baseAttackDamageTypes: [],
    baseAttackCooldown: null,
    age: null,
    abilityScores: {},
    baseDamage: 1,
    baseHealth: 1,
    carrySignals: [],
    supportSignals: [],
    unsupportedSignals: [],
    sourceBreakdown: { carrySignals: [], supportSignals: [], unsupportedSignals: [] },
    gainProfile: { self: gain.self ?? {}, support: gain.support ?? {} },
  }
}

describe('computationMode 常量', () => {
  it('MODE_FRACTION：full=1.0 / p90=0.9 / p80=0.8 / p70=0.7 / p60=0.6 / p50=0.5', () => {
    expect(MODE_FRACTION.full).toBe(1.0)
    expect(MODE_FRACTION.p90).toBe(0.9)
    expect(MODE_FRACTION.p80).toBe(0.8)
    expect(MODE_FRACTION.p70).toBe(0.7)
    expect(MODE_FRACTION.p60).toBe(0.6)
    expect(MODE_FRACTION.p50).toBe(0.5)
  })

  it('OBJECTIVE_DIMENSIONS：carry-dps 含 damage，team-gold 只 gold', () => {
    expect(OBJECTIVE_DIMENSIONS['carry-dps']).toContain('damage')
    expect(OBJECTIVE_DIMENSIONS['team-gold']).toEqual(['gold'])
  })
})

describe('compositeGain', () => {
  it('复合 = max(self 复合, support 复合)', () => {
    const selfCarry = makeHero('a', 1, { self: { damage: 10 }, support: { damage: 1 } })
    const supportHero = makeHero('b', 1, { self: { damage: 1 }, support: { damage: 8 } })
    expect(compositeGain(selfCarry, 'carry-dps')).toBeCloseTo(10)
    expect(compositeGain(supportHero, 'carry-dps')).toBeCloseTo(8)
  })

  it('缺省维度视为 1.0（不拖累乘积）', () => {
    const hero = makeHero('a', 1, { support: { damage: 5 } })
    // crit/vulnerability/global-buff 缺省 → 乘积 = 5
    expect(compositeGain(hero, 'carry-dps')).toBeCloseTo(5)
  })

  it('无 gainProfile 视为中性 1.0', () => {
    const hero = makeHero('a', 1, {})
    expect(compositeGain(hero, 'carry-dps')).toBe(1)
  })
})

describe('applyComputationMode', () => {
  it('full 模式不裁剪（原样返回）', () => {
    const heroes = [makeHero('a', 1, { support: { damage: 2 } }), makeHero('b', 1, { support: { damage: 1.1 } })]
    expect(applyComputationMode(heroes, 'full', 'carry-dps', new Set())).toHaveLength(2)
  })

  it('p50 按席位裁剪：seat 内取收益前 50%（ceil），低收益被砍', () => {
    const heroes = [
      makeHero('h1', 1, { support: { damage: 5 } }),
      makeHero('h2', 1, { support: { damage: 4 } }),
      makeHero('h3', 1, { support: { damage: 1.1 } }),
      makeHero('h4', 1, { support: { damage: 1.05 } }),
    ]
    const kept = applyComputationMode(heroes, 'p50', 'carry-dps', new Set())
    expect(kept.map((h) => h.heroId).sort()).toEqual(['h1', 'h2'])
  })

  it('每席位至少留 1 个（即使席位只有 1 个低收益英雄）', () => {
    const heroes = [makeHero('low', 2, { support: { damage: 1.01 } })]
    const kept = applyComputationMode(heroes, 'p50', 'carry-dps', new Set())
    expect(kept.map((h) => h.heroId)).toEqual(['low'])
  })

  it('forced 英雄无条件保留（即使收益最低），且不占该席位普通候选名额', () => {
    const heroes = [
      makeHero('forced', 1, { support: { damage: 1.01 } }),
      makeHero('strong1', 1, { support: { damage: 5 } }),
      makeHero('strong2', 1, { support: { damage: 4 } }),
    ]
    const kept = applyComputationMode(heroes, 'p50', 'carry-dps', new Set(['forced']))
    // forced 必留 + 非 forced 候选 p50 留前 1（strong1）= 共 2
    expect(kept.map((h) => h.heroId).sort()).toEqual(['forced', 'strong1'])
  })

  it('scoringMode 切换排序 key：金币英雄在 team-gold 模式排前', () => {
    const heroes = [
      makeHero('dpsHero', 1, { support: { damage: 10, gold: 1 } }),
      makeHero('goldHero', 1, { support: { damage: 1, gold: 5 } }),
    ]
    // p50 seat1 各留 1 个
    expect(applyComputationMode(heroes, 'p50', 'carry-dps', new Set()).map((h) => h.heroId)).toEqual(['dpsHero'])
    expect(applyComputationMode(heroes, 'p50', 'team-gold', new Set()).map((h) => h.heroId)).toEqual(['goldHero'])
  })

  it('复合 = max(self, support)：self 强或 support 强都能保住', () => {
    const heroes = [
      makeHero('selfCarry', 1, { self: { damage: 10 }, support: { damage: 1 } }),
      makeHero('supportHero', 1, { self: { damage: 1 }, support: { damage: 8 } }),
      makeHero('weak', 1, { self: { damage: 1.01 }, support: { damage: 1.01 } }),
    ]
    const kept = applyComputationMode(heroes, 'p50', 'carry-dps', new Set())
    // ceil(3×0.5)=2，留 selfCarry(10) + supportHero(8)
    expect(kept.map((h) => h.heroId).sort()).toEqual(['selfCarry', 'supportHero'])
  })

  it('保留原始顺序（确定性）', () => {
    const heroes = [
      makeHero('z', 1, { support: { damage: 5 } }),
      makeHero('a', 1, { support: { damage: 4 } }),
      makeHero('m', 2, { support: { damage: 5 } }),
    ]
    const kept = applyComputationMode(heroes, 'p50', 'carry-dps', new Set())
    // 输入顺序 z,a,m 都保留（p50 各席位 ceil 都 ≥1，seat1 ceil(2×0.5)=1... 实际留 z；seat2 留 m）
    // seat1 留收益最高的 z；seat2 留 m
    expect(kept.map((h) => h.heroId)).toEqual(['z', 'm'])
  })
})
