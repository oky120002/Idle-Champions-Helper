import { computeSkelAnimFrameBounds } from './skelanim-renderer.mjs'

function mergeBounds(base, next) {
  if (!next) {
    return base
  }

  if (!base) {
    return {
      minX: next.minX,
      minY: next.minY,
      maxX: next.maxX,
      maxY: next.maxY,
    }
  }

  return {
    minX: Math.min(base.minX, next.minX),
    minY: Math.min(base.minY, next.minY),
    maxX: Math.max(base.maxX, next.maxX),
    maxY: Math.max(base.maxY, next.maxY),
  }
}

function buildBoundsArea(bounds) {
  if (!bounds) {
    return 0
  }

  return Math.max(0, bounds.maxX - bounds.minX) * Math.max(0, bounds.maxY - bounds.minY)
}

function buildMotionScore(motionRatio) {
  if (!Number.isFinite(motionRatio) || motionRatio <= 0) {
    return 0.35
  }

  const target = 0.22
  const distance = Math.abs(motionRatio - target)
  return Math.max(0, 1 - distance / 0.45)
}

function isRenderableMetrics(metrics) {
  return typeof metrics.frameIndex === 'number' && metrics.frameIndex >= 0
}

function isUnsafeIdlePromotion(currentMetrics, candidateMetrics) {
  if (candidateMetrics.sequenceIndex === currentMetrics.sequenceIndex) {
    return false
  }

  if (candidateMetrics.motionScore < 0.42) {
    return true
  }

  if (candidateMetrics.averageVisiblePieceRatio < currentMetrics.averageVisiblePieceRatio - 0.12) {
    return true
  }

  if (candidateMetrics.persistentPieceRatio < currentMetrics.persistentPieceRatio - 0.18) {
    return true
  }

  if (candidateMetrics.singleFramePieceRatio > currentMetrics.singleFramePieceRatio + 0.16) {
    return true
  }

  const currentLooksStable =
    currentMetrics.averageVisiblePieceRatio >= 0.95 &&
    currentMetrics.persistentPieceRatio >= 0.95 &&
    currentMetrics.singleFramePieceRatio <= 0.05

  if (currentLooksStable) {
    if (
      candidateMetrics.averageVisiblePieceRatio < 0.95 ||
      candidateMetrics.persistentPieceRatio < 0.95 ||
      candidateMetrics.singleFramePieceRatio > 0.05
    ) {
      return true
    }

    if (candidateMetrics.pieceCoverageRatio <= currentMetrics.pieceCoverageRatio + 0.06) {
      return true
    }
  }

  if (
    candidateMetrics.boundsAreaRatio - currentMetrics.boundsAreaRatio > 0.22 &&
    candidateMetrics.averageVisiblePieceRatio <= currentMetrics.averageVisiblePieceRatio + 0.01 &&
    candidateMetrics.persistentPieceRatio <= currentMetrics.persistentPieceRatio + 0.01 &&
    candidateMetrics.pieceCoverageRatio <= currentMetrics.pieceCoverageRatio + 0.06
  ) {
    return true
  }

  return false
}

export function resolvePreferredSequenceIndexes(graphicDefinition) {
  const sequenceOverride = graphicDefinition?.export_params?.sequence_override

  if (!Array.isArray(sequenceOverride) || sequenceOverride.length === 0) {
    return []
  }

  return sequenceOverride
    .map((value) => Number(value) - 1)
    .filter((value) => Number.isInteger(value) && value >= 0)
}

export function summarizeAnimationSequence(sequence) {
  let bounds = null
  let firstRenderableFrameIndex = null

  for (let frameIndex = 0; frameIndex < sequence.length; frameIndex += 1) {
    const frameBounds = computeSkelAnimFrameBounds(sequence, frameIndex)

    if (!frameBounds) {
      continue
    }

    if (firstRenderableFrameIndex === null) {
      firstRenderableFrameIndex = frameIndex
    }

    bounds = mergeBounds(bounds, frameBounds)
  }

  return {
    sequenceIndex: sequence.sequenceIndex,
    frameCount: sequence.length,
    pieceCount: sequence.pieces.length,
    firstRenderableFrameIndex,
    bounds,
  }
}

