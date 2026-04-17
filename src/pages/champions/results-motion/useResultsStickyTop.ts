import { useEffect, useState } from 'react'

export function useResultsStickyTop(): number {
  const [stickyTop, setStickyTop] = useState(160)

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

  return stickyTop
}
