import { useEffect, useRef, useState } from 'react'
import { isWorkbenchRoute } from './workbenchRoutes'

const HEADER_CONDENSE_SCROLL_TOP = 56
const HEADER_EXPAND_SCROLL_TOP = 24

function shouldCondenseHeader(pathname: string, isCurrentlyCondensed: boolean) {
  if (typeof window === 'undefined' || pathname === '/') {
    return false
  }

  if (isWorkbenchRoute(pathname) && window.innerWidth >= 1080) {
    return true
  }

  return isCurrentlyCondensed ? window.scrollY > HEADER_EXPAND_SCROLL_TOP : window.scrollY > HEADER_CONDENSE_SCROLL_TOP
}

export function useSiteHeaderState(pathname: string) {
  const [mobileNavState, setMobileNavState] = useState(() => ({
    isOpen: false,
    pathname,
  }))
  const [isHeaderCondensed, setIsHeaderCondensed] = useState(() => shouldCondenseHeader(pathname, false))
  const isHeaderCondensedRef = useRef(isHeaderCondensed)

  useEffect(() => {
    isHeaderCondensedRef.current = isHeaderCondensed
  }, [isHeaderCondensed])

  useEffect(() => {
    let frameId: number | null = null

    const syncHeaderCondensedState = () => {
      const nextIsHeaderCondensed = shouldCondenseHeader(pathname, isHeaderCondensedRef.current)

      if (nextIsHeaderCondensed === isHeaderCondensedRef.current) {
        return
      }

      isHeaderCondensedRef.current = nextIsHeaderCondensed
      setIsHeaderCondensed(nextIsHeaderCondensed)
    }

    const scheduleHeaderCondensedSync = () => {
      if (frameId !== null) {
        return
      }

      frameId = window.requestAnimationFrame(() => {
        frameId = null
        syncHeaderCondensedState()
      })
    }

    syncHeaderCondensedState()
    window.addEventListener('scroll', scheduleHeaderCondensedSync, { passive: true })

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId)
      }

      window.removeEventListener('scroll', scheduleHeaderCondensedSync)
    }
  }, [pathname])

  const isHomeRoute = pathname === '/'
  const isMobileNavOpen = mobileNavState.isOpen && mobileNavState.pathname === pathname
  const headerClassName = [
    'site-header',
    !isHomeRoute ? 'site-header--subpage' : '',
    isHeaderCondensed ? 'site-header--condensed' : '',
    isMobileNavOpen ? 'site-header--mobile-nav-open' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return {
    headerClassName,
    isMobileNavOpen,
    closeMobileNav: () =>
      setMobileNavState({
        isOpen: false,
        pathname,
      }),
    toggleMobileNav: () =>
      setMobileNavState((current) => ({
        isOpen: current.pathname === pathname ? !current.isOpen : true,
        pathname,
      })),
  }
}
