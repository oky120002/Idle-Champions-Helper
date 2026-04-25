import test from 'node:test'
import assert from 'node:assert/strict'
import {
  listAnimationIdleCandidateMetrics,
  selectAnimationIdleDefaultMetrics,
} from './champion-animation-idle-selection.mjs'

function createMetrics(overrides) {
  return {
    sequenceIndex: 0,
    frameIndex: 0,
    frameCount: 12,
    pieceCount: 20,
    renderableFrameCount: 12,
    renderableFrameRatio: 1,
    persistentPieceCount: 20,
    persistentPieceRatio: 1,
    singleFramePieceCount: 0,
    singleFramePieceRatio: 0,
    averageVisiblePieceRatio: 1,
    nullPieceRatio: 0,
    bounds: { minX: 0, minY: 0, maxX: 100, maxY: 100 },
    boundsArea: 10000,
    averageMotion: 10,
    pieceCoverageRatio: 0.8,
    boundsAreaRatio: 0.6,
    motionRatio: 0.22,
    motionScore: 1,
    score: 8,
    ...overrides,
  }
}

test('selectAnimationIdleDefaultMetrics 会拒绝只靠大轮廓撑高分但更碎的 sequence', () => {
  const current = createMetrics({
    sequenceIndex: 0,
    score: 8.2,
    boundsAreaRatio: 0.24,
    pieceCoverageRatio: 0.46,
    motionScore: 0.61,
  })
  const overstretched = createMetrics({
    sequenceIndex: 4,
    score: 9.7,
    boundsAreaRatio: 1,
    pieceCoverageRatio: 0.48,
    averageVisiblePieceRatio: 0.9,
    persistentPieceRatio: 0.88,
    motionScore: 0.22,
    motionRatio: 0.57,
  })

  const selected = selectAnimationIdleDefaultMetrics({
    scoredMetrics: [current, overstretched],
    preferredSequenceIndexes: [0],
  })

  assert.equal(selected?.sequenceIndex, 0)
})

test('selectAnimationIdleDefaultMetrics 尊重 fixedSequenceIndex 覆写', () => {
  const current = createMetrics({ sequenceIndex: 0, score: 8.2 })
  const better = createMetrics({ sequenceIndex: 2, score: 9.4, pieceCoverageRatio: 0.95, boundsAreaRatio: 0.9 })

  const selected = selectAnimationIdleDefaultMetrics({
    scoredMetrics: [current, better],
    preferredSequenceIndexes: [0],
    fixedSequenceIndex: 0,
  })

  assert.equal(selected?.sequenceIndex, 0)
})

test('listAnimationIdleCandidateMetrics 不再推荐已被人工封禁的 sequence', () => {
  const current = createMetrics({ sequenceIndex: 0, score: 8.2 })
  const blocked = createMetrics({
    sequenceIndex: 4,
    score: 9.5,
    boundsAreaRatio: 0.88,
    pieceCoverageRatio: 0.88,
    motionScore: 0.86,
    motionRatio: 0.2,
  })
  const fallback = createMetrics({
    sequenceIndex: 1,
    score: 8.9,
    boundsAreaRatio: 0.52,
    pieceCoverageRatio: 0.9,
    motionScore: 0.81,
    motionRatio: 0.18,
  })

  const candidates = listAnimationIdleCandidateMetrics({
    scoredMetrics: [current, blocked, fallback],
    currentSequenceIndex: 0,
    blockedSequenceIndexes: [4],
    maxCandidates: 3,
  })

  assert.deepEqual(
    candidates.map((item) => item.sequenceIndex),
    [1],
  )
})
