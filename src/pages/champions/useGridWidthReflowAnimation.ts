import { useEffect, type RefObject } from 'react'

type GridItemSnapshot = {
  element: HTMLElement
  left: number
  top: number
}

const GRID_REFLOW_ANIMATION_MS = 240
const GRID_REFLOW_EASE = 'cubic-bezier(0.22, 0.61, 0.36, 1)'
const GRID_REFLOW_WIDTH_DELTA = 8

function shouldAnimateGridReflow(): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function measureGridItems(grid: HTMLElement): Map<string, GridItemSnapshot> {
  const snapshots = new Map<string, GridItemSnapshot>()

  grid.querySelectorAll<HTMLElement>('[data-grid-motion-key]').forEach((element) => {
    const key = element.dataset.gridMotionKey

    if (!key) {
      return
    }

    const rect = element.getBoundingClientRect()
    snapshots.set(key, {
      element,
      left: rect.left,
      top: rect.top,
    })
  })

  return snapshots
}

export function useGridWidthReflowAnimation(gridRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const grid = gridRef.current

    if (grid === null || typeof ResizeObserver === 'undefined') {
      return
    }

    let frameId: number | null = null
    let width = Math.round(grid.getBoundingClientRect().width)
    let previousItems = measureGridItems(grid)

    const refreshSnapshot = () => {
      width = Math.round(grid.getBoundingClientRect().width)
      previousItems = measureGridItems(grid)
    }

    const scheduleSnapshot = () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId)
      }

      frameId = window.requestAnimationFrame(() => {
        frameId = null
        const nextWidth = Math.round(grid.getBoundingClientRect().width)
        const nextItems = measureGridItems(grid)

        if (shouldAnimateGridReflow() && nextWidth < width - GRID_REFLOW_WIDTH_DELTA) {
          nextItems.forEach((item, key) => {
            const previousItem = previousItems.get(key)

            if (previousItem === undefined) {
              return
            }

            const deltaX = previousItem.left - item.left
            const deltaY = previousItem.top - item.top

            if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) {
              return
            }

            item.element.getAnimations().forEach((animation) => animation.cancel())
            item.element.animate(
              [
                { transform: `translate(${deltaX}px, ${deltaY}px)` },
                { transform: 'translate(0, 0)' },
              ],
              {
                duration: GRID_REFLOW_ANIMATION_MS,
                easing: GRID_REFLOW_EASE,
              },
            )
          })
        }

        width = nextWidth
        previousItems = nextItems
      })
    }

    refreshSnapshot()

    const resizeObserver = new ResizeObserver(() => {
      scheduleSnapshot()
    })
    resizeObserver.observe(grid)

    const mutationObserver = new MutationObserver(() => {
      scheduleSnapshot()
    })
    mutationObserver.observe(grid, { childList: true })

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId)
      }

      resizeObserver.disconnect()
      mutationObserver.disconnect()
    }
  }, [gridRef])
}
