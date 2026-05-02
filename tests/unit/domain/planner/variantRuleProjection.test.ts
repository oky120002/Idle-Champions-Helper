import { describe, expect, it } from 'vitest'
import { projectVariantRules } from '../../../../src/domain/planner/variantRuleProjection'

describe('variant rule projection', () => {
  it('投影 only_allow_crusaders', () => {
    const result = projectVariantRules([
      { type: 'only_allow_crusaders', heroes: ['1', '5', '12'] },
    ])

    expect(result.constraints).toHaveLength(1)
    expect(result.constraints[0]?.kind).toBe('allowList')
    expect(result.constraints[0]?.heroIds).toEqual(['1', '5', '12'])
  })

  it('投影 disallow_crusaders', () => {
    const result = projectVariantRules([
      { type: 'disallow_crusaders', heroes: ['3', '7'] },
    ])

    expect(result.constraints).toHaveLength(1)
    expect(result.constraints[0]?.kind).toBe('banList')
    expect(result.constraints[0]?.heroIds).toEqual(['3', '7'])
  })

  it('投影 force_use_heroes', () => {
    const result = projectVariantRules([
      { type: 'force_use_heroes', heroes: ['1'] },
    ])

    expect(result.constraints).toHaveLength(1)
    expect(result.constraints[0]?.kind).toBe('forceInclude')
    expect(result.constraints[0]?.heroIds).toEqual(['1'])
  })

  it('未知 mechanics 保留为 warnings', () => {
    const result = projectVariantRules([
      { type: 'speed_limit', value: 50 },
      { type: 'unknown_mechanic', data: 'something' },
    ])

    expect(result.warnings.length).toBe(2)
    expect(result.warnings[0]).toContain('speed_limit')
    expect(result.warnings[1]).toContain('unknown_mechanic')
  })

  it('空规则列表返回空结果', () => {
    const result = projectVariantRules([])

    expect(result.constraints).toEqual([])
    expect(result.warnings).toEqual([])
  })
})
