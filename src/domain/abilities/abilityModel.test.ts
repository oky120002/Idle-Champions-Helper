import { describe, expect, it } from 'vitest'

import {
  applyHeroAbilityPatch,
  computeHeroGainProfile,
  DIMENSION_BY_KIND,
  POOL_SCOPE_BY_KIND,
  type HeroAbilityDimension,
  type HeroAbilityKind,
  type HeroAbilityPoolScope,
  type HeroAbilityProfile,
  type HeroAbilitySignal,
} from './abilityModel'

describe('HeroAbilityKind 维度与 pool 归属映射', () => {
  it('每个 kind 都在 DIMENSION_BY_KIND 登记维度（穷尽守护）', () => {
    // 类型级：DIMENSION_BY_KIND 是 Record<HeroAbilityKind, _>，缺 key 会 typecheck 失败。
    // 运行级：逐 kind 断言非 undefined，防运行时漏登记。
    const kinds: HeroAbilityKind[] = [
      'globalDpsMultiplier',
      'heroDpsMultiplier',
      'globalGoldMultiplier',
      'globalCritChance',
      'heroCritChance',
      'globalCritDamage',
      'heroCritDamage',
    ]

    for (const kind of kinds) {
      expect(DIMENSION_BY_KIND[kind], `${kind} 未登记维度`).toBeDefined()
      expect(POOL_SCOPE_BY_KIND[kind], `${kind} 未登记 pool scope`).toBeDefined()
    }
  })

  it('gold kind 映射到 gold 维度', () => {
    const globalDim: HeroAbilityDimension = DIMENSION_BY_KIND.globalGoldMultiplier
    expect(globalDim).toBe('gold')
  })

  it('crit kind 映射到 crit 维度（chance/damage 各 global/hero）', () => {
    expect<HeroAbilityDimension>(DIMENSION_BY_KIND.globalCritChance).toBe('crit')
    expect<HeroAbilityDimension>(DIMENSION_BY_KIND.heroCritChance).toBe('crit')
    expect<HeroAbilityDimension>(DIMENSION_BY_KIND.globalCritDamage).toBe('crit')
    expect<HeroAbilityDimension>(DIMENSION_BY_KIND.heroCritDamage).toBe('crit')
    expect(POOL_SCOPE_BY_KIND.globalCritChance).toBe('global')
    expect(POOL_SCOPE_BY_KIND.heroCritChance).toBe('hero')
    expect(POOL_SCOPE_BY_KIND.globalCritDamage).toBe('global')
    expect(POOL_SCOPE_BY_KIND.heroCritDamage).toBe('hero')
  })

  it('gold pool scope：global 区分', () => {
    const globalScope: HeroAbilityPoolScope = POOL_SCOPE_BY_KIND.globalGoldMultiplier
    expect(globalScope).toBe('global')
  })

  it('damage kind 仍映射 damage 维度（回归）', () => {
    const damageDimension: HeroAbilityDimension = DIMENSION_BY_KIND.globalDpsMultiplier
    expect(damageDimension).toBe('damage')
  })
})

