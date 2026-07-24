import { createHash } from 'node:crypto'
import type { LocalizedText } from '../../src/domain/types/common.ts'
import {
  compareLocalizedText,
  normalizeLocalizedText,
  uniqueNumbers,
} from './normalize-text-utils.ts'

type FormationContextKind = 'campaign' | 'adventure' | 'variant'

interface FormationContext {
  kind: FormationContextKind
  id: string
  name: LocalizedText | null
  campaignId?: string | undefined
  variantAdventureId?: string | undefined
}

interface ApplicableContextRef {
  kind: FormationContextKind
  id: string
}

interface SlotSeed {
  index: number
  x: number
  y: number
  columnSeed: number
  rowSeed: number
  adjacentIndices: number[]
}

interface NormalizedOfficialSlot {
  id: string
  row: number
  column: number
  x: number
  y: number
  adjacentSlotIds: string[]
}

interface OfficialFormationLayout {
  id: string
  name: LocalizedText
  notes: LocalizedText
  slots: NormalizedOfficialSlot[]
  applicableContexts: ApplicableContextRef[]
  sourceContexts: FormationContext[]
}

type RawDefinition = Record<string, unknown>

// ponytail: String() on unknown 触发 no-base-to-string；统一经此 helper 收口为 String() 行为。
function toStr(value: unknown): string {
  return String(value)
}

const CONTEXT_KIND_ORDER: Record<FormationContextKind, number> = {
  campaign: 0,
  adventure: 1,
  variant: 2,
}

function getDefinitionName(definition: RawDefinition = {}): unknown {
  return definition.name ?? definition.label ?? definition.campaign_name
}

function isFormationContextKind(value: string): value is FormationContextKind {
  return value === 'campaign' || value === 'adventure' || value === 'variant'
}

function getContextOrder(kind: string): number {
  return isFormationContextKind(kind) ? CONTEXT_KIND_ORDER[kind] : Number.MAX_SAFE_INTEGER
}

function compareFormationContexts(left: FormationContext, right: FormationContext): number {
  return (
    getContextOrder(left.kind) - getContextOrder(right.kind) ||
    compareLocalizedText(left.name ?? { original: '', display: '' }, right.name ?? { original: '', display: '' }) ||
    left.id.localeCompare(right.id)
  )
}

function toFiniteNumber(value: unknown, fallback = 0): number {
  const normalized = Number(value)
  return Number.isFinite(normalized) ? normalized : fallback
}

function buildNormalizedSlotSeed(slot: RawDefinition = {}, index = 0): SlotSeed {
  const adj = Array.isArray(slot.adj) ? slot.adj : []
  return {
    index,
    x: toFiniteNumber(slot.x),
    y: toFiniteNumber(slot.y),
    columnSeed: toFiniteNumber(slot.col),
    rowSeed: Number.isFinite(Number(slot.row)) ? Number(slot.row) : toFiniteNumber(slot.y),
    adjacentIndices: adj
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value >= 0),
  }
}

function compareSlotSeeds(left: SlotSeed, right: SlotSeed, rowIndexBySeed: Map<number, number>): number {
  return (
    left.columnSeed - right.columnSeed ||
    (rowIndexBySeed.get(left.rowSeed) ?? 0) - (rowIndexBySeed.get(right.rowSeed) ?? 0) ||
    left.y - right.y ||
    right.x - left.x ||
    left.index - right.index
  )
}

function compareSlotIds(left: string, right: string): number {
  return Number(left.slice(1)) - Number(right.slice(1))
}

export function looksLikeVariant(definition: RawDefinition = {}): boolean {
  return (
    definition.variant_adventure_id !== undefined ||
    definition.base_adventure_id !== undefined ||
    definition.variant_id !== undefined ||
    definition.adventure_variant_id !== undefined
  )
}

export function normalizeOfficialFormationSlots(rawSlots: readonly RawDefinition[] = []): NormalizedOfficialSlot[] {
  const seeds = rawSlots.map((slot, index) => buildNormalizedSlotSeed(slot, index))
  const rowSeeds = uniqueNumbers(seeds.map((slot) => slot.rowSeed))
  const rowIndexBySeed = new Map(rowSeeds.map((value, index) => [value, index + 1]))
  const sortedSeeds = [...seeds].sort((left, right) => compareSlotSeeds(left, right, rowIndexBySeed))
  const slotIdByOriginalIndex = new Map<number, string>(
    sortedSeeds.map((slot, index) => [slot.index, `s${index + 1}`]),
  )

  return sortedSeeds.map((slot, index) => ({
    id: `s${index + 1}`,
    row: rowIndexBySeed.get(slot.rowSeed) ?? 0,
    column: slot.columnSeed + 1,
    x: slot.x,
    y: slot.y,
    adjacentSlotIds: slot.adjacentIndices
      .map((value) => slotIdByOriginalIndex.get(value))
      .filter((value): value is string => typeof value === 'string')
      .sort(compareSlotIds),
  }))
}

export function buildOfficialFormationSignature(rawSlots: readonly RawDefinition[] = []): string {
  const slots = normalizeOfficialFormationSlots(rawSlots)

  return slots
    .map(
      (slot) =>
        `${slot.column}:${slot.row}:${slot.x}:${slot.y}:${slot.adjacentSlotIds.join(',')}`,
    )
    .join('|')
}

function buildFormationLayoutId(signature: string, slotCount: number): string {
  const digest = createHash('sha1').update(signature).digest('hex').slice(0, 10)
  return `official-${String(slotCount).padStart(2, '0')}-${digest}`
}

