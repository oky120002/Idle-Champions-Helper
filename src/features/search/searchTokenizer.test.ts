import { describe, expect, it } from 'vitest'

import { tokenize } from './searchTokenizer'

describe('tokenize', () => {
  it('切分拉丁词并小写化', () => expect(tokenize('Hello WORLD')).toEqual(['hello', 'world']))

  it('过滤标点与空白', () => expect(tokenize('dwarf, fighter!')).toEqual(['dwarf', 'fighter']))

  it('切分中文词项并小写', () => {
    const terms = tokenize('布鲁诺 伤害')
    expect(terms.length).toBeGreaterThan(0)
    expect(terms.every((term) => term === term.toLowerCase())).toBe(true)
    expect(terms.some((term) => term.includes('布鲁诺') || term.includes('伤害'))).toBe(true)
  })

  it('空串返回空数组', () => expect(tokenize('')).toEqual([]))
})
