import type { AppLocale } from '../../app/i18n'
import type { FormationSnapshotPreview } from '../../data/formationPersistence'
import { matchesLocalizedText } from '../../domain/localizedText'
import type { Champion, FormationDraft, FormationLayout, FormationPreset } from '../../domain/types'
import { DRAFT_SCHEMA_VERSION } from './types'
import type { DraftPrompt, LayoutFilterKind, ReadyFormationState } from './types'

export function buildReadyFormationState(
  dataVersion: string,
  formations: FormationLayout[],
  champions: Champion[],
): ReadyFormationState {
  return {
    status: 'ready',
    dataVersion,
    formations,
    champions,
  }
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '未知错误'
}

export function formatDateTime(value: string, locale: AppLocale): string {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString(locale, {
    hour12: false,
  })
}

export function parseScenarioTags(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(/[，,\n]/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  )
}

export function buildPresetId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `preset-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export function convertPresetToDraft(preset: FormationPreset): FormationDraft {
  return {
    schemaVersion: DRAFT_SCHEMA_VERSION,
    dataVersion: preset.dataVersion,
    layoutId: preset.layoutId,
    scenarioRef: preset.scenarioRef,
    placements: preset.placements,
    updatedAt: preset.updatedAt,
  }
}

export function buildRestoredDraftFromPreview(
  preview: FormationSnapshotPreview<FormationDraft>,
): FormationDraft {
  return {
    schemaVersion: DRAFT_SCHEMA_VERSION,
    dataVersion: preview.dataVersion,
    layoutId: preview.snapshot.layoutId,
    scenarioRef: preview.snapshot.scenarioRef,
    placements: preview.placements,
    updatedAt: new Date().toISOString(),
  }
}

export function buildDraftPromptSummary(
  draftPrompt: DraftPrompt,
  locale: AppLocale,
): string {
  if (draftPrompt.kind !== 'restore') {
    return draftPrompt.detail
  }

  const championCount = Object.keys(draftPrompt.preview.placements).length
  const championCountLabel =
    locale === 'zh-CN' ? `${championCount} 名英雄` : `${championCount} champions`

  return `${formatDateTime(draftPrompt.preview.snapshot.updatedAt, locale)} · ${championCountLabel}`
}

export function matchesLayoutSearch(layout: FormationLayout, query: string): boolean {
  if (!query.trim()) {
    return true
  }

  return (
    matchesLocalizedText(layout.name, query) ||
    (layout.notes ? matchesLocalizedText(layout.notes, query) : false) ||
    (layout.sourceContexts ?? []).some((context) => matchesLocalizedText(context.name, query))
  )
}

export function matchesLayoutContextKind(
  layout: FormationLayout,
  selectedKind: LayoutFilterKind,
): boolean {
  if (selectedKind === 'all') {
    return true
  }

  return (layout.sourceContexts ?? []).some((context) => context.kind === selectedKind)
}

export function pickPreferredSlotId(
  layout: FormationLayout | null,
  placements: Record<string, string> = {},
): string {
  if (!layout) {
    return ''
  }

  return layout.slots.find((slot) => Boolean(placements[slot.id]))?.id ?? layout.slots[0]?.id ?? ''
}
