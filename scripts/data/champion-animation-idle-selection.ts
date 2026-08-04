import type { SkelAnimFrame, SkelAnimSequence } from './skelanim-codec.ts'
import { computeSkelAnimFrameBounds } from './skelanim-renderer.ts'

// ponytail: skelanim-codec 未导出 SkelAnimBounds 命名，这里在本地补一个与 renderer bounds 形状一致的别名，
// 避免上游 renderer 的 SkelAnimFrameBounds 漂移到本模块。SkelAnimFrameBounds 字段更全（含 width/height/visiblePieceCount），
// 本模块只需 min/max 部分，故独立声明。
interface AnimationBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

interface AnimationSequenceSummary {
  sequenceIndex: number
  frameCount: number
  pieceCount: number
  firstRenderableFrameIndex: number | null
  bounds: AnimationBounds | null
}

interface AnimationSequenceMetrics {
  sequenceIndex: number
  frameIndex: number | null
  frameCount: number
  pieceCount: number
  renderableFrameCount: number
  renderableFrameRatio: number
  persistentPieceCount: number
  persistentPieceRatio: number
  singleFramePieceCount: number
  singleFramePieceRatio: number
  averageVisiblePieceRatio: number
  nullPieceRatio: number
  bounds: AnimationBounds | null
  boundsArea: number
  averageMotion: number
}

interface ScoredAnimationSequenceMetrics extends AnimationSequenceMetrics {
  pieceCoverageRatio: number
  boundsAreaRatio: number
  motionRatio: number
  motionScore: number
  score: number
}

interface SelectIdleDefaultOptions {
  scoredMetrics: readonly ScoredAnimationSequenceMetrics[]
  preferredSequenceIndexes?: readonly number[]
  blockedSequenceIndexes?: readonly number[]
  fixedSequenceIndex?: number | null
}

interface ListIdleCandidateOptions {
  scoredMetrics: readonly ScoredAnimationSequenceMetrics[]
  currentSequenceIndex: number
  blockedSequenceIndexes?: readonly number[]
  fixedSequenceIndex?: number | null
  maxCandidates?: number
}

type SuspicionSignal =
  | 'score_gap'
  | 'visibility_gap'
  | 'persistent_gap'
  | 'coverage_gap'
  | 'motion_gap'
  | 'sparse_default'

type SuspicionLevel = 'none' | 'low' | 'medium' | 'high'

type GraphicDefinition = Record<string, unknown>

