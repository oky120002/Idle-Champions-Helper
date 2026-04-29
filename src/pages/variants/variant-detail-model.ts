import type { AppLocale } from '../../app/i18n'
import type { VariantAreaHighlight, VariantAttackMix } from '../../domain/types'
import { getAreaHighlightLabel, getAttackMixSummary, getEnemyTypeLabel, getMechanicLabel } from './variant-labels'
import type { VariantAdventureGroup } from './types'

export type VariantRatioStat = {
  id: string
  label: string
  count: number
  percent: number
}

export function formatVariantPercent(value: number, locale: AppLocale): string {
  if (!Number.isFinite(value) || value <= 0) {
    return '0%'
  }

  const formatted = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 2,
  }).format(value)

  return `${formatted}%`
}

export function getEnemyTypeStats(group: VariantAdventureGroup, locale: AppLocale): VariantRatioStat[] {
  const counts = new Map<string, number>()
  let total = 0

  for (const variant of group.variants) {
    if (variant.enemyTypeCounts && Object.keys(variant.enemyTypeCounts).length > 0) {
      for (const [enemyType, count] of Object.entries(variant.enemyTypeCounts)) {
        if (count <= 0) {
          continue
        }

        counts.set(enemyType, (counts.get(enemyType) ?? 0) + count)
      }

      total += variant.enemyCount
      continue
    }

    const uniqueTypes = Array.from(new Set(variant.enemyTypes))

    for (const enemyType of uniqueTypes) {
      counts.set(enemyType, (counts.get(enemyType) ?? 0) + 1)
    }

    total += uniqueTypes.length
  }

  return Array.from(counts.entries())
    .map(([id, count]) => ({
      id,
      count,
      label: getEnemyTypeLabel(id, locale),
      percent: total > 0 ? (count / total) * 100 : 0,
    }))
    .sort((left, right) => right.percent - left.percent || left.label.localeCompare(right.label))
}

export function getAttackTypeStats(attackMix: VariantAttackMix, locale: AppLocale): VariantRatioStat[] {
  const labels = {
    melee: locale === 'zh-CN' ? '近战' : 'Melee',
    ranged: locale === 'zh-CN' ? '远程' : 'Ranged',
    magic: locale === 'zh-CN' ? '魔法' : 'Magic',
    other: locale === 'zh-CN' ? '其他' : 'Other',
  }
  const total = attackMix.melee + attackMix.ranged + attackMix.magic + attackMix.other

  return (Object.entries(attackMix) as Array<[keyof VariantAttackMix, number]>)
    .filter(([, count]) => count > 0)
    .map(([id, count]) => ({
      id,
      count,
      label: labels[id],
      percent: total > 0 ? (count / total) * 100 : 0,
    }))
    .sort((left, right) => right.percent - left.percent || left.label.localeCompare(right.label))
}

export function getSpecialEnemySummary(group: VariantAdventureGroup, locale: AppLocale): string {
  if (group.specialEnemyMin === group.specialEnemyMax) {
    return locale === 'zh-CN'
      ? `${group.specialEnemyMax} 个`
      : `${group.specialEnemyMax}`
  }

  return locale === 'zh-CN'
    ? `${group.specialEnemyMin}-${group.specialEnemyMax} 个`
    : `${group.specialEnemyMin}-${group.specialEnemyMax}`
}

export function getAreaHighlights(group: VariantAdventureGroup): VariantAreaHighlight[] {
  const byId = new Map<string, VariantAreaHighlight>()

  for (const variant of group.variants) {
    for (const highlight of variant.areaHighlights) {
      if (!byId.has(highlight.id)) {
        byId.set(highlight.id, highlight)
      }
    }
  }

  return Array.from(byId.values()).sort(
    (left, right) => left.start - right.start || left.kind.localeCompare(right.kind),
  )
}

export function getMechanicLabels(group: VariantAdventureGroup, locale: AppLocale): string[] {
  const mechanics = new Set<string>()

  for (const variant of group.variants) {
    for (const mechanic of variant.mechanics) {
      mechanics.add(mechanic)
    }
  }

  return Array.from(mechanics)
    .sort((left, right) => left.localeCompare(right))
    .map((mechanic) => getMechanicLabel(mechanic, locale))
}

export function getAreaHighlightLabels(group: VariantAdventureGroup, locale: AppLocale): string[] {
  return getAreaHighlights(group).map((highlight) => getAreaHighlightLabel(highlight, locale))
}

export function getAttackSummary(group: VariantAdventureGroup, locale: AppLocale): string {
  return getAttackMixSummary(group.attackMix, locale)
}