export function summarizeAnimationSequenceMetrics(sequence, sequenceSummary) {
  const frameCount = Math.max(1, sequence.length)
  const pieceCount = Math.max(1, sequence.pieces.length)
  let totalVisibleFrames = 0
  let renderableFrameCount = 0
  let persistentPieceCount = 0
  let singleFramePieceCount = 0
  let motionTotal = 0
  let motionPairCount = 0

  for (let frameIndex = 0; frameIndex < sequence.length; frameIndex += 1) {
    let frameHasPiece = false

    for (const piece of sequence.pieces) {
      if (piece.frames[frameIndex]) {
        frameHasPiece = true
        break
      }
    }

    if (frameHasPiece) {
      renderableFrameCount += 1
    }
  }

  for (const piece of sequence.pieces) {
    let visibleCount = 0
    let previousFrame = null

    for (const frame of piece.frames) {
      if (!frame) {
        continue
      }

      visibleCount += 1

      if (previousFrame) {
        motionTotal +=
          Math.abs(frame.x - previousFrame.x) +
          Math.abs(frame.y - previousFrame.y) +
          Math.abs(frame.rotation - previousFrame.rotation) * 12 +
          Math.abs(frame.scaleX - previousFrame.scaleX) * 40 +
          Math.abs(frame.scaleY - previousFrame.scaleY) * 40
        motionPairCount += 1
      }

      previousFrame = frame
    }

    totalVisibleFrames += visibleCount

    if (visibleCount === frameCount) {
      persistentPieceCount += 1
    }

    if (visibleCount === 1) {
      singleFramePieceCount += 1
    }
  }

  const averageVisiblePieceRatio = totalVisibleFrames / (pieceCount * frameCount)

  return {
    sequenceIndex: sequence.sequenceIndex,
    frameIndex:
      typeof sequenceSummary?.firstRenderableFrameIndex === 'number' && sequenceSummary.firstRenderableFrameIndex >= 0
        ? sequenceSummary.firstRenderableFrameIndex
        : null,
    frameCount: sequence.length,
    pieceCount: sequence.pieces.length,
    renderableFrameCount,
    renderableFrameRatio: renderableFrameCount / frameCount,
    persistentPieceCount,
    persistentPieceRatio: persistentPieceCount / pieceCount,
    singleFramePieceCount,
    singleFramePieceRatio: singleFramePieceCount / pieceCount,
    averageVisiblePieceRatio,
    nullPieceRatio: 1 - averageVisiblePieceRatio,
    bounds: sequenceSummary?.bounds ?? null,
    boundsArea: buildBoundsArea(sequenceSummary?.bounds ?? null),
    averageMotion: motionPairCount > 0 ? motionTotal / motionPairCount : 0,
  }
}

export function scoreAnimationSequenceMetrics(rawMetrics) {
  const maxPieceCount = Math.max(1, ...rawMetrics.map((item) => item.pieceCount))
  const maxBoundsArea = Math.max(1, ...rawMetrics.map((item) => item.boundsArea))
  const maxMotion = Math.max(1, ...rawMetrics.map((item) => item.averageMotion))

  return rawMetrics.map((item) => {
    const pieceCoverageRatio = item.pieceCount / maxPieceCount
    const boundsAreaRatio = item.boundsArea / maxBoundsArea
    const motionRatio = item.averageMotion / maxMotion
    const motionScore = buildMotionScore(motionRatio)
    const score =
      boundsAreaRatio * 3.2 +
      pieceCoverageRatio * 2.8 +
      item.averageVisiblePieceRatio * 2.2 +
      item.persistentPieceRatio * 1.8 +
      item.renderableFrameRatio * 0.8 +
      motionScore * 1.4 -
      item.singleFramePieceRatio * 1.1

    return {
      ...item,
      pieceCoverageRatio,
      boundsAreaRatio,
      motionRatio,
      motionScore,
      score: Number(score.toFixed(6)),
    }
  })
}

export function compareAnimationSequenceMetrics(left, right) {
  return (
    right.score - left.score ||
    right.boundsAreaRatio - left.boundsAreaRatio ||
    right.pieceCoverageRatio - left.pieceCoverageRatio ||
    right.averageVisiblePieceRatio - left.averageVisiblePieceRatio ||
    left.sequenceIndex - right.sequenceIndex
  )
}

export function resolveLegacyDefaultMetrics(scoredMetrics, preferredSequenceIndexes = []) {
  const renderableMetrics = scoredMetrics.filter(isRenderableMetrics)
  const metricsByIndex = new Map(renderableMetrics.map((item) => [item.sequenceIndex, item]))

  for (const preferredIndex of preferredSequenceIndexes) {
    const metrics = metricsByIndex.get(preferredIndex)

    if (metrics) {
      return metrics
    }
  }

  return renderableMetrics[0] ?? null
}

