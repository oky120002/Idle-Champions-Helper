import type { SkelAnimManifest } from '../../domain/types'
import { computeFrameBounds, resolveRenderableFrameIndex } from './model'
import type { PreparedSkelAnimData, SkelAnimBounds, SkelAnimSequence } from './types'

interface WalkSequenceMetrics {
  sequence: SkelAnimSequence
  bounds: SkelAnimBounds | null
  firstRenderableFrameIndex: number | null
  frameCount: number
  renderableFrameRatio: number
  persistentPieceRatio: number
  singleFramePieceRatio: number
  averageVisiblePieceRatio: number
  averageMotion: number
  boundsArea: number
}

function buildBoundsWidth(bounds: SkelAnimBounds) {
  return bounds.maxX - bounds.minX
}

function buildBoundsHeight(bounds: SkelAnimBounds) {
  return bounds.maxY - bounds.minY
}

function mergeBounds(base: SkelAnimBounds | null, next: SkelAnimBounds | null) {
  if (!next) {
    return base
  }

  if (!base) {
    return next
  }

  return {
    minX: Math.min(base.minX, next.minX),
    minY: Math.min(base.minY, next.minY),
    maxX: Math.max(base.maxX, next.maxX),
    maxY: Math.max(base.maxY, next.maxY),
  }
}

function buildBoundsArea(bounds: SkelAnimBounds | null) {
  if (!bounds) {
    return 0
  }

  return Math.max(0, bounds.maxX - bounds.minX) * Math.max(0, bounds.maxY - bounds.minY)
}

function buildWalkMotionScore(motionRatio: number) {
  if (!Number.isFinite(motionRatio) || motionRatio <= 0) {
    return 0
  }

  const target = 0.34
  const distance = Math.abs(motionRatio - target)
  return Math.max(0, 1 - distance / 0.4)
}

function summarizeWalkSequenceMetrics(sequence: SkelAnimSequence): WalkSequenceMetrics {
  const frameCount = Math.max(1, sequence.length)
  const pieceCount = Math.max(1, sequence.pieces.length)
  let bounds: SkelAnimBounds | null = null
  let firstRenderableFrameIndex: number | null = null
  let renderableFrameCount = 0
  let totalVisibleFrames = 0
  let persistentPieceCount = 0
  let singleFramePieceCount = 0
  let motionTotal = 0
  let motionPairCount = 0

  for (let frameIndex = 0; frameIndex < sequence.length; frameIndex += 1) {
    const frameBounds = computeFrameBounds(sequence, frameIndex)

    if (!frameBounds) {
      continue
    }

    renderableFrameCount += 1
    bounds = mergeBounds(bounds, frameBounds)

    if (firstRenderableFrameIndex === null) {
      firstRenderableFrameIndex = frameIndex
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
      }

      previousFrame = frame
    }

    if (visibleCount > 1) {
      motionPairCount += visibleCount - 1
    }

    totalVisibleFrames += visibleCount

    if (visibleCount === frameCount) {
      persistentPieceCount += 1
    }

    if (visibleCount === 1) {
      singleFramePieceCount += 1
    }
  }

  return {
    sequence,
    bounds,
    firstRenderableFrameIndex,
    frameCount: sequence.length,
    renderableFrameRatio: renderableFrameCount / frameCount,
    persistentPieceRatio: persistentPieceCount / pieceCount,
    singleFramePieceRatio: singleFramePieceCount / pieceCount,
    averageVisiblePieceRatio: totalVisibleFrames / (pieceCount * frameCount),
    averageMotion: motionPairCount > 0 ? motionTotal / motionPairCount : 0,
    boundsArea: buildBoundsArea(bounds),
  }
}

function resolveRenderableMetrics(manifest: SkelAnimManifest, prepared: PreparedSkelAnimData) {
  const character = prepared.data.characters[0]

  if (!character) {
    return []
  }

  const rawMetrics = character.sequences.map(summarizeWalkSequenceMetrics)
  const renderableMetrics = rawMetrics.filter((item) => item.firstRenderableFrameIndex !== null)
  const maxMotion = Math.max(1, ...renderableMetrics.map((item) => item.averageMotion))
  const maxBoundsArea = Math.max(1, ...renderableMetrics.map((item) => item.boundsArea))
  const maxFrameCount = Math.max(1, ...renderableMetrics.map((item) => item.frameCount))
  const manifestBoundsByIndex = new Map(manifest.sequences.map((sequence) => [sequence.sequenceIndex, sequence.bounds]))

  return renderableMetrics.map((item) => ({
    ...item,
    bounds: manifestBoundsByIndex.get(item.sequence.sequenceIndex) ?? item.bounds,
    boundsAreaRatio: item.boundsArea / maxBoundsArea,
    motionRatio: item.averageMotion / maxMotion,
    frameCountRatio: item.frameCount / maxFrameCount,
  }))
}

