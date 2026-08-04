import path from 'node:path'
import { readJson } from './io-utils.ts'

export const DEFAULT_CHAMPION_ANIMATION_IDLE_OVERRIDES_FILE = path.resolve(
  'scripts/data/champion-animation-idle-overrides.json',
)

export interface ChampionAnimationIdleOverride {
  fixedSequenceIndex: number | null
  blockedSequenceIndexes: number[]
}

function normalizeSequenceIndexes(value: unknown): number[] {
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

function normalizeEntry(entry: unknown): ChampionAnimationIdleOverride | null {
  if (entry == null || typeof entry !== 'object') {
    return null
  }

  const record = entry as Record<string, unknown>
  const fixedSequenceIndex = Number(record.fixedSequenceIndex)
  const blockedSequenceIndexes = normalizeSequenceIndexes(record.blockedSequenceIndexes)

  return {
    fixedSequenceIndex:
      Number.isInteger(fixedSequenceIndex) && fixedSequenceIndex >= 0 ? fixedSequenceIndex : null,
    blockedSequenceIndexes,
  }
}

export async function readChampionAnimationIdleOverrides(
  filePath: string = DEFAULT_CHAMPION_ANIMATION_IDLE_OVERRIDES_FILE,
): Promise<Map<string, ChampionAnimationIdleOverride>> {
  const parsed = await readJson(path.resolve(filePath))

  if (parsed == null || typeof parsed !== 'object') {
    return new Map()
  }

  const rawEntries = (parsed as Record<string, unknown>).entries

  if (rawEntries == null || typeof rawEntries !== 'object') {
    return new Map()
  }

  return new Map(
    Object.entries(rawEntries as Record<string, unknown>).flatMap<[string, ChampionAnimationIdleOverride]>(
      ([id, entry]) => {
        const normalized = normalizeEntry(entry)
        return normalized ? [[id, normalized]] : []
      },
    ),
  )
}
