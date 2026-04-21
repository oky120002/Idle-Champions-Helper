import { useCallback, useRef } from 'react'
import { getResultsPaneTargetBottom, getResultsPaneTargetTop } from './results-motion/results-scroll-targets'
import { useResultsQuickNavigation } from './results-motion/useResultsQuickNavigation'
import { useResultsScrollAnimator } from './results-motion/useResultsScrollAnimator'
import { useResultsScrollRestore } from './results-motion/useResultsScrollRestore'
import { useResultsViewportTransition } from './results-motion/useResultsViewportTransition'
import type { ResultsTransitionReason } from './types'

interface UseChampionResultsMotionOptions {
  locationSearch: string
  stateStatus: 'loading' | 'ready' | 'error'
  filteredCount: number
  visibleCount: number
  showAllResults: boolean
  transitionKey: string
}

export function useChampionResultsMotion({
  locationSearch,
  stateStatus,
  filteredCount,
  visibleCount,
  showAllResults,
  transitionKey,
}: UseChampionResultsMotionOptions) {
  const resultsPaneRef = useRef<HTMLDivElement | null>(null)
  const resultsPaneSectionRef = useRef<HTMLElement | null>(null)
  const { scrollPaneTo } = useResultsScrollAnimator()

  useResultsScrollRestore({
    locationSearch,
    stateStatus,
    showAllResults,
    visibleCount,
    resultsPaneRef,
  })

  const { prepareResultsViewportTransition } = useResultsViewportTransition({
    transitionKey,
    resultsPaneRef,
    scrollPaneTo,
  })
  const { resultsQuickNavigation, setResultsQuickNavigation } = useResultsQuickNavigation({
    filteredCount,
    visibleCount,
    transitionKey,
    resultsPaneRef,
  })

  const scrollResultsToBoundary = useCallback(
    (direction: 'top' | 'bottom') => {
      const pane = resultsPaneRef.current

      if (!pane) {
        return
      }

      scrollPaneTo(
        pane,
        direction === 'top' ? getResultsPaneTargetTop() : getResultsPaneTargetBottom(pane),
        () => {
          setResultsQuickNavigation({
            isVisible: true,
            canScrollTop: direction === 'bottom',
            canScrollBottom: direction === 'top',
          })
        },
      )
    },
    [resultsPaneRef, scrollPaneTo, setResultsQuickNavigation],
  )

  return {
    resultsPaneRef,
    resultsPaneSectionRef,
    resultsQuickNavigation,
    prepareResultsViewportTransition: (reason: ResultsTransitionReason = 'filters') => {
      prepareResultsViewportTransition(reason)
    },
    scrollResultsToBoundary,
  }
}
