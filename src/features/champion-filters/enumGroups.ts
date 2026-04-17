import type { LocalizedText } from '../../domain/types'
import type { LocalizedEnumGroup, StringEnumGroup } from './types'

export function isLocalizedText(value: unknown): value is LocalizedText {
  return (
    typeof value === 'object' &&
    value !== null &&
    'original' in value &&
    typeof value.original === 'string' &&
    'display' in value &&
    typeof value.display === 'string'
  )
}

export function isLocalizedEnumGroup(value: unknown): value is LocalizedEnumGroup {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'values' in value &&
    Array.isArray(value.values) &&
    value.values.every((item) => isLocalizedText(item))
  )
}

export function isStringEnumGroup(value: unknown): value is StringEnumGroup {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'values' in value &&
    Array.isArray(value.values) &&
    value.values.every((item) => typeof item === 'string')
  )
}
