import { seatOptions } from './options'

export function readSearchValue(searchParams: URLSearchParams): string {
  return searchParams.get('q')?.trim() ?? ''
}

export function readSeatValues(searchParams: URLSearchParams): number[] {
  return Array.from(
    new Set(
      searchParams
        .getAll('seat')
        .map((value) => Number.parseInt(value, 10))
        .filter((value) => seatOptions.includes(value)),
    ),
  ).sort((left, right) => left - right)
}

export function readStringValues(searchParams: URLSearchParams, key: string): string[] {
  return Array.from(
    new Set(
      searchParams
        .getAll(key)
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  )
}

export function appendSortedStringValues(searchParams: URLSearchParams, key: string, values: string[]): void {
  values
    .slice()
    .sort((left, right) => left.localeCompare(right))
    .forEach((value) => searchParams.append(key, value))
}
