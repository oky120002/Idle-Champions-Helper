import { describe, expect, it } from 'vitest'
import {
  type EffectDefinitionEntry,
  isEffectDefinitionReference,
  parseEffectKind,
  resolveEffectDefinitionKeys,
  resolveEffectKeyValue,
} from './effectDefinitionDps'

const templates = new Map<string, EffectDefinitionEntry>([
  ['930', { id: '930', effectKeys: [{ effectString: 'global_dps_multiplier_mult,$replace', filterTargets: [], targets: [] }] }],
  ['455', { id: '455', effectKeys: [{ effectString: 'hero_dps_multiplier_mult,$replace', filterTargets: [{ type: 'by_tags', tags: 'male' }], targets: ['all'] }] }],
  ['196', { id: '196', effectKeys: [{ effectString: 'hero_dps_multiplier_mult,400', filterTargets: [], targets: [{ type: 'heroes', hero_ids: [1, 2, 3] }] }] }],
])

describe('isEffectDefinitionReference', () => {
  it('识别 effect_def,<id> 引用', () => {
    expect(isEffectDefinitionReference('effect_def,930')).toBe(true)
    expect(isEffectDefinitionReference('global_dps_multiplier_mult,$replace')).toBe(false)
  })
})

describe('resolveEffectDefinitionKeys', () => {
  it('解引用 effect_def,<id> → template effectKeys', () => {
    expect(resolveEffectDefinitionKeys('effect_def,930', templates)?.map((k) => k.effectString)).toEqual([
      'global_dps_multiplier_mult,$replace',
    ])
  })

  it('裸 effect_string → null（调用方按裸逻辑处理）', () => {
    expect(resolveEffectDefinitionKeys('global_dps_multiplier_mult,$replace', templates)).toBeNull()
  })

  it('template 缺该 id → null', () => {
    expect(resolveEffectDefinitionKeys('effect_def,999', templates)).toBeNull()
  })

  it('无 templates → null（向后兼容：未导入 effect-definitions）', () => {
    expect(resolveEffectDefinitionKeys('effect_def,930', null)).toBeNull()
    expect(resolveEffectDefinitionKeys('effect_def,930', undefined)).toBeNull()
  })
})

describe('resolveEffectKeyValue', () => {
  it('$replace → perLevel × actualLevel', () => {
    expect(resolveEffectKeyValue('global_dps_multiplier_mult,$replace', 100, 1)).toBe(100)
    expect(resolveEffectKeyValue('hero_dps_multiplier_mult,$replace', 50, 40)).toBe(2000)
  })

  it('固定值 → effect_string 内的数值', () => {
    expect(resolveEffectKeyValue('hero_dps_multiplier_mult,400', 0, 1)).toBe(400)
  })

  it('非法 effect_string → 0', () => {
    expect(resolveEffectKeyValue('hero_dps_multiplier_mult', 100, 1)).toBe(0)
  })
})

describe('parseEffectKind', () => {
  it('精确提取 kind（区分 area_tags 等变体，避免 startsWith 误匹配）', () => {
    expect(parseEffectKind('global_dps_multiplier_mult,$replace')).toBe('global_dps_multiplier_mult')
    expect(parseEffectKind('global_dps_multiplier_mult_area_tags,$replace,underground')).toBe('global_dps_multiplier_mult_area_tags')
    expect(parseEffectKind('hero_dps_multiplier_mult,400')).toBe('hero_dps_multiplier_mult')
  })

  it('非法 → null', () => {
    expect(parseEffectKind('')).toBeNull()
  })
})
