import type { SkelAnimManifest } from '../../domain/types'
import { computeFrameBounds, resolveRenderableFrameIndex } from './model'
import { resolveWalkSequenceSelection } from './walk-selection'
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

export interface SkelAnimViewportLayout {
  renderBounds: SkelAnimBounds
  contentBounds: SkelAnimBounds
  contentScale: number
  offsetX: number
  offsetY: number
}

export interface SkelAnimDisplaySize {
  width: number
  height: number
}

export function getBoundsSize(bounds: SkelAnimBounds) {
  return {
    width: Math.max(1, Math.ceil(bounds.maxX - bounds.minX)),
    height: Math.max(1, Math.ceil(bounds.maxY - bounds.minY)),
  }
}

export function resolveSkelAnimViewportLayout(
  contentBounds: SkelAnimBounds,
  viewportBounds: SkelAnimBounds | null,
): SkelAnimViewportLayout {
  const renderBounds = viewportBounds ?? contentBounds

  if (!viewportBounds) {
    return {
      renderBounds,
      contentBounds,
      contentScale: 1,
      offsetX: 0,
      offsetY: 0,
    }
  }

  return {
    renderBounds,
    contentBounds: viewportBounds,
    contentScale: 1,
    offsetX: 0,
    offsetY: 0,
  }
}

export function resolveCanvasRasterScale(
  renderBounds: SkelAnimBounds,
  displaySize: SkelAnimDisplaySize | null,
) {
  if (!displaySize || displaySize.width <= 0 || displaySize.height <= 0) {
    return 1
  }

  const renderSize = getBoundsSize(renderBounds)
  const widthRatio = displaySize.width / renderSize.width
  const heightRatio = displaySize.height / renderSize.height
  const rasterScale = Math.min(widthRatio, heightRatio)

  if (!Number.isFinite(rasterScale) || rasterScale <= 1) {
    return 1
  }

  return rasterScale
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
  sequenceIntent: 'default' | 'walk' = 'default',
): SkelAnimSequenceSelection | null {
  if (!animation || !prepared) {
    return null
  }

  if (sequenceIntent === 'walk') {
    const walkSelection = resolveWalkSequenceSelection(animation, prepared)

    if (walkSelection) {
      return walkSelection
    }
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