export function selectAnimationIdleDefaultMetrics({
  scoredMetrics,
  preferredSequenceIndexes = [],
  blockedSequenceIndexes = [],
  fixedSequenceIndex = null,
}) {
  const renderableMetrics = scoredMetrics.filter(isRenderableMetrics)
  const metricsByIndex = new Map(renderableMetrics.map((item) => [item.sequenceIndex, item]))

  if (Number.isInteger(fixedSequenceIndex) && fixedSequenceIndex >= 0) {
    return metricsByIndex.get(fixedSequenceIndex) ?? null
  }

  const currentMetrics = resolveLegacyDefaultMetrics(renderableMetrics, preferredSequenceIndexes)

  if (!currentMetrics) {
    return null
  }

  const blocked = new Set(blockedSequenceIndexes)
  const candidatePool = renderableMetrics
    .filter((item) => !blocked.has(item.sequenceIndex))
    .sort(compareAnimationSequenceMetrics)

  if (candidatePool.length === 0) {
    return currentMetrics
  }

  if (blocked.has(currentMetrics.sequenceIndex)) {
    return candidatePool[0]
  }

  const safeCandidate =
    candidatePool.find((item) => !isUnsafeIdlePromotion(currentMetrics, item)) ?? currentMetrics

  if (
    safeCandidate.sequenceIndex !== currentMetrics.sequenceIndex &&
    safeCandidate.score - currentMetrics.score < 0.6
  ) {
    return currentMetrics
  }

  return safeCandidate
}

export function listAnimationIdleCandidateMetrics({
  scoredMetrics,
  currentSequenceIndex,
  blockedSequenceIndexes = [],
  fixedSequenceIndex = null,
  maxCandidates = 3,
}) {
  if (Number.isInteger(fixedSequenceIndex) && fixedSequenceIndex === currentSequenceIndex) {
    return []
  }

  const renderableMetrics = scoredMetrics.filter(isRenderableMetrics)
  const currentMetrics =
    renderableMetrics.find((item) => item.sequenceIndex === currentSequenceIndex) ??
    renderableMetrics[0] ??
    null

  if (!currentMetrics) {
    return []
  }

  const blocked = new Set(blockedSequenceIndexes)

  return renderableMetrics
    .filter(
      (item) =>
        item.sequenceIndex !== currentMetrics.sequenceIndex &&
        !blocked.has(item.sequenceIndex) &&
        !isUnsafeIdlePromotion(currentMetrics, item),
    )
    .sort(compareAnimationSequenceMetrics)
    .slice(0, maxCandidates)
}

export function buildSuspicionSignals(currentMetrics, recommendedMetrics) {
  const signals = []

  if (recommendedMetrics.sequenceIndex === currentMetrics.sequenceIndex) {
    return signals
  }

  if (recommendedMetrics.score - currentMetrics.score >= 0.9) {
    signals.push('score_gap')
  }

  if (recommendedMetrics.averageVisiblePieceRatio - currentMetrics.averageVisiblePieceRatio >= 0.12) {
    signals.push('visibility_gap')
  }

  if (recommendedMetrics.persistentPieceRatio - currentMetrics.persistentPieceRatio >= 0.18) {
    signals.push('persistent_gap')
  }

  if (recommendedMetrics.boundsAreaRatio - currentMetrics.boundsAreaRatio >= 0.16) {
    signals.push('coverage_gap')
  }

  if (currentMetrics.motionScore <= 0.45 && recommendedMetrics.motionScore >= 0.72) {
    signals.push('motion_gap')
  }

  if (currentMetrics.averageVisiblePieceRatio <= 0.78 && recommendedMetrics.averageVisiblePieceRatio >= 0.92) {
    signals.push('sparse_default')
  }

  return signals
}

export function buildSuspicionLevel(currentMetrics, recommendedMetrics, signals) {
  if (recommendedMetrics.sequenceIndex === currentMetrics.sequenceIndex) {
    return 'none'
  }

  const scoreDelta = recommendedMetrics.score - currentMetrics.score

  if (scoreDelta >= 1.2 || signals.length >= 3) {
    return 'high'
  }

  if (scoreDelta >= 0.55 || signals.length >= 1) {
    return 'medium'
  }

  return 'low'
}
