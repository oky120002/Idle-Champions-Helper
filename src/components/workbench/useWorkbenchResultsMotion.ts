import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'

const DEFAULT_SCROLL_KEY = '__default__'
const RESULTS_SCROLL_DURATION_MS = 340
const RESULTS_QUICK_NAV_THRESHOLD = 10

type ResultsStateStatus = 'loading' | 'ready' | 'error'
type ResultsTransitionReason = 'filters' | 'visibility'

type WorkbenchResultsMotionOptions = {
  storageKey: string
  locationSearch: string
  stateStatus: ResultsStateStatus
  filteredCount: number
  visibleCount: number
  showAllResults: boolean
  transitionKey: string
}

type PendingResultsTransition = {
  shouldRelocate: boolean
  reason: ResultsTransitionReason
}

function buildWorkbenchScrollRestoreKey(storageKey: string, search: string): string {
  return `workbench-pane-scroll:${storageKey}:${search || DEFAULT_SCROLL_KEY}`
}

function getResultsPaneTargetTop(): number {
  return 0
}

function getResultsPaneTargetBottom(pane: HTMLElement): number {
  return Math.max(pane.scrollHeight - pane.clientHeight, 0)
}

function scrollPaneTo(pane: HTMLElement, targetTop: number, onComplete?: () => void) {
  if (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    pane.scrollTo?.({ top: targetTop, behavior: 'auto' })
    pane.scrollTop = targetTop
    onComplete?.()
    return () => undefined
  }

  const startTop = pane.scrollTop
  const distance = targetTop - startTop

  if (Math.abs(distance) < 2) {
    onComplete?.()
    return () => undefined
  }

  let frameId: number | null = null
  let startTime: number | null = null
  const easeOutQuart = (progress: number) => 1 - (1 - progress) ** 4

  const step = (now: number) => {
    if (startTime === null) {
      startTime = now
    }

    const progress = Math.min((now - startTime) / RESULTS_SCROLL_DURATION_MS, 1)
    const nextTop = startTop + distance * easeOutQuart(progress)

    pane.scrollTo?.({ top: nextTop, behavior: 'auto' })
    pane.scrollTop = nextTop

    if (progress < 1) {
      frameId = window.requestAnimationFrame(step)
      return
    }

    frameId = null
    onComplete?.()
  }

  frameId = window.requestAnimationFrame(step)

  return () => {
    if (frameId !== null) {
      window.cancelAnimationFrame(frameId)
    }
  }
}

export function saveWorkbenchResultsPaneScroll(storageKey: string, search: string, scrollTop: number): void {
  if (typeof window === 'undefined') {
    return
  }

  window.sessionStorage.setItem(buildWorkbenchScrollRestoreKey(storageKey, search), String(scrollTop))
}

