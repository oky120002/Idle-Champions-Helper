import { useEffect, useRef, type RefObject } from 'react'
import { buildScrollRestoreKey } from '../query-state'

type ResultsStateStatus = 'loading' | 'ready' | 'error'

type UseResultsScrollRestoreOptions = {
  locationSearch: string
  stateStatus: ResultsStateStatus
  showAllResults: boolean
  visibleCount: number
  resultsPaneRef: RefObject<HTMLElement | null>
}

export function useResultsScrollRestore({
  locationSearch,
  stateStatus,
  showAllResults,
  visibleCount,
  resultsPaneRef,
}: UseResultsScrollRestoreOptions) {
  const hasAttemptedScrollRestoreRef = useRef(false)

  useEffect(() => {
    if (stateStatus !== 'ready' || hasAttemptedScrollRestoreRef.current || typeof window === 'undefined') {
      return
    }

    hasAttemptedScrollRestoreRef.current = true
    const storageKey = buildScrollRestoreKey(locationSearch)
    const stored = window.sessionStorage.getItem(storageKey)

    if (!stored) {
      return
    }

    const scrollY = Number.parseFloat(stored)

    if (!Number.isFinite(scrollY)) {
      window.sessionStorage.removeItem(storageKey)
      return
    }

    let frameId: number | null = null
    let attemptCount = 0
    const maxAttempts = 60
    let isCancelled = false

    const updatePaneScrollTop = (pane: HTMLElement, top: number) => {
      if (typeof pane.scrollTo === 'function') {
        pane.scrollTo({ top, behavior: 'auto' })
        return
      }

      pane.scrollTop = top
    }

    const restorePaneScrollTop = () => {
      if (isCancelled) {
        return
      }

      attemptCount += 1
      const pane = resultsPaneRef.current

      if (!pane) {
        if (attemptCount < maxAttempts) {
          frameId = window.requestAnimationFrame(restorePaneScrollTop)
        } else {
          window.sessionStorage.removeItem(storageKey)
        }
        return
      }

      updatePaneScrollTop(pane, scrollY)

      if (Math.abs(pane.scrollTop - scrollY) <= 2 || attemptCount >= maxAttempts) {
        window.sessionStorage.removeItem(storageKey)
        return
      }

      frameId = window.requestAnimationFrame(restorePaneScrollTop)
    }

    frameId = window.requestAnimationFrame(() => {
      frameId = window.requestAnimationFrame(restorePaneScrollTop)
    })

    return () => {
      isCancelled = true

      if (frameId !== null) {
        window.cancelAnimationFrame(frameId)
      }
    }
  }, [locationSearch, resultsPaneRef, showAllResults, stateStatus, visibleCount])
}
