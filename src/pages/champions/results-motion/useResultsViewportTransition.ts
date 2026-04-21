import { useCallback, useLayoutEffect, useRef, type RefObject } from 'react'
import type { PendingResultsTransition, ResultsTransitionReason } from '../types'
import { getResultsPaneTargetTop } from './results-scroll-targets'

type UseResultsViewportTransitionOptions = {
  transitionKey: string
  resultsPaneRef: RefObject<HTMLElement | null>
  scrollPaneTo: (pane: HTMLElement, targetTop: number, onComplete?: () => void) => void
}

export function useResultsViewportTransition({
  transitionKey,
  resultsPaneRef,
  scrollPaneTo,
}: UseResultsViewportTransitionOptions) {
  const pendingResultsTransitionRef = useRef<PendingResultsTransition | null>(null)
  const lastTransitionKeyRef = useRef(transitionKey)

  const prepareResultsViewportTransition = useCallback(
    (reason: ResultsTransitionReason = 'filters') => {
      const pane = resultsPaneRef.current

      if (!pane) {
        return
      }

      pendingResultsTransitionRef.current = {
        previousFilteredCount: 0,
        previousVisibleCount: 0,
        shouldRelocate: pane.scrollTop > 8,
        reason,
      }
    },
    [resultsPaneRef],
  )

  useLayoutEffect(() => {
    if (lastTransitionKeyRef.current === transitionKey) {
      return
    }

    lastTransitionKeyRef.current = transitionKey
    const pendingTransition = pendingResultsTransitionRef.current
    const pane = resultsPaneRef.current

    if (!pendingTransition || !pane) {
      return
    }

    pendingResultsTransitionRef.current = null
    if (!pendingTransition.shouldRelocate) {
      return
    }

    scrollPaneTo(pane, getResultsPaneTargetTop())
  }, [resultsPaneRef, scrollPaneTo, transitionKey])

  return {
    prepareResultsViewportTransition,
  }
}
