import { useCallback, useEffect, useRef } from 'react'
import { RESULTS_SCROLL_DURATION_MS } from '../constants'

export function useResultsScrollAnimator() {
  const scrollAnimationFrameRef = useRef<number | null>(null)

  const updatePaneScrollTop = useCallback((pane: HTMLElement, top: number) => {
    if (typeof pane.scrollTo === 'function') {
      pane.scrollTo({ top, behavior: 'auto' })
      return
    }

    pane.scrollTop = top
  }, [])

  const cancelScrollAnimation = useCallback(() => {
    if (scrollAnimationFrameRef.current === null) {
      return
    }

    window.cancelAnimationFrame(scrollAnimationFrameRef.current)
    scrollAnimationFrameRef.current = null
  }, [])

  const scrollWindowTo = useCallback(
    (pane: HTMLElement, targetTop: number, onComplete?: () => void) => {
      cancelScrollAnimation()

      if (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        updatePaneScrollTop(pane, targetTop)
        onComplete?.()
        return
      }

      const startTop = pane.scrollTop
      const distance = targetTop - startTop

      if (Math.abs(distance) < 2) {
        onComplete?.()
        return
      }

      let startTime: number | null = null
      const easeOutQuart = (progress: number) => 1 - (1 - progress) ** 4

      const step = (now: number) => {
        if (startTime === null) {
          startTime = now
        }

        const progress = Math.min((now - startTime) / RESULTS_SCROLL_DURATION_MS, 1)

        updatePaneScrollTop(pane, startTop + distance * easeOutQuart(progress))

        if (progress < 1) {
          scrollAnimationFrameRef.current = window.requestAnimationFrame(step)
          return
        }

        scrollAnimationFrameRef.current = null
        onComplete?.()
      }

      scrollAnimationFrameRef.current = window.requestAnimationFrame(step)
    },
    [cancelScrollAnimation, updatePaneScrollTop],
  )

  useEffect(() => cancelScrollAnimation, [cancelScrollAnimation])

  return {
    scrollPaneTo: scrollWindowTo,
  }
}
