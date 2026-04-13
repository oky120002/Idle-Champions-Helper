import type { DataCollection, DataVersion } from '../domain/types'

const memoryCache = new Map<string, unknown>()

function buildDataUrl(relativePath: string): string {
  const base = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`

  return `${base}data/${relativePath}`
}

async function fetchJson<T>(relativePath: string, init?: RequestInit): Promise<T> {
  const response = await fetch(buildDataUrl(relativePath), init)

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  return (await response.json()) as T
}

export async function loadVersion(): Promise<DataVersion> {
  const cacheKey = 'version'
  const cached = memoryCache.get(cacheKey)

  if (cached) {
    return cached as DataVersion
  }

  const version = await fetchJson<DataVersion>('version.json', { cache: 'no-store' })
  memoryCache.set(cacheKey, version)
  return version
}

export async function loadCollection<T>(name: string): Promise<DataCollection<T>> {
  const version = await loadVersion()
  const cacheKey = `${version.current}:${name}`
  const cached = memoryCache.get(cacheKey)

  if (cached) {
    return cached as DataCollection<T>
  }

  const collection = await fetchJson<DataCollection<T>>(`${version.current}/${name}.json`)
  memoryCache.set(cacheKey, collection)
  return collection
}

export function clearDataCache(): void {
  memoryCache.clear()
}
