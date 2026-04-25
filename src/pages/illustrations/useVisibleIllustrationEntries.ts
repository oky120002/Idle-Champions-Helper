import { useEffect, useMemo, useState } from 'react'
import type { FilterableIllustration } from '../../rules/illustrationFilter'
import { MAX_VISIBLE_ILLUSTRATIONS } from './constants'

const PROGRESSIVE_BATCH_SIZE = 48

function resolveDefaultVisibleCount(totalCount: number) {
  return Math.min(totalCount, MAX_VISIBLE_ILLUSTRATIONS)
}

export function useVisibleIllustrationEntries(
  orderedIllustrationEntries: FilterableIllustration[],
  showAllResults: boolean,
) {
  const totalCount = orderedIllustrationEntries.length
  const defaultVisibleCount = resolveDefaultVisibleCount(totalCount)
  const [visibleCount, setVisibleCount] = useState(defaultVisibleCount)
  const shouldProgressivelyReveal =
    showAllResults && totalCount > MAX_VISIBLE_ILLUSTRATIONS && typeof window !== 'undefined'
  const visibleLimit = shouldProgressivelyReveal
    ? Math.min(totalCount, Math.max(defaultVisibleCount, visibleCount))
    : totalCount

  useEffect(() => {
    if (!shouldProgressivelyReveal) {
      return
    }

    let cancelled = false
    let frameId = 0

    const pumpVisibleCount = () => {
      if (cancelled) {
        return
      }

      setVisibleCount((current) => {
        const normalizedCurrent = Math.min(totalCount, Math.max(defaultVisibleCount, current))

        if (normalizedCurrent >= totalCount) {
          return totalCount
        }

        const nextCount = Math.min(totalCount, normalizedCurrent + PROGRESSIVE_BATCH_SIZE)

        if (nextCount < totalCount) {
          frameId = window.requestAnimationFrame(pumpVisibleCount)
        }

        return nextCount
      })
    }

    frameId = window.requestAnimationFrame(pumpVisibleCount)

    return () => {
      cancelled = true

      if (frameId) {
        window.cancelAnimationFrame(frameId)
      }
    }
  }, [defaultVisibleCount, shouldProgressivelyReveal, totalCount])

  return useMemo(
    () => orderedIllustrationEntries.slice(0, showAllResults ? visibleLimit : defaultVisibleCount),
    [defaultVisibleCount, orderedIllustrationEntries, showAllResults, visibleLimit],
  )
}
