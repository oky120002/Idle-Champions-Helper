import { describe, expect, it } from 'vitest'
import { getChampionAttributeTags, getChampionTagLabel } from '../../../src/domain/championTags'

describe('championTags', () => {
  it('属性标签会排除已经单独展示的定位标签', () => {
    expect(getChampionAttributeTags(['support', 'human', 'event', 'control_slow'])).toEqual([
      'human',
      'event',
      'control_slow',
    ])
  })

  it('会把常见标签转换成更易读的中文文案', () => {
    expect(getChampionTagLabel('male', 'zh-CN')).toBe('男性')
    expect(getChampionTagLabel('control_slow', 'zh-CN')).toBe('减速控制')
    expect(getChampionTagLabel('y2', 'zh-CN')).toBe('第 2 年活动')
    expect(getChampionTagLabel('starter', 'zh-CN')).toBe('starter')
  })
})
