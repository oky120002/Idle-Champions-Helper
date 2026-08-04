import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  ANIMATION_AUDIT_FEEDBACK_TAGS,
  buildAnimationAuditFeedbackPayload,
  createEmptyAnimationAuditFeedbackDraft,
  isMeaningfulAnimationAuditFeedback,
  normalizeAnimationAuditFeedbackDraft,
  readStoredAnimationAuditFeedback,
  toggleAnimationAuditFeedbackTag,
  writeStoredAnimationAuditFeedback,
} from './feedback'
import type {
  AnimationAuditEntry,
  AnimationAuditFeedbackDraft,
  AnimationAuditFeedbackTag,
  AnimationAuditSequenceMetrics,
} from './types'

const FEEDBACK_STORAGE_KEY = 'animation-audit.feedback.v1'

function buildDraft(partial: Partial<AnimationAuditFeedbackDraft> = {}): AnimationAuditFeedbackDraft {
  return { verdict: null, tags: [], note: '', ...partial }
}

// buildFeedbackExportEntry 只读 sequenceIndex，其余 metrics 字段给零值即可。
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
    candidates: [buildMetrics(1), buildMetrics(2), buildMetrics(3)],
    ...overrides,
  }
}

describe('ANIMATION_AUDIT_FEEDBACK_TAGS', () => {
  it('按固定顺序暴露全部可选项，新增/删改 tag 需同步前端与导出契约', () => {
    expect(ANIMATION_AUDIT_FEEDBACK_TAGS).toEqual([
      'joint_dislocation',
      'not_idle_like',
      'motion_too_busy',
      'sparse_or_cropped',
      'samey_template',
    ])
  })
})

describe('createEmptyAnimationAuditFeedbackDraft', () => {
  it('初始草稿 verdict 为空、无 tag、note 为空串', () => {
    expect(createEmptyAnimationAuditFeedbackDraft()).toEqual({ verdict: null, tags: [], note: '' })
  })
})

describe('normalizeAnimationAuditFeedbackDraft', () => {
  it('全空草稿归一化为 null（不构成有效反馈）', () => {
    expect(normalizeAnimationAuditFeedbackDraft(buildDraft())).toBeNull()
  })

  it('只有空白 note 时也归一化为 null（trim 后无内容）', () => {
    expect(normalizeAnimationAuditFeedbackDraft(buildDraft({ note: '   \t  ' }))).toBeNull()
  })

  it('只设 verdict 时保留草稿，note trim 为空串', () => {
    expect(normalizeAnimationAuditFeedbackDraft(buildDraft({ verdict: 'current' }))).toEqual({
      verdict: 'current',
      tags: [],
      note: '',
    })
  })

  it('只设 tag 时保留草稿', () => {
    expect(
      normalizeAnimationAuditFeedbackDraft(buildDraft({ tags: ['motion_too_busy'] })),
    ).toEqual({ verdict: null, tags: ['motion_too_busy'], note: '' })
  })

  it('note 前后空白会被 trim', () => {
    expect(normalizeAnimationAuditFeedbackDraft(buildDraft({ note: '  有问题  ' }))).toEqual({
      verdict: null,
      tags: [],
      note: '有问题',
    })
  })

  it('重复 tag 去重并按白名单顺序重排', () => {
    const result = normalizeAnimationAuditFeedbackDraft(
      buildDraft({ tags: ['samey_template', 'motion_too_busy', 'motion_too_busy'] }),
    )
    expect(result?.tags).toEqual(['motion_too_busy', 'samey_template'])
  })

  it('verdict + tags + note 同时存在时全部保留', () => {
    expect(
      normalizeAnimationAuditFeedbackDraft(
        buildDraft({ verdict: 'recommended', tags: ['joint_dislocation'], note: '脱节' }),
      ),
    ).toEqual({ verdict: 'recommended', tags: ['joint_dislocation'], note: '脱节' })
  })
})

