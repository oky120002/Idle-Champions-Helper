import { computeSkelAnimFrameBounds } from './skelanim-renderer.mjs'

function mergeBounds(base, next) {
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

function buildBoundsArea(bounds) {
  if (!bounds) {
    return 0
  }

  return Math.max(0, bounds.maxX - bounds.minX) * Math.max(0, bounds.maxY - bounds.minY)
}

function buildBoundsWidth(bounds) {
  return bounds.maxX - bounds.minX
}

function buildBoundsHeight(bounds) {
  return bounds.maxY - bounds.minY
}

function buildWalkMotionScore(motionRatio) {
  if (!Number.isFinite(motionRatio) || motionRatio <= 0) {
    return 0
  }

  const target = 0.34
  const distance = Math.abs(motionRatio - target)
  return Math.max(0, 1 - distance / 0.4)
}

function summarizeWalkSequenceMetrics(sequence) {
  const frameCount = Math.max(1, sequence.length)
  const pieceCount = Math.max(1, sequence.pieces.length)
  let bounds = null
  let firstRenderableFrameIndex = null
  let renderableFrameCount = 0
  let totalVisibleFrames = 0
  let persistentPieceCount = 0
  let singleFramePieceCount = 0
  let motionTotal = 0
  let motionPairCount = 0

  for (let frameIndex = 0; frameIndex < sequence.length; frameIndex += 1) {
    const frameBounds = computeSkelAnimFrameBounds(sequence, frameIndex)

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

function resolveRenderableMetrics(manifest, character) {
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

function buildWalkCandidateScore(candidate, current) {
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

function isWalkCandidate(candidate, current) {
  return (
    candidate.sequence.sequenceIndex !== current.sequence.sequenceIndex &&
    candidate.frameCount > 1 &&
    candidate.averageVisiblePieceRatio >= Math.max(0.58, current.averageVisiblePieceRatio - 0.18) &&
    candidate.persistentPieceRatio >= Math.max(0.52, current.persistentPieceRatio - 0.22) &&
    candidate.singleFramePieceRatio <= 0.28 &&
    candidate.averageMotion > current.averageMotion
  )
}

function resolveWalkViewportBounds(sequence, startFrameIndex, fallbackBounds) {
  const startFrameBounds = computeSkelAnimFrameBounds(sequence, startFrameIndex)

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

function resolveRenderableFrameIndex(sequence, preferredFrameIndex) {
  if (
    Number.isInteger(preferredFrameIndex) &&
    preferredFrameIndex >= 0 &&
    preferredFrameIndex < sequence.length &&
    computeSkelAnimFrameBounds(sequence, preferredFrameIndex)
  ) {
    return preferredFrameIndex
  }

  for (let frameIndex = 0; frameIndex < sequence.length; frameIndex += 1) {
    if (computeSkelAnimFrameBounds(sequence, frameIndex)) {
      return frameIndex
    }
  }

  return null
}

function resolveWalkFallbackFrameIndex(manifest, sequence, firstRenderableFrameIndex) {
  if (sequence.sequenceIndex !== manifest.defaultSequenceIndex) {
    return firstRenderableFrameIndex
  }

  return resolveRenderableFrameIndex(sequence, manifest.defaultFrameIndex) ?? firstRenderableFrameIndex
}

export function resolveWalkPosterPose(manifest, skelAnim, characterIndex = 0) {
  const character = skelAnim.characters[characterIndex]
  const renderableMetrics = resolveRenderableMetrics(manifest, character)
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
    const viewportBounds = resolveWalkViewportBounds(
      current.sequence,
      fallbackFrameIndex,
      current.bounds,
    )

    return {
      sequenceIndex: current.sequence.sequenceIndex,
      frameIndex: fallbackFrameIndex,
      viewportBounds,
    }
  }

  const viewportBounds = resolveWalkViewportBounds(
    candidate.sequence,
    candidate.firstRenderableFrameIndex,
    candidate.bounds,
  )

  return {
    sequenceIndex: candidate.sequence.sequenceIndex,
    frameIndex: candidate.firstRenderableFrameIndex,
    viewportBounds,
  }
}
