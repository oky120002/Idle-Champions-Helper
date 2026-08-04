import type { LocalizedText } from '../../domain/types'
import type { LocalizedEnumGroup, StringEnumGroup } from './types'

export function isLocalizedText(value: unknown): value is LocalizedText {
  if (typeof value !== 'object' || value === null) return false
  if (!('original' in value) || !('display' in value)) return false
  return typeof value.original === 'string' && typeof value.display === 'string'
}

export function isLocalizedEnumGroup(value: unknown): value is LocalizedEnumGroup {
  if (typeof value !== 'object' || value === null) return false
  if (!('id' in value) || !('values' in value)) return false
  if (!Array.isArray(value.values)) return false
  return value.values.every((item) => isLocalizedText(item))
}

export function isStringEnumGroup(value: unknown): value is StringEnumGroup {
  if (typeof value !== 'object' || value === null) return false
  if (!('id' in value) || !('values' in value)) return false
  if (!Array.isArray(value.values)) return false
  return value.values.every((item) => typeof item === 'string')
}
