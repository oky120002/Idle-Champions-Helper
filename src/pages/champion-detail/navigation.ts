import type { DetailSectionId } from './types'
import { DETAIL_HASH_PREFIX, DETAIL_SECTION_IDS } from './types'

export function isDetailSectionId(value: string): value is DetailSectionId {
  return DETAIL_SECTION_IDS.includes(value as DetailSectionId)
}

export function resolveSectionIdFromHashValue(hashValue: string): DetailSectionId | null {
  const normalizedHash = hashValue.startsWith('#') ? hashValue.slice(1) : hashValue
  const normalizedSectionId = normalizedHash.startsWith(DETAIL_HASH_PREFIX)
    ? normalizedHash.slice(DETAIL_HASH_PREFIX.length)
    : normalizedHash

  return isDetailSectionId(normalizedSectionId) ? normalizedSectionId : null
}

export function resolveSectionIdFromBrowserHash(hash: string): DetailSectionId | null {
  const normalizedHash = hash.startsWith('#') ? hash.slice(1) : hash
  const lastHashIndex = normalizedHash.lastIndexOf('#')

  if (lastHashIndex === -1) {
    return resolveSectionIdFromHashValue(normalizedHash)
  }

  return resolveSectionIdFromHashValue(normalizedHash.slice(lastHashIndex + 1))
}

export function buildSectionHash(pathname: string, search: string, sectionId: DetailSectionId): string {
  return `#${pathname}${search}#${DETAIL_HASH_PREFIX}${sectionId}`
}

export function resolveActiveSectionId(scrollContainer?: HTMLElement | null): DetailSectionId {
  const activationOffset = 196
  const activationLine = scrollContainer
    ? scrollContainer.getBoundingClientRect().top + activationOffset
    : activationOffset
  let activeSectionId: DetailSectionId = DETAIL_SECTION_IDS[0]

  for (const sectionId of DETAIL_SECTION_IDS) {
    const element = document.getElementById(sectionId)

    if (!element) {
      continue
    }

    if (element.getBoundingClientRect().top <= activationLine) {
      activeSectionId = sectionId
    } else {
      break
    }
  }

  return activeSectionId
}
