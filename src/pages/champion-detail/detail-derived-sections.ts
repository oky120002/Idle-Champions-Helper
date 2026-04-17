import type { AppLocale } from '../../app/i18n'
import { getPrimaryLocalizedText } from '../../domain/localizedText'
import type { ChampionDetail, ChampionUpgradeDetail } from '../../domain/types'
import { buildUpgradeCategoryMeta, buildUpgradePresentation } from './effect-model'
import { buildOverviewPropertyFields } from './summary-model'
import { isJsonObject } from './detail-json'
import { formatNumber } from './detail-value-formatters'
import type { DetailFieldProps, EffectContext, LedgerUpgradeRow, UpgradeCategoryMeta } from './types'

export function buildSpotlightUpgrades(detail: ChampionDetail | null): ChampionUpgradeDetail[] {
  if (!detail) {
    return []
  }

  return detail.upgrades.filter(
    (upgrade) =>
      Boolean(upgrade.name) ||
      Boolean(upgrade.specializationName) ||
      Boolean(upgrade.specializationDescription) ||
      Boolean(upgrade.tipText) ||
      Boolean(upgrade.effectDefinition) ||
      upgrade.upgradeType === 'unlock_ability' ||
      upgrade.upgradeType === 'unlock_ultimate',
  )
}

export function buildLedgerUpgrades(detail: ChampionDetail | null): ChampionUpgradeDetail[] {
  if (!detail) {
    return []
  }

  return detail.upgrades.filter(
    (upgrade) =>
      !upgrade.name &&
      !upgrade.specializationName &&
      !upgrade.specializationDescription &&
      !upgrade.tipText &&
      !upgrade.effectDefinition &&
      upgrade.upgradeType !== 'unlock_ability' &&
      upgrade.upgradeType !== 'unlock_ultimate',
  )
}

export function buildLedgerRows(
  ledgerUpgrades: ChampionUpgradeDetail[],
  effectContext: EffectContext | null,
  locale: AppLocale,
  upgradePresentations: Map<string, ReturnType<typeof buildUpgradePresentation>>,
): LedgerUpgradeRow[] {
  if (!effectContext) {
    return []
  }

  return ledgerUpgrades.map((upgrade) => {
    const presentation = upgradePresentations.get(upgrade.id) ?? buildUpgradePresentation(upgrade, effectContext)

    return {
      upgrade,
      presentation,
      category: buildUpgradeCategoryMeta(presentation.typeLabel, locale),
    }
  })
}

export function buildLedgerFilterOptions(
  ledgerRows: LedgerUpgradeRow[],
  locale: AppLocale,
): Array<UpgradeCategoryMeta & { count: number }> {
  const optionMap = new Map<string, UpgradeCategoryMeta & { count: number }>()

  ledgerRows.forEach((row) => {
    const current = optionMap.get(row.category.key)

    if (current) {
      current.count += 1
      return
    }

    optionMap.set(row.category.key, {
      ...row.category,
      count: 1,
    })
  })

  return Array.from(optionMap.values()).sort((left, right) => {
    if (left.defaultEnabled !== right.defaultEnabled) {
      return left.defaultEnabled ? 1 : -1
    }

    if (left.count !== right.count) {
      return right.count - left.count
    }

    return left.label.localeCompare(right.label, locale)
  })
}

export function buildUpgradeSectionBadges(options: {
  detail: ChampionDetail | null
  spotlightUpgrades: ChampionUpgradeDetail[]
  ledgerRows: LedgerUpgradeRow[]
  visibleLedgerRows: LedgerUpgradeRow[]
  locale: AppLocale
  t: (text: { zh: string; en: string }) => string
}) {
  const { detail, spotlightUpgrades, ledgerRows, visibleLedgerRows, locale, t } = options

  return [
    {
      label: t({ zh: '全部升级', en: 'All' }),
      value: formatNumber(detail?.upgrades.length ?? 0, locale),
    },
    {
      label: t({ zh: '重点升级', en: 'Spotlight' }),
      value: formatNumber(spotlightUpgrades.length, locale),
    },
    {
      label: t({ zh: '数值里程碑', en: 'Ledger' }),
      value:
        ledgerRows.length > 0
          ? `${formatNumber(visibleLedgerRows.length, locale)} / ${formatNumber(ledgerRows.length, locale)}`
          : formatNumber(ledgerRows.length, locale),
    },
  ]
}