function buildFormationContext(
  kind: FormationContextKind,
  originalDefinition: RawDefinition = {},
  localizedDefinition: RawDefinition = {},
): FormationContext {
  const name = normalizeLocalizedText(
    getDefinitionName(originalDefinition),
    getDefinitionName(localizedDefinition),
    `${kind}-${toStr(originalDefinition.id ?? 'unknown')}`,
  )

  const context: FormationContext = {
    kind,
    id: toStr(originalDefinition.id),
    name,
  }

  if (originalDefinition.campaign_id !== undefined) {
    context.campaignId = toStr(originalDefinition.campaign_id)
  }
  if (originalDefinition.variant_adventure_id !== undefined) {
    context.variantAdventureId = toStr(originalDefinition.variant_adventure_id)
  }

  return context
}

function buildFormationName(
  primaryContext: FormationContext | undefined,
  slotCount: number,
  layoutId: string,
): LocalizedText {
  if (!primaryContext?.name) {
    return {
      original: `Official layout ${slotCount} slots · ${layoutId}`,
      display: `官方布局 ${slotCount} 槽 · ${layoutId}`,
    }
  }

  return {
    original: `${primaryContext.name.original} · ${slotCount} slots`,
    display: `${primaryContext.name.display} · ${slotCount} 槽`,
  }
}

function buildFormationNotes(contexts: readonly FormationContext[], slotCount: number): LocalizedText {
  const counts = contexts.reduce(
    (result, context) => {
      result[context.kind] = (result[context.kind] ?? 0) + 1
      return result
    },
    { campaign: 0, adventure: 0, variant: 0 } as Record<FormationContextKind, number>,
  )

  const summaryParts = [
    counts.campaign > 0 ? `${counts.campaign} 个战役` : null,
    counts.adventure > 0 ? `${counts.adventure} 个冒险` : null,
    counts.variant > 0 ? `${counts.variant} 个变体` : null,
  ].filter((value): value is string => value !== null)

  const englishSummaryParts = [
    counts.campaign > 0 ? `${counts.campaign} campaign${counts.campaign > 1 ? 's' : ''}` : null,
    counts.adventure > 0
      ? `${counts.adventure} adventure${counts.adventure > 1 ? 's' : ''}`
      : null,
    counts.variant > 0 ? `${counts.variant} variant${counts.variant > 1 ? 's' : ''}` : null,
  ].filter((value): value is string => value !== null)

  return {
    original: `Auto-extracted ${slotCount}-slot layout from official definitions, currently linked to ${englishSummaryParts.join(' / ')}.`,
    display: `官方 definitions 自动提取的 ${slotCount} 槽布局，当前关联 ${summaryParts.join(' / ')}。`,
  }
}

function compareFormationLayouts(left: OfficialFormationLayout, right: OfficialFormationLayout): number {
  const leftPrimaryContext = left.sourceContexts[0]
  const rightPrimaryContext = right.sourceContexts[0]

  return (
    left.slots.length - right.slots.length ||
    getContextOrder(leftPrimaryContext?.kind ?? '') - getContextOrder(rightPrimaryContext?.kind ?? '') ||
    compareLocalizedText(
      leftPrimaryContext?.name ?? left.name,
      rightPrimaryContext?.name ?? right.name,
    ) ||
    left.id.localeCompare(right.id)
  )
}

export function extractOfficialFormations(
  rawDefinitions: RawDefinition = {},
  localizedDefinitions: RawDefinition = rawDefinitions,
): OfficialFormationLayout[] {
  const localizedCampaignList = Array.isArray(localizedDefinitions.campaign_defines)
    ? (localizedDefinitions.campaign_defines as RawDefinition[])
    : []
  const localizedAdventureList = Array.isArray(localizedDefinitions.adventure_defines)
    ? (localizedDefinitions.adventure_defines as RawDefinition[])
    : []
  const localizedCampaignById = new Map(
    localizedCampaignList.map((definition) => [String(definition.id), definition]),
  )
  const localizedAdventureById = new Map(
    localizedAdventureList.map((definition) => [String(definition.id), definition]),
  )
  const layoutsById = new Map<string, OfficialFormationLayout>()

  function registerContext(
    kind: FormationContextKind,
    definition: RawDefinition,
    localizedDefinition: RawDefinition,
  ): void {
    const gameChanges = Array.isArray(definition.game_changes) ? definition.game_changes : []
    const rawFormation = gameChanges
      .map((change) => (change && typeof change === 'object' ? (change as RawDefinition).formation : undefined))
      .find((change): change is RawDefinition[] => Array.isArray(change) && change.length > 0)

    if (!rawFormation) {
      return
    }

    const signature = buildOfficialFormationSignature(rawFormation)
    const slots = normalizeOfficialFormationSlots(rawFormation)
    const layoutId = buildFormationLayoutId(signature, slots.length)
    const context = buildFormationContext(kind, definition, localizedDefinition)

    const existingLayout = layoutsById.get(layoutId)
    if (!existingLayout) {
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

    const sourceContexts = [...existingLayout.sourceContexts, context].sort(compareFormationContexts)
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

  const campaignList = Array.isArray(rawDefinitions.campaign_defines)
    ? (rawDefinitions.campaign_defines as RawDefinition[])
    : []
  for (const definition of campaignList) {
    registerContext(
      'campaign',
      definition,
      localizedCampaignById.get(toStr(definition.id)) ?? definition,
    )
  }

  const adventureList = Array.isArray(rawDefinitions.adventure_defines)
    ? (rawDefinitions.adventure_defines as RawDefinition[])
    : []
  for (const definition of adventureList) {
    registerContext(
      looksLikeVariant(definition) ? 'variant' : 'adventure',
      definition,
      localizedAdventureById.get(toStr(definition.id)) ?? definition,
    )
  }

  return Array.from(layoutsById.values()).sort(compareFormationLayouts)
}
