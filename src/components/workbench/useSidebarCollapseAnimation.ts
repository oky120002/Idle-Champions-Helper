import { useCallback, useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'

const DESKTOP_SIDEBAR_ANIMATION_MS = 340
const OPENING_WIDTH_LOCK_RELEASE_MS = 240

function shouldAnimateSidebarLayout(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }

  return (
    window.matchMedia('(min-width: 1080px)').matches
    && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

interface SidebarAnimationController {
  animationTimeoutRef: RefObject<number | null>
  openingWidthReleaseTimeoutRef: RefObject<number | null>
  animationFrameRef: RefObject<number | null>
  setCollapsed: (value: boolean) => void
  setLayoutCollapsed: (value: boolean) => void
  setLayoutSyncing: (value: boolean) => void
  setOpening: (value: boolean) => void
  setAnimating: (value: boolean) => void
}

function runCollapseAnimation(ctrl: SidebarAnimationController): void {
  ctrl.setLayoutSyncing(false)
  ctrl.setOpening(false)
  ctrl.setCollapsed(true)
  ctrl.animationTimeoutRef.current = window.setTimeout(() => {
    ctrl.setLayoutSyncing(true)
    ctrl.setLayoutCollapsed(true)
    ctrl.animationTimeoutRef.current = null
    ctrl.animationFrameRef.current = window.requestAnimationFrame(() => {
      ctrl.setLayoutSyncing(false)
      ctrl.setOpening(false)
      ctrl.setAnimating(false)
      ctrl.animationFrameRef.current = null
    })
  }, DESKTOP_SIDEBAR_ANIMATION_MS)
}

function runExpandAnimation(ctrl: SidebarAnimationController): void {
  ctrl.setOpening(true)
  ctrl.setLayoutSyncing(true)
  ctrl.setLayoutCollapsed(false)
  ctrl.animationFrameRef.current = window.requestAnimationFrame(() => {
    ctrl.setLayoutSyncing(false)
    ctrl.animationFrameRef.current = window.requestAnimationFrame(() => {
      ctrl.setCollapsed(false)
      ctrl.openingWidthReleaseTimeoutRef.current = window.setTimeout(() => {
        ctrl.setOpening(false)
        ctrl.openingWidthReleaseTimeoutRef.current = null
      }, OPENING_WIDTH_LOCK_RELEASE_MS)
      ctrl.animationTimeoutRef.current = window.setTimeout(() => {
        ctrl.setAnimating(false)
        ctrl.animationTimeoutRef.current = null
      }, DESKTOP_SIDEBAR_ANIMATION_MS)
      ctrl.animationFrameRef.current = null
    })
  })
}

export function useSidebarCollapseAnimation(
  hasSidebar: boolean,
  isCollapsed: boolean,
  setCollapsed: (value: boolean) => void,
) {
  const [isLayoutCollapsed, setIsLayoutCollapsed] = useState(isCollapsed)
  const [isLayoutSyncing, setIsLayoutSyncing] = useState(false)
  const [isOpening, setIsOpening] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const animationTimeoutRef = useRef<number | null>(null)
  const openingWidthReleaseTimeoutRef = useRef<number | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  const clearPendingAnimation = useCallback(() => {
    if (animationTimeoutRef.current !== null) {
      window.clearTimeout(animationTimeoutRef.current)
      animationTimeoutRef.current = null
    }

    if (openingWidthReleaseTimeoutRef.current !== null) {
      window.clearTimeout(openingWidthReleaseTimeoutRef.current)
      openingWidthReleaseTimeoutRef.current = null
    }

    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
  }, [])

  useEffect(() => clearPendingAnimation, [clearPendingAnimation])

  const toggleCollapsed = useCallback(() => {
    if (!hasSidebar || isAnimating) {
      return
    }

    const nextCollapsed = !isCollapsed

    if (!shouldAnimateSidebarLayout()) {
      clearPendingAnimation()
      setCollapsed(nextCollapsed)
      setIsLayoutCollapsed(nextCollapsed)
      setIsLayoutSyncing(false)
      setIsOpening(false)
      setIsAnimating(false)
      return
    }

    clearPendingAnimation()
    setIsAnimating(true)

    const ctrl: SidebarAnimationController = {
      animationTimeoutRef,
      openingWidthReleaseTimeoutRef,
      animationFrameRef,
      setCollapsed,
      setLayoutCollapsed: setIsLayoutCollapsed,
      setLayoutSyncing: setIsLayoutSyncing,
      setOpening: setIsOpening,
      setAnimating: setIsAnimating,
    }

    if (nextCollapsed) {
      runCollapseAnimation(ctrl)
    } else {
      runExpandAnimation(ctrl)
    }
  }, [clearPendingAnimation, hasSidebar, isAnimating, isCollapsed, setCollapsed])

  return { isLayoutCollapsed, isLayoutSyncing, isOpening, isAnimating, toggleCollapsed }
}
