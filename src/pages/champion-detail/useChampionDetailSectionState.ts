import { useEffect, useRef, useState, type RefObject } from 'react'
import type { ChampionDetail } from '../../domain/types'
import { DETAIL_SECTION_IDS, type DetailSectionId, type DetailSectionLink, type DetailSectionProgressState } from './types'
import { buildSectionHash, resolveActiveSectionId, resolveSectionIdFromBrowserHash, resolveSectionIdFromHashValue } from './navigation'

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

function buildSectionLinks(t: Translation): DetailSectionLink[] {
  return [
    { id: 'specializations', label: t({ zh: '专精', en: 'Specializations' }) },
    { id: 'abilities', label: t({ zh: '能力', en: 'Abilities' }) },
    { id: 'loot', label: t({ zh: '装备', en: 'Loot' }) },
    { id: 'legendary', label: t({ zh: '传奇', en: 'Legendary' }) },
    { id: 'feats', label: t({ zh: '天赋', en: 'Feats' }) },
    { id: 'skins', label: t({ zh: '皮肤', en: 'Skins' }) },
    { id: 'story-misc', label: t({ zh: '故事与杂项', en: 'Story & Misc' }) },
  ]
}

function resolveProgressState(index: number, activeIndex: number): DetailSectionProgressState {
  if (index < activeIndex) {
    return 'completed'
  }

  if (index === activeIndex) {
    return 'active'
  }

  return 'upcoming'
}

function resolveProgressText(state: DetailSectionProgressState, t: Translation): string {
  if (state === 'completed') {
    return t({ zh: '已读', en: 'Seen' })
  }

  if (state === 'active') {
    return t({ zh: '当前', en: 'Current' })
  }

  return t({ zh: '未读', en: 'Ahead' })
}

function trackDetailChange(
  detailId: string | undefined,
  prevDetailIdRef: RefObject<string | undefined>,
  pendingHashSectionIdRef: RefObject<DetailSectionId | null>,
  handledSectionHashRef: RefObject<string | null>,
  isLeavingPageRef: RefObject<boolean>,
): void {
  const prevId = prevDetailIdRef.current
  prevDetailIdRef.current = detailId

  if (prevId !== undefined && prevId !== detailId) {
    pendingHashSectionIdRef.current = null
    handledSectionHashRef.current = null
    isLeavingPageRef.current = false
  }
}

function attachScrollTracker(
  scrollContainerRef: RefObject<HTMLDivElement | null>,
  pendingHashSectionIdRef: RefObject<DetailSectionId | null>,
  setActiveSectionId: (id: DetailSectionId) => void,
): (() => void) | undefined {
  if (typeof window === 'undefined') {
    return
  }

  const scrollContainer = scrollContainerRef.current
  const scrollSource: HTMLElement | Window = scrollContainer ?? window

  const updateActiveSection = () => {
    const nextSectionId = resolveActiveSectionId(scrollContainer)

    if (pendingHashSectionIdRef.current != null) {
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
}

function handleHashNavigation(
  detail: ChampionDetail | null,
  hashSectionId: DetailSectionId | null,
  handledSectionHashRef: RefObject<string | null>,
  pendingHashSectionIdRef: RefObject<DetailSectionId | null>,
  setActiveSectionId: (id: DetailSectionId) => void,
): (() => void) | undefined {
  if (!detail || hashSectionId == null || typeof window === 'undefined') {
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

  return () => window.cancelAnimationFrame(frameId)
}

function syncSectionHash(
  detail: ChampionDetail | null,
  activeSectionId: DetailSectionId,
  pathname: string,
  search: string,
  isLeavingPageRef: RefObject<boolean>,
  pendingHashSectionIdRef: RefObject<DetailSectionId | null>,
  handledSectionHashRef: RefObject<string | null>,
): void {
  if (!detail || typeof window === 'undefined') {
    return
  }

  if (isLeavingPageRef.current) {
    return
  }

  if (pendingHashSectionIdRef.current != null && pendingHashSectionIdRef.current !== activeSectionId) {
    return
  }

  const nextHash = buildSectionHash(pathname, search, activeSectionId)
  handledSectionHashRef.current = nextHash

  if (window.location.hash === nextHash) {
    return
  }

  window.history.replaceState(
    window.history.state,
    '',
    `${window.location.pathname}${window.location.search}${nextHash}`,
  )
}

function scrollToSectionImpl(
  id: string,
  pathname: string,
  search: string,
  pendingHashSectionIdRef: RefObject<DetailSectionId | null>,
  handledSectionHashRef: RefObject<string | null>,
  setActiveSectionId: (id: DetailSectionId) => void,
): void {
  if (DETAIL_SECTION_IDS.includes(id as DetailSectionId)) {
    pendingHashSectionIdRef.current = id as DetailSectionId
    setActiveSectionId(id as DetailSectionId)

    if (typeof window !== 'undefined') {
      const nextHash = buildSectionHash(pathname, search, id as DetailSectionId)
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
  const prevDetailIdRef = useRef<string | undefined>(undefined)

  useEffect(() => trackDetailChange(detail?.summary.id, prevDetailIdRef, pendingHashSectionIdRef, handledSectionHashRef, isLeavingPageRef), [detail?.summary.id])

  const sectionLinks = buildSectionLinks(t)
  const activeSectionIndex = Math.max(sectionLinks.findIndex((s) => s.id === activeSectionId), 0)
  const activeSectionLabel = sectionLinks[activeSectionIndex]?.label ?? sectionLinks[0]?.label ?? ''
  const sectionProgressValue = `${String(((activeSectionIndex + 1) / sectionLinks.length) * 100)}%`
  const hashSectionId = typeof window === 'undefined'
    ? resolveSectionIdFromHashValue(location.hash)
    : resolveSectionIdFromBrowserHash(window.location.hash) ?? resolveSectionIdFromHashValue(location.hash)

  useEffect(() => (detail ? attachScrollTracker(scrollContainerRef, pendingHashSectionIdRef, setActiveSectionId) : undefined), [detail, scrollContainerRef])

  useEffect(() => handleHashNavigation(detail, hashSectionId, handledSectionHashRef, pendingHashSectionIdRef, setActiveSectionId), [detail, hashSectionId])

  useEffect(() => syncSectionHash(detail, activeSectionId, location.pathname, location.search, isLeavingPageRef, pendingHashSectionIdRef, handledSectionHashRef), [activeSectionId, detail, location.pathname, location.search])

  const scrollToSection = (id: string) => scrollToSectionImpl(id, location.pathname, location.search, pendingHashSectionIdRef, handledSectionHashRef, setActiveSectionId)

  const navigateBackToChampions = () => {
    isLeavingPageRef.current = true
    void navigate(backTarget)
  }

  return {
    activeSectionId,
    sectionLinks,
    activeSectionIndex,
    activeSectionLabel,
    sectionProgressValue,
    scrollToSection,
    navigateBackToChampions,
    getSectionProgressState: (index: number) => resolveProgressState(index, activeSectionIndex),
    getSectionProgressText: (state: DetailSectionProgressState) => resolveProgressText(state, t),
    backToChampions: backTarget,
  }
}
