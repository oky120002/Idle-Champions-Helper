import { describe, expect, it } from 'vitest'

import { buildHighlightedSnippet } from './searchHighlight'

describe('buildHighlightedSnippet', () => {
  it('高亮命中词', () => {
    const text = 'the quick brown fox jumps over the lazy dog'
    const segments = buildHighlightedSnippet(text, ['quick'], 15)
    expect(segments.filter((s) => s.match).map((s) => s.text)).toEqual(['quick'])
    expect(segments.map((s) => s.text).join('')).toContain('quick')
  })

  it('大小写不敏感匹配', () => {
    const segments = buildHighlightedSnippet('Dwarf Champions', ['dwarf'], 80)
    expect(segments.some((s) => s.match && s.text === 'Dwarf')).toBe(true)
  })

  it('中文命中高亮', () => {
    const text = '布鲁诺领导战锤氏族。每与一名勇士同列，即提升伤害。'
    const segments = buildHighlightedSnippet(text, ['伤害'], 24)
    expect(segments.some((s) => s.match && s.text === '伤害')).toBe(true)
  })

  it('无命中时返回纯文本前缀', () => {
    expect(buildHighlightedSnippet('abcdef', ['zzz'], 6)).toEqual([
      { text: 'abcdef', match: false },
    ])
  })

  it('空词项列表返回截断纯文本', () => {
    expect(buildHighlightedSnippet('abcdef', [], 3)).toEqual([{ text: 'abc', match: false }])
  })

  it('截取窗口在两侧补省略号', () => {
    const text = 'abcdefghijklmnopqrstuvwxyz'
    const segments = buildHighlightedSnippet(text, ['m'], 5)
    const joined = segments.map((s) => s.text).join('')
    expect(joined.startsWith('…')).toBe(true)
    expect(joined.endsWith('…')).toBe(true)
    expect(joined).toContain('m')
  })
})
