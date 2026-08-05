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
  it('按中文名命中并归 title 桶', () => {
    const engine = buildEngine(collection)
    const hits = engine.search('布鲁诺', 5)
    expect(hits).toHaveLength(1)
    const first = unwrap(hits[0], '应命中布鲁诺')
    expect(first.doc.championId).toBe('1')
    expect(first.bucket).toBe('title')
  })

  it('按英文名命中并归 title 桶', () => {
    const engine = buildEngine(collection)
    const hits = engine.search('Bruenor', 5)
    expect(hits).toHaveLength(1)
    expect(unwrap(hits[0], '应命中 Bruenor').bucket).toBe('title')
  })

  it('按关键字命中归 meta 桶', () => {
    const engine = buildEngine(collection)
    const hits = engine.search('dwarf', 5)
    expect(hits).toHaveLength(1)
    expect(unwrap(hits[0], '应命中 dwarf').bucket).toBe('meta')
  })

  it('按正文词命中归 body 桶', () => {
    const engine = buildEngine(collection)
    const hits = engine.search('伤害', 5)
    expect(hits).toHaveLength(1)
    expect(unwrap(hits[0], '应命中 伤害').bucket).toBe('body')
  })

  it('空查询返回空', () => {
    expect(buildEngine(collection).search('   ', 5)).toEqual([])
  })

  it('limit 截断结果', () => {
    expect(buildEngine(collection).search('布鲁诺', 0)).toEqual([])
  })
})
