import { useEffect, useMemo, useRef, useState } from 'react'
import { prepareSkelAnim, readReducedMotionPreference } from './asset-loader'
import { computeFrameBounds, findNextRenderableFrameIndex, listVisiblePieces, resolveRenderableFrameIndex } from './model'
import type {
  PreparedSkelAnimEntry,
  SkelAnimBounds,
  SkelAnimCanvasProps,
  SkelAnimLoadErrorEntry,
} from './types'

function getBoundsSize(bounds: SkelAnimBounds) {
  return {
    width: Math.max(1, Math.ceil(bounds.maxX - bounds.minX)),
    height: Math.max(1, Math.ceil(bounds.maxY - bounds.minY)),
  }
}

export function SkelAnimCanvas({
  animation,
  fallbackSrc,
  alt,
  labels,
  className,
  showStatus = true,
  showControls = true,
  playbackMode = 'manual',
}: SkelAnimCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const assetPath = animation?.asset.path ?? null
  const [preparedEntry, setPreparedEntry] = useState<PreparedSkelAnimEntry | null>(null)
  const [loadErrorEntry, setLoadErrorEntry] = useState<SkelAnimLoadErrorEntry | null>(null)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(readReducedMotionPreference)
  const [isPlaybackEnabled, setIsPlaybackEnabled] = useState(() => !readReducedMotionPreference())

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches)
    }

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange)
      return () => {
        mediaQuery.removeEventListener('change', handleChange)
      }
    }

    mediaQuery.addListener(handleChange)
    return () => {
      mediaQuery.removeListener(handleChange)
    }
  }, [])

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

  const prepared = assetPath && preparedEntry?.assetPath === assetPath ? preparedEntry.value : null
  const loadError = assetPath && loadErrorEntry?.assetPath === assetPath ? loadErrorEntry.message : null
  const isLoading = Boolean(assetPath && !prepared && !loadError)
  const isPlaying =
    playbackMode === 'play'
      ? !prefersReducedMotion
      : playbackMode === 'pause'
        ? false
        : isPlaybackEnabled && !prefersReducedMotion

  const sequenceSelection = useMemo(() => {
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
    const manifestBounds = animation.sequences.find((item) => item.sequenceIndex === sequence.sequenceIndex)?.bounds ?? null
    const bounds = manifestBounds ?? fallbackBounds

    return bounds
      ? {
          sequence,
          startFrameIndex,
          bounds,
        }
      : null
  }, [animation, prepared])

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

    const { width, height } = getBoundsSize(sequenceSelection.bounds)
    const textureById = new Map(prepared.textures.map((texture) => [texture.textureId, texture.image]))
    const frameDuration = 1000 / Math.max(1, animation?.fps ?? 1)
    const pixelRatio = Math.max(1, typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1)
    let currentFrameIndex = sequenceSelection.startFrameIndex
    let lastTick = 0
    let frameHandle = 0

    canvasRef.current.width = Math.round(width * pixelRatio)
    canvasRef.current.height = Math.round(height * pixelRatio)
    canvasRef.current.style.width = `${width}px`
    canvasRef.current.style.height = `${height}px`

    const drawFrame = (frameIndex: number) => {
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
      context.clearRect(0, 0, width, height)

      for (const { piece, frame } of listVisiblePieces(sequenceSelection.sequence, frameIndex)) {
        const image = textureById.get(piece.textureId)

        if (!image) {
          continue
        }

        context.save()
        context.translate(frame.x - sequenceSelection.bounds.minX, frame.y - sequenceSelection.bounds.minY)
        context.rotate(-frame.rotation)
        context.scale(frame.scaleX, frame.scaleY)
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
    frameHandle = window.requestAnimationFrame(tick)

    return () => {
      window.cancelAnimationFrame(frameHandle)
    }
  }, [animation?.fps, assetPath, isPlaying, labels.error, prepared, sequenceSelection])

  const showCanvas = Boolean(animation && prepared && sequenceSelection && !loadError)
  const statusText = loadError
    ? `${labels.error} · ${loadError}`
    : showCanvas
      ? `${labels.animated}${prefersReducedMotion ? ` · ${labels.reducedMotion}` : ''}`
      : labels.fallback
  const rootClassName = className ? `skelanim-player ${className}` : 'skelanim-player'

  return (
    <div className={rootClassName}>
      <div className="skelanim-player__stage">
        {showCanvas ? (
          <canvas ref={canvasRef} className="skelanim-player__canvas" role="img" aria-label={alt} />
        ) : fallbackSrc ? (
          <img className="skelanim-player__fallback-image skin-artwork-dialog__image" src={fallbackSrc} alt={alt} loading="eager" />
        ) : (
          <div className="skin-artwork-dialog__fallback">{loadError ?? labels.error}</div>
        )}

        {isLoading ? <div className="skelanim-player__badge">{labels.loading}</div> : null}
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
