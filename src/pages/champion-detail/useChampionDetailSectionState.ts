import { useEffect, useRef, useState, type MouseEvent, type RefObject } from 'react'
import { DETAIL_SECTION_IDS, type DetailSectionId, type DetailSectionLink, type DetailSectionProgressState } from './types'
import { buildSectionHash, resolveActiveSectionId, resolveSectionIdFromBrowserHash, resolveSectionIdFromHashValue } from './navigation'
import type { ChampionDetail } from '../../domain/types'

interface Translation {
  (text: { zh: string; en: string }): string
}

interface PageLocation {
  hash: string
  pathname: string
  search: string
}

interface BackTarget {
  pathname: string
  search: string
}

type NavigateFn = (to: BackTarget | string, options?: { replace?: boolean; state?: unknown }) => void | Promise<void>

export function useChampionDetailSectionState(
  detail: ChampionDetail | null,
  location: PageLocation,
  navigate: NavigateFn,
  backTarget: BackTarget,
  scrollContainerRef: RefObject<HTMLDivElement | null>,
  t: Translation,
) {
  const [activeSectionId, setActiveSectionId] = useState<DetailSectionId>(DETAIL_SECTION_IDS[0])
  const pendingHashSectionIdRef = useRef<DetailSectionId | null>(null)
  const handledSectionHashRef = useRef<string | null>(null)
  const isLeavingPageRef = useRef(false)

  useEffect(() => {
    pendingHashSectionIdRef.current = null
    handledSectionHashRef.current = null
    isLeavingPageRef.current = false
  }, [detail?.summary.id])

  const sectionLinks: DetailSectionLink[] = [
    { id: 'specializations', label: 'Specializations' },
    { id: 'abilities', label: 'Abilities' },
    { id: 'loot', label: 'Loot' },
    { id: 'legendary', label: 'Legendary' },
    { id: 'feats', label: 'Feats' },
    { id: 'skins', label: 'Skins' },
    { id: 'story-misc', label: 'Story & Misc' },
  ]

  const activeSectionIndex = Math.max(
    sectionLinks.findIndex((section) => section.id === activeSectionId),
    0,
  )
  const activeSectionLabel = sectionLinks[activeSectionIndex]?.label ?? sectionLinks[0]?.label ?? ''
  const sectionProgressValue = `${((activeSectionIndex + 1) / sectionLinks.length) * 100}%`
  const getSectionProgressState = (index: number): DetailSectionProgressState => {
    if (index < activeSectionIndex) {
      return 'completed'
    }

    if (index === activeSectionIndex) {
      return 'active'
    }

    return 'upcoming'
  }
  const getSectionProgressText = (state: DetailSectionProgressState): string => {
    if (state === 'completed') {
      return t({ zh: '已读', en: 'Seen' })
    }

    if (state === 'active') {
      return t({ zh: '当前', en: 'Current' })
    }

    return t({ zh: '未读', en: 'Ahead' })
  }
  const hashSectionId =
    typeof window === 'undefined'
      ? resolveSectionIdFromHashValue(location.hash)
      : resolveSectionIdFromBrowserHash(window.location.hash) ?? resolveSectionIdFromHashValue(location.hash)

  useEffect(() => {
    if (!detail || typeof window === 'undefined') {
      return undefined
    }

    const scrollContainer = scrollContainerRef.current
    const scrollSource: HTMLElement | Window = scrollContainer ?? window

    const updateActiveSection = () => {
      const nextSectionId = resolveActiveSectionId(scrollContainer)

      if (pendingHashSectionIdRef.current) {
        if (nextSectionId === pendingHashSectionIdRef.current) {
          pendingHashSectionIdRef.current = null
          setActiveSectionId(nextSectionId)
        }

        return
      }

      setActiveSectionId(nextSectionId)
    }

    updateActiveSection()
    scrollSource.addEventListener('scroll', updateActiveSection, { passive: true })
    window.addEventListener('resize', updateActiveSection)

    return () => {
      scrollSource.removeEventListener('scroll', updateActiveSection)
      window.removeEventListener('resize', updateActiveSection)
    }
  }, [detail, scrollContainerRef])

  useEffect(() => {
    if (!detail || !hashSectionId || typeof window === 'undefined') {
      return
    }

    const browserHash = window.location.hash

    if (handledSectionHashRef.current === browserHash) {
      return
    }

    handledSectionHashRef.current = browserHash
    pendingHashSectionIdRef.current = hashSectionId

    const frameId = window.requestAnimationFrame(() => {
      setActiveSectionId(hashSectionId)
      document.getElementById(hashSectionId)?.scrollIntoView({ behavior: 'auto', block: 'start' })
    })

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [detail, hashSectionId])

  useEffect(() => {
    if (!detail || typeof window === 'undefined') {
      return
    }

    if (isLeavingPageRef.current) {
      return
    }

    if (pendingHashSectionIdRef.current && pendingHashSectionIdRef.current !== activeSectionId) {
      return
    }

    const nextHash = buildSectionHash(location.pathname, location.search, activeSectionId)
    handledSectionHashRef.current = nextHash

    if (window.location.hash === nextHash) {
      return
    }

    window.history.replaceState(
      window.history.state,
      '',
      `${window.location.pathname}${window.location.search}${nextHash}`,
    )
  }, [activeSectionId, detail, location.pathname, location.search])

  const scrollToSection = (id: string) => {
    if (DETAIL_SECTION_IDS.includes(id as DetailSectionId)) {
      pendingHashSectionIdRef.current = id as DetailSectionId
      setActiveSectionId(id as DetailSectionId)

      if (typeof window !== 'undefined') {
        const nextHash = buildSectionHash(location.pathname, location.search, id as DetailSectionId)
        handledSectionHashRef.current = nextHash

        if (window.location.hash !== nextHash) {
          window.history.replaceState(
            window.history.state,
            '',
            `${window.location.pathname}${window.location.search}${nextHash}`,
          )
        }
      }
    }

    if (typeof window === 'undefined') {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }

    window.requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const handleBackClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault()
    isLeavingPageRef.current = true
    void navigate(backTarget)
  }

  return {
    activeSectionId,
    sectionLinks,
    activeSectionIndex,
    activeSectionLabel,
    sectionProgressValue,
    getSectionProgressState,
    getSectionProgressText,
    scrollToSection,
    backToChampions: backTarget,
    handleBackClick,
  }
}
