import { useEffect, useState } from 'react'

interface UseSiteHeaderOffsetOptions {
  fallback?: number
  gap?: number
}

export function useSiteHeaderOffset(options: UseSiteHeaderOffsetOptions = {}): number {
  const { fallback = 160, gap = 16 } = options
  const [offset, setOffset] = useState(fallback)

  useEffect(() => {
    const siteHeader = document.querySelector('.site-header')

    if (!(siteHeader instanceof HTMLElement)) {
      return
    }

    const updateOffset = () => {
      setOffset(Math.ceil(siteHeader.getBoundingClientRect().height) + gap)
    }

    updateOffset()

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateOffset)
      return () => {
        window.removeEventListener('resize', updateOffset)
      }
    }

    const resizeObserver = new ResizeObserver(() => {
      updateOffset()
    })

    resizeObserver.observe(siteHeader)
    window.addEventListener('resize', updateOffset)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', updateOffset)
    }
  }, [fallback, gap])

  return offset
}
