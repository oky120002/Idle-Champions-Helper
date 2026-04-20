import { useCallback, useRef } from 'react'
import { getResultsTargetBottom, getResultsTargetTop } from './results-motion/results-scroll-targets'
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
  const resultsShellRef = useRef<HTMLElement | null>(null)
  const resultsContentRef = useRef<HTMLDivElement | null>(null)
  const { scrollWindowTo } = useResultsScrollAnimator()

  useResultsScrollRestore({
    locationSearch,
    stateStatus,
    showAllResults,
    visibleCount,
  })

  const { resultsShellHeight, prepareResultsViewportTransition } = useResultsViewportTransition({
    filteredCount,
    visibleCount,
    transitionKey,
    resultsShellRef,
    resultsContentRef,
    scrollWindowTo,
  })
  const { resultsQuickNavigation, setResultsQuickNavigation } = useResultsQuickNavigation({
    filteredCount,
    visibleCount,
    resultsShellHeight,
    transitionKey,
    resultsShellRef,
  })

  const scrollResultsToBoundary = useCallback(
    (direction: 'top' | 'bottom') => {
      const shell = resultsShellRef.current

      if (!shell) {
        return
      }

      scrollWindowTo(direction === 'top' ? getResultsTargetTop(shell) : getResultsTargetBottom(shell), () => {
        setResultsQuickNavigation({
          isVisible: true,
          canScrollTop: direction === 'bottom',
          canScrollBottom: direction === 'top',
        })
      })
    },
    [scrollWindowTo, setResultsQuickNavigation],
  )

  return {
    resultsShellHeight,
    resultsShellRef,
    resultsContentRef,
    resultsQuickNavigation,
    prepareResultsViewportTransition: (reason: ResultsTransitionReason = 'filters') => {
      prepareResultsViewportTransition(reason)
    },
    scrollResultsToBoundary,
  }
}
