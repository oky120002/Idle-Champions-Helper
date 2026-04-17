import { matchesLocalizedText } from '../../domain/localizedText'
import type { Pet } from '../../domain/types'

export function matchesPetQuery(pet: Pet, query: string) {
  if (!query.trim()) {
    return true
  }

  if (matchesLocalizedText(pet.name, query)) {
    return true
  }

  if (pet.description && matchesLocalizedText(pet.description, query)) {
    return true
  }

  const normalizedQuery = query.trim().toLowerCase()
  const haystack = [
    pet.acquisition.sourceType ?? '',
    pet.acquisition.premiumPackName?.display ?? '',
    pet.acquisition.premiumPackName?.original ?? '',
    pet.acquisition.patronName?.display ?? '',
    pet.acquisition.patronName?.original ?? '',
  ]
    .join(' ')
    .toLowerCase()

  return haystack.includes(normalizedQuery)
}
