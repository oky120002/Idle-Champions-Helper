import { describe, expect, it } from 'vitest'
import { isIdLocalizedEnumGroup, isLocalizedEnumGroup, isStringEnumGroup } from './enumGroups'

describe('enum group type guards', () => {
  it('isStringEnumGroup 匹配纯字符串值组', () => {
    expect(isStringEnumGroup({ id: 'roles', values: ['support', 'tank'] })).toBe(true)
    expect(isStringEnumGroup({ id: 'roles', values: ['support', { original: 'x', display: 'y' }] })).toBe(false)
  })

  it('isLocalizedEnumGroup 匹配无 id 的本地化值组', () => {
    expect(
      isLocalizedEnumGroup({
        id: 'affiliations',
        values: [{ original: 'Hall', display: '大厅' }],
      }),
    ).toBe(true)
  })

  it('isLocalizedEnumGroup 拒绝带 per-item id 的值组（与 isIdLocalizedEnumGroup 互斥）', () => {
    const idLocalizedGroup = {
      id: 'patrons',
      values: [{ id: '1', original: 'Patron', display: '赞助人' }],
    }

    expect(isLocalizedEnumGroup(idLocalizedGroup)).toBe(false)
    expect(isIdLocalizedEnumGroup(idLocalizedGroup)).toBe(true)
  })

  it('isIdLocalizedEnumGroup 要求每个值都有字符串 id', () => {
    expect(
      isIdLocalizedEnumGroup({
        id: 'patrons',
        values: [
          { id: '1', original: 'A', display: '甲' },
          { id: '2', original: 'B', display: '乙' },
        ],
      }),
    ).toBe(true)

    expect(
      isIdLocalizedEnumGroup({
        id: 'patrons',
        values: [{ id: '1', original: 'A', display: '甲' }, { original: 'B', display: '乙' }],
      }),
    ).toBe(false)
  })
})
