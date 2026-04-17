import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import {
  MAX_VISIBLE_RESULTS,
  RESULTS_HEIGHT_TRANSITION_MS,
  RESULTS_QUICK_NAV_THRESHOLD,
  RESULTS_RELOCATE_THRESHOLD,
  RESULTS_SCROLL_DURATION_MS,
} from './constants'
import { buildScrollRestoreKey } from './query-state'
import type {
  PendingResultsTransition,
  ResultsQuickNavigationState,
  ResultsTransitionReason,
} from './types'

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
  const [resultsShellHeight, setResultsShellHeight] = useState<number | null>(null)
  const [stickyTop, setStickyTop] = useState(160)
  const [resultsQuickNavigation, setResultsQuickNavigation] = useState<ResultsQuickNavigationState>({
    isVisible: false,
    canScrollTop: false,
    canScrollBottom: false,
  })
  const resultsShellRef = useRef<HTMLElement | null>(null)
  const resultsContentRef = useRef<HTMLDivElement | null>(null)
  const pendingResultsTransitionRef = useRef<PendingResultsTransition | null>(null)
  const releaseResultsHeightTimeoutRef = useRef<number | null>(null)
  const scrollAnimationFrameRef = useRef<number | null>(null)
  const hasAttemptedScrollRestoreRef = useRef(false)

  function getResultsTargetTop(shell: HTMLElement): number {
    const siteHeader = document.querySelector('.site-header')
    const headerHeight = siteHeader instanceof HTMLElement ? siteHeader.getBoundingClientRect().height : 0

    return Math.max(Math.round(shell.getBoundingClientRect().top + window.scrollY - headerHeight - 16), 0)
  }

  function getResultsTargetBottom(shell: HTMLElement): number {
    const maxScrollTop = Math.max(document.documentElement.scrollHeight - window.innerHeight, 0)
    const shellBottom = shell.getBoundingClientRect().bottom + window.scrollY
    const targetTop = Math.round(shellBottom - window.innerHeight + 24)

    return Math.min(Math.max(targetTop, 0), maxScrollTop)
  }

  function scrollWindowTo(targetTop: number, onComplete?: () => void) {
    if (scrollAnimationFrameRef.current !== null) {
      window.cancelAnimationFrame(scrollAnimationFrameRef.current)
      scrollAnimationFrameRef.current = null
    }

    if (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      window.scrollTo({ top: targetTop, behavior: 'auto' })
      window.dispatchEvent(new Event('scroll'))
      onComplete?.()
      return
    }

    const startTop = window.scrollY
    const distance = targetTop - startTop

    if (Math.abs(distance) < 2) {
      window.dispatchEvent(new Event('scroll'))
      onComplete?.()
      return
    }

    let startTime: number | null = null
    const easeOutQuart = (progress: number) => 1 - (1 - progress) ** 4

    const step = (now: number) => {
      if (startTime === null) {
        startTime = now
      }

      const progress = Math.min((now - startTime) / RESULTS_SCROLL_DURATION_MS, 1)

      window.scrollTo({
        top: startTop + distance * easeOutQuart(progress),
        behavior: 'auto',
      })

      if (progress < 1) {
        scrollAnimationFrameRef.current = window.requestAnimationFrame(step)
        return
      }

      scrollAnimationFrameRef.current = null
      window.dispatchEvent(new Event('scroll'))
      onComplete?.()
    }

    scrollAnimationFrameRef.current = window.requestAnimationFrame(step)
  }

  function prepareResultsViewportTransition(reason: ResultsTransitionReason = 'filters') {
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

    if (releaseResultsHeightTimeoutRef.current !== null) {
      window.clearTimeout(releaseResultsHeightTimeoutRef.current)
      releaseResultsHeightTimeoutRef.current = null
    }

    pendingResultsTransitionRef.current = {
      previousFilteredCount: filteredCount,
      previousVisibleCount: visibleCount,
      shouldRelocate,
      targetTop,
      reason,
    }

    setResultsShellHeight(Math.ceil(shell.getBoundingClientRect().height))
  }

  function scrollResultsToBoundary(direction: 'top' | 'bottom') {
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
  }

  useEffect(() => {
    return () => {
      if (releaseResultsHeightTimeoutRef.current !== null) {
        window.clearTimeout(releaseResultsHeightTimeoutRef.current)
      }

      if (scrollAnimationFrameRef.current !== null) {
        window.cancelAnimationFrame(scrollAnimationFrameRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const siteHeader = document.querySelector('.site-header')

    if (!(siteHeader instanceof HTMLElement)) {
      return
    }

    const updateStickyTop = () => {
      setStickyTop(Math.ceil(siteHeader.getBoundingClientRect().height) + 16)
    }

    updateStickyTop()

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateStickyTop)
      return () => {
        window.removeEventListener('resize', updateStickyTop)
      }
    }

    const resizeObserver = new ResizeObserver(() => {
      updateStickyTop()
    })

    resizeObserver.observe(siteHeader)
    window.addEventListener('resize', updateStickyTop)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', updateStickyTop)
    }
  }, [])

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
  }, [filteredCount, resultsShellHeight, transitionKey, visibleCount])

  useEffect(() => {
    const updateResultsQuickNavigation = () => {
      const shell = resultsShellRef.current

      if (!shell || visibleCount < RESULTS_QUICK_NAV_THRESHOLD) {
        setResultsQuickNavigation((current) => {
          if (!current.isVisible && !current.canScrollTop && !current.canScrollBottom) {
            return current
          }

          return {
            isVisible: false,
            canScrollTop: false,
            canScrollBottom: false,
          }
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
  }, [filteredCount, resultsShellHeight, transitionKey, visibleCount])

  const championsWorkspaceStyle = {
    '--champions-sticky-top': `${stickyTop}px`,
  } as CSSProperties

  return {
    resultsShellHeight,
    championsWorkspaceStyle,
    resultsShellRef,
    resultsContentRef,
    resultsQuickNavigation,
    prepareResultsViewportTransition,
    scrollResultsToBoundary,
  }
}
