import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { MAX_VISIBLE_RESULTS, RESULTS_HEIGHT_TRANSITION_MS, RESULTS_RELOCATE_THRESHOLD } from '../constants'
import type { PendingResultsTransition, ResultsTransitionReason } from '../types'
import { getResultsTargetTop } from './results-scroll-targets'

type UseResultsViewportTransitionOptions = {
  filteredCount: number
  visibleCount: number
  transitionKey: string
  resultsShellRef: RefObject<HTMLElement | null>
  resultsContentRef: RefObject<HTMLDivElement | null>
  scrollWindowTo: (targetTop: number, onComplete?: () => void) => void
}

export function useResultsViewportTransition({
  filteredCount,
  visibleCount,
  transitionKey,
  resultsShellRef,
  resultsContentRef,
  scrollWindowTo,
}: UseResultsViewportTransitionOptions) {
  const [resultsShellHeight, setResultsShellHeight] = useState<number | null>(null)
  const pendingResultsTransitionRef = useRef<PendingResultsTransition | null>(null)
  const releaseResultsHeightTimeoutRef = useRef<number | null>(null)

  const clearResultsHeightRelease = useCallback(() => {
    if (releaseResultsHeightTimeoutRef.current === null) {
      return
    }

    window.clearTimeout(releaseResultsHeightTimeoutRef.current)
    releaseResultsHeightTimeoutRef.current = null
  }, [])

  const prepareResultsViewportTransition = useCallback(
    (reason: ResultsTransitionReason = 'filters') => {
      const shell = resultsShellRef.current

      if (!shell) {
        return
      }

      const targetTop = getResultsTargetTop(shell)
      const shouldRelocate = window.scrollY > targetTop + 48

      if (!shouldRelocate) {
        pendingResultsTransitionRef.current = null
        return
      }

      clearResultsHeightRelease()
      pendingResultsTransitionRef.current = {
        previousFilteredCount: filteredCount,
        previousVisibleCount: visibleCount,
        shouldRelocate,
        targetTop,
        reason,
      }

      setResultsShellHeight(Math.ceil(shell.getBoundingClientRect().height))
    },
    [clearResultsHeightRelease, filteredCount, resultsShellRef, visibleCount],
  )

  useEffect(() => clearResultsHeightRelease, [clearResultsHeightRelease])

  useLayoutEffect(() => {
    const pendingTransition = pendingResultsTransitionRef.current
    const content = resultsContentRef.current

    if (!pendingTransition || !content || resultsShellHeight === null) {
      return
    }

    pendingResultsTransitionRef.current = null

    const nextHeight = Math.ceil(content.getBoundingClientRect().height)
    const filteredCollapsedToFew =
      filteredCount < pendingTransition.previousFilteredCount && filteredCount <= RESULTS_RELOCATE_THRESHOLD
    const visibleCollapsed = visibleCount < pendingTransition.previousVisibleCount
    const collapsedBackToDefaultWindow =
      pendingTransition.previousVisibleCount > MAX_VISIBLE_RESULTS &&
      visibleCount <= MAX_VISIBLE_RESULTS &&
      visibleCollapsed
    const shouldRelocate =
      pendingTransition.shouldRelocate &&
      (pendingTransition.reason === 'filters'
        ? filteredCollapsedToFew || collapsedBackToDefaultWindow
        : visibleCollapsed)

    const animationFrameId = window.requestAnimationFrame(() => {
      setResultsShellHeight(nextHeight)

      if (shouldRelocate) {
        scrollWindowTo(pendingTransition.targetTop)
      }

      releaseResultsHeightTimeoutRef.current = window.setTimeout(() => {
        setResultsShellHeight(null)
        releaseResultsHeightTimeoutRef.current = null
      }, RESULTS_HEIGHT_TRANSITION_MS)
    })

    return () => {
      window.cancelAnimationFrame(animationFrameId)
    }
  }, [clearResultsHeightRelease, filteredCount, resultsContentRef, resultsShellHeight, scrollWindowTo, transitionKey, visibleCount])

  return {
    resultsShellHeight,
    prepareResultsViewportTransition,
  }
}
