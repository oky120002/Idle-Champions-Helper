import { describe, expect, it } from 'vitest'
import {
  buildEffectDefinitionTemplates,
  normalizeEffectDefinitionTemplate,
} from './effect-definition-templates'

describe('normalizeEffectDefinitionTemplate', () => {
  it('提取 hero_dps effect_key（含 filter_targets + targets）', () => {
    expect(
      normalizeEffectDefinitionTemplate({
        id: 455,
        effect_keys: [
          {
            effect_string: 'hero_dps_multiplier_mult,$replace',
            targets: ['all'],
            filter_targets: [{ type: 'by_tags', tags: 'male' }],
          },
        ],
      }),
    ).toEqual({
      id: '455',
      effectKeys: [
        {
          effectString: 'hero_dps_multiplier_mult,$replace',
          filterTargets: [{ type: 'by_tags', tags: 'male' }],
          targets: ['all'],
        },
      ],
    })
  })

  it('提取 global_dps effect_key（无 filter，全局）', () => {
    const t = normalizeEffectDefinitionTemplate({
      id: 930,
      effect_keys: [{ effect_string: 'global_dps_multiplier_mult,$replace' }],
    })
    expect(t).toEqual({
      id: '930',
      effectKeys: [{ effectString: 'global_dps_multiplier_mult,$replace', filterTargets: [], targets: [] }],
    })
  })

  it('丢弃非 DPS effect_def（healing/gold/cooldown 等）', () => {
    expect(
      normalizeEffectDefinitionTemplate({
        id: 1384,
        effect_keys: [{ effect_string: 'healing_mult,$replace', targets: [{ type: 'by_tags', tags: ['tanking'] }] }],
      }),
    ).toBeNull()
  })

  it('保留同 effect_def 内多个 DPS effect_key', () => {
    const t = normalizeEffectDefinitionTemplate({
      id: 828,
      effect_keys: [
        { effect_string: 'hero_dps_multiplier_mult,$replace', filter_targets: [{ type: 'by_tags', tags: 'good' }] },
        { effect_string: 'hero_dps_multiplier_mult,150', filter_targets: [{ type: 'by_tags', tags: 'good' }] },
        { effect_string: 'healing_mult,$replace' },
      ],
    })
    expect(t?.effectKeys).toHaveLength(2)
    expect(t?.effectKeys[1]?.effectString).toBe('hero_dps_multiplier_mult,150')
  })

  it('effect_keys 元素为裸 string 时按 effect_string 造 template', () => {
    const t = normalizeEffectDefinitionTemplate({ id: 1, effect_keys: ['global_dps_multiplier_mult,100'] })
    expect(t?.effectKeys).toEqual([
      { effectString: 'global_dps_multiplier_mult,100', filterTargets: [], targets: [] },
    ])
  })

  it('无 id 或无 DPS effect_key 返回 null', () => {
    expect(normalizeEffectDefinitionTemplate({ effect_keys: [] })).toBeNull()
    expect(normalizeEffectDefinitionTemplate({ id: 1, effect_keys: [] })).toBeNull()
    expect(normalizeEffectDefinitionTemplate({ id: 1 })).toBeNull()
  })
})

describe('buildEffectDefinitionTemplates', () => {
  it('批量提取并过滤 null', () => {
    const result = buildEffectDefinitionTemplates([
      { id: 455, effect_keys: [{ effect_string: 'hero_dps_multiplier_mult,$replace' }] },
      { id: 1384, effect_keys: [{ effect_string: 'healing_mult,$replace' }] },
      { id: 930, effect_keys: [{ effect_string: 'global_dps_multiplier_mult,$replace' }] },
    ])
    expect(result.map((t) => t.id)).toEqual(['455', '930'])
  })
})
