import { useEffect, useState } from 'react'

export function useSiteHeaderState(pathname: string) {
  const [mobileNavState, setMobileNavState] = useState(() => ({
    isOpen: false,
    pathname,
  }))
  const [scrollY, setScrollY] = useState(() => (typeof window === 'undefined' ? 0 : window.scrollY))

  useEffect(() => {
    const syncScrollY = () => {
      setScrollY(window.scrollY)
    }

    window.addEventListener('scroll', syncScrollY, { passive: true })

    return () => {
      window.removeEventListener('scroll', syncScrollY)
    }
  }, [])

  const isHomeRoute = pathname === '/'
  const isMobileNavOpen = mobileNavState.isOpen && mobileNavState.pathname === pathname
  const isHeaderCondensed = !isHomeRoute && Math.max(scrollY, typeof window === 'undefined' ? 0 : window.scrollY) > 56
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
