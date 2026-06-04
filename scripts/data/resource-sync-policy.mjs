import { access, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

async function readJsonIfExists(filePath) {
  try {
    return JSON.parse(await readFile(filePath, 'utf8'))
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return null
    }

    throw error
  }
}

function normalizeUpdatedAt(value) {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null
}

function normalizeComparableValue(value) {
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

  return String(value)
}

export function getUpdatedAtFromDefinitions(rawDefinitions) {
  if (typeof rawDefinitions?.current_time === 'number') {
    return new Date(rawDefinitions.current_time * 1000).toISOString().slice(0, 10)
  }

  return new Date().toISOString().slice(0, 10)
}

export function compareUpdatedAt(left, right) {
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

export function shouldSkipResourceSync({ existingUpdatedAt, nextUpdatedAt }) {
  return compareUpdatedAt(existingUpdatedAt, nextUpdatedAt) >= 0
}

export async function readExistingCollection(collectionFile) {
  const collection = await readJsonIfExists(collectionFile)

  if (!collection || !Array.isArray(collection.items)) {
    return null
  }

  return collection
}

export async function readUpdatedAtFromJsonFile(filePath) {
  const payload = await readJsonIfExists(filePath)
  return normalizeUpdatedAt(payload?.updatedAt)
}

export async function writeUpdatedAtJsonFile(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

export async function fileExists(filePath) {
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

export function canReuseGeneratedImage({
  existingItem,
  nextSourceGraphic,
  nextSourceVersion,
  nextImagePath,
}) {
  if (!existingItem?.image?.path) {
    return false
  }

  return (
    normalizeComparableValue(existingItem.sourceGraphic) === normalizeComparableValue(nextSourceGraphic) &&
    normalizeComparableValue(existingItem.sourceVersion) ===
      normalizeComparableValue(nextSourceVersion) &&
    existingItem.image.path === nextImagePath
  )
}

export async function removeUnexpectedFiles(directory, expectedFileNames) {
  let entries = []

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
