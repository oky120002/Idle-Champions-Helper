import type { SkelAnimManifest } from '../../domain/types'
import { computeFrameBounds, resolveRenderableFrameIndex } from './model'
import type {
  PreparedSkelAnimData,
  PreparedSkelAnimEntry,
  SkelAnimBounds,
  SkelAnimCanvasLabels,
  SkelAnimLoadErrorEntry,
  SkelAnimSequence,
} from './types'

export interface PreparedAssetState {
  prepared: PreparedSkelAnimData | null
  loadError: string | null
  isLoading: boolean
}

export interface SkelAnimSequenceSelection {
  sequence: SkelAnimSequence
  startFrameIndex: number
  bounds: SkelAnimBounds
}

export function getBoundsSize(bounds: SkelAnimBounds) {
  return {
    width: Math.max(1, Math.ceil(bounds.maxX - bounds.minX)),
    height: Math.max(1, Math.ceil(bounds.maxY - bounds.minY)),
  }
}

export function resolvePreparedAssetState(
  assetPath: string | null,
  preparedEntry: PreparedSkelAnimEntry | null,
  loadErrorEntry: SkelAnimLoadErrorEntry | null,
): PreparedAssetState {
  const prepared = assetPath && preparedEntry?.assetPath === assetPath ? preparedEntry.value : null
  const loadError = assetPath && loadErrorEntry?.assetPath === assetPath ? loadErrorEntry.message : null

  return {
    prepared,
    loadError,
    isLoading: Boolean(assetPath && !prepared && !loadError),
  }
}

export function resolveSequenceSelection(
  animation: SkelAnimManifest | null,
  prepared: PreparedSkelAnimData | null,
): SkelAnimSequenceSelection | null {
  if (!animation || !prepared) {
    return null
  }

  const character = prepared.data.characters[0]
  const sequence = character?.sequences.find((item) => item.sequenceIndex === animation.defaultSequenceIndex)

  if (!sequence) {
    return null
  }

  const startFrameIndex = resolveRenderableFrameIndex(sequence, animation.defaultFrameIndex)

  if (startFrameIndex === null) {
    return null
  }

  const fallbackBounds = computeFrameBounds(sequence, startFrameIndex)
  const manifestBounds =
    animation.sequences.find((item) => item.sequenceIndex === sequence.sequenceIndex)?.bounds ?? null
  const bounds = manifestBounds ?? fallbackBounds

  return bounds
    ? {
        sequence,
        startFrameIndex,
        bounds,
      }
    : null
}

export function resolveSkelAnimPlayback(
  playbackMode: 'manual' | 'play' | 'pause',
  prefersReducedMotion: boolean,
  isPlaybackEnabled: boolean,
) {
  if (playbackMode === 'play') {
    return !prefersReducedMotion
  }

  if (playbackMode === 'pause') {
    return false
  }

  return isPlaybackEnabled && !prefersReducedMotion
}

interface BuildSkelAnimStatusTextOptions {
  loadError: string | null
  showCanvas: boolean
  prefersReducedMotion: boolean
  labels: SkelAnimCanvasLabels
}

export function buildSkelAnimStatusText({
  loadError,
  showCanvas,
  prefersReducedMotion,
  labels,
}: BuildSkelAnimStatusTextOptions) {
  if (loadError) {
    return `${labels.error} · ${loadError}`
  }

  if (showCanvas) {
    return `${labels.animated}${prefersReducedMotion ? ` · ${labels.reducedMotion}` : ''}`
  }

  return labels.fallback
}

export function buildSkelAnimRootClassName(className?: string) {
  return className ? `skelanim-player ${className}` : 'skelanim-player'
}
