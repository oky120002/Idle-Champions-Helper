import { describe, expect, it } from 'vitest'
import {
  getChampionAttributeGroups,
  getChampionAttributeTags,
  getChampionTagsForGroup,
  getChampionTagLabel,
} from '../../../src/domain/championTags'

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
    expect(getChampionTagLabel('starter', 'zh-CN')).toBe('起始英雄')
  })

  it('会把属性标签拆成结构化分组', () => {
    expect(
      getChampionAttributeGroups([
        'support',
        'human',
        'male',
        'good',
        'lawful',
        'warlock',
        'event',
        'y2',
        'starter',
        'control_slow',
      ]),
    ).toEqual([
      { id: 'race', tags: ['human'] },
      { id: 'gender', tags: ['male'] },
      { id: 'alignment', tags: ['good', 'lawful'] },
      { id: 'profession', tags: ['warlock'] },
      { id: 'acquisition', tags: ['event', 'y2', 'starter'] },
      { id: 'mechanics', tags: ['control_slow'] },
    ])
  })

  it('未归类标签会落到其他分组', () => {
    expect(getChampionAttributeGroups(['support', 'mystery_flag'])).toEqual([
      { id: 'other', tags: ['mystery_flag'] },
    ])
  })

  it('可以按分组提取指定属性标签', () => {
    expect(getChampionTagsForGroup(['support', 'human', 'male', 'warlock'], 'race')).toEqual(['human'])
    expect(getChampionTagsForGroup(['support', 'human', 'male', 'warlock'], 'gender')).toEqual(['male'])
    expect(getChampionTagsForGroup(['support', 'human', 'male', 'warlock'], 'profession')).toEqual([
      'warlock',
    ])
  })
})
