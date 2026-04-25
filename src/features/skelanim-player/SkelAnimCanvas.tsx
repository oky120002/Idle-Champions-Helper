import { useEffect, useRef, useState } from 'react'
import { prepareSkelAnim, readReducedMotionPreference } from './asset-loader'
import {
  buildSkelAnimRootClassName,
  buildSkelAnimStatusText,
  getBoundsSize,
  resolveCanvasRasterScale,
  resolvePreparedAssetState,
  resolveSequenceSelection,
  resolveSkelAnimPlayback,
  resolveSkelAnimViewportLayout,
} from './skelanim-canvas-model'
import { findNextRenderableFrameIndex, listVisiblePieces } from './model'
import type {
  PreparedSkelAnimEntry,
  SkelAnimCanvasProps,
  SkelAnimLoadErrorEntry,
} from './types'
import { useReducedMotionPreference } from './useReducedMotionPreference'

export function SkelAnimCanvas({
  animation,
  fallbackSrc,
  alt,
  labels,
  viewportBounds = null,
  className,
  showStatus = true,
  showControls = true,
  showLoadingBadge = true,
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
    if (!assetPath) {
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

  const { prepared, loadError, isLoading } = resolvePreparedAssetState(
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
  const showCanvas = Boolean(animation && prepared && sequenceSelection && !loadError)
  const statusText = buildSkelAnimStatusText({
    loadError,
    showCanvas,
    prefersReducedMotion,
    labels,
  })
  const rootClassName = buildSkelAnimRootClassName(className)

  useEffect(() => {
    if (!showCanvas || !canvasRef.current) {
      return undefined
    }

    const canvasElement = canvasRef.current
    const updateDisplaySize = () => {
      const nextDisplaySize = {
        width: canvasElement.clientWidth,
        height: canvasElement.clientHeight,
      }

      setDisplaySize((currentSize) => {
        if (
          currentSize &&
          Math.abs(currentSize.width - nextDisplaySize.width) < 0.5 &&
          Math.abs(currentSize.height - nextDisplaySize.height) < 0.5
        ) {
          return currentSize
        }

        return nextDisplaySize
      })
    }

    updateDisplaySize()

    if (typeof ResizeObserver !== 'function') {
      return undefined
    }

    const observer = new ResizeObserver(() => {
      updateDisplaySize()
    })

    observer.observe(canvasElement)

    return () => {
      observer.disconnect()
    }
  }, [assetPath, showCanvas])

  useEffect(() => {
    if (!assetPath || !prepared || !sequenceSelection || !canvasRef.current) {
      return undefined
    }

    const context = canvasRef.current.getContext('2d')

    if (!context) {
      queueMicrotask(() => {
        setLoadErrorEntry({
          assetPath,
          message: labels.error,
        })
      })
      return undefined
    }

    context.imageSmoothingEnabled = false

    const viewportLayout = resolveSkelAnimViewportLayout(sequenceSelection.bounds, viewportBounds)
    const { width, height } = getBoundsSize(viewportLayout.renderBounds)
    const rasterScale = resolveCanvasRasterScale(viewportLayout.renderBounds, displaySize)
    const textureById = new Map(prepared.textures.map((texture) => [texture.textureId, texture.image]))
    const frameDuration = 1000 / Math.max(1, animation?.fps ?? 1)
    const pixelRatio = Math.max(1, typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1)
    let currentFrameIndex = sequenceSelection.startFrameIndex
    let lastTick = 0
    let frameHandle = 0

    canvasRef.current.width = Math.round(width * rasterScale * pixelRatio)
    canvasRef.current.height = Math.round(height * rasterScale * pixelRatio)

    const drawFrame = (frameIndex: number) => {
      context.setTransform(pixelRatio * rasterScale, 0, 0, pixelRatio * rasterScale, 0, 0)
      context.clearRect(0, 0, width, height)

      for (const { piece, frame } of listVisiblePieces(sequenceSelection.sequence, frameIndex)) {
        const image = textureById.get(piece.textureId)

        if (!image) {
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

    const tick = (timestamp: number) => {
      if (!lastTick) {
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
      if (frameHandle) {
        window.cancelAnimationFrame(frameHandle)
      }
    }
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

  return (
    <div className={rootClassName}>
      <div className="skelanim-player__stage">
        {showCanvas ? (
          <canvas ref={canvasRef} className="skelanim-player__canvas" role="img" aria-label={alt} />
        ) : fallbackSrc ? (
          <img
            className="skelanim-player__fallback-image skin-artwork-dialog__image"
            src={fallbackSrc}
            alt={alt}
            loading="eager"
          />
        ) : (
          <div className="skin-artwork-dialog__fallback">{loadError ?? labels.error}</div>
        )}

        {showLoadingBadge && isLoading ? <div className="skelanim-player__badge">{labels.loading}</div> : null}
      </div>

      {showStatus || (showControls && showCanvas) ? (
        <div className="skelanim-player__toolbar">
          {showStatus ? <span className="skelanim-player__status">{statusText}</span> : <span />}
          {showControls && showCanvas && playbackMode === 'manual' ? (
            <button
              type="button"
              className="skelanim-player__button"
              onClick={() => setIsPlaybackEnabled((value) => !value)}
            >
              {isPlaying ? labels.pause : labels.play}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
