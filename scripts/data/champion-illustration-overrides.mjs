import { readFile } from 'node:fs/promises'

const VALID_SLOTS = new Set(['base', 'large', 'xl'])

function toText(value) {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed || null
  }

  if (typeof value === 'number') {
    return String(value)
  }

  return null
}

function toTextList(value) {
  if (Array.isArray(value)) {
    return value.flatMap((item) => toTextList(item))
  }

  const text = toText(value)
  return text ? [text] : []
}

function uniqueStrings(values) {
  const seen = new Set()
  const ordered = []

  for (const value of values) {
    if (!value || seen.has(value)) {
      continue
    }

    seen.add(value)
    ordered.push(value)
  }

  return ordered
}

function normalizeIndexes(value, fieldName, label) {
  const values = Array.isArray(value) ? value : value == null ? [] : [value]

  return values.map((item, itemIndex) => {
    const number = Number(item)

    if (!Number.isInteger(number) || number < 0) {
      throw new Error(`${label} 的 ${fieldName}[${itemIndex}] 必须是大于等于 0 的整数`)
    }

    return number
  })
}

function buildOverrideLabel(item, index) {
  const selectors = [
    item.skinId ? `skinId=${item.skinId}` : null,
    item.graphicId ? `graphicId=${item.graphicId}` : null,
    item.championId ? `championId=${item.championId}` : null,
  ].filter(Boolean)

  return selectors.length > 0 ? selectors.join(', ') : `items[${index}]`
}

function normalizeOverrideItem(item, index) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    throw new Error(`items[${index}] 必须是对象`)
  }

  const championId = toText(item.championId)
  const skinId = toText(item.skinId)
  const graphicId = toText(item.graphicId)

  if (!championId && !skinId && !graphicId) {
    throw new Error(`items[${index}] 至少要提供 skinId / graphicId / championId 其中一个选择器`)
  }

  const label = buildOverrideLabel({ championId, skinId, graphicId }, index)
  const slot = item.slot == null ? null : toText(item.slot)

  if (slot != null && !VALID_SLOTS.has(slot)) {
    throw new Error(`${label} 的 slot 必须是 base / large / xl 之一`)
  }

  const preferredSequenceIndexes = normalizeIndexes(item.preferredSequenceIndexes, 'preferredSequenceIndexes', label)
  const preferredFrameIndexes = normalizeIndexes(item.preferredFrameIndexes, 'preferredFrameIndexes', label)
  const notes = uniqueStrings(toTextList(item.notes))

  if (!slot && preferredSequenceIndexes.length === 0 && preferredFrameIndexes.length === 0) {
    throw new Error(`${label} 至少要提供 slot / preferredSequenceIndexes / preferredFrameIndexes 其中一个动作字段`)
  }

  return {
    order: index,
    championId,
    skinId,
    graphicId,
    slot,
    preferredSequenceIndexes,
    preferredFrameIndexes,
    notes,
  }
}

function getOverrideTier(item) {
  if (item.skinId) {
    return 3
  }

  if (item.graphicId) {
    return 2
  }

  return 1
}

function matchesOverride(item, task, candidate) {
  if (item.championId && item.championId !== task.championId) {
    return false
  }

  if (item.skinId && item.skinId !== task.skinId) {
    return false
  }

  if (item.graphicId && item.graphicId !== candidate.asset.graphicId) {
    return false
  }

  return true
}

export function normalizeChampionIllustrationOverrides(raw = {}) {
  const items = Array.isArray(raw.items) ? raw.items : []
  return items.map((item, index) => normalizeOverrideItem(item, index))
}

export async function loadChampionIllustrationOverrides(filePath) {
  if (!filePath) {
    return []
  }

  const raw = JSON.parse(await readFile(filePath, 'utf8'))
  return normalizeChampionIllustrationOverrides(raw)
}

export function resolveChampionIllustrationOverride(task, candidate, overrides = []) {
  const matches = overrides
    .filter((item) => matchesOverride(item, task, candidate))
    .sort((left, right) => getOverrideTier(left) - getOverrideTier(right) || left.order - right.order)

  if (matches.length === 0) {
    return null
  }

  let requestedSlot = null
  let preferredSequenceIndexes = []
  let preferredFrameIndexes = []
  const matchedBy = []
  const notes = []
  const matchedKeys = new Set()

  for (const item of matches) {
    if (item.championId && !matchedKeys.has('championId')) {
      matchedKeys.add('championId')
      matchedBy.push('championId')
    }

    if (item.graphicId && !matchedKeys.has('graphicId')) {
      matchedKeys.add('graphicId')
      matchedBy.push('graphicId')
    }

    if (item.skinId && !matchedKeys.has('skinId')) {
      matchedKeys.add('skinId')
      matchedBy.push('skinId')
    }

    if (item.slot) {
      requestedSlot = item.slot
    }

    if (item.preferredSequenceIndexes.length > 0) {
      preferredSequenceIndexes = item.preferredSequenceIndexes
    }

    if (item.preferredFrameIndexes.length > 0) {
      preferredFrameIndexes = item.preferredFrameIndexes
    }

    notes.push(...item.notes)
  }

  const candidateMatchedSlot = requestedSlot == null ? null : candidate.slot === requestedSlot
  const matchedGraphic = matches.some((item) => item.graphicId != null)

  return {
    priorityScore: (candidateMatchedSlot ? 100 : 0) + (matchedGraphic ? 10 : 0),
    preferredSequenceIndexes,
    preferredFrameIndexes,
    audit: {
      matchedBy,
      requestedSlot,
      candidateMatchedSlot,
      preferredSequenceIndexes,
      preferredFrameIndexes,
      notes: uniqueStrings(notes),
    },
  }
}
