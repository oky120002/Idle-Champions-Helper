import type { AppLocale } from '../../app/i18n'
import { buildFormationSnapshotPrompt } from '../../data/formationPersistence'
import { listFormationPresets } from '../../data/formationPresetStore'
import { buildOrderedChampionsFromPlacements } from '../../domain/championPlacement'
import { getLocalizedTextPair } from '../../domain/localizedText'
import type { Champion, FormationLayout, FormationPreset, PresetPriority } from '../../domain/types'
import { PRESET_SCHEMA_VERSION } from './constants'
import type { PresetEditorState, PresetsMetrics, PresetView } from './types'

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

export function buildPriorityLabel(priority: PresetPriority, locale: AppLocale): string {
  if (priority === 'high') {
    return locale === 'zh-CN' ? '高优先' : 'High'
  }

  if (priority === 'low') {
    return locale === 'zh-CN' ? '备用' : 'Fallback'
  }

  return locale === 'zh-CN' ? '常用' : 'Regular'
}

export function buildEditorState(preset: FormationPreset): PresetEditorState {
  return {
    name: preset.name,
    description: preset.description,
    scenarioTagsInput: preset.scenarioTags.join('，'),
    priority: preset.priority,
  }
}

export function buildChampionSummary(view: PresetView): Champion[] {
  if (view.prompt.kind !== 'restore') {
    return []
  }

  return buildOrderedChampionsFromPlacements(view.prompt.preview.placements, view.prompt.preview.champions)
}

export async function buildPresetViews(
  dataVersion: string,
  formations: FormationLayout[],
  champions: Champion[],
): Promise<PresetView[]> {
  const presets = await listFormationPresets()

  return Promise.all(
    presets.map(async (preset) => ({
      preset,
      prompt: await buildFormationSnapshotPrompt(
        preset,
        dataVersion,
        formations,
        champions,
        '方案',
        PRESET_SCHEMA_VERSION,
      ),
    })),
  )
}

export function buildPresetsMetrics(items: PresetView[]): PresetsMetrics {
  const recoverable = items.filter((item) => item.prompt.kind === 'restore').length
  const risky = items.filter(
    (item) =>
      item.prompt.kind === 'invalid' ||
      item.prompt.preview.restoreMode === 'compatible' ||
      item.prompt.preview.invalidChampionIds.length > 0 ||
      item.prompt.preview.invalidSlotIds.length > 0,
  ).length

  return {
    total: items.length,
    recoverable,
    risky,
  }
}

export function buildLayoutSummary(view: PresetView, locale: AppLocale): string {
  return view.prompt.kind === 'restore'
    ? getLocalizedTextPair(view.prompt.preview.layoutName, locale)
    : view.preset.layoutId
}

export function isCompatibleRestore(view: PresetView): boolean {
  return view.prompt.kind === 'restore' && view.prompt.preview.restoreMode === 'compatible'
}

export function hasDroppedReferences(view: PresetView): boolean {
  return (
    view.prompt.kind === 'restore' &&
    (view.prompt.preview.invalidSlotIds.length > 0 || view.prompt.preview.invalidChampionIds.length > 0)
  )
}
