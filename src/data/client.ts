import type { ChampionDetail, DataCollection, DataVersion } from '../domain/types'

const memoryCache = new Map<string, unknown>()

export function resolveDataUrl(relativePath: string): string {
  const base = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`

  return `${base}data/${relativePath}`
}

async function fetchJson<T>(relativePath: string, init?: RequestInit): Promise<T> {
  const response = await fetch(resolveDataUrl(relativePath), init)

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

export async function loadCollectionAtVersion<T>(version: string, name: string): Promise<DataCollection<T>> {
  const cacheKey = `${version}:${name}`
  const cached = memoryCache.get(cacheKey)

  if (cached) {
    return cached as DataCollection<T>
  }

  const collection = await fetchJson<DataCollection<T>>(`${version}/${name}.json`)
  memoryCache.set(cacheKey, collection)
  return collection
}

export async function loadCollection<T>(name: string): Promise<DataCollection<T>> {
  const version = await loadVersion()
  return loadCollectionAtVersion<T>(version.current, name)
}

export async function loadChampionDetailAtVersion(
  version: string,
  championId: string,
): Promise<ChampionDetail> {
  const cacheKey = `${version}:champion-details:${championId}`
  const cached = memoryCache.get(cacheKey)

  if (cached) {
    return cached as ChampionDetail
  }

  const detail = await fetchJson<ChampionDetail>(`${version}/champion-details/${championId}.json`)
  memoryCache.set(cacheKey, detail)
  return detail
}

export async function loadChampionDetail(championId: string): Promise<ChampionDetail> {
  const version = await loadVersion()
  return loadChampionDetailAtVersion(version.current, championId)
}

export function clearDataCache(): void {
  memoryCache.clear()
}
