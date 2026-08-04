import type { JsonValue } from '../../domain/types'

export type JsonPrimitiveValue = string | number | boolean | null

export function isJsonObject(value: unknown): value is Record<string, JsonValue> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isJsonPrimitive(value: unknown): value is JsonPrimitiveValue {
  return value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
}

export function parseInlineJsonValue(value: string): JsonValue | null {
  const trimmed = value.trim()

  if (!trimmed || (!trimmed.startsWith('{') && !trimmed.startsWith('['))) {
    return null
  }

  try {
    return JSON.parse(trimmed) as JsonValue
  } catch {
    return null
  }
}