function buildWalkCandidateScore(
  candidate: ReturnType<typeof resolveRenderableMetrics>[number],
  current: ReturnType<typeof resolveRenderableMetrics>[number],
) {
  return (
    buildWalkMotionScore(candidate.motionRatio) * 3.5 +
    candidate.averageVisiblePieceRatio * 3 +
    candidate.persistentPieceRatio * 2 +
    candidate.renderableFrameRatio * 1.5 +
    candidate.frameCountRatio * 0.8 -
    candidate.singleFramePieceRatio * 3 -
    Math.abs(candidate.boundsAreaRatio - current.boundsAreaRatio) * 1.1
  )
}

function isWalkCandidate(
  candidate: ReturnType<typeof resolveRenderableMetrics>[number],
  current: ReturnType<typeof resolveRenderableMetrics>[number],
) {
  return (
    candidate.sequence.sequenceIndex !== current.sequence.sequenceIndex &&
    candidate.frameCount > 1 &&
    candidate.averageVisiblePieceRatio >= Math.max(0.58, current.averageVisiblePieceRatio - 0.18) &&
    candidate.persistentPieceRatio >= Math.max(0.52, current.persistentPieceRatio - 0.22) &&
    candidate.singleFramePieceRatio <= 0.28 &&
    candidate.averageMotion > current.averageMotion
  )
}

function resolveWalkViewportBounds(
  sequence: SkelAnimSequence,
  startFrameIndex: number,
  fallbackBounds: SkelAnimBounds,
) {
  const startFrameBounds = computeFrameBounds(sequence, startFrameIndex)

  if (!startFrameBounds) {
    return fallbackBounds
  }

  const fallbackWidth = buildBoundsWidth(fallbackBounds)
  const fallbackHeight = buildBoundsHeight(fallbackBounds)
  const startWidth = buildBoundsWidth(startFrameBounds)
  const startHeight = buildBoundsHeight(startFrameBounds)
  const widthRatio = fallbackWidth / Math.max(1, startWidth)
  const heightRatio = fallbackHeight / Math.max(1, startHeight)

  if (widthRatio <= 1.22 && heightRatio <= 1.18) {
    return fallbackBounds
  }

  const paddingX = Math.max(6, startWidth * 0.12)
  const paddingTop = Math.max(8, startHeight * 0.06)
  const paddingBottom = Math.max(6, startHeight * 0.05)

  return {
    minX: Math.max(fallbackBounds.minX, startFrameBounds.minX - paddingX),
    minY: Math.max(fallbackBounds.minY, startFrameBounds.minY - paddingTop),
    maxX: Math.min(fallbackBounds.maxX, startFrameBounds.maxX + paddingX),
    maxY: Math.min(fallbackBounds.maxY, startFrameBounds.maxY + paddingBottom),
  }
}

function resolveWalkFallbackFrameIndex(
  manifest: SkelAnimManifest,
  sequence: SkelAnimSequence,
  firstRenderableFrameIndex: number,
) {
  if (sequence.sequenceIndex !== manifest.defaultSequenceIndex) {
    return firstRenderableFrameIndex
  }

  return resolveRenderableFrameIndex(sequence, manifest.defaultFrameIndex) ?? firstRenderableFrameIndex
}

export function resolveWalkSequenceSelection(
  manifest: SkelAnimManifest,
  prepared: PreparedSkelAnimData,
) {
  const renderableMetrics = resolveRenderableMetrics(manifest, prepared)
  const current =
    renderableMetrics.find((item) => item.sequence.sequenceIndex === manifest.defaultSequenceIndex) ??
    renderableMetrics[0] ??
    null

  if (!current || current.firstRenderableFrameIndex === null || !current.bounds) {
    return null
  }

  const candidate =
    renderableMetrics
      .filter((item) => isWalkCandidate(item, current))
      .map((item) => ({
        ...item,
        walkCandidateScore: buildWalkCandidateScore(item, current),
      }))
      .sort(
        (left, right) =>
          right.walkCandidateScore - left.walkCandidateScore ||
          left.sequence.sequenceIndex - right.sequence.sequenceIndex,
      )[0] ?? null

  if (!candidate || candidate.firstRenderableFrameIndex === null || !candidate.bounds) {
    const fallbackFrameIndex = resolveWalkFallbackFrameIndex(
      manifest,
      current.sequence,
      current.firstRenderableFrameIndex,
    )
    const fallbackBounds = resolveWalkViewportBounds(
      current.sequence,
      fallbackFrameIndex,
      current.bounds,
    )

    return {
      sequence: current.sequence,
      startFrameIndex: fallbackFrameIndex,
      bounds: fallbackBounds,
    }
  }

  const viewportBounds = resolveWalkViewportBounds(
    candidate.sequence,
    candidate.firstRenderableFrameIndex,
    candidate.bounds,
  )

  return {
    sequence: candidate.sequence,
    startFrameIndex: candidate.firstRenderableFrameIndex,
    bounds: viewportBounds,
  }
}