describe('isMeaningfulAnimationAuditFeedback', () => {
  it('undefined 不是有效反馈（类型守卫收窄到 false）', () => {
    expect(isMeaningfulAnimationAuditFeedback(undefined)).toBe(false)
  })

  it('全空草稿不是有效反馈', () => {
    expect(isMeaningfulAnimationAuditFeedback(buildDraft())).toBe(false)
  })

  it('带内容的草稿是有效反馈', () => {
    expect(isMeaningfulAnimationAuditFeedback(buildDraft({ verdict: 'current' }))).toBe(true)
    expect(isMeaningfulAnimationAuditFeedback(buildDraft({ tags: ['samey_template'] }))).toBe(true)
    expect(isMeaningfulAnimationAuditFeedback(buildDraft({ note: '备注' }))).toBe(true)
  })
})

describe('toggleAnimationAuditFeedbackTag', () => {
  it('未选中的 tag 被追加', () => {
    const result = toggleAnimationAuditFeedbackTag(buildDraft(), 'motion_too_busy')
    expect(result.tags).toEqual(['motion_too_busy'])
  })

  it('已选中的 tag 被移除', () => {
    const result = toggleAnimationAuditFeedbackTag(
      buildDraft({ tags: ['motion_too_busy', 'samey_template'] }),
      'motion_too_busy',
    )
    expect(result.tags).toEqual(['samey_template'])
  })

  it('toggle 不影响 verdict 与 note', () => {
    const result = toggleAnimationAuditFeedbackTag(
      buildDraft({ verdict: 'manual', note: '备注' }),
      'joint_dislocation',
    )
    expect(result.verdict).toBe('manual')
    expect(result.note).toBe('备注')
  })

  it('toggle 结果会按白名单去重排序', () => {
    const result = toggleAnimationAuditFeedbackTag(
      buildDraft({ tags: ['samey_template'] as AnimationAuditFeedbackTag[] }),
      'motion_too_busy',
    )
    expect(result.tags).toEqual(['motion_too_busy', 'samey_template'])
  })
})

