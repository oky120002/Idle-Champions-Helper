import { useEffect, useRef, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { prepareSkelAnim, readReducedMotionPreference } from './asset-loader'
import { findNextRenderableFrameIndex, listVisiblePieces } from './model'
import {
  buildSkelAnimRootClassName,
  buildSkelAnimStatusText,
  getBoundsSize,
  resolveCanvasRasterScale,
  resolvePreparedAssetState,
  resolveSequenceSelection,
  resolveSkelAnimPlayback,
  resolveSkelAnimViewportLayout,
  type SkelAnimDisplaySize,
  type SkelAnimSequenceSelection,
  type SkelAnimViewportLayout,
} from './skelanim-canvas-model'
import type {
  PreparedSkelAnimData,
  PreparedSkelAnimEntry,
  SkelAnimBounds,
  SkelAnimCanvasProps,
  SkelAnimLoadErrorEntry,
  SkelAnimSequence,
} from './types'
import { useReducedMotionPreference } from './useReducedMotionPreference'

function paintSkelAnimFrame(
  context: CanvasRenderingContext2D,
  textureById: Map<number, CanvasImageSource>,
  sequence: SkelAnimSequence,
  viewportLayout: SkelAnimViewportLayout,
  frameIndex: number,
  transformScale: number,
  clearWidth: number,
  clearHeight: number,
) {
  context.setTransform(transformScale, 0, 0, transformScale, 0, 0)
  context.clearRect(0, 0, clearWidth, clearHeight)

  for (const { piece, frame } of listVisiblePieces(sequence, frameIndex)) {
    const image = textureById.get(piece.textureId)

    if (image === undefined) {
      continue
    }

    context.save()
    context.translate(viewportLayout.offsetX, viewportLayout.offsetY)
    context.scale(viewportLayout.contentScale, viewportLayout.contentScale)
    context.translate(
      frame.x - viewportLayout.contentBounds.minX,
      frame.y - viewportLayout.contentBounds.minY,
    )
    context.scale(frame.scaleX, frame.scaleY)
    context.rotate(frame.rotation)
    context.drawImage(
      image,
      piece.sourceX,
      piece.sourceY,
      piece.sourceWidth,
      piece.sourceHeight,
      -piece.centerX,
      -piece.centerY,
      piece.sourceWidth,
      piece.sourceHeight,
    )
    context.restore()
  }
}

interface DrawLoopParams {
  canvas: HTMLCanvasElement
  prepared: PreparedSkelAnimData
  sequenceSelection: SkelAnimSequenceSelection
  fps: number
  viewportBounds: SkelAnimBounds | null | undefined
  displaySize: SkelAnimDisplaySize | null
  isPlaying: boolean
  onError: () => void
}

function startSkelAnimDrawLoop(params: DrawLoopParams): () => void {
  const { canvas, prepared, sequenceSelection, fps, viewportBounds, displaySize, isPlaying, onError } = params
  const context = canvas.getContext('2d')

  if (context === null) {
    queueMicrotask(onError)
    return () => {}
  }

  context.imageSmoothingEnabled = false

  const viewportLayout = resolveSkelAnimViewportLayout(sequenceSelection.bounds, viewportBounds ?? null)
  const { width, height } = getBoundsSize(viewportLayout.renderBounds)
  const rasterScale = resolveCanvasRasterScale(viewportLayout.renderBounds, displaySize)
  const textureById = new Map(prepared.textures.map((texture) => [texture.textureId, texture.image]))
  const frameDuration = 1000 / Math.max(1, fps)
  const pixelRatio = Math.max(1, typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1)
  const transformScale = pixelRatio * rasterScale
  let currentFrameIndex = sequenceSelection.startFrameIndex
  let lastTick = 0
  let frameHandle = 0

  canvas.width = Math.round(width * rasterScale * pixelRatio)
  canvas.height = Math.round(height * rasterScale * pixelRatio)

  const drawFrame = (frameIndex: number) => {
    paintSkelAnimFrame(context, textureById, sequenceSelection.sequence, viewportLayout, frameIndex, transformScale, width, height)
  }

  const tick = (timestamp: number) => {
    if (lastTick === 0) {
      lastTick = timestamp
    }

    if (isPlaying && timestamp - lastTick >= frameDuration) {
      currentFrameIndex = findNextRenderableFrameIndex(sequenceSelection.sequence, currentFrameIndex)
      lastTick = timestamp
    }

    drawFrame(currentFrameIndex)
    frameHandle = window.requestAnimationFrame(tick)
  }

  drawFrame(currentFrameIndex)

  if (isPlaying) {
    frameHandle = window.requestAnimationFrame(tick)
  }

  return () => {
    if (frameHandle !== 0) {
      window.cancelAnimationFrame(frameHandle)
    }
  }
}

function setupCanvasDisplaySizeObserver(
  canvasElement: HTMLCanvasElement,
  setDisplaySize: Dispatch<SetStateAction<SkelAnimDisplaySize | null>>,
): () => void {
  const updateDisplaySize = () => {
    setDisplaySize((current) => {
      const next = { width: canvasElement.clientWidth, height: canvasElement.clientHeight }
      if (
        current !== null &&
        Math.abs(current.width - next.width) < 0.5 &&
        Math.abs(current.height - next.height) < 0.5
      ) {
        return current
      }
      return next
    })
  }

  updateDisplaySize()

  if (typeof ResizeObserver !== 'function') {
    return () => {}
  }

  const observer = new ResizeObserver(() => { updateDisplaySize() })
  observer.observe(canvasElement)
  return () => { observer.disconnect() }
}

function renderSkelAnimToolbar(params: {
  showStatus: boolean
  showControls: boolean
  showCanvas: boolean
  playbackMode: 'manual' | 'play' | 'pause'
  isPlaying: boolean
  statusText: string
  playLabel: string
  pauseLabel: string
  onTogglePlayback: () => void
}) {
  const { showStatus, showControls, showCanvas, playbackMode, isPlaying, statusText, playLabel, pauseLabel, onTogglePlayback } = params
  if (!showStatus && !(showControls && showCanvas)) {
    return null
  }

  return (
    <div className="skelanim-player__toolbar">
      {showStatus ? <span className="skelanim-player__status">{statusText}</span> : <span />}
      {showControls && showCanvas && playbackMode === 'manual' ? (
        <button type="button" className="skelanim-player__button" onClick={onTogglePlayback}>
          {isPlaying ? pauseLabel : playLabel}
        </button>
      ) : null}
    </div>
  )
}

export function SkelAnimCanvas({
  animation,
  fallbackSrc,
  alt,
  labels,
  viewportBounds = null,
  className,
  showStatus = true,
  showControls = true,
  playbackMode = 'manual',
  sequenceIntent = 'default',
}: SkelAnimCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const assetPath = animation?.asset.path ?? null
  const [preparedEntry, setPreparedEntry] = useState<PreparedSkelAnimEntry | null>(null)
  const [loadErrorEntry, setLoadErrorEntry] = useState<SkelAnimLoadErrorEntry | null>(null)
  const [displaySize, setDisplaySize] = useState<{ width: number; height: number } | null>(null)
  const prefersReducedMotion = useReducedMotionPreference()
  const [isPlaybackEnabled, setIsPlaybackEnabled] = useState(() => !readReducedMotionPreference())

  useEffect(() => {
    if (assetPath === null) {
      return undefined
    }

    let cancelled = false

    prepareSkelAnim(assetPath)
      .then((nextPrepared) => {
        if (cancelled) {
          return
        }

        setPreparedEntry({ assetPath, value: nextPrepared })
        setLoadErrorEntry(null)
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return
        }

        setLoadErrorEntry({
          assetPath,
          message: error instanceof Error ? error.message : labels.error,
        })
      })

    return () => {
      cancelled = true
    }
  }, [assetPath, labels.error])

  const { prepared, loadError } = resolvePreparedAssetState(
    assetPath,
    preparedEntry,
    loadErrorEntry,
  )
  const sequenceSelection = resolveSequenceSelection(animation, prepared, sequenceIntent)
  const isPlaying = resolveSkelAnimPlayback(
    playbackMode,
    prefersReducedMotion,
    isPlaybackEnabled,
  )
  const showCanvas = animation !== null && prepared !== null && sequenceSelection !== null && loadError === null
  const statusText = buildSkelAnimStatusText({
    loadError,
    showCanvas,
    prefersReducedMotion,
    labels,
  })
  const rootClassName = buildSkelAnimRootClassName(className)

  useEffect(() => {
    if (!showCanvas || canvasRef.current === null) {
      return undefined
    }

    return setupCanvasDisplaySizeObserver(canvasRef.current, setDisplaySize)
  }, [assetPath, showCanvas])

  useEffect(() => {
    if (assetPath === null || prepared === null || sequenceSelection === null || canvasRef.current === null) {
      return undefined
    }

    return startSkelAnimDrawLoop({
      prepared,
      sequenceSelection,
      viewportBounds,
      displaySize,
      isPlaying,
      canvas: canvasRef.current,
      fps: animation?.fps ?? 1,
      onError: () => { setLoadErrorEntry({ assetPath, message: labels.error }) },
    })
  }, [
    animation?.fps,
    assetPath,
    displaySize,
    isPlaying,
    labels.error,
    prepared,
    sequenceIntent,
    sequenceSelection,
    viewportBounds,
  ])

  let stageContent
  if (showCanvas) {
    stageContent = <canvas ref={canvasRef} className="skelanim-player__canvas" role="img" aria-label={alt} />
  } else if (fallbackSrc !== null) {
    stageContent = (
      <img
        className="skelanim-player__fallback-image skin-artwork-dialog__image"
        src={fallbackSrc}
        alt={alt}
        loading="eager"
      />
    )
  } else {
    stageContent = <div className="skin-artwork-dialog__fallback">{loadError ?? labels.error}</div>
  }

  return (
    <div className={rootClassName}>
      <div className="skelanim-player__stage">
        {stageContent}
      </div>

      {renderSkelAnimToolbar({
        showStatus,
        showControls,
        showCanvas,
        playbackMode,
        isPlaying,
        statusText,
        playLabel: labels.play,
        pauseLabel: labels.pause,
        onTogglePlayback: () => { setIsPlaybackEnabled((value) => !value); },
      })}
    </div>
  )
}
