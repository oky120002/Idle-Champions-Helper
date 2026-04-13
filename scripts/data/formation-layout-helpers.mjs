import { createHash } from 'node:crypto'

const CONTEXT_KIND_ORDER = {
  campaign: 0,
  adventure: 1,
  variant: 2,
}

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

function normalizeLocalizedText(originalValue, displayValue, fallbackValue = '') {
  const fallback = toText(fallbackValue) ?? ''
  const original = toText(originalValue) ?? toText(displayValue) ?? fallback
  const display = toText(displayValue) ?? original

  if (!original || !display) {
    return null
  }

  return {
    original,
    display,
  }
}

function getDefinitionName(definition = {}) {
  return definition.name ?? definition.label ?? definition.campaign_name
}

function getContextOrder(kind) {
  return CONTEXT_KIND_ORDER[kind] ?? Number.MAX_SAFE_INTEGER
}

function compareLocalizedText(left, right) {
  return left.display.localeCompare(right.display) || left.original.localeCompare(right.original)
}

function compareFormationContexts(left, right) {
  return (
    getContextOrder(left.kind) - getContextOrder(right.kind) ||
    compareLocalizedText(left.name, right.name) ||
    left.id.localeCompare(right.id)
  )
}

function uniqueNumbers(values) {
  return Array.from(new Set(values)).sort((left, right) => left - right)
}

function toFiniteNumber(value, fallback = 0) {
  const normalized = Number(value)
  return Number.isFinite(normalized) ? normalized : fallback
}

function buildNormalizedSlotSeed(slot = {}, index = 0) {
  return {
    index,
    x: toFiniteNumber(slot.x),
    y: toFiniteNumber(slot.y),
    columnSeed: toFiniteNumber(slot.col),
    rowSeed: Number.isFinite(Number(slot.row)) ? Number(slot.row) : toFiniteNumber(slot.y),
    adjacentIndices: Array.isArray(slot.adj)
      ? slot.adj.map((value) => Number(value)).filter((value) => Number.isInteger(value) && value >= 0)
      : [],
  }
}

function compareSlotSeeds(left, right, rowIndexBySeed) {
  return (
    left.columnSeed - right.columnSeed ||
    rowIndexBySeed.get(left.rowSeed) - rowIndexBySeed.get(right.rowSeed) ||
    left.y - right.y ||
    right.x - left.x ||
    left.index - right.index
  )
}

function compareSlotIds(left, right) {
  return Number(left.slice(1)) - Number(right.slice(1))
}

export function looksLikeVariant(definition = {}) {
  return (
    definition.variant_adventure_id !== undefined ||
    definition.base_adventure_id !== undefined ||
    definition.variant_id !== undefined ||
    definition.adventure_variant_id !== undefined
  )
}

export function normalizeOfficialFormationSlots(rawSlots = []) {
  const seeds = rawSlots.map((slot, index) => buildNormalizedSlotSeed(slot, index))
  const rowSeeds = uniqueNumbers(seeds.map((slot) => slot.rowSeed))
  const rowIndexBySeed = new Map(rowSeeds.map((value, index) => [value, index + 1]))
  const sortedSeeds = [...seeds].sort((left, right) => compareSlotSeeds(left, right, rowIndexBySeed))
  const slotIdByOriginalIndex = new Map(
    sortedSeeds.map((slot, index) => [slot.index, `s${index + 1}`]),
  )

  return sortedSeeds.map((slot, index) => ({
    id: `s${index + 1}`,
    row: rowIndexBySeed.get(slot.rowSeed),
    column: slot.columnSeed + 1,
    x: slot.x,
    y: slot.y,
    adjacentSlotIds: slot.adjacentIndices
      .map((value) => slotIdByOriginalIndex.get(value))
      .filter(Boolean)
      .sort(compareSlotIds),
  }))
}

export function buildOfficialFormationSignature(rawSlots = []) {
  const slots = normalizeOfficialFormationSlots(rawSlots)

  return slots
    .map(
      (slot) =>
        `${slot.column}:${slot.row}:${slot.x}:${slot.y}:${slot.adjacentSlotIds.join(',')}`,
    )
    .join('|')
}

function buildFormationLayoutId(signature, slotCount) {
  const digest = createHash('sha1').update(signature).digest('hex').slice(0, 10)
  return `official-${String(slotCount).padStart(2, '0')}-${digest}`
}