describe('computeHeroGainProfile', () => {
  function signal(
    kind: HeroAbilityKind,
    value: number,
    amountFunc?: HeroAbilitySignal['amountFunc'],
  ): HeroAbilitySignal {
    return { kind, value, rawEffect: `${kind},${value}`, source: 'official-parsed', amountFunc: amountFunc ?? null }
  }

  it('add 信号同维度按百分比相加（+100%+100% → ×3）', () => {
    const gain = computeHeroGainProfile([signal('globalDpsMultiplier', 100), signal('globalDpsMultiplier', 100)], [])
    expect(gain.self.damage).toBe(3)
    expect(gain.support).toEqual({})
  })

  it('mult 信号同维度相乘（×1.5×1.5 → ×2.25）', () => {
    const gain = computeHeroGainProfile(
      [],
      [signal('heroDpsMultiplier', 50, 'mult'), signal('heroDpsMultiplier', 50, 'mult')],
    )
    expect(gain.support.damage).toBeCloseTo(2.25)
  })

  it('add+mult 混合：(1+add/100)×multFactor', () => {
    // damage: add+100% (×2) × mult+50% (×1.5) = ×3
    const gain = computeHeroGainProfile(
      [],
      [signal('globalDpsMultiplier', 100), signal('heroDpsMultiplier', 50, 'mult')],
    )
    expect(gain.support.damage).toBeCloseTo(3)
  })

  it('信号按维度分流（dps→damage，gold→gold）', () => {
    const gain = computeHeroGainProfile(
      [signal('globalDpsMultiplier', 100), signal('globalGoldMultiplier', 50)],
      [],
    )
    expect(gain.self.damage).toBe(2)
    expect(gain.self.gold).toBe(1.5)
  })

  it('self（carrySignals）与 support（supportSignals）分开', () => {
    const gain = computeHeroGainProfile([signal('heroDpsMultiplier', 100)], [signal('globalDpsMultiplier', 200)])
    expect(gain.self.damage).toBe(2)
    expect(gain.support.damage).toBe(3)
  })

  it('无信号返回空 profile（稀疏；复合时缺省视为 1.0）', () => {
    const gain = computeHeroGainProfile([], [])
    expect(gain.self).toEqual({})
    expect(gain.support).toEqual({})
  })

  it('buff_upgrade wrapper（bonusScaleOfSignal）按 base.value×value/100 折算 addPercent（与评分池聚合一致）', () => {
    // base +300% (×4) + wrapper 100% 放大 base → 实际贡献 base.value×100/100=300% → 合 +600% (×7)。
    // 旧实现直接 += wrapper.value(100) → 合 +400% (×5)：base.value≠100 时低估，致 computationMode 误裁强候选。
    const base = signal('heroDpsMultiplier', 300)
    const wrapper: HeroAbilitySignal = {
      ...signal('heroDpsMultiplier', 100),
      bonusScaleOfSignal: base,
    }
    const gain = computeHeroGainProfile([base, wrapper], [])
    expect(gain.self.damage).toBe(7)
  })

  it('buff_upgrade wrapper amountFunc=mult 按 base.value×value/100 折算 multFactor', () => {
    // base +200% (×3) + wrapper mult 50%：multFactor ×= 1+200×50/10000=2.0 → 3×2=6.0
    const base = signal('heroDpsMultiplier', 200)
    const wrapper: HeroAbilitySignal = {
      ...signal('heroDpsMultiplier', 50, 'mult'),
      bonusScaleOfSignal: base,
    }
    const gain = computeHeroGainProfile([base, wrapper], [])
    expect(gain.self.damage).toBe(6)
  })

  it('stacksMultiply（无 stackFunc）走 multFactor，count=1 上界 = 1+value/100（与 pool 路由对称）', () => {
    // 实际评分 placementFit：stacksMultiply→multFactor，multiplier=(1+value/100)^count。
    // gain count=1：value=50 → multFactor ×= 1.5。旧实现走 addPercent += 50（单信号巧合等价，混池见下）。
    const gain = computeHeroGainProfile([{ ...signal('heroDpsMultiplier', 50), stacksMultiply: true }], [])
    expect(gain.self.damage).toBe(1.5)
  })

  it('stacksMultiply 与 add 信号同维度：(1+add/100)×multFactor（混池路由对称）', () => {
    // add +100% (×2) × stacksMultiply +50% (×1.5) = 3.0。
    // 旧实现 stacksMultiply 误走 addPercent → 合 +150% (×2.5)：混池路由错误（实际评分走 multFactor）。
    const gain = computeHeroGainProfile(
      [signal('globalDpsMultiplier', 100), { ...signal('heroDpsMultiplier', 50), stacksMultiply: true }],
      [],
    )
    expect(gain.self.damage).toBe(3.0)
  })

  it('stacksMultiply wrapper（bonusScaleOfSignal）用 value 而非 base.value×value/100（短路分支 base 仅门控）', () => {
    // base +300% + wrapper stacksMultiply 50%：短路分支 multiplier=(1+50/100)^count，base 仅依赖门控不参与数值。
    // gain count=1：wrapper multFactor ×= 1.5；base addPercent +300% → (1+3)×1.5=6.0。
    // 旧实现 wrapper 走 addPercent += base.value×50/100=150 → 合 +450% (×5.5)：误用 base.value。
    const base = signal('heroDpsMultiplier', 300)
    const wrapper: HeroAbilitySignal = {
      ...signal('heroDpsMultiplier', 50),
      stacksMultiply: true,
      bonusScaleOfSignal: base,
    }
    const gain = computeHeroGainProfile([base, wrapper], [])
    expect(gain.self.damage).toBe(6)
  })
})

describe('applyHeroAbilityPatch 重算 gainProfile', () => {
  function makeHero(carry: HeroAbilitySignal[]): HeroAbilityProfile {
    return {
      heroId: '1',
      name: { original: 'A', display: 'A' },
      seat: 1,
      roles: [],
      tags: [],
      baseAttackDamageTypes: [],
      baseAttackCooldown: null,
      age: null,
      abilityScores: {},
      baseDamage: 1,
      baseHealth: 1,
      carrySignals: carry,
      supportSignals: [],
      unsupportedSignals: [],
      sourceBreakdown: {
        carrySignals: carry.map(() => 'official-parsed' as const),
        supportSignals: [],
        unsupportedSignals: [],
      },
    }
  }

  it('override 改 signals 后 gainProfile 反映新信号', () => {
    const base = makeHero([{ kind: 'globalDpsMultiplier', value: 100, rawEffect: 'old', source: 'official-parsed' }])
    const patched = applyHeroAbilityPatch(
      base,
      { heroId: '1', carrySignals: [{ kind: 'globalDpsMultiplier', value: 300, rawEffect: 'new' }] },
      'repo-semantic-patch',
    )
    // 原 +100% (×2) → override +300% (×4)
    expect(patched.gainProfile?.self.damage).toBe(4)
  })

  it('无 patch 时原样返回（gainProfile 不变）', () => {
    const base = makeHero([{ kind: 'globalDpsMultiplier', value: 100, rawEffect: 'old', source: 'official-parsed' }])
    const baseWithGain = { ...base, gainProfile: computeHeroGainProfile(base.carrySignals, base.supportSignals) }
    expect(applyHeroAbilityPatch(baseWithGain, undefined, 'repo-semantic-patch')).toBe(baseWithGain)
  })
})
