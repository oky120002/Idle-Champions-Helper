import type { LocalizedText } from './types'

export function matchesLocalizedText(value: LocalizedText, query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase()

  if (!normalizedQuery) {
    return true
  }

  return [value.display, value.original].some((item) => item.toLowerCase().includes(normalizedQuery))
}

export function getLocalizedOriginal(value: LocalizedText): string | null {
  return value.display === value.original ? null : value.original
}