function buildFormationContext(kind, originalDefinition = {}, localizedDefinition = {}) {
  const name = normalizeLocalizedText(
    getDefinitionName(originalDefinition),
    getDefinitionName(localizedDefinition),
    `${kind}-${originalDefinition.id ?? 'unknown'}`,
  )

  return {
    kind,
    id: String(originalDefinition.id),
    name,
    campaignId:
      originalDefinition.campaign_id !== undefined ? String(originalDefinition.campaign_id) : undefined,
    variantAdventureId:
      originalDefinition.variant_adventure_id !== undefined
        ? String(originalDefinition.variant_adventure_id)
        : undefined,
  }
}

function buildFormationName(primaryContext, slotCount, layoutId) {
  if (!primaryContext?.name) {
    return `官方布局 ${slotCount} 槽 · ${layoutId}`
  }

  return `${primaryContext.name.display} · ${slotCount} 槽`
}

function buildFormationNotes(contexts, slotCount) {
  const counts = contexts.reduce(
    (result, context) => {
      result[context.kind] = (result[context.kind] ?? 0) + 1
      return result
    },
    { campaign: 0, adventure: 0, variant: 0 },
  )

  const summaryParts = [
    counts.campaign > 0 ? `${counts.campaign} 个战役` : null,
    counts.adventure > 0 ? `${counts.adventure} 个冒险` : null,
    counts.variant > 0 ? `${counts.variant} 个变体` : null,
  ].filter(Boolean)

  return `官方 definitions 自动提取的 ${slotCount} 槽布局，当前关联 ${summaryParts.join(' / ')}。`
}

function compareFormationLayouts(left, right) {
  const leftPrimaryContext = left.sourceContexts?.[0]
  const rightPrimaryContext = right.sourceContexts?.[0]

  return (
    left.slots.length - right.slots.length ||
    getContextOrder(leftPrimaryContext?.kind) - getContextOrder(rightPrimaryContext?.kind) ||
    compareLocalizedText(
      leftPrimaryContext?.name ?? { original: left.name, display: left.name },
      rightPrimaryContext?.name ?? { original: right.name, display: right.name },
    ) ||
    left.id.localeCompare(right.id)
  )
}

export function extractOfficialFormations(
  rawDefinitions = {},
  localizedDefinitions = rawDefinitions,
) {
  const localizedCampaignById = new Map(
    (localizedDefinitions.campaign_defines ?? []).map((definition) => [String(definition.id), definition]),
  )
  const localizedAdventureById = new Map(
    (localizedDefinitions.adventure_defines ?? []).map((definition) => [String(definition.id), definition]),
  )
  const layoutsById = new Map()

  function registerContext(kind, definition, localizedDefinition) {
    const rawFormation = (definition.game_changes ?? []).find((change) => Array.isArray(change?.formation))
      ?.formation

    if (!Array.isArray(rawFormation) || rawFormation.length === 0) {
      return
    }

    const signature = buildOfficialFormationSignature(rawFormation)
    const slots = normalizeOfficialFormationSlots(rawFormation)
    const layoutId = buildFormationLayoutId(signature, slots.length)
    const context = buildFormationContext(kind, definition, localizedDefinition)

    if (!layoutsById.has(layoutId)) {
      layoutsById.set(layoutId, {
        id: layoutId,
        name: buildFormationName(context, slots.length, layoutId),
        notes: buildFormationNotes([context], slots.length),
        slots,
        applicableContexts: [{ kind: context.kind, id: context.id }],
        sourceContexts: [context],
      })
      return
    }

    const existingLayout = layoutsById.get(layoutId)
    const sourceContexts = [...(existingLayout.sourceContexts ?? []), context].sort(compareFormationContexts)
    const applicableContexts = sourceContexts.map((item) => ({ kind: item.kind, id: item.id }))
    const primaryContext = sourceContexts[0]

    layoutsById.set(layoutId, {
      ...existingLayout,
      name: buildFormationName(primaryContext, existingLayout.slots.length, layoutId),
      notes: buildFormationNotes(sourceContexts, existingLayout.slots.length),
      applicableContexts,
      sourceContexts,
    })
  }

  for (const definition of rawDefinitions.campaign_defines ?? []) {
    registerContext(
      'campaign',
      definition,
      localizedCampaignById.get(String(definition.id)) ?? definition,
    )
  }

  for (const definition of rawDefinitions.adventure_defines ?? []) {
    registerContext(
      looksLikeVariant(definition) ? 'variant' : 'adventure',
      definition,
      localizedAdventureById.get(String(definition.id)) ?? definition,
    )
  }

  return Array.from(layoutsById.values()).sort(compareFormationLayouts)
}
