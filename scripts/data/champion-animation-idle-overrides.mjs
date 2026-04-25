import { readFile } from 'node:fs/promises'
import path from 'node:path'

export const DEFAULT_CHAMPION_ANIMATION_IDLE_OVERRIDES_FILE = path.resolve(
  'scripts/data/champion-animation-idle-overrides.json',
)

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'))
}

function normalizeSequenceIndexes(value) {
  if (!Array.isArray(value)) {
    return []
  }

  return Array.from(
    new Set(
      value
        .map((item) => Number(item))
        .filter((item) => Number.isInteger(item) && item >= 0),
    ),
  ).sort((left, right) => left - right)
}

function normalizeEntry(entry) {
  if (!entry || typeof entry !== 'object') {
    return null
  }

  const fixedSequenceIndex = Number(entry.fixedSequenceIndex)
  const blockedSequenceIndexes = normalizeSequenceIndexes(entry.blockedSequenceIndexes)

  return {
    fixedSequenceIndex: Number.isInteger(fixedSequenceIndex) && fixedSequenceIndex >= 0 ? fixedSequenceIndex : null,
    blockedSequenceIndexes,
  }
}

export async function readChampionAnimationIdleOverrides(filePath = DEFAULT_CHAMPION_ANIMATION_IDLE_OVERRIDES_FILE) {
  const parsed = await readJson(path.resolve(filePath))
  const rawEntries = parsed?.entries

  if (!rawEntries || typeof rawEntries !== 'object') {
    return new Map()
  }

  return new Map(
    Object.entries(rawEntries).flatMap(([id, entry]) => {
      const normalized = normalizeEntry(entry)
      return normalized ? [[id, normalized]] : []
    }),
  )
}
