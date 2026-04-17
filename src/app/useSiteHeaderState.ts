import { useEffect, useRef, useState } from 'react'

export function useSiteHeaderState(pathname: string) {
  const localeSwitcherRef = useRef<HTMLDivElement | null>(null)
  const [mobileNavState, setMobileNavState] = useState(() => ({
    isOpen: false,
    pathname,
  }))
  const [isLocaleMenuOpen, setLocaleMenuOpen] = useState(false)
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

  useEffect(() => {
    if (!isLocaleMenuOpen) {
      return
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!localeSwitcherRef.current || !(event.target instanceof Node)) {
        return
      }

      if (!localeSwitcherRef.current.contains(event.target)) {
        setLocaleMenuOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setLocaleMenuOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isLocaleMenuOpen])

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
    isLocaleMenuOpen,
    isMobileNavOpen,
    localeSwitcherRef,
    closeMobileNav: () =>
      setMobileNavState({
        isOpen: false,
        pathname,
      }),
    setLocaleMenuOpen,
    toggleMobileNav: () =>
      setMobileNavState((current) => ({
        isOpen: current.pathname === pathname ? !current.isOpen : true,
        pathname,
      })),
  }
}
