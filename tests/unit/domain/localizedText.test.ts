import { describe, expect, it } from 'vitest'
import {
  formatSeatLabel,
  getLocalizedTextPair,
  getPrimaryLocalizedText,
  getSecondaryLocalizedText,
} from '../../../src/domain/localizedText'
import type { LocalizedText } from '../../../src/domain/types'

const briv: LocalizedText = {
  original: 'Briv',
  display: '布里夫',
}

describe('localizedText helpers', () => {
  it('按界面语言返回主文本与副文本', () => {
    expect(getPrimaryLocalizedText(briv, 'zh-CN')).toBe('布里夫')
    expect(getSecondaryLocalizedText(briv, 'zh-CN')).toBe('Briv')
    expect(getPrimaryLocalizedText(briv, 'en-US')).toBe('Briv')
    expect(getSecondaryLocalizedText(briv, 'en-US')).toBe('布里夫')
  })

  it('主副文本相同时不再返回副文本', () => {
    const duplicated: LocalizedText = {
      original: 'Lae\'zel',
      display: 'Lae\'zel',
    }

    expect(getSecondaryLocalizedText(duplicated, 'zh-CN')).toBeNull()
    expect(getSecondaryLocalizedText(duplicated, 'en-US')).toBeNull()
  })

  it('支持按当前语言格式化双语文本和 seat 标签', () => {
    expect(getLocalizedTextPair(briv, 'zh-CN')).toBe('布里夫 · Briv')
    expect(getLocalizedTextPair(briv, 'en-US', ' / ')).toBe('Briv / 布里夫')
    expect(formatSeatLabel(4, 'zh-CN')).toBe('4 号位')
    expect(formatSeatLabel(4, 'en-US')).toBe('Seat 4')
  })
})
