import { useEffect, useState, type RefObject } from 'react'
import { RESULTS_QUICK_NAV_THRESHOLD } from '../constants'
import type { ResultsQuickNavigationState } from '../types'
import { getResultsTargetBottom, getResultsTargetTop } from './results-scroll-targets'

const HIDDEN_QUICK_NAVIGATION: ResultsQuickNavigationState = {
  isVisible: false,
  canScrollTop: false,
  canScrollBottom: false,
}

type UseResultsQuickNavigationOptions = {
  filteredCount: number
  visibleCount: number
  resultsShellHeight: number | null
  transitionKey: string
  resultsShellRef: RefObject<HTMLElement | null>
}

export function useResultsQuickNavigation({
  filteredCount,
  visibleCount,
  resultsShellHeight,
  transitionKey,
  resultsShellRef,
}: UseResultsQuickNavigationOptions) {
  const [resultsQuickNavigation, setResultsQuickNavigation] = useState<ResultsQuickNavigationState>(
    HIDDEN_QUICK_NAVIGATION,
  )

  useEffect(() => {
    const updateResultsQuickNavigation = () => {
      const shell = resultsShellRef.current
      const hasEnoughVisibleResults = visibleCount >= RESULTS_QUICK_NAV_THRESHOLD && filteredCount >= visibleCount

      if (!shell || !hasEnoughVisibleResults) {
        setResultsQuickNavigation((current) => {
          if (!current.isVisible && !current.canScrollTop && !current.canScrollBottom) {
            return current
          }

          return HIDDEN_QUICK_NAVIGATION
        })
        return
      }

      const topTarget = getResultsTargetTop(shell)
      const bottomTarget = getResultsTargetBottom(shell)
      const scrollableRange = Math.max(bottomTarget - topTarget, 1)
      const scrollProgress = Math.min(Math.max((window.scrollY - topTarget) / scrollableRange, 0), 1)
      const visibilityThreshold = Math.max(topTarget - 240, 220)
      const canScrollTop = scrollProgress > 0.18
      const canScrollBottom = scrollProgress < 0.88
      const isVisible =
        bottomTarget - topTarget > 160 && window.scrollY >= visibilityThreshold && (canScrollTop || canScrollBottom)

      setResultsQuickNavigation((current) => {
        if (
          current.isVisible === isVisible &&
          current.canScrollTop === canScrollTop &&
          current.canScrollBottom === canScrollBottom
        ) {
          return current
        }

        return {
          isVisible,
          canScrollTop,
          canScrollBottom,
        }
      })
    }

    updateResultsQuickNavigation()
    window.addEventListener('scroll', updateResultsQuickNavigation, { passive: true })
    window.addEventListener('resize', updateResultsQuickNavigation)

    return () => {
      window.removeEventListener('scroll', updateResultsQuickNavigation)
      window.removeEventListener('resize', updateResultsQuickNavigation)
    }
  }, [filteredCount, resultsShellHeight, resultsShellRef, transitionKey, visibleCount])

  return {
    resultsQuickNavigation,
    setResultsQuickNavigation,
  }
}