export function buildAvailableFeatCount(detail: ChampionDetail | null): number {
  if (!detail) {
    return 0
  }

  return detail.feats.filter((feat) => isJsonObject(feat.properties) && feat.properties.is_available === true).length
}

export function buildFeatSectionBadges(options: {
  detail: ChampionDetail | null
  availableFeatCount: number
  locale: AppLocale
  t: (text: { zh: string; en: string }) => string
}) {
  const { detail, availableFeatCount, locale, t } = options

  return [
    {
      label: t({ zh: '全部天赋', en: 'Total' }),
      value: formatNumber(detail?.feats.length ?? 0, locale),
    },
    {
      label: t({ zh: '默认槽', en: 'Default slots' }),
      value: formatNumber(detail?.defaultFeatSlotUnlocks.length ?? 0, locale),
    },
    {
      label: t({ zh: '当前可用', en: 'Available now' }),
      value: formatNumber(availableFeatCount, locale),
    },
  ]
}

export function buildOverviewFields(options: {
  detail: ChampionDetail | null
  locale: AppLocale
  t: (text: { zh: string; en: string }) => string
  effectContext: EffectContext | null
}): DetailFieldProps[] {
  const { detail, locale, t, effectContext } = options

  if (!detail) {
    return []
  }

  return [
    {
      label: t({ zh: 'Seat', en: 'Seat' }),
      value: locale === 'zh-CN' ? `${detail.summary.seat} 号位` : `Seat ${detail.summary.seat}`,
    },
    ...(detail.eventName
      ? [
          {
            label: t({ zh: '活动名', en: 'Event name' }),
            value: getPrimaryLocalizedText(detail.eventName, locale),
          },
        ]
      : []),
    {
      label: t({ zh: '首次可用', en: 'Date available' }),
      value: detail.dateAvailable?.trim() || (locale === 'zh-CN' ? '暂无' : 'Not available'),
    },
    ...(detail.lastReworkDate
      ? [
          {
            label: t({ zh: '最后重做', en: 'Last rework' }),
            value: detail.lastReworkDate?.trim() || (locale === 'zh-CN' ? '暂无' : 'Not available'),
          },
        ]
      : []),
    ...(detail.availability.nextEventTimestamp && detail.availability.nextEventTimestamp > 0
      ? [
          {
            label: t({ zh: '下次活动时间', en: 'Next event time' }),
            value: new Intl.DateTimeFormat(locale, {
              dateStyle: 'medium',
              timeStyle: 'short',
            }).format(new Date(detail.availability.nextEventTimestamp * 1000)),
          },
        ]
      : []),
    {
      label: t({ zh: '默认天赋槽解锁', en: 'Default feat slots' }),
      value:
        detail.defaultFeatSlotUnlocks.length > 0
          ? detail.defaultFeatSlotUnlocks.join(' / ')
          : t({ zh: '暂无', en: 'None yet' }),
    },
    ...buildOverviewPropertyFields(detail, locale, effectContext),
  ]
}

export function buildSummaryAvailabilityBadges(
  detail: ChampionDetail | null,
  t: (text: { zh: string; en: string }) => string,
) {
  if (!detail) {
    return []
  }

  const badges: Array<{ key: string; label: string; active?: boolean }> = []

  if (detail.availability.isAvailable) {
    badges.push({
      key: 'available',
      label: t({ zh: '当前可用', en: 'Currently available' }),
      active: true,
    })
  }

  if (detail.availability.availableInShop) {
    badges.push({
      key: 'shop',
      label: t({ zh: '商店可得', en: 'Available in shop' }),
      active: true,
    })
  }

  if (detail.availability.availableInTimeGate) {
    badges.push({
      key: 'time-gate',
      label: t({ zh: '时间门可得', en: 'Available in Time Gate' }),
      active: true,
    })
  }

  if (detail.availability.availableInNextEvent) {
    badges.push({
      key: 'next-event',
      label: t({ zh: '下个活动可得', en: 'Available in next event' }),
      active: true,
    })
  }

  if (badges.length === 0) {
    badges.push({
      key: 'unavailable',
      label: t({ zh: '当前未开放', en: 'Currently unavailable' }),
    })
  }

  return badges
}
