import type { AppLocale } from '../app/i18n'
import type { Adventure, LocalizedOption, LocalizedText, ScenarioRef, Variant } from './types'

/**
 * scenarioRef → 玩家可读的场景友好名。
 *
 * 数据源（见 docs/research data 勘察）：
 * - variant → variants.json，记录内嵌 adventure: LocalizedText + campaign: LocalizedOption
 * - adventure → adventures.json
 * - campaign → enums.json campaigns 组
 * - trial/timeGate 无名称数据源 → 回退原始 `${kind}:${id}`
 * variant/adventure/campaign kind 但查不到（场景从游戏消失）→ 「原场景已消失」标记。
 */
export interface ScenarioLabelLookup {
  variantsById: Map<string, Variant>
  adventuresById: Map<string, Adventure>
  campaignsById: Map<string, LocalizedOption>
}

function pickLocalized(text: LocalizedText | null | undefined, locale: AppLocale): string | null {
  if (text === null || text === undefined) {
    return null
  }
  return locale === 'zh-CN' ? text.display : text.original
}

function goneLabel(locale: AppLocale): string {
  return locale === 'zh-CN' ? '原场景已消失' : 'Original scenario gone'
}

function formatVariantLabel(ref: ScenarioRef, lookup: ScenarioLabelLookup, locale: AppLocale): string {
  const variant = lookup.variantsById.get(ref.id)
  if (variant === undefined) return goneLabel(locale)
  const variantName = pickLocalized(variant.name, locale)
  const adventureName = pickLocalized(variant.adventure, locale)
  if (variantName !== null && adventureName !== null) {
    return `${variantName} · ${adventureName}`
  }
  return variantName ?? ref.id
}

function formatAdventureLabel(ref: ScenarioRef, lookup: ScenarioLabelLookup, locale: AppLocale): string {
  const adventure = lookup.adventuresById.get(ref.id)
  if (adventure === undefined) return goneLabel(locale)
  return pickLocalized(adventure.name, locale) ?? ref.id
}

function formatCampaignLabel(ref: ScenarioRef, lookup: ScenarioLabelLookup, locale: AppLocale): string {
  const campaign = lookup.campaignsById.get(ref.id)
  if (campaign === undefined) return goneLabel(locale)
  return locale === 'zh-CN' ? campaign.display : campaign.original
}

export function formatScenarioRefLabel(
  ref: ScenarioRef,
  lookup: ScenarioLabelLookup,
  locale: AppLocale,
): string {
  if (ref.kind === 'variant') return formatVariantLabel(ref, lookup, locale)
  if (ref.kind === 'adventure') return formatAdventureLabel(ref, lookup, locale)
  if (ref.kind === 'campaign') return formatCampaignLabel(ref, lookup, locale)
  // trial / timeGate 无名称数据源 → 回退原始标识串
  return `${ref.kind}:${ref.id}`
}

function indexById<T extends { id: string }>(items: readonly T[]): Map<string, T> {
  return new Map(items.map((item) => [item.id, item]))
}

export function buildScenarioLabelLookup(
  variants: readonly Variant[],
  adventures: readonly Adventure[],
  campaigns: readonly LocalizedOption[],
): ScenarioLabelLookup {
  return {
    variantsById: indexById(variants),
    adventuresById: indexById(adventures),
    campaignsById: indexById(campaigns),
  }
}