function mergeBounds(base: AnimationBounds | null, next: AnimationBounds | null): AnimationBounds | null {
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

function buildBoundsArea(bounds: AnimationBounds | null): number {
  if (!bounds) {
    return 0
  }

  return Math.max(0, bounds.maxX - bounds.minX) * Math.max(0, bounds.maxY - bounds.minY)
}

function buildMotionScore(motionRatio: number): number {
  if (!Number.isFinite(motionRatio) || motionRatio <= 0) {
    return 0.35
  }

  const target = 0.22
  const distance = Math.abs(motionRatio - target)
  return Math.max(0, 1 - distance / 0.45)
}

function isRenderableMetrics(metrics: ScoredAnimationSequenceMetrics): boolean {
  return metrics.frameIndex !== null && metrics.frameIndex >= 0
}

function isUnsafeIdlePromotion(
  currentMetrics: ScoredAnimationSequenceMetrics,
  candidateMetrics: ScoredAnimationSequenceMetrics,
): boolean {
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

export function resolvePreferredSequenceIndexes(graphicDefinition: GraphicDefinition = {}): number[] {
  const exportParams = graphicDefinition.export_params
  if (exportParams === null || typeof exportParams !== 'object') {
    return []
  }
  const sequenceOverride = (exportParams as Record<string, unknown>).sequence_override

  if (!Array.isArray(sequenceOverride) || sequenceOverride.length === 0) {
    return []
  }

  return sequenceOverride
    .map((value) => Number(value) - 1)
    .filter((value) => Number.isInteger(value) && value >= 0)
}

export function summarizeAnimationSequence(sequence: SkelAnimSequence): AnimationSequenceSummary {
  let bounds: AnimationBounds | null = null
  let firstRenderableFrameIndex: number | null = null

  for (let frameIndex = 0; frameIndex < sequence.length; frameIndex += 1) {
    const frameBounds = computeSkelAnimFrameBounds(sequence, frameIndex)

    if (!frameBounds) {
      continue
    }

    firstRenderableFrameIndex ??= frameIndex

    bounds = mergeBounds(bounds, {
      minX: frameBounds.minX,
      minY: frameBounds.minY,
      maxX: frameBounds.maxX,
      maxY: frameBounds.maxY,
    })
  }

  return {
    sequenceIndex: sequence.sequenceIndex,
    frameCount: sequence.length,
    pieceCount: sequence.pieces.length,
    firstRenderableFrameIndex,
    bounds,
  }
}

function computePieceFrameMotion(frame: SkelAnimFrame, previousFrame: SkelAnimFrame): number {
  return (
    Math.abs(frame.x - previousFrame.x) +
    Math.abs(frame.y - previousFrame.y) +
    Math.abs(frame.rotation - previousFrame.rotation) * 12 +
    Math.abs(frame.scaleX - previousFrame.scaleX) * 40 +
    Math.abs(frame.scaleY - previousFrame.scaleY) * 40
  )
}

export function summarizeAnimationSequenceMetrics(
  sequence: SkelAnimSequence,
  sequenceSummary: AnimationSequenceSummary | null,
): AnimationSequenceMetrics {
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
    let previousFrame: SkelAnimFrame | null = null

    for (const frame of piece.frames) {
      if (!frame) {
        continue
      }

      visibleCount += 1

      if (previousFrame) {
        motionTotal += computePieceFrameMotion(frame, previousFrame)
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
  const firstRenderable =
    sequenceSummary?.firstRenderableFrameIndex !== null &&
    typeof sequenceSummary?.firstRenderableFrameIndex === 'number' &&
    sequenceSummary.firstRenderableFrameIndex >= 0
      ? sequenceSummary.firstRenderableFrameIndex
      : null

  return {
    sequenceIndex: sequence.sequenceIndex,
    frameIndex: firstRenderable,
    frameCount: sequence.length,
    pieceCount: sequence.pieces.length,
    renderableFrameRatio: renderableFrameCount / frameCount,
    persistentPieceRatio: persistentPieceCount / pieceCount,
    singleFramePieceRatio: singleFramePieceCount / pieceCount,
    nullPieceRatio: 1 - averageVisiblePieceRatio,
    bounds: sequenceSummary?.bounds ?? null,
    boundsArea: buildBoundsArea(sequenceSummary?.bounds ?? null),
    averageMotion: motionPairCount > 0 ? motionTotal / motionPairCount : 0,
    renderableFrameCount,
    persistentPieceCount,
    singleFramePieceCount,
    averageVisiblePieceRatio,
  }
}

export function scoreAnimationSequenceMetrics(
  rawMetrics: readonly AnimationSequenceMetrics[],
): ScoredAnimationSequenceMetrics[] {
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

export function compareAnimationSequenceMetrics(
  left: ScoredAnimationSequenceMetrics,
  right: ScoredAnimationSequenceMetrics,
): number {
  const scoreDiff = right.score - left.score
  if (scoreDiff !== 0) return scoreDiff
  const boundsDiff = right.boundsAreaRatio - left.boundsAreaRatio
  if (boundsDiff !== 0) return boundsDiff
  const coverageDiff = right.pieceCoverageRatio - left.pieceCoverageRatio
  if (coverageDiff !== 0) return coverageDiff
  const visibilityDiff = right.averageVisiblePieceRatio - left.averageVisiblePieceRatio
  if (visibilityDiff !== 0) return visibilityDiff
  return left.sequenceIndex - right.sequenceIndex
}

export function resolveLegacyDefaultMetrics(
  scoredMetrics: readonly ScoredAnimationSequenceMetrics[],
  preferredSequenceIndexes: readonly number[] = [],
): ScoredAnimationSequenceMetrics | null {
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

export function selectAnimationIdleDefaultMetrics(
  options: SelectIdleDefaultOptions,
): ScoredAnimationSequenceMetrics | null {
  const { scoredMetrics, preferredSequenceIndexes = [], blockedSequenceIndexes = [], fixedSequenceIndex = null } =
    options
  const renderableMetrics = scoredMetrics.filter(isRenderableMetrics)
  const metricsByIndex = new Map(renderableMetrics.map((item) => [item.sequenceIndex, item]))

  if (Number.isInteger(fixedSequenceIndex) && fixedSequenceIndex !== null && fixedSequenceIndex >= 0) {
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
    return candidatePool[0] ?? currentMetrics
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

export function listAnimationIdleCandidateMetrics(
  options: ListIdleCandidateOptions,
): ScoredAnimationSequenceMetrics[] {
  const {
    scoredMetrics,
    currentSequenceIndex,
    blockedSequenceIndexes = [],
    fixedSequenceIndex = null,
    maxCandidates = 3,
  } = options

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

export function buildSuspicionSignals(
  currentMetrics: ScoredAnimationSequenceMetrics,
  recommendedMetrics: ScoredAnimationSequenceMetrics,
): SuspicionSignal[] {
  const signals: SuspicionSignal[] = []

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

export function buildSuspicionLevel(
  currentMetrics: ScoredAnimationSequenceMetrics,
  recommendedMetrics: ScoredAnimationSequenceMetrics,
  signals: readonly SuspicionSignal[],
): SuspicionLevel {
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

// ponytail: 本地 AnimationBounds 只取 min/max；renderer 的 SkelAnimFrameBounds 含更多字段，
// 此处只搬必须的部分，避免上游 renderer 字段漂移到本模块。