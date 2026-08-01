import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../data/client', () => ({
  loadCollection: vi.fn(),
  resolveDataUrl: (path: string) => `resolved:${path}`,
}))

import { loadCollection } from '../../data/client'
import { useAnimationAuditPageModel } from './useAnimationAuditPageModel'
import type { AnimationAuditEntry, AnimationAuditSequenceMetrics } from './types'

function buildMetrics(sequenceIndex: number): AnimationAuditSequenceMetrics {
  return {
    sequenceIndex,
    frameIndex: 0,
    frameCount: 0,
    pieceCount: 0,
    renderableFrameCount: 0,
    renderableFrameRatio: 0,
    persistentPieceCount: 0,
    persistentPieceRatio: 0,
    singleFramePieceCount: 0,
    singleFramePieceRatio: 0,
    averageVisiblePieceRatio: 0,
    nullPieceRatio: 0,
    bounds: null,
    boundsArea: 0,
    averageMotion: 0,
    pieceCoverageRatio: 0,
    boundsAreaRatio: 0,
    motionRatio: 0,
    motionScore: 0,
    score: 0,
  }
}

function buildEntry(overrides: Partial<AnimationAuditEntry> = {}): AnimationAuditEntry {
  return {
    id: 'entry-1',
    championId: '7',
    skinId: null,
    kind: 'hero-base',
    seat: 1,
    championName: { original: 'Minsc', display: '明斯克' },
    illustrationName: { original: 'Base', display: '本体' },
    currentSequenceIndex: 1,
    currentFrameIndex: 0,
    sequenceCount: 3,
    suspicionLevel: 'medium',
    suspicionScore: 42,
    suspicionSignals: ['sparse'],
    current: buildMetrics(1),
    recommended: buildMetrics(2),
    candidates: [buildMetrics(1), buildMetrics(2)],
    ...overrides,
  }
}

const auditEntries: AnimationAuditEntry[] = [
  buildEntry({
    id: 'e-high',
    championId: '1',
    kind: 'hero-base',
    suspicionLevel: 'high',
    championName: { original: 'Minsc', display: '明斯克' },
    illustrationName: { original: 'Base', display: '本体' },
  }),
  buildEntry({
    id: 'e-medium',
    championId: '2',
    skinId: 'skin-2',
    kind: 'skin',
    suspicionLevel: 'medium',
    championName: { original: 'Celeste', display: '塞莉丝' },
    illustrationName: { original: 'Holiday', display: '节日' },
  }),
  buildEntry({
    id: 'e-none',
    championId: '3',
    kind: 'hero-base',
    suspicionLevel: 'none',
    championName: { original: 'Birdsong', display: '伯德桑' },
    illustrationName: { original: 'Base', display: '本体' },
  }),
]

const mockedLoadCollection = vi.mocked(loadCollection)

function renderModel() {
  return renderHook(() => useAnimationAuditPageModel())
}