describe('buildAnimationAuditFeedbackPayload', () => {
  const generatedAt = '2026-08-01T00:00:00Z'
  const sourceHref = 'https://example.test/audit'

  it('过滤掉无有效反馈的条目，totalSelected 只计有效项', () => {
    const payload = buildAnimationAuditFeedbackPayload({
      auditEntries: [
        buildEntry({ id: 'empty' }),
        buildEntry({ id: 'meaningful' }),
        buildEntry({ id: 'also-empty' }),
      ],
      feedbackById: {
        meaningful: buildDraft({ verdict: 'current' }),
      },
      generatedAt,
      sourceHref,
    })

    expect(payload.version).toBe(1)
    expect(payload.generatedAt).toBe(generatedAt)
    expect(payload.sourceHref).toBe(sourceHref)
    expect(payload.totalSelected).toBe(1)
    expect(payload.entries.map((entry) => entry.id)).toEqual(['meaningful'])
  })

  it('sourceHref 允许为 null', () => {
    const payload = buildAnimationAuditFeedbackPayload({
      auditEntries: [],
      feedbackById: {},
      generatedAt,
      sourceHref: null,
    })
    expect(payload.sourceHref).toBeNull()
    expect(payload.entries).toEqual([])
  })

  it('verdict=current → preferredSequenceIndex 取当前序列', () => {
    const entry = buildEntry({ id: 'e-current', current: buildMetrics(9) })
    const [result] = buildAnimationAuditFeedbackPayload({
      auditEntries: [entry],
      feedbackById: { 'e-current': buildDraft({ verdict: 'current' }) },
      generatedAt,
      sourceHref,
    }).entries
    expect(result?.preferredSequenceIndex).toBe(9)
    expect(result?.currentSequenceIndex).toBe(9)
  })

  it('verdict=recommended → preferredSequenceIndex 取推荐序列', () => {
    const entry = buildEntry({ id: 'e-rec', recommended: buildMetrics(7) })
    const [result] = buildAnimationAuditFeedbackPayload({
      auditEntries: [entry],
      feedbackById: { 'e-rec': buildDraft({ verdict: 'recommended' }) },
      generatedAt,
      sourceHref,
    }).entries
    expect(result?.preferredSequenceIndex).toBe(7)
    expect(result?.recommendedSequenceIndex).toBe(7)
  })

  it('verdict=alternate → preferredSequenceIndex 取首个非推荐候选序列', () => {
    const entry = buildEntry({
      id: 'e-alt',
      recommended: buildMetrics(2),
      candidates: [buildMetrics(2), buildMetrics(5), buildMetrics(8)],
    })
    const [result] = buildAnimationAuditFeedbackPayload({
      auditEntries: [entry],
      feedbackById: { 'e-alt': buildDraft({ verdict: 'alternate' }) },
      generatedAt,
      sourceHref,
    }).entries
    expect(result?.preferredSequenceIndex).toBe(5)
    expect(result?.alternateSequenceIndex).toBe(5)
  })

  it('verdict=alternate 但无可用候选 → preferredSequenceIndex 落到 null', () => {
    const entry = buildEntry({
      id: 'e-alt-none',
      recommended: buildMetrics(2),
      candidates: [buildMetrics(2)],
    })
    const [result] = buildAnimationAuditFeedbackPayload({
      auditEntries: [entry],
      feedbackById: { 'e-alt-none': buildDraft({ verdict: 'alternate' }) },
      generatedAt,
      sourceHref,
    }).entries
    expect(result?.preferredSequenceIndex).toBeNull()
    expect(result?.alternateSequenceIndex).toBeNull()
  })

  it('verdict=manual → preferredSequenceIndex 为 null', () => {
    const [result] = buildAnimationAuditFeedbackPayload({
      auditEntries: [buildEntry({ id: 'e-manual' })],
      feedbackById: { 'e-manual': buildDraft({ verdict: 'manual', note: '手调' }) },
      generatedAt,
      sourceHref,
    }).entries
    expect(result?.preferredSequenceIndex).toBeNull()
    expect(result?.note).toBe('手调')
  })

  it('导出条目携带审计元信息与反馈快照', () => {
    const [result] = buildAnimationAuditFeedbackPayload({
      auditEntries: [
        buildEntry({
          id: 'e-meta',
          championId: '42',
          skinId: 'skin-3',
          kind: 'skin',
          seat: 6,
          championName: { original: 'Celeste', display: '塞莉丝' },
          illustrationName: { original: 'Holiday', display: '节日' },
          suspicionLevel: 'high',
          suspicionScore: 88,
          suspicionSignals: ['motion_too_busy', 'joint_dislocation'],
          recommended: buildMetrics(3),
          candidates: [buildMetrics(3), buildMetrics(4)],
        }),
      ],
      feedbackById: {
        'e-meta': buildDraft({ verdict: 'recommended', tags: ['samey_template'], note: '模板化' }),
      },
      generatedAt,
      sourceHref,
    }).entries

    expect(result).toMatchObject({
      id: 'e-meta',
      championId: '42',
      skinId: 'skin-3',
      kind: 'skin',
      seat: 6,
      championName: '塞莉丝',
      illustrationName: '节日',
      suspicionLevel: 'high',
      suspicionScore: 88,
      suspicionSignals: ['motion_too_busy', 'joint_dislocation'],
      verdict: 'recommended',
      tags: ['samey_template'],
      note: '模板化',
    })
  })
})

