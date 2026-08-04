import { describe, expect, it } from 'vitest'

import { unwrap } from '../../../tests/utils/dom-assertions'
import { buildEngine } from './searchEngine'
import type { SearchDocumentCollection } from './searchTypes'

const collection: SearchDocumentCollection = {
  updatedAt: '2026-06-09',
  items: [
    {
      championId: '1',
      name: { original: 'Bruenor', display: '布鲁诺' },
      seat: 1,
      portrait: { path: 'v1/champion-portraits/1.png' },
      title: { en: 'Bruenor Bruenor Battlehammer', zh: '布鲁诺 布鲁诺·战锤' },
      body: { en: 'Increase damage for each adjacent Champion', zh: '每与一名勇士同列即提升伤害' },
      meta: { en: 'dwarf fighter support', zh: '矮人 战士 辅助' },
    },
  ],
}

describe('buildEngine', () => {
  it.each([
    { query: '布鲁诺', expectedBucket: 'title', desc: '按中文名命中并归 title 桶' },
    { query: 'Bruenor', expectedBucket: 'title', desc: '按英文名命中并归 title 桶' },
    { query: 'dwarf', expectedBucket: 'meta', desc: '按关键字命中归 meta 桶' },
    { query: '伤害', expectedBucket: 'body', desc: '按正文词命中归 body 桶' },
  ])('$desc', ({ query, expectedBucket }) => {
    const hits = buildEngine(collection).search(query, 5)
    expect(hits).toHaveLength(1)
    expect(unwrap(hits[0], `expected a hit for "${query}"`).bucket).toBe(expectedBucket)
  })

  it('中文命中时返回正确英雄 ID', () => {
    const hits = buildEngine(collection).search('布鲁诺', 5)
    expect(hits).toHaveLength(1)
    expect(unwrap(hits[0], 'expected a hit for "布鲁诺"').doc.championId).toBe('1')
  })

  it('空查询返回空', () => {
    expect(buildEngine(collection).search('   ', 5)).toEqual([])
  })

  it('limit 截断结果', () => {
    expect(buildEngine(collection).search('布鲁诺', 0)).toEqual([])
  })
})
