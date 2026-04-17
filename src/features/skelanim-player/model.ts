import type { SkelAnimBounds, SkelAnimFrame, SkelAnimSequence } from './types'

export function applyTransform(frame: SkelAnimFrame, x: number, y: number) {
  const angle = -frame.rotation
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)

  return {
    x: cos * frame.scaleX * x + -sin * frame.scaleY * y + frame.x,
    y: sin * frame.scaleX * x + cos * frame.scaleY * y + frame.y,
  }
}

export function listVisiblePieces(sequence: SkelAnimSequence, frameIndex: number) {
  return sequence.pieces
    .map((piece) => ({
      piece,
      frame: piece.frames[frameIndex] ?? null,
    }))
    .filter(
      (entry): entry is { piece: SkelAnimSequence['pieces'][number]; frame: NonNullable<typeof entry.frame> } =>
        entry.frame !== null,
    )
    .sort((left, right) => left.frame.depth - right.frame.depth)
}

export function computeFrameBounds(sequence: SkelAnimSequence, frameIndex: number): SkelAnimBounds | null {
  const visiblePieces = listVisiblePieces(sequence, frameIndex)

  if (visiblePieces.length === 0) {
    return null
  }

  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  for (const { piece, frame } of visiblePieces) {
    const corners = [
      applyTransform(frame, -piece.centerX, -piece.centerY),
      applyTransform(frame, piece.sourceWidth - piece.centerX, -piece.centerY),
      applyTransform(frame, piece.sourceWidth - piece.centerX, piece.sourceHeight - piece.centerY),
      applyTransform(frame, -piece.centerX, piece.sourceHeight - piece.centerY),
    ]

    for (const corner of corners) {
      minX = Math.min(minX, corner.x)
      minY = Math.min(minY, corner.y)
      maxX = Math.max(maxX, corner.x)
      maxY = Math.max(maxY, corner.y)
    }
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    return null
  }

  return { minX, minY, maxX, maxY }
}

export function resolveRenderableFrameIndex(sequence: SkelAnimSequence, preferredFrameIndex: number) {
  if (preferredFrameIndex >= 0 && preferredFrameIndex < sequence.length && computeFrameBounds(sequence, preferredFrameIndex)) {
    return preferredFrameIndex
  }

  for (let frameIndex = 0; frameIndex < sequence.length; frameIndex += 1) {
    if (computeFrameBounds(sequence, frameIndex)) {
      return frameIndex
    }
  }

  return null
}

export function findNextRenderableFrameIndex(sequence: SkelAnimSequence, currentFrameIndex: number) {
  for (let step = 1; step <= sequence.length; step += 1) {
    const nextFrameIndex = (currentFrameIndex + step) % sequence.length

    if (computeFrameBounds(sequence, nextFrameIndex)) {
      return nextFrameIndex
    }
  }

  return currentFrameIndex
}
