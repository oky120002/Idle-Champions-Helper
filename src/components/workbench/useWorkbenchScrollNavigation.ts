import { useCallback, useEffect, useState, type RefObject } from 'react'

interface UseWorkbenchScrollNavigationOptions {
  scrollRef: RefObject<HTMLDivElement | null>
  threshold?: number
}

export function useWorkbenchScrollNavigation({
  scrollRef,
  threshold = 80,
}: UseWorkbenchScrollNavigationOptions) {
  const [showScrollTop, setShowScrollTop] = useState(false)

  const scrollToTop = useCallback(() => {
    const pane = scrollRef.current

    if (!pane) {
      return
    }

    pane.scrollTo({ top: 0, behavior: 'smooth' })
  }, [scrollRef])

  useEffect(() => {
    const updateVisibility = () => {
      const pane = scrollRef.current

      if (!pane) {
        setShowScrollTop(false)
        return
      }

      const canScroll = pane.scrollHeight - pane.clientHeight > 240
      setShowScrollTop(canScroll && pane.scrollTop > threshold)
    }

    updateVisibility()
    const pane = scrollRef.current
    pane?.addEventListener('scroll', updateVisibility, { passive: true })
    window.addEventListener('resize', updateVisibility)

    return () => {
      pane?.removeEventListener('scroll', updateVisibility)
      window.removeEventListener('resize', updateVisibility)
    }
  }, [scrollRef, threshold])

  return {
    showScrollTop,
    scrollToTop,
  }
}
