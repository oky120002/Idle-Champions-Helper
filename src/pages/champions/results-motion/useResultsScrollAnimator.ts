import { useCallback, useEffect, useRef } from 'react'
import { RESULTS_SCROLL_DURATION_MS } from '../constants'

export function useResultsScrollAnimator() {
  const scrollAnimationFrameRef = useRef<number | null>(null)

  const cancelScrollAnimation = useCallback(() => {
    if (scrollAnimationFrameRef.current === null) {
      return
    }

    window.cancelAnimationFrame(scrollAnimationFrameRef.current)
    scrollAnimationFrameRef.current = null
  }, [])

  const scrollWindowTo = useCallback(
    (targetTop: number, onComplete?: () => void) => {
      cancelScrollAnimation()

      if (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        window.scrollTo({ top: targetTop, behavior: 'auto' })
        window.dispatchEvent(new Event('scroll'))
        onComplete?.()
        return
      }

      const startTop = window.scrollY
      const distance = targetTop - startTop

      if (Math.abs(distance) < 2) {
        window.dispatchEvent(new Event('scroll'))
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

        window.scrollTo({
          top: startTop + distance * easeOutQuart(progress),
          behavior: 'auto',
        })

        if (progress < 1) {
          scrollAnimationFrameRef.current = window.requestAnimationFrame(step)
          return
        }

        scrollAnimationFrameRef.current = null
        window.dispatchEvent(new Event('scroll'))
        onComplete?.()
      }

      scrollAnimationFrameRef.current = window.requestAnimationFrame(step)
    },
    [cancelScrollAnimation],
  )

  useEffect(() => cancelScrollAnimation, [cancelScrollAnimation])

  return {
    scrollWindowTo,
  }
}
