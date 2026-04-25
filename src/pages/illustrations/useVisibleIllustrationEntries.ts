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

  useEffect(() => {
    if (!showAllResults) {
      setVisibleCount(defaultVisibleCount)
      return
    }

    if (totalCount <= MAX_VISIBLE_ILLUSTRATIONS || typeof window === 'undefined') {
      setVisibleCount(totalCount)
      return
    }

    let cancelled = false
    let frameId = 0

    setVisibleCount((current) => Math.min(totalCount, Math.max(defaultVisibleCount, current)))

    const pumpVisibleCount = () => {
      if (cancelled) {
        return
      }

      setVisibleCount((current) => {
        if (current >= totalCount) {
          return totalCount
        }

        const nextCount = Math.min(totalCount, current + PROGRESSIVE_BATCH_SIZE)

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
  }, [defaultVisibleCount, showAllResults, totalCount])

  return useMemo(
    () => orderedIllustrationEntries.slice(0, showAllResults ? visibleCount : defaultVisibleCount),
    [defaultVisibleCount, orderedIllustrationEntries, showAllResults, visibleCount],
  )
}