// localStorage 读写依赖 window。node 环境下 window 未定义，先测守卫路径，
// 再用 vi.stubGlobal 注入模拟 localStorage 测防御性解析。
describe('readStoredAnimationAuditFeedback', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('window 未定义时返回空对象（SSR/Node 守卫）', () => {
    expect(readStoredAnimationAuditFeedback()).toEqual({})
  })

  function stubLocalStorage(store: Map<string, string>) {
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
          store.set(key, value)
        },
      },
    })
  }

  it('无存储值时返回空对象', () => {
    stubLocalStorage(new Map())
    expect(readStoredAnimationAuditFeedback()).toEqual({})
  })

  it('存储值非合法 JSON 时回退空对象（不抛错）', () => {
    const store = new Map<string, string>([[FEEDBACK_STORAGE_KEY, '{not json']])
    stubLocalStorage(store)
    expect(readStoredAnimationAuditFeedback()).toEqual({})
  })

  it('存储值 JSON 非对象时回退空对象', () => {
    stubLocalStorage(new Map<string, string>([[FEEDBACK_STORAGE_KEY, '[]']]))
    expect(readStoredAnimationAuditFeedback()).toEqual({})
  })

  it('合法条目被归一化，空草稿条目被丢弃', () => {
    const store = new Map<string, string>([
      [
        FEEDBACK_STORAGE_KEY,
        JSON.stringify({
          'good-current': { verdict: 'current', tags: ['motion_too_busy'], note: '保留' },
          'empty': { verdict: null, tags: [], note: '' },
          'whitespace-only': { verdict: null, tags: [], note: '   ' },
        }),
      ],
    ])
    stubLocalStorage(store)

    expect(readStoredAnimationAuditFeedback()).toEqual({
      'good-current': { verdict: 'current', tags: ['motion_too_busy'], note: '保留' },
    })
  })

  it('条目值非对象时被跳过', () => {
    const store = new Map<string, string>([
      [
        FEEDBACK_STORAGE_KEY,
        JSON.stringify({
          'bad-value': 'not-an-object',
          'good': { verdict: 'manual', tags: [], note: 'ok' },
        }),
      ],
    ])
    stubLocalStorage(store)

    expect(readStoredAnimationAuditFeedback()).toEqual({
      good: { verdict: 'manual', tags: [], note: 'ok' },
    })
  })

  it('未知 tag 被裁剪，已知 tag 去重排序；非法 note 被强制为空串', () => {
    const store = new Map<string, string>([
      [
        FEEDBACK_STORAGE_KEY,
        JSON.stringify({
          'coerce': {
            verdict: 'recommended',
            tags: ['unknown_tag', 'samey_template', 'samey_template', 'motion_too_busy'],
            note: 12345,
          },
        }),
      ],
    ])
    stubLocalStorage(store)

    expect(readStoredAnimationAuditFeedback()).toEqual({
      coerce: {
        verdict: 'recommended',
        tags: ['motion_too_busy', 'samey_template'],
        note: '',
      },
    })
  })

  it('tags 非数组时回退为空数组', () => {
    const store = new Map<string, string>([
      [
        FEEDBACK_STORAGE_KEY,
        JSON.stringify({ 'bad-tags': { verdict: 'current', tags: 'nope', note: 'x' } }),
      ],
    ])
    stubLocalStorage(store)

    expect(readStoredAnimationAuditFeedback()).toEqual({
      'bad-tags': { verdict: 'current', tags: [], note: 'x' },
    })
  })
})

describe('writeStoredAnimationAuditFeedback', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('window 未定义时直接返回不抛错（SSR/Node 守卫）', () => {
    expect(() => writeStoredAnimationAuditFeedback({})).not.toThrow()
  })

  it('有 window 时以 storage key 写入 JSON 序列化结果', () => {
    const store = new Map<string, string>()
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
          store.set(key, value)
        },
      },
    })

    const feedbackById = {
      'e-1': { verdict: 'current' as const, tags: [], note: 'n' },
    }
    writeStoredAnimationAuditFeedback(feedbackById)

    expect(store.get(FEEDBACK_STORAGE_KEY)).toBe(JSON.stringify(feedbackById))
  })
})
