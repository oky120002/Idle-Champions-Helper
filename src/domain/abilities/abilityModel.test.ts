import { describe, expect, it } from 'vitest'

import {
  DIMENSION_BY_KIND,
  POOL_SCOPE_BY_KIND,
  type HeroAbilityDimension,
  type HeroAbilityKind,
  type HeroAbilityPoolScope,
} from './abilityModel'

describe('HeroAbilityKind 维度与 pool 归属映射', () => {
  it('每个 kind 都在 DIMENSION_BY_KIND 登记维度（穷尽守护）', () => {
    // 类型级：DIMENSION_BY_KIND 是 Record<HeroAbilityKind, _>，缺 key 会 typecheck 失败。
    // 运行级：逐 kind 断言非 undefined，防运行时漏登记。
    const kinds: HeroAbilityKind[] = [
      'globalDpsMultiplier',
      'heroDpsMultiplier',
      'adjacentBuff',
      'taggedChampionBuff',
      'globalGoldMultiplier',
      'heroGoldMultiplier',
    ]

    for (const kind of kinds) {
      expect(DIMENSION_BY_KIND[kind], `${kind} 未登记维度`).toBeDefined()
      expect(POOL_SCOPE_BY_KIND[kind], `${kind} 未登记 pool scope`).toBeDefined()
    }
  })

  it('gold kind 映射到 gold 维度', () => {
    const globalDim: HeroAbilityDimension = DIMENSION_BY_KIND.globalGoldMultiplier
    const heroDim: HeroAbilityDimension = DIMENSION_BY_KIND.heroGoldMultiplier
    expect(globalDim).toBe('gold')
    expect(heroDim).toBe('gold')
  })

  it('gold pool scope：global/hero 区分', () => {
    const globalScope: HeroAbilityPoolScope = POOL_SCOPE_BY_KIND.globalGoldMultiplier
    const heroScope: HeroAbilityPoolScope = POOL_SCOPE_BY_KIND.heroGoldMultiplier
    expect(globalScope).toBe('global')
    expect(heroScope).toBe('hero')
  })

  it('damage kind 仍映射 damage 维度（回归）', () => {
    const damageDimension: HeroAbilityDimension = DIMENSION_BY_KIND.globalDpsMultiplier
    expect(damageDimension).toBe('damage')
  })
})
