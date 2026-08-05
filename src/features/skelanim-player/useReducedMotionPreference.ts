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

    // eslint-disable-next-line @typescript-eslint/no-deprecated -- 旧浏览器（Safari < 14）无 addEventListener，保留 addListener 回退确保语义不变
    mediaQuery.addListener(handleChange)
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-deprecated -- 见上 addEventListener 缺失时的成对回退
      mediaQuery.removeListener(handleChange)
    }
  }, [])

  return prefersReducedMotion
}
