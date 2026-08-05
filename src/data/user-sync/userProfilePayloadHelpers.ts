export type JsonRecord = Record<string, unknown>

export function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function asRecord(value: unknown): JsonRecord {
  return isRecord(value) ? value : {}
}

export function toStringValue(value: unknown, fallback = 'unknown'): string {
  if (value === null || value === undefined || value === '') {
    return fallback
  }
  if (typeof value === 'string') {
    return value
  }
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value)
  }
  return fallback
}

export function toNumberValue(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
  }
  return fallback
}

export function normalizeNumberRecord(value: unknown): Record<string, number> {
  if (!isRecord(value)) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, toNumberValue(item)]),
  )
}

export function normalizeStringRecord(value: unknown): Record<string, string> {
  if (!isRecord(value)) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([, item]) => item !== null && item !== undefined && item !== '')
      .map(([key, item]) => [key, String(item)]),
  )
}

export function normalizeStringArrayRecord(value: unknown): Record<string, string[]> {
  if (!isRecord(value)) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, toStringArray(item)]),
  )
}

function toStringArray(item: unknown): string[] {
  if (Array.isArray(item)) {
    return item.map((entry) => toStringValue(entry))
  }
  if (item === null || item === undefined || item === '') {
    return []
  }
  return [toStringValue(item)]
}

export function normalizeObjectArray(value: unknown): JsonRecord[] {
  if (Array.isArray(value)) {
    return value.filter(isRecord)
  }

  if (isRecord(value)) {
    return Object.values(value).filter(isRecord)
  }

  return []
}

export function normalizeIdArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return (value as unknown[])
    .map((item) => {
      if (isRecord(item)) {
        return item.id
      }
      return item
    })
    .filter((item) => item !== null && item !== undefined && item !== '')
    .map((item) => toStringValue(item))
}

export function isTruthyFlag(value: unknown, fallback = true): boolean {
  if (value === null || value === undefined || value === '') {
    return fallback
  }

  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'number') {
    return value !== 0
  }

  if (typeof value === 'string') {
    return value !== '0' && value.toLowerCase() !== 'false'
  }

  return fallback
}