export function useWorkbenchResultsMotion({
  storageKey,
  locationSearch,
  stateStatus,
  filteredCount,
  visibleCount,
  showAllResults,
  transitionKey,
}: WorkbenchResultsMotionOptions) {
  const resultsPaneRef = useRef<HTMLDivElement | null>(null)
  const hasAttemptedScrollRestoreRef = useRef(false)
  const pendingResultsTransitionRef = useRef<PendingResultsTransition | null>(null)
  const lastTransitionKeyRef = useRef(transitionKey)
  const cancelScrollAnimationRef = useRef<(() => void) | null>(null)
  const [showResultsQuickNavTop, setShowResultsQuickNavTop] = useState(false)

  const storageRestoreKey = useMemo(
    () => buildWorkbenchScrollRestoreKey(storageKey, locationSearch),
    [locationSearch, storageKey],
  )

  const cancelScrollAnimation = useCallback(() => {
    cancelScrollAnimationRef.current?.()
    cancelScrollAnimationRef.current = null
  }, [])

  const animatePaneScroll = useCallback(
    (targetTop: number, onComplete?: () => void) => {
      const pane = resultsPaneRef.current

      if (!pane) {
        return
      }

      cancelScrollAnimation()
      cancelScrollAnimationRef.current = scrollPaneTo(pane, targetTop, () => {
        cancelScrollAnimationRef.current = null
        onComplete?.()
      })
    },
    [cancelScrollAnimation],
  )

  const prepareResultsViewportTransition = useCallback((reason: ResultsTransitionReason = 'filters') => {
    const pane = resultsPaneRef.current

    if (!pane) {
      return
    }

    pendingResultsTransitionRef.current = {
      shouldRelocate: pane.scrollTop > 8,
      reason,
    }
  }, [])

  const scrollResultsToTop = useCallback(() => {
    animatePaneScroll(getResultsPaneTargetTop())
  }, [animatePaneScroll])

  useEffect(() => {
    if (stateStatus !== 'ready' || hasAttemptedScrollRestoreRef.current || typeof window === 'undefined') {
      return
    }

    hasAttemptedScrollRestoreRef.current = true
    const stored = window.sessionStorage.getItem(storageRestoreKey)

    if (!stored) {
      return
    }

    const scrollTop = Number.parseFloat(stored)

    if (!Number.isFinite(scrollTop)) {
      window.sessionStorage.removeItem(storageRestoreKey)
      return
    }

    let frameId: number | null = null
    let attemptCount = 0
    const maxAttempts = 60
    let cancelled = false

    const restorePaneScrollTop = () => {
      if (cancelled) {
        return
      }

      attemptCount += 1
      const pane = resultsPaneRef.current

      if (!pane) {
        if (attemptCount < maxAttempts) {
          frameId = window.requestAnimationFrame(restorePaneScrollTop)
        } else {
          window.sessionStorage.removeItem(storageRestoreKey)
        }
        return
      }

      pane.scrollTo?.({ top: scrollTop, behavior: 'auto' })
      pane.scrollTop = scrollTop

      if (Math.abs(pane.scrollTop - scrollTop) <= 2 || attemptCount >= maxAttempts) {
        window.sessionStorage.removeItem(storageRestoreKey)
        return
      }

      frameId = window.requestAnimationFrame(restorePaneScrollTop)
    }

    frameId = window.requestAnimationFrame(() => {
      frameId = window.requestAnimationFrame(restorePaneScrollTop)
    })

    return () => {
      cancelled = true

      if (frameId !== null) {
        window.cancelAnimationFrame(frameId)
      }
    }
  }, [locationSearch, resultsPaneRef, showAllResults, stateStatus, storageRestoreKey, visibleCount])

  useLayoutEffect(() => {
    if (lastTransitionKeyRef.current === transitionKey) {
      return
    }

    lastTransitionKeyRef.current = transitionKey
    const pendingTransition = pendingResultsTransitionRef.current

    if (!pendingTransition) {
      return
    }

    pendingResultsTransitionRef.current = null

    if (!pendingTransition.shouldRelocate) {
      return
    }

    animatePaneScroll(getResultsPaneTargetTop())
  }, [animatePaneScroll, transitionKey])

  useEffect(() => {
    const updateResultsQuickNav = () => {
      const pane = resultsPaneRef.current
      const hasEnoughVisibleResults = visibleCount >= RESULTS_QUICK_NAV_THRESHOLD && filteredCount >= visibleCount

      if (!pane || !hasEnoughVisibleResults) {
        setShowResultsQuickNavTop(false)
        return
      }

      const bottomTarget = getResultsPaneTargetBottom(pane)
      const canScrollTop = pane.scrollTop > 80
      const isVisible = bottomTarget > 240 && canScrollTop
      setShowResultsQuickNavTop(isVisible)
    }

    updateResultsQuickNav()
    const pane = resultsPaneRef.current
    pane?.addEventListener('scroll', updateResultsQuickNav, { passive: true })
    window.addEventListener('resize', updateResultsQuickNav)

    return () => {
      pane?.removeEventListener('scroll', updateResultsQuickNav)
      window.removeEventListener('resize', updateResultsQuickNav)
    }
  }, [filteredCount, transitionKey, visibleCount])

  useEffect(() => cancelScrollAnimation, [cancelScrollAnimation])

  return {
    resultsPaneRef,
    showResultsQuickNavTop,
    prepareResultsViewportTransition,
    scrollResultsToTop,
  }
}

export type { ResultsTransitionReason, WorkbenchResultsMotionOptions, RefObject }
