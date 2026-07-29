import { describe, expect, it } from 'vitest'
import { collectHeroDpsContributions } from './externalHeroDpsMult'
import type { ActiveCatalogEffect, EffectDefinitionEntry } from './effectDefinitionDps'

const templates = new Map<string, EffectDefinitionEntry>([
  // by_tags 属性限定（filter_targets）
  ['455', { id: '455', effectKeys: [{ effectString: 'hero_dps_multiplier_mult,$replace', filterTargets: [{ type: 'by_tags', tags: 'male' }], targets: ['all'] }] }],
  // by_tags 属性限定（targets，isFilterLikeTarget 认 by_tags）
  ['929', { id: '929', effectKeys: [{ effectString: 'hero_dps_multiplier_mult,$replace', filterTargets: [], targets: [{ type: 'by_tags', tags: 'dwarf|elf|halfling|human' }] }] }],
  // 无 filter（全局 hero_dps）
  ['1039', { id: '1039', effectKeys: [{ effectString: 'hero_dps_multiplier_mult,$replace', filterTargets: [], targets: [] }] }],
  // heroes 白名单（type=heroes，非 filter-like，未解析 → 丢弃）
  ['196', { id: '196', effectKeys: [{ effectString: 'hero_dps_multiplier_mult,400', filterTargets: [], targets: [{ type: 'heroes', hero_ids: [1, 2, 3] }] }] }],
  // slots 位置限定（未解析 → 丢弃）
  ['192', { id: '192', effectKeys: [{ effectString: 'hero_dps_multiplier_mult,$replace', filterTargets: [], targets: [{ type: 'slots', slot_ids: [3, 4, 5] }] }] }],
  // global_dps（非 hero_dps）
  ['930', { id: '930', effectKeys: [{ effectString: 'global_dps_multiplier_mult,$replace', filterTargets: [], targets: [] }] }],
])

const effect = (effectString: string, perLevel: number, level: number): ActiveCatalogEffect => ({ effectString, perLevel, level })

describe('collectHeroDpsContributions', () => {
  it('effect_def 引用的 hero_dps + by_tags filter → 收集（filter_targets 形态）', () => {
    const c = collectHeroDpsContributions([effect('effect_def,455', 100, 10)], templates)
    expect(c).toHaveLength(1)
    expect(c[0]?.value).toBe(1000)
    expect(c[0]?.qualifier?.predicate).toBeInstanceOf(Object)
  })

  it('effect_def 引用的 hero_dps + targets by_tags filter → 收集（targets 形态）', () => {
    const c = collectHeroDpsContributions([effect('effect_def,929', 50, 30)], templates)
    expect(c).toHaveLength(1)
    expect(c[0]?.value).toBe(1500)
  })

  it('无 filter 的 hero_dps → qualifier=null（对所有 carry 生效）', () => {
    const c = collectHeroDpsContributions([effect('effect_def,1039', 100, 1)], templates)
    expect(c).toEqual([{ value: 100, qualifier: null }])
  })

  it('global_dps effect_def 不收（属 globalBuff 通道）', () => {
    expect(collectHeroDpsContributions([effect('effect_def,930', 100, 1)], templates)).toEqual([])
  })

  it('filter 未解析（heroes 白名单 / slots 位置）→ 保守丢弃', () => {
    expect(collectHeroDpsContributions([effect('effect_def,196', 0, 1)], templates)).toEqual([])
    expect(collectHeroDpsContributions([effect('effect_def,192', 50, 40)], templates)).toEqual([])
  })

  it('裸 effect_string（非 effect_def 引用）不收', () => {
    expect(collectHeroDpsContributions([effect('hero_dps_multiplier_mult,$replace', 100, 1)], templates)).toEqual([])
  })

  it('无 templates → 全部跳过（向后兼容）', () => {
    expect(collectHeroDpsContributions([effect('effect_def,455', 100, 1)], null)).toEqual([])
  })
})

