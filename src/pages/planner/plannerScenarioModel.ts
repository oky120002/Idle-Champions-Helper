import type { MessageRef, TranslateParams, AppLocale  } from '../../app/i18n'

export interface PlannerScenarioRecord {
  id: string
  name: string
  campaignId: string
  campaign: string
  adventure: string
  scene: string
  objectiveArea: number | null
  restrictions: string[]
  rewards: string[]
  mechanics: string[]
  enemyCount: number
  searchText: string
}

export const DEFAULT_VISIBLE_RESULTS = 12

type Translate = (text: string | MessageRef, params?: TranslateParams) => string

export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

export function getQueryTokens(value: string): string[] {
  return normalizeSearchText(value)
    .split(/\s+/u)
    .filter(Boolean)
}

export function getScenarioSortWeight(record: PlannerScenarioRecord, selectedId: string | null): number {
  return record.id === selectedId ? -1 : 0
}

export interface CampaignOption {
  id: string
  label: string
  count: number
}

export function buildCampaignOptions(
  records: PlannerScenarioRecord[],
  locale: AppLocale,
  t: Translate,
): CampaignOption[] {
  const counts = new Map<string, CampaignOption>()

  for (const record of records) {
    const existing = counts.get(record.campaignId)
    if (existing) {
      existing.count += 1
    } else {
      counts.set(record.campaignId, { id: record.campaignId, label: record.campaign, count: 1 })
    }
  }

  return [
    { id: 'all', label: t("全部战役"), count: records.length },
    ...[...counts.values()].sort((left, right) => left.label.localeCompare(right.label, locale)),
  ]
}
