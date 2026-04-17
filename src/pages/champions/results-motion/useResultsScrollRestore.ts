import { useEffect, useRef } from 'react'
import { buildScrollRestoreKey } from '../query-state'

type ResultsStateStatus = 'loading' | 'ready' | 'error'

type UseResultsScrollRestoreOptions = {
  locationSearch: string
  stateStatus: ResultsStateStatus
  showAllResults: boolean
  visibleCount: number
}

export function useResultsScrollRestore({
  locationSearch,
  stateStatus,
  showAllResults,
  visibleCount,
}: UseResultsScrollRestoreOptions) {
  const hasAttemptedScrollRestoreRef = useRef(false)

  useEffect(() => {
    if (stateStatus !== 'ready' || hasAttemptedScrollRestoreRef.current || typeof window === 'undefined') {
      return
    }

    hasAttemptedScrollRestoreRef.current = true
    const stored = window.sessionStorage.getItem(buildScrollRestoreKey(locationSearch))

    if (!stored) {
      return
    }

    window.sessionStorage.removeItem(buildScrollRestoreKey(locationSearch))
    const scrollY = Number.parseFloat(stored)

    if (!Number.isFinite(scrollY)) {
      return
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.scrollTo({ top: scrollY, left: 0, behavior: 'auto' })
      })
    })
  }, [locationSearch, showAllResults, stateStatus, visibleCount])
}
