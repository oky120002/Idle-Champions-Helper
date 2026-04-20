import { useEffect, useState } from 'react'
import { readReducedMotionPreference } from './asset-loader'

export function useReducedMotionPreference() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(readReducedMotionPreference)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches)
    }

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange)
      return () => {
        mediaQuery.removeEventListener('change', handleChange)
      }
    }

    mediaQuery.addListener(handleChange)
    return () => {
      mediaQuery.removeListener(handleChange)
    }
  }, [])

  return prefersReducedMotion
}
