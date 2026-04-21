import { useEffect, useState, type RefObject } from 'react'
import { RESULTS_QUICK_NAV_THRESHOLD } from '../constants'
import type { ResultsQuickNavigationState } from '../types'
import { getResultsPaneTargetBottom } from './results-scroll-targets'

const HIDDEN_QUICK_NAVIGATION: ResultsQuickNavigationState = {
  isVisible: false,
  canScrollTop: false,
  canScrollBottom: false,
}

type UseResultsQuickNavigationOptions = {
  filteredCount: number
  visibleCount: number
  transitionKey: string
  resultsPaneRef: RefObject<HTMLElement | null>
}

export function useResultsQuickNavigation({
  filteredCount,
  visibleCount,
  transitionKey,
  resultsPaneRef,
}: UseResultsQuickNavigationOptions) {
  const [resultsQuickNavigation, setResultsQuickNavigation] = useState<ResultsQuickNavigationState>(
    HIDDEN_QUICK_NAVIGATION,
  )

  useEffect(() => {
    const updateResultsQuickNavigation = () => {
      const pane = resultsPaneRef.current
      const hasEnoughVisibleResults = visibleCount >= RESULTS_QUICK_NAV_THRESHOLD && filteredCount >= visibleCount

      if (!pane || !hasEnoughVisibleResults) {
        setResultsQuickNavigation((current) => {
          if (!current.isVisible && !current.canScrollTop && !current.canScrollBottom) {
            return current
          }

          return HIDDEN_QUICK_NAVIGATION
        })
        return
      }

      const bottomTarget = getResultsPaneTargetBottom(pane)
      const canScrollTop = pane.scrollTop > 80
      const canScrollBottom = bottomTarget - pane.scrollTop > 96
      const isVisible = bottomTarget > 240 && (canScrollTop || canScrollBottom)

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
    const pane = resultsPaneRef.current
    pane?.addEventListener('scroll', updateResultsQuickNavigation, { passive: true })
    window.addEventListener('resize', updateResultsQuickNavigation)

    return () => {
      pane?.removeEventListener('scroll', updateResultsQuickNavigation)
      window.removeEventListener('resize', updateResultsQuickNavigation)
    }
  }, [filteredCount, resultsPaneRef, transitionKey, visibleCount])

  return {
    resultsQuickNavigation,
    setResultsQuickNavigation,
  }
}