beforeEach(() => {
  mockedLoadCollection.mockImplementation(async (name: string) => {
    if (name === 'champion-animation-audit') return { items: auditEntries, updatedAt: '' }
    if (name === 'champion-animations') return { items: [], updatedAt: '' }
    if (name === 'champion-illustrations') return { items: [], updatedAt: '' }
    throw new Error(`unexpected collection: ${name}`)
  })
  window.localStorage.clear()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('useAnimationAuditPageModel · 加载', () => {
  it('加载完成后进入 ready 状态', async () => {
    const { result } = renderModel()

    expect(result.current.state.status).toBe('loading')
    await waitFor(() => expect(result.current.state.status).toBe('ready'))
  })

  it('loadCollection 失败时进入 error 状态', async () => {
    mockedLoadCollection.mockRejectedValue(new Error('boom'))
    const { result } = renderModel()

    await waitFor(() => expect(result.current.state.status).toBe('error'))
    if (result.current.state.status === 'error') {
      expect(result.current.state.message).toBe('boom')
    }
  })
})

describe('useAnimationAuditPageModel · 过滤', () => {
  it('默认 levelFilter=flagged 只显示疑似项（排除 none）', async () => {
    const { result } = renderModel()
    await waitFor(() => expect(result.current.state.status).toBe('ready'))

    expect(result.current.filteredEntries.map((entry) => entry.id)).toEqual(['e-high', 'e-medium'])
  })

  it('levelFilter=all 显示全部', async () => {
    const { result } = renderModel()
    await waitFor(() => expect(result.current.state.status).toBe('ready'))

    act(() => result.current.setLevelFilter('all'))

    expect(result.current.filteredEntries.map((entry) => entry.id)).toEqual([
      'e-high',
      'e-medium',
      'e-none',
    ])
  })

  it('levelFilter=high 只显示高疑似', async () => {
    const { result } = renderModel()
    await waitFor(() => expect(result.current.state.status).toBe('ready'))

    act(() => result.current.setLevelFilter('high'))

    expect(result.current.filteredEntries.map((entry) => entry.id)).toEqual(['e-high'])
  })

  it('kindFilter=skin 只显示皮肤', async () => {
    const { result } = renderModel()
    await waitFor(() => expect(result.current.state.status).toBe('ready'))

    act(() => {
      result.current.setLevelFilter('all')
      result.current.setKindFilter('skin')
    })

    expect(result.current.filteredEntries.map((entry) => entry.id)).toEqual(['e-medium'])
  })

  it('search 按中英文名/ID 大小写不敏感匹配', async () => {
    const { result } = renderModel()
    await waitFor(() => expect(result.current.state.status).toBe('ready'))

    act(() => {
      result.current.setLevelFilter('all')
      result.current.setSearch('MINSC')
    })
    expect(result.current.filteredEntries.map((entry) => entry.id)).toEqual(['e-high'])

    act(() => result.current.setSearch('节日'))
    expect(result.current.filteredEntries.map((entry) => entry.id)).toEqual(['e-medium'])

    act(() => result.current.setSearch('skin-2'))
    expect(result.current.filteredEntries.map((entry) => entry.id)).toEqual(['e-medium'])

    act(() => result.current.setSearch('   '))
    expect(result.current.filteredEntries.map((entry) => entry.id)).toHaveLength(3)
  })
})

describe('useAnimationAuditPageModel · 摘要聚合', () => {
  it('summary 按 level 与 kind 计数', async () => {
    const { result } = renderModel()
    await waitFor(() => expect(result.current.state.status).toBe('ready'))

    expect(result.current.summary).toEqual({
      total: 3,
      flagged: 2,
      high: 1,
      medium: 1,
      low: 0,
      heroBase: 2,
      skin: 1,
    })
  })
})

describe('useAnimationAuditPageModel · 反馈状态', () => {
  it('设 verdict 后条目保留在 feedbackById', async () => {
    const { result } = renderModel()
    await waitFor(() => expect(result.current.state.status).toBe('ready'))

    act(() => result.current.setFeedbackVerdict('e-high', 'current'))

    expect(result.current.feedbackById['e-high']).toEqual({
      verdict: 'current',
      tags: [],
      note: '',
    })
    expect(result.current.feedbackSummary.withVerdict).toBe(1)
    expect(result.current.feedbackSummary.selected).toBe(1)
    expect(result.current.hasFeedback).toBe(true)
  })

  it('切换 tag 累加/移除', async () => {
    const { result } = renderModel()
    await waitFor(() => expect(result.current.state.status).toBe('ready'))

    act(() => result.current.toggleFeedbackTagById('e-high', 'motion_too_busy'))
    act(() => result.current.toggleFeedbackTagById('e-high', 'samey_template'))

    expect(result.current.feedbackById['e-high']?.tags).toEqual(['motion_too_busy', 'samey_template'])
    expect(result.current.feedbackSummary.withTags).toBe(1)

    act(() => result.current.toggleFeedbackTagById('e-high', 'motion_too_busy'))
    expect(result.current.feedbackById['e-high']?.tags).toEqual(['samey_template'])
  })

  it('note 被写入并计入 withNotes', async () => {
    const { result } = renderModel()
    await waitFor(() => expect(result.current.state.status).toBe('ready'))

    act(() => result.current.setFeedbackNote('e-medium', '脱节'))

    expect(result.current.feedbackById['e-medium']?.note).toBe('脱节')
    expect(result.current.feedbackSummary.withNotes).toBe(1)
  })

  it('清空到全空草稿时条目从 feedbackById 删除（不留空壳）', async () => {
    const { result } = renderModel()
    await waitFor(() => expect(result.current.state.status).toBe('ready'))

    act(() => result.current.setFeedbackVerdict('e-high', 'current'))
    expect(result.current.feedbackById).toHaveProperty('e-high')

    act(() => result.current.setFeedbackVerdict('e-high', null))
    expect(result.current.feedbackById).not.toHaveProperty('e-high')
    expect(result.current.feedbackSummary.selected).toBe(0)
  })

  it('clearFeedback 删除单条，clearAllFeedback 清空全部', async () => {
    const { result } = renderModel()
    await waitFor(() => expect(result.current.state.status).toBe('ready'))

    act(() => {
      result.current.setFeedbackVerdict('e-high', 'current')
      result.current.toggleFeedbackTagById('e-medium', 'samey_template')
    })
    expect(Object.keys(result.current.feedbackById)).toHaveLength(2)

    act(() => result.current.clearFeedback('e-high'))
    expect(result.current.feedbackById).not.toHaveProperty('e-high')
    expect(result.current.feedbackById).toHaveProperty('e-medium')

    act(() => result.current.clearAllFeedback())
    expect(result.current.feedbackById).toEqual({})
  })

  it('note 仅空白时条目不保留（trim 后无意义）', async () => {
    const { result } = renderModel()
    await waitFor(() => expect(result.current.state.status).toBe('ready'))

    act(() => result.current.setFeedbackNote('e-high', '   '))

    expect(result.current.feedbackById).not.toHaveProperty('e-high')
  })
})

describe('useAnimationAuditPageModel · 可见条目截断', () => {
  it('默认只显示前 24 条，canShowMore 反映是否有更多', async () => {
    const many = Array.from({ length: 30 }, (_, index) =>
      buildEntry({ id: `e-${index}`, suspicionLevel: 'high' }),
    )
    mockedLoadCollection.mockImplementation(async (name: string) => {
      if (name === 'champion-animation-audit') return { items: many, updatedAt: '' }
      return { items: [], updatedAt: '' }
    })

    const { result } = renderModel()
    await waitFor(() => expect(result.current.state.status).toBe('ready'))

    expect(result.current.visibleEntries).toHaveLength(24)
    expect(result.current.canShowMore).toBe(true)

    act(() => result.current.setShowAll(true))
    expect(result.current.visibleEntries).toHaveLength(30)
    expect(result.current.canShowMore).toBe(true)
  })
})
