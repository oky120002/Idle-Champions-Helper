import { access, readdir, rm } from 'node:fs/promises'
import type { Dirent } from 'node:fs'
import path from 'node:path'
import { readJsonIfExists, writeJson } from './io-utils.ts'

// 读取的外部 JSON（collection / updatedAt / definitions）按 testing-conventions §8 以 unknown
// 在边界收窄，不为不可信形状过度声明（那是 zod 的职责）。

function normalizeUpdatedAt(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null
}

function normalizeComparableValue(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed || null
  }

  // value 已排除 null/undefined/number/string；剩余为外部不可信类型，防御性转字符串。
  // eslint-disable-next-line @typescript-eslint/no-base-to-string
  return String(value)
}

export function getUpdatedAtFromDefinitions(
  rawDefinitions: { current_time?: unknown } | null,
): string {
  const currentTime = rawDefinitions?.current_time
  if (typeof currentTime === 'number') {
    return new Date(currentTime * 1000).toISOString().slice(0, 10)
  }

  return new Date().toISOString().slice(0, 10)
}

export function compareUpdatedAt(left: unknown, right: unknown): number {
  const normalizedLeft = normalizeUpdatedAt(left)
  const normalizedRight = normalizeUpdatedAt(right)

  if (!normalizedLeft && !normalizedRight) {
    return 0
  }

  if (!normalizedLeft) {
    return -1
  }

  if (!normalizedRight) {
    return 1
  }

  return normalizedLeft.localeCompare(normalizedRight)
}

export function shouldSkipResourceSync({
  existingUpdatedAt,
  nextUpdatedAt,
}: {
  existingUpdatedAt: unknown
  nextUpdatedAt: unknown
}): boolean {
  return compareUpdatedAt(existingUpdatedAt, nextUpdatedAt) >= 0
}

export async function readExistingCollection(
  collectionFile: string,
): Promise<{ items: unknown[]; updatedAt?: unknown } | null> {
  const collection = await readJsonIfExists(collectionFile)

  if (
    !collection
    || typeof collection !== 'object'
    || !Array.isArray((collection as Record<string, unknown>).items)
  ) {
    return null
  }

  return collection as { items: unknown[]; updatedAt?: unknown }
}

export async function readUpdatedAtFromJsonFile(filePath: string): Promise<string | null> {
  const payload = await readJsonIfExists(filePath)
  const updatedAt =
    payload && typeof payload === 'object'
      ? (payload as Record<string, unknown>).updatedAt
      : undefined
  return normalizeUpdatedAt(updatedAt)
}

export async function writeUpdatedAtJsonFile(filePath: string, value: unknown): Promise<void> {
  await writeJson(filePath, value)
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath)
    return true
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return false
    }

    throw error
  }
}

interface ReuseCheckInput {
  existingItem: {
    image?: { path?: unknown } | null
    sourceGraphic?: unknown
    sourceVersion?: unknown
  } | null
  nextSourceGraphic: unknown
  nextSourceVersion: unknown
  nextImagePath: unknown
}

export function canReuseGeneratedImage({
  existingItem,
  nextSourceGraphic,
  nextSourceVersion,
  nextImagePath,
}: ReuseCheckInput): boolean {
  const existingPath = existingItem?.image?.path
  if (!existingPath) {
    return false
  }

  return (
    normalizeComparableValue(existingItem?.sourceGraphic) === normalizeComparableValue(nextSourceGraphic)
    && normalizeComparableValue(existingItem?.sourceVersion) === normalizeComparableValue(nextSourceVersion)
    && existingPath === nextImagePath
  )
}

export async function removeUnexpectedFiles(
  directory: string,
  expectedFileNames: Set<string>,
): Promise<void> {
  let entries: Dirent[]

  try {
    entries = await readdir(directory, { withFileTypes: true })
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return
    }

    throw error
  }

  await Promise.all(
    entries
      .filter((entry) => entry.isFile() && !expectedFileNames.has(entry.name))
      .map((entry) => rm(path.join(directory, entry.name), { force: true })),
  )
}
